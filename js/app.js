/* ════════════════════════════════════════
   VitalFlow — shared app logic
════════════════════════════════════════ */

const VF = {
  /* ── Storage helpers (protegido contra localStorage bloqueado) ── */
  _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  },
  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      VF.toast('Não foi possível salvar os dados. Verifique as configurações do navegador.', 'error');
      return false;
    }
  },
  _remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  /* ── Session ── */
  getSession() { return this._get('vf_session', null); },
  requireAuth() {
    if (!this.getSession()) window.location.href = 'index.html';
  },
  logout() {
    this._remove('vf_session');
    window.location.href = 'index.html';
  },

  /* ── Goals ── */
  getGoals() {
    const g = this._get('vf_goals', { water: 2000, exercise: 30 });
    /* garante que os valores são números válidos */
    return {
      water:    Number.isFinite(g.water)    && g.water    > 0 ? g.water    : 2000,
      exercise: Number.isFinite(g.exercise) && g.exercise > 0 ? g.exercise : 30,
    };
  },
  saveGoals(g) { this._set('vf_goals', g); },

  /* ── Daily log ── */
  todayKey() {
    const d = new Date();
    return `vf_log_${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },
  getLog(key) {
    const raw = this._get(key || this.todayKey(), []);
    /* descarta entradas malformadas */
    return Array.isArray(raw)
      ? raw.filter(e => e && typeof e.type === 'string' && Number.isFinite(e.amount) && e.amount > 0)
      : [];
  },
  saveLog(log, key) { this._set(key || this.todayKey(), log); },
  addEntry(type, amount) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      VF.toast('Valor inválido.', 'error');
      return null;
    }
    const log = this.getLog();
    log.push({ type, amount: amt, ts: Date.now() });
    this.saveLog(log);
    return log;
  },

  /* ── Totals ── */
  dayTotal(type, key) {
    return this.getLog(key)
      .filter(e => e.type === type)
      .reduce((s, e) => s + e.amount, 0);
  },
  pct(type) {
    const goals = this.getGoals();
    const goal  = type === 'water' ? goals.water : goals.exercise;
    const total = this.dayTotal(type);
    if (!goal) return 0;
    return Math.min(100, Math.round(total / goal * 100));
  },

  /* ── Weekly log (last 7 days) ── */
  weekData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key   = `vf_log_${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      days.push({ label, water: this.dayTotal('water', key), exercise: this.dayTotal('exercise', key) });
    }
    return days;
  },

  /* ── Toast ── */
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
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
  },

  /* ── Sidebar: init, toggle, mobile overlay ── */
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

    /* ── collapse toggle (desktop) ── */
    const shell   = document.querySelector('.app-shell');
    const sidebar = document.querySelector('.sidebar');
    const COLLAPSED_KEY = 'vf_sidebar_collapsed';
    const toggleBtn = document.getElementById('sidebarToggleBtn');

    function applyCollapsed(collapsed) {
      shell?.classList.toggle('sidebar-collapsed', collapsed);
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', !collapsed);
    }

    /* restore saved state */
    applyCollapsed(this._get(COLLAPSED_KEY, false));

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const willCollapse = !shell?.classList.contains('sidebar-collapsed');
        applyCollapsed(willCollapse);
        this._set(COLLAPSED_KEY, willCollapse);
      });
    }

    /* ── mobile drawer overlay ── */
    const mobileToggle  = document.getElementById('mobileMenuBtn');
    const mobileOverlay = document.getElementById('mobileOverlay');

    function openMobileMenu()  {
      sidebar?.classList.add('mobile-open');
      mobileOverlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeMobileMenu() {
      sidebar?.classList.remove('mobile-open');
      mobileOverlay?.classList.remove('open');
      document.body.style.overflow = '';
    }

    mobileToggle?.addEventListener('click', openMobileMenu);
    mobileOverlay?.addEventListener('click', closeMobileMenu);

    /* close mobile menu on nav link click */
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', closeMobileMenu);
    });
  },

  /* ── Helpers ── */
  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  },
  dateLabel() {
    return new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  },
};
