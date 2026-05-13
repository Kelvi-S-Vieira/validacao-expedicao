import { useEffect, useState } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db, app } from './firebase'

const VAPID_KEY     = import.meta.env.VITE_FIREBASE_VAPID_KEY
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 dias

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

  // ── Escuta mensagens do Service Worker (foreground) ──────
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
        // App já trata isso em App.jsx via window.postMessage
        window.dispatchEvent(new CustomEvent('abrirAprovacao', { detail: event.data }))
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  function adicionarNotificacao(title, body, data) {
    setNotificacoes(prev => [{
      id:    Date.now(),
      title,
      body,
      data,
      lida:  false,
      ts:    new Date().toLocaleTimeString('pt-BR'),
    }, ...prev.slice(0, 9)])
  }

  // ── PROTEÇÃO 4: Verifica expiração do token ──────────────
  async function verificarEInicializar() {
    try {
      const tokenDoc = await getDoc(doc(db, 'fcm_tokens', usuario.uid))
      if (tokenDoc.exists()) {
        const { updatedAt } = tokenDoc.data()
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

      // Registra o SW e aguarda estar pronto
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: sw,
      })

      if (token) {
        setFcmToken(token)
        setTokenExpirado(false)
        await salvarTokenFirestore(token, usuario)
        console.log('[FCM] Token registrado:', token.substring(0, 30) + '...')
      }

      // ── onMessage: quando app está em foreground ──────────
      // O SW agora também intercepta o push e exibe a notificação nativa
      // Aqui apenas adicionamos na lista de notificações da UI
      onMessage(messaging, payload => {
        const { title, body } = payload.notification || {}
        const data = payload.data || {}
        console.log('[FCM] Foreground message recebida:', title)
        adicionarNotificacao(
          title || 'Validação de Expedição',
          body  || 'Nova pendência',
          data
        )
        // O SW vai cuidar de mostrar a notificação nativa
      })

    } catch (err) {
      console.error('[FCM] Erro:', err)
      if (err.code === 'messaging/token-unsubscribe-failed' ||
          err.message?.includes('404') || err.message?.includes('410')) {
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

async function salvarTokenFirestore(token, usuario) {
  try {
    await setDoc(doc(db, 'fcm_tokens', usuario.uid), {
      token,
      email:     usuario.email,
      perfil:    usuario.perfil,
      updatedAt: serverTimestamp(),
    })
    console.log('[FCM] Token salvo no Firestore')
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