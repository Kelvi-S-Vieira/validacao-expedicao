import { useEffect, useState } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db, app } from './firebase'

const VAPID_KEY      = import.meta.env.VITE_FIREBASE_VAPID_KEY
const TOKEN_MAX_AGE  = 30 * 24 * 60 * 60 * 1000 // 30 dias → renova token

export function useFCM(usuario) {
  const [fcmToken, setFcmToken]         = useState(null)
  const [permissao, setPermissao]       = useState('default')
  const [notificacoes, setNotificacoes] = useState([])
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

  // ── PROTEÇÃO 4: Verifica se token está expirado ───────────
  async function verificarEInicializar() {
    try {
      // Verifica idade do token salvo no Firestore
      const tokenDoc = await getDoc(doc(db, 'fcm_tokens', usuario.uid))
      if (tokenDoc.exists()) {
        const { updatedAt } = tokenDoc.data()
        const idade = Date.now() - (updatedAt?.toMillis?.() || 0)
        if (idade > TOKEN_MAX_AGE) {
          console.log('Token FCM expirado — renovando...')
          setTokenExpirado(true)
        }
      }
      await solicitarPermissao()
    } catch (err) {
      console.error('Erro ao verificar token FCM:', err)
      await solicitarPermissao()
    }
  }

  async function solicitarPermissao() {
    try {
      const perm = await Notification.requestPermission()
      setPermissao(perm)
      if (perm !== 'granted') return

      const messaging = getMessaging(app)
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready

      // Força renovação do token FCM
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: sw,
      })

      if (token) {
        setFcmToken(token)
        setTokenExpirado(false)
        await salvarTokenFirestore(token, usuario)
        console.log('Token FCM renovado e salvo com sucesso')
      }

      onMessage(messaging, payload => {
        const { title, body } = payload.notification || {}
        const data = payload.data || {}
        setNotificacoes(prev => [{
          id:    Date.now(),
          title: title || 'Validação de Expedição',
          body:  body  || 'Nova pendência',
          data,
          lida:  false,
          ts:    new Date().toLocaleTimeString('pt-BR'),
        }, ...prev.slice(0, 9)])
        if (Notification.permission === 'granted') {
          new Notification(title || 'Validação de Expedição', { body, icon: '/favicon.svg' })
        }
      })
    } catch (err) {
      console.error('Erro FCM:', err)
      // Se for erro de token inválido, marca como expirado
      if (err.code === 'messaging/token-unsubscribe-failed' ||
          err.message?.includes('404') ||
          err.message?.includes('410')) {
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
  } catch (err) {
    console.error('Erro ao salvar token FCM:', err)
  }
}

export function dispararNotificacaoLocal(titulo, corpo) {
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(titulo, { body: corpo, icon: '/favicon.svg', badge: '/favicon.svg' })
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}