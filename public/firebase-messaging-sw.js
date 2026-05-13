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

// ── BACKGROUND: app fechado ou em segundo plano ───────────
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload)
  const notification = payload.notification || {}
  const data = payload.data || {}

  self.registration.showNotification(notification.title || 'Validação de Expedição', {
    body: notification.body || 'Nova pendência aguardando aprovação',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `doca-${data.doca || Date.now()}`,   // evita notificações duplicadas
    renotify: true,
    requireInteraction: true,                  // mantém na tela até interagir
    data: { doca: data.doca || '', url: 'https://validacao-expedicao.vercel.app/?aba=aprovacao' },
    actions: [
      { action: 'aprovar',  title: '✅ Aprovar' },
      { action: 'ver',      title: '👁 Ver doca' },
    ]
  })
})

// ── FOREGROUND: app aberto na tela ────────────────────────
// Intercepta mensagens do FCM mesmo com app em foco e exibe via SW
// (necessário porque Chrome Android bloqueia new Notification() em foreground)
self.addEventListener('push', event => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { return }

  const notification = payload.notification || {}
  const data         = payload.data || {}

  // Verifica se há alguma janela do app aberta
  const showNotif = self.registration.showNotification(
    notification.title || 'Validação de Expedição', {
      body: notification.body || 'Nova pendência aguardando aprovação',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `doca-${data.doca || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: { doca: data.doca || '', url: 'https://validacao-expedicao.vercel.app/?aba=aprovacao' },
      actions: [
        { action: 'aprovar', title: '✅ Aprovar' },
        { action: 'ver',     title: '👁 Ver doca' },
      ]
    }
  )

  event.waitUntil(
    Promise.all([
      showNotif,
      // Também envia mensagem para o app aberto atualizar notificações na UI
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'FCM_FOREGROUND',
            payload: { notification, data }
          })
        })
      })
    ])
  )
})

// ── CLIQUE NA NOTIFICAÇÃO ─────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const doca = event.notification.data?.doca || ''
  const base = 'https://validacao-expedicao.vercel.app'
  const url  = event.action === 'aprovar'
    ? `${base}/?aba=aprovacao&doca=${doca}&acao=aprovar`
    : `${base}/?aba=aprovacao`

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('validacao-expedicao.vercel.app')) {
          client.focus()
          client.postMessage({ type: 'ABRIR_APROVACAO', doca, acao: event.action })
          return
        }
      }
      return self.clients.openWindow(url)
    })
  )
})