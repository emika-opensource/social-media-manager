/* ── Social Media Manager — SPA (Redesigned) ─────────────────────────────── */

const API = '';
const PLATFORMS = ['linkedin','instagram','facebook','tiktok','twitter','blog'];
const PLATFORM_LABELS = { linkedin:'LinkedIn', instagram:'Instagram', facebook:'Facebook', tiktok:'TikTok', twitter:'Twitter/X', blog:'Blog' };
const CHAR_LIMITS = { linkedin:3000, instagram:2200, facebook:63206, tiktok:2200, twitter:280, blog:50000 };
const PLATFORM_COLORS = { linkedin:'#0a66c2', instagram:'#e4405f', facebook:'#1877f2', tiktok:'#00f2ea', twitter:'#1da1f2', blog:'#a78bfa' };

const CAMERA_SVG = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="17" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M11 8l1.5-3h7L21 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CAMERA_SVG_SM = '<svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="17" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M11 8l1.5-3h7L21 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ── State ────────────────────────────────────────────────────────────────────
let state = {
  posts: [], references: [], schedules: [], config: {}, scanResults: [], analytics: {},
  pipelineStages: ['Idea', 'Draft', 'Review', 'Scheduled', 'Published'],
  calendarDate: new Date(),
  editingPost: null,
  createPlatform: 'linkedin',
  createHashtags: [],
  loading: true,
  apifyConfigured: false,
};

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ── API ──────────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function loadAll() {
  const [posts, refs, schedules, config, scanResults, analytics, scanStatus, stages] = await Promise.all([
    api('/api/posts'), api('/api/references'), api('/api/schedules'),
    api('/api/config'), api('/api/scan/results'), api('/api/analytics'),
    api('/api/scan/status'), api('/api/pipeline/stages')
  ]);
  Object.assign(state, {
    posts, references: refs, schedules, config, scanResults, analytics,
    apifyConfigured: scanStatus.configured,
    pipelineStages: stages
  });
}

// ── Sidebar Collapse ─────────────────────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (collapsed) sidebar.classList.add('collapsed');

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
  });
}

// ── Router ───────────────────────────────────────────────────────────────────
const views = {
  dashboard: renderDashboard,
  pipeline: renderPipeline,
  create: renderCreate,
  calendar: renderCalendar,
  references: renderReferences,
  settings: renderSettings
};

function navigate(view) {
  // Close split editor if open and not going to create
  if (view !== 'create') {
    const existing = document.querySelector('.split-editor');
    if (existing) existing.remove();
    state.editingPost = null;
  }

  if (!views[view]) view = 'dashboard';
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const container = document.getElementById('view-container');
  container.innerHTML = '';
  if (state.loading) {
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
    return;
  }
  if (view === 'dashboard' && !state.config.onboardingComplete && state.posts.length === 0) {
    renderWelcome(container);
    return;
  }
  views[view](container);
}

window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'dashboard'));
window.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  const container = document.getElementById('view-container');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
  try { await loadAll(); } catch (e) {
    container.innerHTML = '<div class="empty-state"><h3>Failed to connect</h3><p>Could not reach the server.</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div>';
    return;
  }
  // PIN check
  if (state.config.pinEnabled && !sessionStorage.getItem('ch-pin-auth')) {
    showPinScreen();
    return;
  }
  state.loading = false;
  navigate(location.hash.slice(1) || 'dashboard');
});

