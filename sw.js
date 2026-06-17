/* ════════════════════════════════════════
   VitalFlow — Service Worker
   Recebe mensagens do app e agenda notificações
════════════════════════════════════════ */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

/* Recebe { type:'SCHEDULE', reminders:[{id,title,body,hour,minute}] } */
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE') {
    scheduleAll(e.data.reminders);
  }
  if (e.data?.type === 'CLEAR') {
    clearAll();
  }
});

const timers = {};

function clearAll() {
  Object.values(timers).forEach(clearTimeout);
  Object.keys(timers).forEach(k => delete timers[k]);
}

function scheduleAll(reminders) {
  clearAll();
  reminders.forEach(r => scheduleOne(r));
}

function scheduleOne(r) {
  const now   = new Date();
  const fire  = new Date();
  fire.setHours(r.hour, r.minute, 0, 0);
  if (fire <= now) fire.setDate(fire.getDate() + 1); /* next day if past */

  const delay = fire.getTime() - now.getTime();

  timers[r.id] = setTimeout(() => {
    self.registration.showNotification(r.title, {
      body:    r.body,
      icon:    'icons/icon-192.png',
      badge:   'icons/icon-192.png',
      tag:     r.id,
      renotify: true,
      data:    { url: r.url || '/' },
    });
    /* re-schedule for next day */
    scheduleOne(r);
  }, delay);
}

/* Click on notification → open app */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
