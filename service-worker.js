const CACHE_NAME = 'jaidyn-train-v1';
const ASSETS = [
  '/',
  '/index.html',
];

// Install — cache assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Training reminder notifications
let reminderInterval = null;

self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_REMINDER') {
    const time = e.data.time || '07:00';
    scheduleDaily(time);
  }
});

function scheduleDaily(time) {
  if (reminderInterval) clearInterval(reminderInterval);
  // Check every minute if it's time
  reminderInterval = setInterval(() => {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    if (now.getHours() === h && now.getMinutes() === m) {
      sendReminder();
    }
  }, 60000);
}

function sendReminder() {
  self.registration.showNotification('Time to Train 💪', {
    body: 'Your session is waiting. Stay consistent — September 19 is the goal.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'training-reminder',
    renotify: true,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    e.waitUntil(clients.openWindow('/'));
  }
});
