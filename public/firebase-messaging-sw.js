importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyAt_4n80JP0Krw0zaWtybM37Jx4f3PbHdM",
  authDomain: "validacao-expedicao.firebaseapp.com",
  projectId: "validacao-expedicao",
  storageBucket: "validacao-expedicao.firebasestorage.app",
  messagingSenderId: "905707450575",
  appId: "1:905707450575:web:237c97c15de7ab0221c7ba"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const { title, body, data } = payload.notification || payload.data || {}
  self.registration.showNotification(title || 'Validação de Expedição', {
    body: body || 'Nova pendência aguardando aprovação',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: data || {},
    actions: [
      { action: 'aprovar',  title: '✅ Aprovar' },
      { action: 'rejeitar', title: '❌ Rejeitar' },
    ]
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.action === 'aprovar' || event.action === 'rejeitar'
    ? '/?acao=' + event.action + '&doca=' + (event.notification.data?.doca || '')
    : '/'
  event.waitUntil(clients.openWindow(url))
})