function showPinScreen() {
  document.getElementById('sidebar').style.display = 'none';
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--bg)">
      <div style="text-align:center;max-width:320px;width:100%">
        <svg width="40" height="40" viewBox="0 0 20 20" fill="none" style="margin-bottom:16px"><rect x="3" y="9" width="14" height="9" rx="2" stroke="#c0c0c0" stroke-width="1.5"/><path d="M6 9V6a4 4 0 118 0v3" stroke="#c0c0c0" stroke-width="1.5" stroke-linecap="round"/></svg>
        <h2 style="font-size:1.2rem;font-weight:600;margin-bottom:4px">Content Hub</h2>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:24px">Enter PIN to continue</p>
        <input type="password" id="pin-input" placeholder="Enter PIN" maxlength="20" style="width:100%;text-align:center;font-size:1.1rem;letter-spacing:4px;padding:12px;margin-bottom:12px">
        <div id="pin-error" style="color:var(--error);font-size:0.85rem;margin-bottom:12px;display:none"></div>
        <button class="btn btn-primary" id="pin-submit" style="width:100%">Unlock</button>
      </div>
    </div>`;
  const inp = document.getElementById('pin-input');
  const err = document.getElementById('pin-error');
  inp.focus();
  async function tryPin() {
    const pin = inp.value.trim();
    if (!pin) return;
    try {
      const res = await fetch('/api/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
      if (res.ok) {
        sessionStorage.setItem('ch-pin-auth', '1');
        document.getElementById('sidebar').style.display = '';
        state.loading = false;
        navigate(location.hash.slice(1) || 'dashboard');
      } else {
        err.textContent = 'Wrong PIN'; err.style.display = 'block';
        inp.value = ''; inp.focus();
      }
    } catch (e) { err.textContent = 'Connection error'; err.style.display = 'block'; }
  }
  document.getElementById('pin-submit').onclick = tryPin;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });
}

// ── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, contentFn) {
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = '';
  contentFn(body);
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
window.closeModal = closeModal;
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') e.className = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k === 'textContent') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.forEach(c => { if (typeof c === 'string') e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
  return e;
}

function formatDate(d) { if (!d) return '--'; return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatDateTime(d) { if (!d) return '--'; return new Date(d).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function platformBadge(p) { return `<span class="platform-badge ${p}">${PLATFORM_LABELS[p] || p}</span>`; }
function statusBadge(s) { return `<span class="status-badge ${s}">${s}</span>`; }
function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); showToast('Copied to clipboard'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('Copied to clipboard'); }
}

function formatPostForCopy(post) {
  let t = '';
  if (post.title) t += post.title + '\n\n';
  t += post.content || '';
  if (post.hashtags && post.hashtags.length) t += '\n\n' + post.hashtags.map(h => '#' + h).join(' ');
  return t;
}

function postImageHtml(post, height = 120) {
  if (post.mediaUrl) {
    return `<img src="${escHtml(post.mediaUrl)}" alt="" style="width:100%;height:${height}px;object-fit:cover" onerror="this.parentElement.innerHTML='<div class=\\'placeholder-icon\\'>${CAMERA_SVG}</div>'">`;
  }
  return `<div class="placeholder-icon">${CAMERA_SVG}</div>`;
}

function makeCustomSelect(options, selected, onChange) {
  const wrapper = el('div', { className: 'custom-select' });
  const trigger = el('div', { className: 'custom-select-trigger' });
  const label = el('span', { textContent: options.find(o => o.value === selected)?.label || selected });
  const arrow = el('span', { innerHTML: '<svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
  trigger.append(label, arrow);

  const optList = el('div', { className: 'custom-select-options' });
  options.forEach(o => {
    const opt = el('div', {
      className: 'custom-select-option' + (o.value === selected ? ' selected' : ''),
      textContent: o.label,
      onClick: () => {
        label.textContent = o.label;
        optList.querySelectorAll('.custom-select-option').forEach(x => x.classList.remove('selected'));
        opt.classList.add('selected');
        wrapper.classList.remove('open');
        onChange(o.value);
      }
    });
    optList.appendChild(opt);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-select.open').forEach(s => { if (s !== wrapper) s.classList.remove('open'); });
    wrapper.classList.toggle('open');
  });

  wrapper.append(trigger, optList);
  return wrapper;
}

document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
});

// ── WELCOME ──────────────────────────────────────────────────────────────────
function renderWelcome(container) {
  container.innerHTML = `
    <div style="max-width:600px;margin:40px auto;text-align:center">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style="margin-bottom:24px"><circle cx="32" cy="32" r="28" stroke="var(--accent)" stroke-width="3"/><path d="M20 32l8 8 16-16" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h1 style="font-size:2rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px">Welcome to Content Hub</h1>
      <p class="text-muted" style="font-size:1rem;margin-bottom:32px;line-height:1.5">Your social media command center. Get set up in under 2 minutes.</p>
      <div class="card" style="text-align:left;padding:28px">
        <div class="form-group"><label>What is your business about?</label><textarea id="welcome-business" rows="3" placeholder="e.g. B2B SaaS startup helping small businesses manage invoices."></textarea></div>
        <div class="form-group"><label>Which platforms?</label><div class="platform-select" id="welcome-platforms"></div></div>
        <div class="flex gap-8 mt-20">
          <button class="btn btn-primary" id="welcome-start">Get Started</button>
          <button class="btn btn-ghost" id="welcome-skip">Skip</button>
        </div>
      </div>
    </div>`;

  const platC = document.getElementById('welcome-platforms');
  const sel = new Set(['linkedin']);
  PLATFORMS.forEach(p => {
    const chip = el('div', { className: `platform-chip${sel.has(p) ? ' selected' : ''}`, textContent: PLATFORM_LABELS[p], onClick: () => { sel.has(p) ? sel.delete(p) : sel.add(p); chip.classList.toggle('selected'); } });
    platC.appendChild(chip);
  });

  document.getElementById('welcome-start').onclick = async () => {
    const platforms = [...sel];
    if (!platforms.length) { showToast('Select at least one platform', 'error'); return; }
    try {
      await api('/api/config', { method: 'PUT', body: { platforms, targetAudience: document.getElementById('welcome-business').value.trim(), onboardingComplete: true } });
      await loadAll();
      showToast('Content hub is ready');
      navigate('dashboard');
    } catch (e) { showToast('Setup failed: ' + e.message, 'error'); }
  };
  document.getElementById('welcome-skip').onclick = async () => {
    try { await api('/api/config', { method: 'PUT', body: { onboardingComplete: true } }); await loadAll(); navigate('dashboard'); }
    catch (e) { showToast(e.message, 'error'); }
  };
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard(container) {
  const a = state.analytics;
  const recent = [...state.posts].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 6);

  container.innerHTML = `
    <div class="page-header"><div><h1>Dashboard</h1><div class="subtitle">Content overview</div></div>
      <button class="btn btn-primary" onclick="location.hash='create'">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        New Post
      </button>
    </div>
    <div class="card-grid card-grid-4 mb-20">
      <div class="card stat-card"><div class="stat-value">${a.totalPosts || 0}</div><div class="stat-label">Total Posts</div></div>
      <div class="card stat-card"><div class="stat-value">${a.drafts || 0}</div><div class="stat-label">Drafts</div></div>
      <div class="card stat-card"><div class="stat-value">${a.scheduled || 0}</div><div class="stat-label">Scheduled</div></div>
      <div class="card stat-card"><div class="stat-value">${a.published || 0}</div><div class="stat-label">Published</div></div>
    </div>
    <div class="card-grid card-grid-2 mb-20">
      <div class="card">
        <h3 class="fw-600 mb-16">Posts This Week</h3>
        <div class="chart-bars" id="weekly-chart"></div>
      </div>
      <div class="card">
        <h3 class="fw-600 mb-16">By Platform</h3>
        <div id="platform-chart"></div>
      </div>
    </div>
    <div class="card">
      <h3 class="fw-600 mb-16">Recent Posts</h3>
      <div id="recent-posts"></div>
    </div>`;

  const rp = document.getElementById('recent-posts');
  if (!recent.length) {
    rp.innerHTML = '<div class="empty-state"><p>No posts yet</p></div>';
  } else {
    recent.forEach(p => {
      const row = el('div', { className: 'list-row', style: 'grid-template-columns:32px 1fr 100px 100px;cursor:pointer;gap:12px', onClick: () => editPost(p.id) });
      row.innerHTML = `
        <div style="width:32px;height:32px;border-radius:4px;overflow:hidden;background:var(--bg-hover);display:flex;align-items:center;justify-content:center">${p.mediaUrl ? `<img src="${escHtml(p.mediaUrl)}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='${CAMERA_SVG_SM}'">` : CAMERA_SVG_SM}</div>
        <div><div class="list-title truncate">${escHtml(p.title || p.content.slice(0, 50))}</div></div>
        <div>${platformBadge(p.platform)}</div>
        <div class="text-xs text-muted">${formatDate(p.updatedAt || p.createdAt)}</div>`;
      rp.appendChild(row);
    });
  }

  // Weekly chart
  const trend = a.weeklyTrend || [];
  const maxPosts = Math.max(1, ...trend.map(t => t.posts));
  const wc = document.getElementById('weekly-chart');
  if (trend.every(t => t.posts === 0)) {
    wc.innerHTML = '<div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center"><p class="text-muted">No posts this week</p></div>';
  } else {
    trend.forEach(t => {
      const pct = (t.posts / maxPosts) * 100;
      wc.innerHTML += `<div class="chart-bar-wrap"><div class="chart-bar-value">${t.posts}</div><div class="chart-bar" style="height:${pct}%"></div><div class="chart-bar-label">${t.day}</div></div>`;
    });
  }

  // Platform chart
  const platforms = a.platforms || {};
  const pc = document.getElementById('platform-chart');
  const platKeys = Object.keys(platforms);
  if (!platKeys.length) {
    pc.innerHTML = '<div class="empty-state" style="padding:40px 20px"><p class="text-muted">No published posts yet</p></div>';
  } else {
    pc.className = 'chart-bars';
    const maxP = Math.max(1, ...Object.values(platforms).map(p => p.posts));
    platKeys.forEach(plat => {
      const pct = (platforms[plat].posts / maxP) * 100;
      pc.innerHTML += `<div class="chart-bar-wrap"><div class="chart-bar-value">${platforms[plat].posts}</div><div class="chart-bar ${plat}" style="height:${pct}%"></div><div class="chart-bar-label">${PLATFORM_LABELS[plat] || plat}</div></div>`;
    });
  }
}

// ── PIPELINE ─────────────────────────────────────────────────────────────────
function renderPipeline(container) {
  const stages = state.pipelineStages;

  container.innerHTML = `
    <div class="page-header"><div><h1>Pipeline</h1><div class="subtitle">Drag posts between stages</div></div>
      <div class="flex gap-8">
        <button class="btn btn-primary" onclick="location.hash='create'">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          New Post
        </button>
      </div>
    </div>
    <div class="pipeline-container" id="pipeline-container"></div>`;

  const pc = document.getElementById('pipeline-container');

  stages.forEach(stage => {
    const stagePosts = state.posts.filter(p => (p.stage || 'Idea') === stage);
    const col = el('div', { className: 'pipeline-column', 'data-stage': stage });
    col.innerHTML = `
      <div class="pipeline-column-header">
        <h3>${escHtml(stage)}</h3>
        <span class="pipeline-column-count">${stagePosts.length}</span>
      </div>`;

    const body = el('div', { className: 'pipeline-column-body' });
    body.dataset.stage = stage;

    // Drag and drop
    body.addEventListener('dragover', e => { e.preventDefault(); body.classList.add('drag-over'); });
    body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
    body.addEventListener('drop', async e => {
      e.preventDefault();
      body.classList.remove('drag-over');
      const postId = e.dataTransfer.getData('text/plain');
      if (!postId) return;
      try {
        await api(`/api/posts/${postId}`, { method: 'PUT', body: { stage } });
        await loadAll();
        renderPipeline(container);
      } catch (err) { showToast('Failed to move post: ' + err.message, 'error'); }
    });

    stagePosts.forEach(p => {
      const card = el('div', { className: 'pipeline-card', draggable: 'true', 'data-id': p.id });
      card.innerHTML = `
        <div class="pipeline-card-body">
          <div class="pipeline-card-title">${escHtml(p.title || p.content.slice(0, 60))}</div>
          <div class="pipeline-card-meta">
            ${platformBadge(p.platform)}
            <span class="pipeline-card-date">${formatDate(p.scheduledAt || p.createdAt)}</span>
          </div>
        </div>`;

      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', p.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('click', () => editPost(p.id));

      body.appendChild(card);
    });

    col.appendChild(body);
    pc.appendChild(col);
  });

}

function openStageManager() {
  openModal('Manage Pipeline Stages', body => {
    let stages = [...state.pipelineStages];

    function render() {
      body.innerHTML = '';
      const list = el('div', { className: 'stage-list' });
      stages.forEach((s, i) => {
        const item = el('div', { className: 'stage-item' });
        const inp = el('input', { type: 'text', value: s });
        inp.addEventListener('change', () => { stages[i] = inp.value; });

        const upBtn = el('button', { className: 'btn btn-ghost btn-sm', innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', onClick: () => { if (i > 0) { [stages[i-1], stages[i]] = [stages[i], stages[i-1]]; render(); } } });
        const downBtn = el('button', { className: 'btn btn-ghost btn-sm', innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10V2M3 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', onClick: () => { if (i < stages.length - 1) { [stages[i], stages[i+1]] = [stages[i+1], stages[i]]; render(); } } });
        const delBtn = el('button', { className: 'btn btn-ghost btn-sm', style: 'color:var(--error)', innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>', onClick: () => { if (stages.length > 1) { stages.splice(i, 1); render(); } } });

        item.append(inp, upBtn, downBtn, delBtn);
        list.appendChild(item);
      });
      body.appendChild(list);

      const addBtn = el('button', { className: 'btn btn-secondary btn-sm mt-12', textContent: 'Add Stage', onClick: () => { stages.push('New Stage'); render(); } });
      body.appendChild(addBtn);

      const saveBtn = el('button', { className: 'btn btn-primary mt-20', textContent: 'Save Stages', onClick: async () => {
        const cleaned = stages.map(s => s.trim()).filter(Boolean);
        if (!cleaned.length) { showToast('Need at least one stage', 'error'); return; }
        try {
          await api('/api/pipeline/stages', { method: 'PUT', body: cleaned });
          state.pipelineStages = cleaned;
          closeModal();
          showToast('Stages updated');
          navigate('pipeline');
        } catch (e) { showToast(e.message, 'error'); }
      }});
      body.appendChild(saveBtn);
    }
    render();
  });
}

// ── CREATE / EDIT (Split Editor) ─────────────────────────────────────────────
function renderCreate(container) {
  container.innerHTML = '';
  // Remove existing split editor
  const existing = document.querySelector('.split-editor');
  if (existing) existing.remove();

  const p = state.editingPost || { title: '', content: '', platform: 'linkedin', status: 'draft', scheduledAt: '', tags: [], hashtags: [], mediaUrl: '', stage: 'Idea' };
  const isEdit = !!state.editingPost;
  let hashtags = [...(p.hashtags || [])];
  let selectedPlatform = isEdit ? p.platform : state.createPlatform;
  let selectedStage = p.stage || 'Idea';

  const editor = el('div', { className: 'split-editor' });
  editor.innerHTML = `
    <div class="split-editor-topbar">
      <div class="split-editor-topbar-left">
        <button class="btn btn-ghost" id="se-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2L4 8l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back
        </button>
        <h2 style="font-size:1.1rem;font-weight:600">${isEdit ? 'Edit Post' : 'Create Post'}</h2>
      </div>
      <div class="split-editor-topbar-right">
        <button class="btn btn-secondary" id="se-save-draft">Save Draft</button>
        <button class="btn btn-secondary" id="se-schedule">Schedule</button>
        <button class="btn btn-success" id="se-publish">Publish</button>
        ${isEdit ? '<button class="btn btn-danger btn-sm" id="se-delete">Delete</button>' : ''}
      </div>
    </div>
    <div class="split-editor-body">
      <div class="split-editor-left">
        <div class="editor-field">
          <label>Title</label>
          <input type="text" id="se-title" value="${escHtml(p.title)}" placeholder="Post title">
        </div>
        <div class="editor-field">
          <label>Content <span class="required">*</span></label>
          <textarea id="se-content" placeholder="Write your content...">${escHtml(p.content)}</textarea>
          <div class="char-count" id="se-charcount"></div>
        </div>
        <div class="editor-field">
          <label>Platform</label>
          <div id="se-platform-select"></div>
        </div>
        <div class="editor-field">
          <label>Pipeline Stage</label>
          <div id="se-stage-select"></div>
        </div>
        <div class="editor-field">
          <label>Tags</label>
          <input type="text" id="se-tags" value="${escHtml((p.tags || []).join(', '))}" placeholder="Comma-separated tags">
        </div>
        <div class="editor-field">
          <label>Hashtags</label>
          <div class="hashtag-container" id="se-hashtags">
            <input type="text" class="hashtag-input" id="se-hashtag-input" placeholder="Type and press Enter">
          </div>
        </div>
        <div class="editor-field">
          <label>Image URL</label>
          <input type="url" id="se-media" value="${escHtml(p.mediaUrl || '')}" placeholder="https://...">
        </div>
        <div class="editor-field">
          <label>Schedule Date</label>
          <input type="datetime-local" id="se-schedule-date" value="${p.scheduledAt ? p.scheduledAt.slice(0,16) : ''}">
        </div>
        <div id="se-error" class="editor-error"></div>
      </div>
      <div class="split-editor-right">
        <div class="preview-pane">
          <h3>Live Preview</h3>
          <div id="se-preview"></div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(editor);

  // Platform select
  const platOpts = PLATFORMS.map(p => ({ value: p, label: PLATFORM_LABELS[p] }));
  const platSelect = makeCustomSelect(platOpts, selectedPlatform, v => { selectedPlatform = v; state.createPlatform = v; updatePreview(); updateCharCount(); });
  document.getElementById('se-platform-select').appendChild(platSelect);

  // Stage select
  const stageOpts = state.pipelineStages.map(s => ({ value: s, label: s }));
  const stageSelect = makeCustomSelect(stageOpts, selectedStage, v => { selectedStage = v; });
  document.getElementById('se-stage-select').appendChild(stageSelect);

  // Hashtags
  const hashContainer = document.getElementById('se-hashtags');
  const hashInput = document.getElementById('se-hashtag-input');

  function renderHashtags() {
    hashContainer.querySelectorAll('.hashtag-tag').forEach(t => t.remove());
    hashtags.forEach((h, i) => {
      const tag = el('span', { className: 'hashtag-tag' }, [
        document.createTextNode('#' + h),
        el('span', { className: 'remove-tag', textContent: '\u00d7', onClick: () => { hashtags.splice(i, 1); renderHashtags(); updatePreview(); } })
      ]);
      hashContainer.insertBefore(tag, hashInput);
    });
  }
  renderHashtags();

  hashInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && hashInput.value.trim()) {
      e.preventDefault();
      const val = hashInput.value.trim().replace(/^#+/, '');
      if (val && !hashtags.includes(val)) { hashtags.push(val); renderHashtags(); updatePreview(); }
      hashInput.value = '';
    }
  });

  // Char count
  const contentEl = document.getElementById('se-content');
  function updateCharCount() {
    const len = contentEl.value.length;
    const limit = CHAR_LIMITS[selectedPlatform];
    const el = document.getElementById('se-charcount');
    el.textContent = `${len} / ${limit}`;
    el.className = 'char-count' + (len > limit ? ' over' : len > limit * 0.9 ? ' warn' : '');
  }

  // Preview
  function updatePreview() {
    const title = document.getElementById('se-title').value;
    const content = contentEl.value;
    const mediaUrl = document.getElementById('se-media').value;
    const hashStr = hashtags.map(h => '#' + h).join(' ');
    const prev = document.getElementById('se-preview');

    prev.innerHTML = `
      <div class="preview-card">
        <div class="preview-card-img">${mediaUrl ? `<img src="${escHtml(mediaUrl)}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'placeholder-icon\\'>${CAMERA_SVG}</div>'">` : `<div class="placeholder-icon">${CAMERA_SVG}</div>`}</div>
        <div class="preview-card-body">
          <div class="preview-author">
            <div class="avatar" style="background:linear-gradient(135deg,${PLATFORM_COLORS[selectedPlatform]},${PLATFORM_COLORS[selectedPlatform]}88)"></div>
            <div><div class="author-name">Your Brand</div><div class="author-meta">${PLATFORM_LABELS[selectedPlatform]} post</div></div>
          </div>
          ${title ? `<div class="preview-title">${escHtml(title)}</div>` : ''}
          <div class="preview-text">${escHtml(content || 'Start typing to see preview...')}</div>
          ${hashStr ? `<div class="preview-hashtags">${escHtml(hashStr)}</div>` : ''}
        </div>
      </div>`;
  }

  contentEl.addEventListener('input', () => { updateCharCount(); updatePreview(); document.getElementById('se-error').textContent = ''; });
  document.getElementById('se-title').addEventListener('input', updatePreview);
  document.getElementById('se-media').addEventListener('input', updatePreview);
  updateCharCount();
  updatePreview();

  // Back
  document.getElementById('se-back').onclick = () => {
    editor.remove();
    state.editingPost = null;
    navigate('pipeline');
  };

  // Save functions
  function gatherData(status) {
    const tags = document.getElementById('se-tags').value.split(',').map(s => s.trim()).filter(Boolean);
    return {
      title: document.getElementById('se-title').value,
      content: contentEl.value,
      platform: selectedPlatform,
      status,
      stage: selectedStage,
      scheduledAt: document.getElementById('se-schedule-date').value ? new Date(document.getElementById('se-schedule-date').value).toISOString() : null,
      hashtags,
      tags,
      mediaUrl: document.getElementById('se-media').value || null
    };
  }

  async function savePost(status) {
    const data = gatherData(status);
    if (!data.content.trim()) {
      document.getElementById('se-error').textContent = 'Content is required.';
      contentEl.focus();
      return;
    }
    if (status === 'scheduled' && !data.scheduledAt) {
      document.getElementById('se-error').textContent = 'Please select a schedule date.';
      return;
    }

    try {
      if (isEdit) {
        await api(`/api/posts/${p.id}`, { method: 'PUT', body: data });
      } else {
        const post = await api('/api/posts', { method: 'POST', body: data });
        if (status === 'scheduled') {
          await api('/api/schedules', { method: 'POST', body: { postId: post.id, platform: data.platform, scheduledAt: data.scheduledAt } });
        }
      }
      await loadAll();
      const label = status === 'published' ? 'Published' : status === 'scheduled' ? 'Scheduled' : 'Draft saved';
      showToast(label);
      editor.remove();
      state.editingPost = null;
      navigate('pipeline');
    } catch (e) {
      document.getElementById('se-error').textContent = e.message;
    }
  }

  document.getElementById('se-save-draft').onclick = () => savePost('draft');
  document.getElementById('se-schedule').onclick = () => savePost('scheduled');
  document.getElementById('se-publish').onclick = () => savePost('published');

  if (isEdit) {
    document.getElementById('se-delete').onclick = async () => {
      if (!confirm('Delete this post?')) return;
      try {
        await api(`/api/posts/${p.id}`, { method: 'DELETE' });
        await loadAll();
        showToast('Post deleted');
        editor.remove();
        state.editingPost = null;
        navigate('pipeline');
      } catch (e) { showToast(e.message, 'error'); }
    };
  }
}

