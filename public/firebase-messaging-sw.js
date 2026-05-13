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

// ─── BACKGROUND (app minimizado ou fechado) ───────────────────────────────────
// O FCM chama onBackgroundMessage quando a mensagem chega com "data only"
// (sem campo "notification" no payload). Quando tem "notification", o browser
// já exibe sozinho — mas perdemos o controle dos botões de ação.
// Solução: mandamos SEMPRE "data only" no Apps Script e exibimos aqui.
messaging.onBackgroundMessage(payload => {
  console.log('[SW] onBackgroundMessage recebido:', payload)

  const data  = payload.data || {}
  const title = data.title || 'Validação de Expedição'
  const body  = data.body  || 'Nova pendência aguardando aprovação'
  const doca  = data.doca  || ''
  const nivel = data.nivel || 'COORDENADOR'

  self.registration.showNotification(title, {
    body,
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    tag:   `expedicao-${doca}`,       // evita duplicar notificação da mesma doca
    renotify: true,
    requireInteraction: true,         // mantém visível até o usuário interagir
    data: { doca, nivel, url: 'https://validacao-expedicao.vercel.app/?aba=aprovacao' },
    actions: [
      { action: 'aprovar',  title: '✅ Aprovar'  },
      { action: 'ver',      title: '👁 Ver doca' },
    ],
  })
})

// ─── PUSH DIRETO (fallback para quando o FCM não processa o onBackgroundMessage) ─
// Garante que mesmo sem o SDK FCM interceptar, o push chega via evento nativo.
self.addEventListener('push', event => {
  if (!event.data) return

  let payload = {}
  try { payload = event.data.json() } catch { return }

  // Se o FCM já vai processar (tem campo 'fcm_options'), deixa o SDK cuidar
  if (payload.fcm_options) return

  const data  = payload.data || payload.notification || {}
  const title = data.title || 'Validação de Expedição'
  const body  = data.body  || 'Nova pendência'
  const doca  = data.doca  || ''

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/favicon.svg',
      badge: '/favicon.svg',
      tag:   `expedicao-${doca}`,
      requireInteraction: true,
      data:  { doca, url: 'https://validacao-expedicao.vercel.app/?aba=aprovacao' },
      actions: [
        { action: 'aprovar', title: '✅ Aprovar'  },
        { action: 'ver',     title: '👁 Ver doca' },
      ],
    })
  )
})

// ─── CLICK NA NOTIFICAÇÃO ────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const doca = event.notification.data?.doca || ''
  const base = 'https://validacao-expedicao.vercel.app'
  const url  = event.action === 'aprovar'
    ? `${base}/?aba=aprovacao&doca=${doca}&acao=aprovar`
    : `${base}/?aba=aprovacao&doca=${doca}`

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se já tem uma aba aberta, foca e manda mensagem
      for (const client of clientList) {
        if (client.url.startsWith(base)) {
          client.focus()
          client.postMessage({
            type:  'ABRIR_APROVACAO',
            doca,
            acao:  event.action,
          })
          return
        }
      }
      // Senão, abre nova aba
      return clients.openWindow(url)
    })
  )
})

// ─── INSTALL / ACTIVATE ──────────────────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e  => e.waitUntil(clients.claim()))