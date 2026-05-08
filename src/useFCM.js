import { useEffect, useState } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey: "AIzaSyAt_4n80JP0Krw0zaWtybM37Jx4f3PbHdM",
  authDomain: "validacao-expedicao.firebaseapp.com",
  projectId: "validacao-expedicao",
  storageBucket: "validacao-expedicao.firebasestorage.app",
  messagingSenderId: "905707450575",
  appId: "1:905707450575:web:237c97c15de7ab0221c7ba"
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

// Inicializa o app Firebase (evita duplicar)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export function useFCM(usuario) {
  const [fcmToken, setFcmToken]         = useState(null)
  const [permissao, setPermissao]       = useState('default')
  const [notificacoes, setNotificacoes] = useState([])

  useEffect(() => {
    if (!usuario) return
    // Só solicita permissão para coordenador e gerente
    if (!['COORDENADOR', 'GERENTE'].includes(usuario.perfil)) return

    solicitarPermissao()
  }, [usuario])

  async function solicitarPermissao() {
    try {
      const perm = await Notification.requestPermission()
      setPermissao(perm)

      if (perm !== 'granted') return

      const messaging = getMessaging(app)

      // Registra o service worker
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

      // Obtém o token FCM
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: sw,
      })

      if (token) {
        setFcmToken(token)
        console.log('FCM Token:', token)
        // Aqui você salvaria o token no Firestore/backend para enviar notificações
        salvarToken(token, usuario)
      }

      // Escuta notificações com app em primeiro plano
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

        // Mostra notificação nativa mesmo com app aberto
        if (Notification.permission === 'granted') {
          new Notification(title || 'Validação de Expedição', {
            body,
            icon: '/favicon.svg',
          })
        }
      })
    } catch (err) {
      console.error('Erro FCM:', err)
    }
  }

  function marcarLida(id) {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  function limparNotificacoes() {
    setNotificacoes([])
  }

  return { fcmToken, permissao, notificacoes, marcarLida, limparNotificacoes, solicitarPermissao }
}

// Salva o token FCM no localStorage para uso posterior
function salvarToken(token, usuario) {
  try {
    const tokens = JSON.parse(localStorage.getItem('gpp_fcm_tokens') || '{}')
    tokens[usuario.email] = { token, perfil: usuario.perfil, ts: Date.now() }
    localStorage.setItem('gpp_fcm_tokens', JSON.stringify(tokens))
  } catch {}
}

// Função utilitária para disparar notificação local (usada pelo EntradaDados)
export function dispararNotificacaoLocal(titulo, corpo, dados = {}) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(titulo, {
    body:  corpo,
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    data:  dados,
  })
  n.onclick = () => {
    window.focus()
    n.close()
  }
}