async function editPost(id) {
  const post = state.posts.find(p => p.id === id);
  if (!post) return;
  state.editingPost = post;
  state.createPlatform = post.platform;
  location.hash = 'create';
}
window.editPost = editPost;

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  try {
    await api(`/api/posts/${id}`, { method: 'DELETE' });
    await loadAll();
    showToast('Post deleted');
    closeModal();
    navigate(location.hash.slice(1) || 'dashboard');
  } catch (e) { showToast('Failed to delete: ' + e.message, 'error'); }
}
window.deletePost = deletePost;

// ── CALENDAR ─────────────────────────────────────────────────────────────────
function renderCalendar(container) {
  const d = state.calendarDate;
  const year = d.getFullYear(), month = d.getMonth();
  const monthName = d.toLocaleString('en', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="page-header"><div><h1>Calendar</h1><div class="subtitle">Visualize your content schedule</div></div></div>
    <div class="calendar-header">
      <h2>${monthName}</h2>
      <div class="calendar-nav">
        <button id="cal-prev"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button id="cal-today" class="btn btn-sm btn-secondary">Today</button>
        <button id="cal-next"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>
    <div class="calendar-grid" id="cal-grid"></div>`;

  document.getElementById('cal-prev').onclick = () => { state.calendarDate = new Date(year, month - 1, 1); renderCalendar(container); };
  document.getElementById('cal-next').onclick = () => { state.calendarDate = new Date(year, month + 1, 1); renderCalendar(container); };
  document.getElementById('cal-today').onclick = () => { state.calendarDate = new Date(); renderCalendar(container); };

  const grid = document.getElementById('cal-grid');
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    grid.appendChild(el('div', { className: 'calendar-day-header', textContent: d }));
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const prevDays = new Date(year, month, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    const dayEl = el('div', { className: 'calendar-day other-month', innerHTML: `<div class="day-num">${prevDays - i}</div>` });
    grid.appendChild(dayEl);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const dayPosts = state.posts.filter(p => { const pDate = p.scheduledAt || p.createdAt; return pDate && pDate.startsWith(dateStr); });

    const dayEl = el('div', { className: `calendar-day${isToday ? ' today' : ''}`, onClick: () => { if (dayPosts.length) showDayPosts(dateStr, dayPosts); } });
    dayEl.innerHTML = `<div class="day-num">${day}</div>`;
    if (dayPosts.length) {
      const dots = el('div', { className: 'calendar-dots' });
      dayPosts.forEach(p => dots.appendChild(el('div', { className: `calendar-dot ${p.platform}` })));
      dayEl.appendChild(dots);
    }
    grid.appendChild(dayEl);
  }

  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    grid.appendChild(el('div', { className: 'calendar-day other-month', innerHTML: `<div class="day-num">${i}</div>` }));
  }
}

function showDayPosts(dateStr, posts) {
  openModal(`Posts for ${formatDate(dateStr)}`, body => {
    posts.forEach(p => {
      const card = el('div', { className: 'card mb-16' });
      card.innerHTML = `
        <div class="flex-between mb-16">${platformBadge(p.platform)} ${statusBadge(p.status)}</div>
        <div class="fw-600">${escHtml(p.title || 'Untitled')}</div>
        <div class="text-sm text-muted mt-12">${escHtml(p.content.slice(0, 200))}</div>
        <div class="flex gap-8 mt-12">
          <button class="btn btn-sm btn-secondary edit-btn">Edit</button>
          <button class="btn btn-sm btn-danger del-btn">Delete</button>
        </div>`;
      card.querySelector('.edit-btn').onclick = () => { closeModal(); editPost(p.id); };
      card.querySelector('.del-btn').onclick = () => deletePost(p.id);
      body.appendChild(card);
    });
  });
}

// ── REFERENCES ───────────────────────────────────────────────────────────────
function renderReferences(container) {
  container.innerHTML = `
    <div class="page-header"><div><h1>References</h1><div class="subtitle">Saved content library</div></div>
      <button class="btn btn-primary" id="btn-add-ref">Add Reference</button>
    </div>
    <div class="filter-bar mb-20">
      <input type="text" id="ref-search" placeholder="Search references...">
      <div id="ref-platform-filter-wrap"></div>
    </div>
    <div class="card-grid card-grid-2" id="ref-grid"></div>`;

  let filterPlatform = '';
  const filterWrap = document.getElementById('ref-platform-filter-wrap');
  const platFilterOpts = [{ value: '', label: 'All Platforms' }, ...PLATFORMS.map(p => ({ value: p, label: PLATFORM_LABELS[p] }))];
  const platFilter = makeCustomSelect(platFilterOpts, '', v => { filterPlatform = v; renderRefs(); });
  filterWrap.appendChild(platFilter);

  const grid = document.getElementById('ref-grid');
  function renderRefs() {
    grid.innerHTML = '';
    const search = document.getElementById('ref-search').value.toLowerCase();
    let refs = state.references;
    if (search) refs = refs.filter(r => (r.title + r.content + r.note).toLowerCase().includes(search));
    if (filterPlatform) refs = refs.filter(r => r.platform === filterPlatform);
    if (!refs.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No references</h3><p>Save content or add manually</p></div>';
      return;
    }
    refs.forEach(r => {
      const card = el('div', { className: 'card' });
      card.innerHTML = `
        <div class="flex-between mb-16">${platformBadge(r.platform || 'web')}<span class="text-xs text-muted">${formatDate(r.savedAt)}</span></div>
        <div class="fw-600">${escHtml(r.title || 'Untitled')}</div>
        <div class="text-sm text-muted mt-12" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${escHtml(r.content)}</div>
        <div class="flex gap-8 mt-12">
          <button class="btn btn-sm btn-secondary copy-btn">Copy</button>
          <button class="btn btn-sm btn-danger del-btn">Delete</button>
        </div>`;
      card.querySelector('.copy-btn').onclick = () => copyToClipboard(r.content);
      card.querySelector('.del-btn').onclick = async () => {
        if (!confirm('Delete this reference?')) return;
        try { await api(`/api/references/${r.id}`, { method: 'DELETE' }); await loadAll(); showToast('Deleted'); renderRefs(); }
        catch (e) { showToast(e.message, 'error'); }
      };
      grid.appendChild(card);
    });
  }
  renderRefs();
  document.getElementById('ref-search').oninput = debounce(renderRefs, 250);

  document.getElementById('btn-add-ref').onclick = () => {
    openModal('Add Reference', body => {
      body.innerHTML = `
        <div class="form-group"><label>Title</label><input type="text" id="ref-title" placeholder="Title"></div>
        <div class="form-group"><label>URL</label><input type="url" id="ref-url" placeholder="https://..."></div>
        <div class="form-group"><label>Platform</label><div id="ref-platform-wrap"></div></div>
        <div class="form-group"><label>Content</label><textarea id="ref-content" rows="4"></textarea></div>
        <div class="form-group"><label>Note</label><input type="text" id="ref-note" placeholder="Your note"></div>
        <button class="btn btn-primary mt-12" id="ref-save">Save</button>`;
      let refPlat = '';
      const rpw = document.getElementById('ref-platform-wrap');
      rpw.appendChild(makeCustomSelect([{ value: '', label: 'None' }, ...PLATFORMS.map(p => ({ value: p, label: PLATFORM_LABELS[p] }))], '', v => { refPlat = v; }));
      document.getElementById('ref-save').onclick = async () => {
        try {
          await api('/api/references', { method: 'POST', body: { title: document.getElementById('ref-title').value, url: document.getElementById('ref-url').value, platform: refPlat, content: document.getElementById('ref-content').value, note: document.getElementById('ref-note').value, tags: [] } });
          await loadAll(); closeModal(); showToast('Reference saved'); renderReferences(container);
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  };
}

// ── ANALYTICS ────────────────────────────────────────────────────────────────
function renderAnalytics(container) {
  const a = state.analytics;
  const trend = a.weeklyTrend || [];
  const platforms = a.platforms || {};
  const maxPosts = Math.max(1, ...trend.map(t => t.posts));

  container.innerHTML = `
    <div class="page-header"><div><h1>Analytics</h1><div class="subtitle">Content activity overview</div></div></div>
    <div class="card-grid card-grid-4 mb-20">
      <div class="card stat-card"><div class="stat-value">${a.totalPosts || 0}</div><div class="stat-label">Total Posts</div></div>
      <div class="card stat-card"><div class="stat-value">${a.drafts || 0}</div><div class="stat-label">Drafts</div></div>
      <div class="card stat-card"><div class="stat-value">${a.scheduled || 0}</div><div class="stat-label">Scheduled</div></div>
      <div class="card stat-card"><div class="stat-value">${a.published || 0}</div><div class="stat-label">Published</div></div>
    </div>
    <div class="card-grid card-grid-2">
      <div class="card">
        <h3 class="fw-600 mb-16">Posts This Week</h3>
        <div class="chart-bars" id="weekly-chart"></div>
      </div>
      <div class="card">
        <h3 class="fw-600 mb-16">By Platform</h3>
        <div id="platform-chart"></div>
      </div>
    </div>`;

  const wc = document.getElementById('weekly-chart');
  if (trend.every(t => t.posts === 0)) {
    wc.innerHTML = '<div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center"><p class="text-muted">No posts this week</p></div>';
  } else {
    trend.forEach(t => {
      const pct = (t.posts / maxPosts) * 100;
      wc.innerHTML += `<div class="chart-bar-wrap"><div class="chart-bar-value">${t.posts}</div><div class="chart-bar" style="height:${pct}%"></div><div class="chart-bar-label">${t.day}</div></div>`;
    });
  }

  const pc = document.getElementById('platform-chart');
  const platKeys = Object.keys(platforms);
  if (!platKeys.length) {
    pc.innerHTML = '<div class="empty-state" style="padding:40px 20px"><p class="text-muted">No published posts yet</p></div>';
  } else {
    pc.className = 'chart-bars';
    const maxP = Math.max(1, ...Object.values(platforms).map(p => p.posts));
    platKeys.forEach(plat => {
      const pct = (platforms[plat].posts / maxP) * 100;
      pc.innerHTML += `<div class="chart-bar-wrap"><div class="chart-bar-value">${platforms[plat].posts}</div><div class="chart-bar ${plat}" style="height:${pct}%"></div><div class="chart-bar-label">${PLATFORM_LABELS[plat] || plat}</div></div>`;
    });
  }
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────
function renderSettings(container) {
  const c = state.config;
  container.innerHTML = `
    <div class="page-header"><div><h1>Settings</h1><div class="subtitle">Configure your content hub</div></div></div>
    <div class="card" style="max-width:640px">
      <div class="settings-section">
        <h3>Platforms</h3>
        <div class="platform-select" id="settings-platforms"></div>
      </div>
      <div class="settings-section">
        <h3>Brand Voice</h3>
        <div class="form-group"><label>Describe your brand voice</label><textarea id="set-voice">${escHtml(c.brandVoice || '')}</textarea></div>
      </div>
      <div class="settings-section">
        <h3>Audience</h3>
        <div class="form-group"><label>Target Audience</label><input type="text" id="set-audience" value="${escHtml(c.targetAudience || '')}" placeholder="e.g. B2B SaaS founders"></div>
      </div>
      <div class="settings-section">
        <h3>Competitors</h3>
        <div class="form-group"><label>Competitor URLs (one per line)</label><textarea id="set-competitors">${(c.competitors || []).join('\n')}</textarea></div>
      </div>
      <div class="settings-section">
        <h3>Pipeline Stages</h3>
        <div class="subtitle mb-12">Customize your content pipeline stages</div>
        <div id="settings-stages"></div>
      </div>
      <div class="settings-section">
        <h3>Posting</h3>
        <div class="form-group"><label>Posting Frequency</label><div id="set-freq-wrap"></div></div>
        <div class="form-group"><label>Timezone</label><input type="text" id="set-timezone" value="${escHtml(c.timezone || 'UTC')}" placeholder="UTC"></div>
      </div>
      <div class="settings-section">
        <h3>PIN Protection</h3>
        <div class="subtitle mb-12">${c.pinEnabled ? 'PIN is enabled' : 'No PIN set'}</div>
        <div class="flex gap-8">
          <input type="password" id="set-pin" placeholder="${c.pinEnabled ? 'New PIN (leave blank to keep)' : 'Set a PIN'}" maxlength="20" style="flex:1">
          ${c.pinEnabled ? '<button class="btn btn-secondary" id="btn-remove-pin">Remove PIN</button>' : ''}
        </div>
      </div>
      <button class="btn btn-primary" id="btn-save-settings">Save Settings</button>
    </div>`;

  const platContainer = document.getElementById('settings-platforms');
  const active = new Set(c.platforms || ['linkedin']);
  PLATFORMS.forEach(plat => {
    const chip = el('div', { className: `platform-chip${active.has(plat) ? ' selected' : ''}`, textContent: PLATFORM_LABELS[plat], onClick: () => chip.classList.toggle('selected') });
    platContainer.appendChild(chip);
  });

  let freq = c.postingFrequency || 'daily';
  const freqWrap = document.getElementById('set-freq-wrap');
  freqWrap.appendChild(makeCustomSelect([
    { value: 'daily', label: 'Daily' },
    { value: '3x-week', label: '3x per Week' },
    { value: 'weekly', label: 'Weekly' }
  ], freq, v => { freq = v; }));

  // Pipeline stages editor
  let editStages = [...state.pipelineStages];
  const stagesContainer = document.getElementById('settings-stages');
  function renderStageEditor() {
    stagesContainer.innerHTML = '';
    editStages.forEach((s, i) => {
      const row = el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px' });
      const inp = el('input', { type: 'text', value: s, style: 'flex:1' });
      inp.addEventListener('change', () => { editStages[i] = inp.value; });
      const upBtn = el('button', { className: 'btn btn-ghost btn-sm', innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', onClick: () => { if (i > 0) { [editStages[i-1], editStages[i]] = [editStages[i], editStages[i-1]]; renderStageEditor(); } } });
      const downBtn = el('button', { className: 'btn btn-ghost btn-sm', innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10V2M3 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', onClick: () => { if (i < editStages.length - 1) { [editStages[i], editStages[i+1]] = [editStages[i+1], editStages[i]]; renderStageEditor(); } } });
      const delBtn = el('button', { className: 'btn btn-ghost btn-sm', style: 'color:var(--error)', innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>', onClick: () => { if (editStages.length > 1) { editStages.splice(i, 1); renderStageEditor(); } } });
      row.append(inp, upBtn, downBtn, delBtn);
      stagesContainer.appendChild(row);
    });
    const addBtn = el('button', { className: 'btn btn-secondary btn-sm', style: 'margin-top:8px', textContent: 'Add Stage', onClick: () => { editStages.push('New Stage'); renderStageEditor(); } });
    stagesContainer.appendChild(addBtn);
  }
  renderStageEditor();

  document.getElementById('btn-save-settings').onclick = async () => {
    const platforms = [...platContainer.querySelectorAll('.platform-chip.selected')].map(c => PLATFORMS[Array.from(platContainer.children).indexOf(c)]);
    if (!platforms.length) { showToast('Select at least one platform', 'error'); return; }
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      // Save PIN if entered
      const pinVal = document.getElementById('set-pin').value.trim();
      if (pinVal) {
        await api('/api/config', { method: 'PUT', body: { pin: pinVal } });
      }

      // Save stages
      const cleanedStages = editStages.map(s => s.trim()).filter(Boolean);
      if (cleanedStages.length) {
        await api('/api/pipeline/stages', { method: 'PUT', body: cleanedStages });
        state.pipelineStages = cleanedStages;
      }
      await api('/api/config', { method: 'PUT', body: {
        platforms,
        brandVoice: document.getElementById('set-voice').value,
        targetAudience: document.getElementById('set-audience').value,
        competitors: document.getElementById('set-competitors').value.split('\n').map(s => s.trim()).filter(Boolean),
        postingFrequency: freq,
        timezone: document.getElementById('set-timezone').value
      }});
      await loadAll();
      showToast('Settings saved');
    } catch (e) { showToast(e.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Save Settings';
  };

  const removeBtn = document.getElementById('btn-remove-pin');
  if (removeBtn) {
    removeBtn.onclick = async () => {
      if (!confirm('Remove PIN protection?')) return;
      await api('/api/config', { method: 'PUT', body: { pin: null } });
      sessionStorage.removeItem('ch-pin-auth');
      await loadAll();
      showToast('PIN removed');
      navigate('settings');
    };
  }
}
