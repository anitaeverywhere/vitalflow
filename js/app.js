/* ════════════════════════════════════════
   VitalFlow — shared app logic
════════════════════════════════════════ */

/* ── Auth ── */
const VF = {
  /* Session */
  getSession() { return JSON.parse(localStorage.getItem('vf_session') || 'null'); },
  requireAuth() {
    if (!this.getSession()) { window.location.href = 'index.html'; }
  },
  logout() {
    localStorage.removeItem('vf_session');
    window.location.href = 'index.html';
  },

  /* Goals */
  getGoals() {
    return JSON.parse(localStorage.getItem('vf_goals') || '{"water":2000,"exercise":30}');
  },
  saveGoals(g) { localStorage.setItem('vf_goals', JSON.stringify(g)); },

  /* Daily log */
  todayKey() {
    const d = new Date();
    return `vf_log_${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },
  getLog(key) { return JSON.parse(localStorage.getItem(key || this.todayKey()) || '[]'); },
  saveLog(log, key) { localStorage.setItem(key || this.todayKey(), JSON.stringify(log)); },
  addEntry(type, amount) {
    const log = this.getLog();
    log.push({ type, amount, ts: Date.now() });
    this.saveLog(log);
    return log;
  },

  /* Totals */
  dayTotal(type, key) {
    return this.getLog(key).filter(e => e.type === type).reduce((s, e) => s + e.amount, 0);
  },
  pct(type) {
    const goals = this.getGoals();
    const total = this.dayTotal(type);
    return Math.min(100, Math.round(total / (type === 'water' ? goals.water : goals.exercise) * 100));
  },

  /* Weekly log (last 7 days) */
  weekData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `vf_log_${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      days.push({
        label,
        water:    this.dayTotal('water', key),
        exercise: this.dayTotal('exercise', key),
      });
    }
    return days;
  },

  /* Toast */
  toast(msg, type = '') {
    let tc = document.getElementById('toast-container');
    if (!tc) {
      tc = document.createElement('div');
      tc.id = 'toast-container';
      document.body.appendChild(tc);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    tc.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 2800);
  },

  /* Sidebar active state */
  initSidebar(activeHref) {
    const session = this.getSession();
    if (!session) return;

    /* user info */
    const av = document.getElementById('sidebarAvatar');
    const nm = document.getElementById('sidebarName');
    const em = document.getElementById('sidebarEmail');
    if (av) av.textContent = session.name[0].toUpperCase();
    if (nm) nm.textContent = session.name;
    if (em) em.textContent = session.email;

    /* active nav */
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === activeHref);
    });

    /* logout */
    document.querySelectorAll('.btn-logout, #logoutBtn').forEach(btn => {
      btn.addEventListener('click', () => VF.logout());
    });
  },

  /* Greeting */
  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  },

  /* Format date */
  dateLabel() {
    return new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  },
};
