import { useEffect, useState } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db, app } from './firebase'

const VAPID_KEY     = import.meta.env.VITE_FIREBASE_VAPID_KEY
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 dias

function getDeviceId() {
  let id = localStorage.getItem('gpp_device_id')
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('gpp_device_id', id)
  }
  return id
}

function getDeviceName() {
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua))  return 'iPhone'
  if (/iPad/i.test(ua))    return 'iPad'
  if (/Android/i.test(ua)) return 'Android'
  if (/Mac/i.test(ua))     return 'Mac'
  if (/Windows/i.test(ua)) return 'Windows'
  return 'Dispositivo'
}

export function useFCM(usuario) {
  const [fcmToken, setFcmToken]           = useState(null)
  const [permissao, setPermissao]         = useState('default')
  const [notificacoes, setNotificacoes]   = useState([])
  const [tokenExpirado, setTokenExpirado] = useState(false)

  useEffect(() => {
    if (!usuario) return
    if (!['COORDENADOR', 'GERENTE'].includes(usuario.perfil)) return
    if (Notification.permission === 'granted') {
      verificarEInicializar()
    } else {
      setPermissao(Notification.permission)
    }
  }, [usuario])

  // Escuta mensagens do Service Worker (foreground)
  useEffect(() => {
    if (!navigator.serviceWorker) return
    const handler = event => {
      if (event.data?.type === 'FCM_FOREGROUND') {
        const { notification, data } = event.data.payload || {}
        adicionarNotificacao(
          notification?.title || 'Validação de Expedição',
          notification?.body  || 'Nova pendência',
          data || {}
        )
      }
      if (event.data?.type === 'ABRIR_APROVACAO') {
        window.dispatchEvent(new CustomEvent('abrirAprovacao', { detail: event.data }))
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  function adicionarNotificacao(title, body, data) {
    setNotificacoes(prev => [{
      id: Date.now(), title, body, data, lida: false,
      ts: new Date().toLocaleTimeString('pt-BR'),
    }, ...prev.slice(0, 9)])
  }

  async function verificarEInicializar() {
    try {
      const deviceId  = getDeviceId()
      const tokenRef  = doc(db, 'fcm_tokens', usuario.uid, 'devices', deviceId)
      const tokenSnap = await getDoc(tokenRef)
      if (tokenSnap.exists()) {
        const { updatedAt } = tokenSnap.data()
        const idade = Date.now() - (updatedAt?.toMillis?.() || 0)
        if (idade > TOKEN_MAX_AGE) {
          console.log('[FCM] Token expirado — renovando...')
          setTokenExpirado(true)
        }
      }
    } catch (err) {
      console.error('[FCM] Erro ao verificar token:', err)
    }
    await solicitarPermissao()
  }

  async function solicitarPermissao() {
    try {
      const perm = await Notification.requestPermission()
      setPermissao(perm)
      if (perm !== 'granted') return

      const messaging = getMessaging(app)
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: sw,
      })

      if (token) {
        setFcmToken(token)
        setTokenExpirado(false)
        await salvarTokenDispositivo(token, usuario)
        console.log('[FCM] Token registrado:', getDeviceId())
      }

      onMessage(messaging, payload => {
        const { title, body } = payload.notification || {}
        const data = payload.data || {}
        adicionarNotificacao(
          title || 'Validação de Expedição',
          body  || 'Nova pendência',
          data
        )
      })

    } catch (err) {
      console.error('[FCM] Erro:', err)
      if (err.message?.includes('404') || err.message?.includes('410')) {
        setTokenExpirado(true)
      }
    }
  }

  function marcarLida(id) {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  function limparNotificacoes() { setNotificacoes([]) }

  return {
    fcmToken, permissao, notificacoes, tokenExpirado,
    marcarLida, limparNotificacoes, solicitarPermissao,
  }
}

// ── Salva token em dois lugares ───────────────────────────
// 1. Subcoleção devices/{deviceId} — suporte multi-device
// 2. Documento raiz fcm_tokens/{uid} — lido pelo FCMPush.gs
async function salvarTokenDispositivo(token, usuario) {
  try {
    const deviceId   = getDeviceId()
    const deviceName = getDeviceName()

    // Subcoleção (multi-device)
    await setDoc(
      doc(db, 'fcm_tokens', usuario.uid, 'devices', deviceId),
      { token, deviceId, deviceName, email: usuario.email, perfil: usuario.perfil, updatedAt: serverTimestamp() }
    )

    // Documento raiz — FCMPush.gs busca aqui
    await setDoc(
      doc(db, 'fcm_tokens', usuario.uid),
      { token, email: usuario.email, perfil: usuario.perfil, updatedAt: serverTimestamp() },
      { merge: true }
    )

    console.log(`[FCM] Token salvo: ${deviceName} (${deviceId}) | perfil: ${usuario.perfil}`)
  } catch (err) {
    console.error('[FCM] Erro ao salvar token:', err)
  }
}

export function dispararNotificacaoLocal(titulo, corpo) {
  if (Notification.permission !== 'granted') return
  try {
    navigator.serviceWorker.ready.then(sw => {
      sw.showNotification(titulo, { body: corpo, icon: '/favicon.svg' })
    })
  } catch {}
}