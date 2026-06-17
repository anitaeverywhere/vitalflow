/* ════════════════════════════════════════
   VitalFlow — Notifications manager
════════════════════════════════════════ */
const VFNotif = {
  STORAGE_KEY: 'vf_reminders',

  /* Default reminder set */
  DEFAULTS: [
    { id: 'water-morning',   enabled: true,  hour:  8, minute:  0, title: '💧 Hora de hidratar!',      body: 'Bom dia! Comece o dia com um copo d\'água.',           url: 'agua.html' },
    { id: 'water-midday',    enabled: true,  hour: 12, minute:  0, title: '💧 Pausa para água',         body: 'Já passou da metade do dia. Como está a hidratação?',  url: 'agua.html' },
    { id: 'water-afternoon', enabled: true,  hour: 15, minute:  0, title: '💧 Lembrete de água',        body: 'Você bebeu água nas últimas horas?',                   url: 'agua.html' },
    { id: 'water-evening',   enabled: false, hour: 18, minute:  0, title: '💧 Última chance do dia',    body: 'Ainda falta água para bater a meta hoje!',             url: 'agua.html' },
    { id: 'exercise-morning',enabled: false, hour:  7, minute:  0, title: '🏋️ Hora do treino!',         body: 'Que tal começar o dia se movimentando?',               url: 'treino.html' },
    { id: 'exercise-lunch',  enabled: false, hour: 13, minute:  0, title: '🏋️ Pausa ativa',             body: 'Um treino no almoço pode energizar sua tarde!',        url: 'treino.html' },
    { id: 'exercise-evening',enabled: true,  hour: 18, minute: 30, title: '🏋️ Treino da tarde!',        body: 'Perfeito para desestressar depois do trabalho/aula.',  url: 'treino.html' },
    { id: 'checkin-night',   enabled: true,  hour: 21, minute:  0, title: '📊 Como foi seu dia?',       body: 'Confira seu progresso e feche o dia com chave de ouro.', url: 'meta-hoje.html' },
  ],

  /* Load saved reminders (merge with defaults for new fields) */
  load() {
    const saved = VF._get(this.STORAGE_KEY, null);
    if (!saved) return this.DEFAULTS.map(r => ({ ...r }));
    /* merge: keep saved enabled/hour/minute, restore any missing defaults */
    const savedMap = Object.fromEntries(saved.map(r => [r.id, r]));
    return this.DEFAULTS.map(def => ({ ...def, ...(savedMap[def.id] || {}) }));
  },

  save(reminders) {
    VF._set(this.STORAGE_KEY, reminders);
  },

  /* Check browser support */
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  /* Current permission state */
  permission() {
    return this.isSupported() ? Notification.permission : 'unsupported';
  },

  /* Request permission and register SW */
  async requestPermission() {
    if (!this.isSupported()) return 'unsupported';
    const result = await Notification.requestPermission();
    if (result === 'granted') await this.registerSW();
    return result;
  },

  /* Register / get SW */
  async registerSW() {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      return reg;
    } catch (e) {
      console.warn('SW registration failed:', e);
      return null;
    }
  },

  /* Send schedule to SW */
  async syncToSW(reminders) {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const active = reg.active || reg.installing || reg.waiting;
      if (!active) return;
      const enabled = reminders.filter(r => r.enabled);
      active.postMessage({ type: 'SCHEDULE', reminders: enabled });
    } catch {}
  },

  /* Clear all notifications from SW */
  async clearSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const active = reg.active;
      if (active) active.postMessage({ type: 'CLEAR' });
    } catch {}
  },

  /* Send a test notification immediately */
  async sendTest() {
    if (this.permission() !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('✅ VitalFlow — Teste', {
      body: 'Notificações estão funcionando!',
      icon: 'icons/icon-192.png',
      tag:  'test',
    });
  },

  /* Init on page load — re-sync reminders if permission already granted */
  async init() {
    if (!this.isSupported()) return;
    if (this.permission() === 'granted') {
      await this.registerSW();
      const reminders = this.load();
      await this.syncToSW(reminders);
    }
  },
};

/* Auto-init */
if (typeof VF !== 'undefined') {
  VFNotif.init().catch(() => {});
}
