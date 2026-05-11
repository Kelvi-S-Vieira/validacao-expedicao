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
  const doca = event.notification.data?.doca || ''
  const url  = event.action === 'aprovar'
    ? `https://validacao-expedicao.vercel.app/?aba=aprovacao&doca=${doca}`
    : `https://validacao-expedicao.vercel.app/?aba=aprovacao`

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('validacao-expedicao.vercel.app')) {
          client.focus()
          client.postMessage({ type: 'ABRIR_APROVACAO', doca })
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})