import { useEffect, useState } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, app } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export function useFCM(usuario) {
  const [fcmToken, setFcmToken]         = useState(null)
  const [permissao, setPermissao]       = useState('default')
  const [notificacoes, setNotificacoes] = useState([])

  useEffect(() => {
    if (!usuario) return
    if (!['COORDENADOR', 'GERENTE'].includes(usuario.perfil)) return
    if (Notification.permission === 'granted') {
      solicitarPermissao()
    } else {
      setPermissao(Notification.permission)
    }
  }, [usuario])

  async function solicitarPermissao() {
    try {
      const perm = await Notification.requestPermission()
      setPermissao(perm)
      if (perm !== 'granted') return

      const messaging = getMessaging(app)
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: sw,
      })

      if (token) {
        setFcmToken(token)
        console.log('FCM Token gerado:', token.substring(0, 30) + '...')
        await salvarTokenFirestore(token, usuario)
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

async function salvarTokenFirestore(token, usuario) {
  try {
    console.log('Salvando token no Firestore para:', usuario.email)
    await setDoc(doc(db, 'fcm_tokens', usuario.uid), {
      token,
      email:     usuario.email,
      perfil:    usuario.perfil,
      updatedAt: serverTimestamp(),
    })
    console.log('Token FCM salvo com sucesso no Firestore!')
  } catch (err) {
    console.error('Erro ao salvar token FCM no Firestore:', err)
  }
}

export function dispararNotificacaoLocal(titulo, corpo) {
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(titulo, { body: corpo, icon: '/favicon.svg', badge: '/favicon.svg' })
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}