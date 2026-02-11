/* ── Social Media Manager — SPA ───────────────────────────────────────────── */

const API = '';
const PLATFORMS = ['linkedin','instagram','facebook','tiktok','twitter','blog'];
const PLATFORM_LABELS = { linkedin:'LinkedIn', instagram:'Instagram', facebook:'Facebook', tiktok:'TikTok', twitter:'Twitter/X', blog:'Blog' };
const CHAR_LIMITS = { linkedin:3000, instagram:2200, facebook:63206, tiktok:2200, twitter:280, blog:50000 };
const PLATFORM_COLORS = { linkedin:'#0a66c2', instagram:'#e4405f', facebook:'#1877f2', tiktok:'#00f2ea', twitter:'#1da1f2', blog:'#a78bfa' };

// ── State ────────────────────────────────────────────────────────────────────
let state = {
  posts: [], references: [], schedules: [], config: {}, scanResults: [], analytics: {},
  calendarDate: new Date(),
  editingPost: null,
  createPlatforms: ['linkedin'],
  createHashtags: [],
  loading: true,
  apifyConfigured: false,
};

// ── Toast System ─────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

async function loadAll() {
  const [posts, refs, schedules, config, scanResults, analytics, scanStatus] = await Promise.all([
    api('/api/posts'), api('/api/references'), api('/api/schedules'),
    api('/api/config'), api('/api/scan/results'), api('/api/analytics'),
    api('/api/scan/status')
  ]);
  Object.assign(state, {
    posts, references: refs, schedules, config, scanResults, analytics,
    apifyConfigured: scanStatus.configured
  });
}

// ── Router ───────────────────────────────────────────────────────────────────
const views = { dashboard: renderDashboard, calendar: renderCalendar, create: renderCreate, inspiration: renderInspiration, references: renderReferences, scheduler: renderScheduler, analytics: renderAnalytics, settings: renderSettings };

function navigate(view) {
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
  // Check for first-run welcome
  if (view === 'dashboard' && !state.config.onboardingComplete && state.posts.length === 0) {
    renderWelcome(container);
    return;
  }
  views[view](container);
}

window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'dashboard'));
window.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('view-container');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
  try {
    await loadAll();
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><h3>Failed to connect</h3><p>Could not reach the server. Please check that it's running.</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div>`;
    return;
  }
  state.loading = false;
  navigate(location.hash.slice(1) || 'dashboard');
});

// ── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, contentFn) {
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = '';
  contentFn(body);
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}
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
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.forEach(c => { if (typeof c === 'string') e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
  return e;
}

function formatDate(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '--';
  return new Date(d).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function platformBadge(p) {
  return `<span class="platform-badge ${p}">${PLATFORM_LABELS[p] || p}</span>`;
}
function statusBadge(s) {
  return `<span class="status-badge ${s}">${s}</span>`;
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard');
  }
}

function formatPostForCopy(post) {
  let text = '';
  if (post.title) text += post.title + '\n\n';
  text += post.content;
  if (post.hashtags && post.hashtags.length) {
    text += '\n\n' + post.hashtags.map(h => '#' + h).join(' ');
  }
  return text;
}

// ── WELCOME / ONBOARDING ─────────────────────────────────────────────────────
function renderWelcome(container) {
  container.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="var(--accent)" stroke-width="3"/><path d="M20 32l8 8 16-16" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h1>Welcome to Content Hub</h1>
      <p class="welcome-subtitle">Your AI-powered social media command center. Let's get you set up in under 2 minutes.</p>

      <div class="welcome-form card">
        <div class="form-group">
          <label>What's your business about? Who's your audience?</label>
          <textarea id="welcome-business" rows="3" placeholder="e.g. We're a B2B SaaS startup helping small businesses manage invoices. Our audience is freelancers and small business owners."></textarea>
        </div>
        <div class="form-group">
          <label>Which platforms do you want to post on?</label>
          <div class="platform-select" id="welcome-platforms"></div>
        </div>
        <div class="flex gap-8 mt-20">
          <button class="btn btn-primary" id="welcome-start">Get Started</button>
          <button class="btn btn-ghost" id="welcome-skip">Skip — I'll explore on my own</button>
        </div>
      </div>
    </div>
  `;

  // Platform chips
  const platContainer = document.getElementById('welcome-platforms');
  const selected = new Set(['linkedin']);
  PLATFORMS.forEach(plat => {
    const chip = el('div', {
      className: `platform-chip${selected.has(plat) ? ' selected' : ''}`,
      textContent: PLATFORM_LABELS[plat],
      onClick: () => {
        if (selected.has(plat)) selected.delete(plat); else selected.add(plat);
        chip.classList.toggle('selected');
      }
    });
    platContainer.appendChild(chip);
  });

  document.getElementById('welcome-start').onclick = async () => {
    const business = document.getElementById('welcome-business').value.trim();
    const platforms = [...selected];
    if (!platforms.length) { showToast('Please select at least one platform', 'error'); return; }

    const btn = document.getElementById('welcome-start');
    btn.disabled = true;
    btn.textContent = 'Setting up...';

    try {
      await api('/api/config', { method: 'PUT', body: {
        platforms,
        targetAudience: business,
        onboardingComplete: true
      }});
      await loadAll();
      showToast('Welcome! Your content hub is ready.');
      navigate('dashboard');
    } catch (e) {
      showToast('Setup failed: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Get Started';
    }
  };

  document.getElementById('welcome-skip').onclick = async () => {
    try {
      await api('/api/config', { method: 'PUT', body: { onboardingComplete: true } });
      await loadAll();
      navigate('dashboard');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard(container) {
  const a = state.analytics;
  const upcoming = [...state.posts].filter(p => p.status === 'scheduled').sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).slice(0, 5);

  container.innerHTML = `
    <div class="page-header"><div><h1>Dashboard</h1><div class="subtitle">Content overview and quick actions</div></div>
      <button class="btn btn-primary" onclick="location.hash='create'">New Post</button>
    </div>
    <div class="card-grid card-grid-4 mb-20">
      <div class="card stat-card"><div class="stat-value">${a.totalPosts || 0}</div><div class="stat-label">Total Posts</div></div>
      <div class="card stat-card"><div class="stat-value">${a.scheduled || 0}</div><div class="stat-label">Scheduled</div></div>
      <div class="card stat-card"><div class="stat-value">${a.published || 0}</div><div class="stat-label">Published</div></div>
      <div class="card stat-card"><div class="stat-value">${a.thisWeek || 0}</div><div class="stat-label">This Week</div></div>
    </div>
    <div class="card-grid card-grid-2">
      <div class="card">
        <h3 class="fw-600 mb-16">Upcoming Schedule</h3>
        <div id="upcoming-list"></div>
      </div>
      <div class="card">
        <h3 class="fw-600 mb-16">Quick Actions</h3>
        <div class="flex gap-8" style="flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="location.hash='create'">Create Post</button>
          <button class="btn btn-secondary" onclick="location.hash='inspiration'">Browse Inspiration</button>
          <button class="btn btn-secondary" onclick="location.hash='calendar'">View Calendar</button>
          <button class="btn btn-secondary" onclick="location.hash='analytics'">Analytics</button>
        </div>
      </div>
    </div>
  `;

  const list = document.getElementById('upcoming-list');
  if (upcoming.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No scheduled posts yet</p></div>';
  } else {
    upcoming.forEach(p => {
      list.appendChild(el('div', { className: 'list-row', style: 'grid-template-columns:1fr 100px 140px;cursor:pointer', onClick: () => editPost(p.id) }, [
        el('div', {}, [el('div', { className: 'list-title', textContent: p.title || p.content.slice(0, 50) }), el('div', { className: 'list-content-preview', textContent: p.content.slice(0, 80) })]),
        el('div', { innerHTML: platformBadge(p.platform) }),
        el('div', { className: 'text-sm text-muted', textContent: formatDateTime(p.scheduledAt) })
      ]));
    });
  }
}

// ── CALENDAR ─────────────────────────────────────────────────────────────────
function renderCalendar(container) {
  const d = state.calendarDate;
  const year = d.getFullYear(), month = d.getMonth();
  const monthName = d.toLocaleString('en', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="page-header"><div><h1>Content Calendar</h1><div class="subtitle">Plan and visualize your content schedule</div></div></div>
    <div class="calendar-header">
      <h2>${monthName}</h2>
      <div class="calendar-nav">
        <button id="cal-prev"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button id="cal-today" class="btn btn-sm btn-secondary">Today</button>
        <button id="cal-next"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>
    <div class="calendar-grid" id="cal-grid"></div>
  `;

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
    const dayEl = el('div', { className: 'calendar-day other-month' });
    dayEl.innerHTML = `<div class="day-num">${prevDays - i}</div>`;
    grid.appendChild(dayEl);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const dayPosts = state.posts.filter(p => {
      const pDate = p.scheduledAt || p.createdAt;
      return pDate && pDate.startsWith(dateStr);
    });

    const dayEl = el('div', { className: `calendar-day${isToday ? ' today' : ''}`, onClick: () => showDayPosts(dateStr, dayPosts) });
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
    const dayEl = el('div', { className: 'calendar-day other-month' });
    dayEl.innerHTML = `<div class="day-num">${i}</div>`;
    grid.appendChild(dayEl);
  }
}

function showDayPosts(dateStr, posts) {
  openModal(`Posts for ${formatDate(dateStr)}`, body => {
    if (!posts.length) {
      body.innerHTML = '<div class="empty-state"><p>No posts for this day</p><button class="btn btn-primary" onclick="closeModal();location.hash=\'create\'">Create One</button></div>';
      return;
    }
    posts.forEach(p => {
      const card = el('div', { className: 'card mb-16' });
      card.innerHTML = `
        <div class="flex-between mb-16">${platformBadge(p.platform)} ${statusBadge(p.status)}</div>
        <div class="fw-600">${escHtml(p.title || 'Untitled')}</div>
        <div class="text-sm text-muted mt-12">${escHtml(p.content.slice(0, 200))}</div>
        <div class="flex gap-8 mt-12">
          <button class="btn btn-sm btn-secondary edit-btn">Edit</button>
          <button class="btn btn-sm btn-ghost copy-btn">📋 Copy</button>
          <button class="btn btn-sm btn-danger del-btn">Delete</button>
        </div>`;
      card.querySelector('.edit-btn').onclick = () => { closeModal(); editPost(p.id); };
      card.querySelector('.copy-btn').onclick = () => copyToClipboard(formatPostForCopy(p));
      card.querySelector('.del-btn').onclick = () => deletePost(p.id);
      body.appendChild(card);
    });
  });
}

// ── CREATE / EDIT POST ───────────────────────────────────────────────────────
function renderCreate(container) {
  const p = state.editingPost || { title: '', content: '', platform: 'linkedin', status: 'draft', scheduledAt: '', tags: [], hashtags: [], mediaUrl: '' };
  const isEdit = !!state.editingPost;

  container.innerHTML = `
    <div class="page-header"><div><h1>${isEdit ? 'Edit Post' : 'Create Post'}</h1><div class="subtitle">${isEdit ? 'Update your content' : 'Craft content for your audience'}</div></div></div>
    <div class="editor-layout">
      <div class="editor-main">
        <div class="card" style="padding:24px">
          <div class="editor-field">
            <label>Title</label>
            <input type="text" id="post-title" value="${escHtml(p.title)}" placeholder="Post title (optional)">
          </div>
          <div class="editor-field">
            <label>Platform</label>
            <div class="platform-select" id="platform-select"></div>
          </div>
          <div class="editor-field">
            <label>Content <span class="required">*</span></label>
            <textarea id="post-content" placeholder="Write your content here...">${escHtml(p.content)}</textarea>
            <div class="char-count" id="char-count"></div>
          </div>
          <div class="editor-field">
            <label>Hashtags</label>
            <div class="hashtag-container" id="hashtag-container">
              <input type="text" class="hashtag-input" id="hashtag-input" placeholder="Type and press Enter">
            </div>
          </div>
          <div class="editor-field">
            <label>Schedule</label>
            <input type="datetime-local" id="post-schedule" value="${p.scheduledAt ? p.scheduledAt.slice(0,16) : ''}">
          </div>
          <div class="editor-field">
            <label>Media URL</label>
            <input type="url" id="post-media" value="${escHtml(p.mediaUrl || '')}" placeholder="https://...">
          </div>
          <div class="flex gap-8 mt-20">
            <button class="btn btn-primary" id="btn-save-draft">${isEdit ? 'Update' : 'Save Draft'}</button>
            <button class="btn btn-secondary" id="btn-schedule">Schedule</button>
            ${isEdit ? '<button class="btn btn-ghost" onclick="state.editingPost=null;location.hash=\'create\'">Cancel</button>' : ''}
          </div>
          <div id="editor-error" class="editor-error"></div>
        </div>
      </div>
      <div class="preview-pane" id="preview-pane">
        <h3>Preview</h3>
        <div id="preview-content"></div>
        <button class="btn btn-secondary btn-sm mt-12" id="btn-copy-preview" style="width:100%">📋 Copy to Clipboard</button>
      </div>
    </div>
  `;

  // Platform chips
  const selContainer = document.getElementById('platform-select');
  const selectedPlatform = isEdit ? p.platform : state.createPlatforms[0];
  PLATFORMS.forEach(plat => {
    const chip = el('div', {
      className: `platform-chip${plat === selectedPlatform ? ' selected' : ''}`,
      textContent: PLATFORM_LABELS[plat],
      onClick: () => {
        selContainer.querySelectorAll('.platform-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        state.createPlatforms = [plat];
        updatePreview();
        updateCharCount();
      }
    });
    selContainer.appendChild(chip);
  });

  // Hashtags
  let hashtags = [...(p.hashtags || [])];
  const hashContainer = document.getElementById('hashtag-container');
  const hashInput = document.getElementById('hashtag-input');

  function renderHashtags() {
    hashContainer.querySelectorAll('.hashtag-tag').forEach(t => t.remove());
    hashtags.forEach((h, i) => {
      const tag = el('span', { className: 'hashtag-tag' }, [
        document.createTextNode('#' + h),
        el('span', { className: 'remove-tag', textContent: '\u00d7', onClick: () => { hashtags.splice(i, 1); renderHashtags(); updatePreview(); }})
      ]);
      hashContainer.insertBefore(tag, hashInput);
    });
  }
  renderHashtags();

  hashInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && hashInput.value.trim()) {
      e.preventDefault();
      const val = hashInput.value.trim().replace(/^#/, '');
      if (val && !hashtags.includes(val)) { hashtags.push(val); renderHashtags(); updatePreview(); }
      hashInput.value = '';
    }
  });

  // Char count
  const contentEl = document.getElementById('post-content');
  function updateCharCount() {
    const plat = state.createPlatforms[0];
    const len = contentEl.value.length;
    const limit = CHAR_LIMITS[plat];
    const countEl = document.getElementById('char-count');
    countEl.textContent = `${len} / ${limit}`;
    countEl.className = 'char-count' + (len > limit ? ' over' : len > limit * 0.9 ? ' warn' : '');
  }
  contentEl.addEventListener('input', () => { updateCharCount(); updatePreview(); clearEditorError(); });
  document.getElementById('post-title').addEventListener('input', updatePreview);
  updateCharCount();

  function clearEditorError() {
    document.getElementById('editor-error').textContent = '';
  }

  // Preview
  function updatePreview() {
    const plat = state.createPlatforms[0];
    const title = document.getElementById('post-title').value;
    const content = contentEl.value;
    const mediaUrl = document.getElementById('post-media').value;
    const prev = document.getElementById('preview-content');
    const hashStr = hashtags.map(h => '#' + h).join(' ');
    prev.innerHTML = `
      <div class="preview-card">
        <div class="preview-author">
          <div class="avatar" style="background:linear-gradient(135deg,${PLATFORM_COLORS[plat]},${PLATFORM_COLORS[plat]}88)"></div>
          <div><div class="author-name">Your Brand</div><div class="author-meta">${PLATFORM_LABELS[plat]} post</div></div>
        </div>
        ${title ? `<div class="fw-600 mb-16" style="font-size:1rem">${escHtml(title)}</div>` : ''}
        <div class="preview-text">${escHtml(content || 'Start typing to see preview...')}</div>
        ${mediaUrl ? `<div class="preview-media"><img src="${escHtml(mediaUrl)}" alt="Media preview" onerror="this.parentElement.innerHTML='<div class=\\'text-sm text-muted\\'>Media: ${escHtml(mediaUrl)}</div>'"></div>` : ''}
        ${hashStr ? `<div class="preview-hashtags">${escHtml(hashStr)}</div>` : ''}
      </div>
    `;
  }
  updatePreview();
  document.getElementById('post-media').addEventListener('input', updatePreview);

  // Copy to clipboard
  document.getElementById('btn-copy-preview').onclick = () => {
    const data = gatherPostData('draft', hashtags);
    copyToClipboard(formatPostForCopy(data));
  };

  // Save
  async function savePost(status) {
    const data = gatherPostData(status, hashtags);
    if (!data.content.trim()) {
      document.getElementById('editor-error').textContent = 'Content is required.';
      contentEl.focus();
      return;
    }
    if (status === 'scheduled' && !data.scheduledAt) {
      document.getElementById('editor-error').textContent = 'Please select a schedule date.';
      return;
    }

    const btn = status === 'scheduled' ? document.getElementById('btn-schedule') : document.getElementById('btn-save-draft');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      if (isEdit) {
        await api(`/api/posts/${p.id}`, { method: 'PUT', body: data });
        state.editingPost = null;
      } else {
        const post = await api('/api/posts', { method: 'POST', body: data });
        if (status === 'scheduled') {
          await api('/api/schedules', { method: 'POST', body: { postId: post.id, platform: data.platform, scheduledAt: data.scheduledAt } });
        }
      }
      await loadAll();
      showToast(isEdit ? 'Post updated ✓' : status === 'scheduled' ? 'Post scheduled ✓' : 'Draft saved ✓');
      location.hash = status === 'scheduled' ? 'scheduler' : 'dashboard';
    } catch (e) {
      document.getElementById('editor-error').textContent = e.message;
      btn.disabled = false;
      btn.textContent = origText;
    }
  }

  document.getElementById('btn-save-draft').onclick = () => savePost('draft');
  document.getElementById('btn-schedule').onclick = () => savePost('scheduled');
}

function gatherPostData(status, hashtags) {
  return {
    title: document.getElementById('post-title').value,
    content: document.getElementById('post-content').value,
    platform: state.createPlatforms[0],
    status,
    scheduledAt: document.getElementById('post-schedule').value ? new Date(document.getElementById('post-schedule').value).toISOString() : null,
    hashtags,
    mediaUrl: document.getElementById('post-media').value || null
  };
}

async function editPost(id) {
  const post = state.posts.find(p => p.id === id);
  if (!post) return;
  state.editingPost = post;
  state.createPlatforms = [post.platform];
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
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}
window.deletePost = deletePost;

// ── INSPIRATION ──────────────────────────────────────────────────────────────
function renderInspiration(container) {
  const allItems = state.scanResults.flatMap(r => (r.items || []).map(item => ({ ...item, platform: r.platform, scanId: r.id })));

  container.innerHTML = `
    <div class="page-header">
      <div><h1>Inspiration</h1><div class="subtitle">Discover trending content from competitors</div></div>
      <div class="flex gap-8">
        <button class="btn btn-secondary" id="btn-scan">Scan Content</button>
      </div>
    </div>
    ${!state.apifyConfigured ? '<div class="card notice-card mb-20"><strong>⚠️ Apify not configured.</strong> Set the <code>APIFY_TOKEN</code> environment variable to enable content scanning. You can still add references manually.</div>' : ''}
    <div class="filter-bar mb-20">
      <select id="insp-platform-filter"><option value="">All Platforms</option>${PLATFORMS.map(p => `<option value="${p}">${PLATFORM_LABELS[p]}</option>`).join('')}</select>
    </div>
    <div class="card-grid card-grid-2" id="insp-grid"></div>
  `;

  const grid = document.getElementById('insp-grid');
  const filterEl = document.getElementById('insp-platform-filter');

  function renderItems(filter) {
    grid.innerHTML = '';
    let items = filter ? allItems.filter(i => i.platform === filter) : allItems;
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>No inspiration content yet</h3><p>${state.apifyConfigured ? 'Run a scan to discover trending content' : 'Configure Apify or add references manually to build your inspiration library'}</p></div>`;
      return;
    }
    items.slice(0, 20).forEach(item => {
      const text = item.text || item.postText || item.content || item.caption || JSON.stringify(item).slice(0, 300);
      const card = el('div', { className: `card inspiration-card ${item.platform || ''}` });
      card.innerHTML = `
        ${platformBadge(item.platform || 'web')}
        <div class="insp-content">${escHtml(text)}</div>
        <div class="insp-meta">${item.likesCount ? 'Likes: ' + item.likesCount : ''} ${item.commentsCount ? '| Comments: ' + item.commentsCount : ''}</div>
        <div class="insp-actions">
          <button class="btn btn-sm btn-secondary save-ref-btn">Save to References</button>
          <button class="btn btn-sm btn-ghost remix-btn">✏️ Remix</button>
          <button class="btn btn-sm btn-ghost copy-btn">📋 Copy</button>
        </div>`;
      card.querySelector('.save-ref-btn').onclick = async () => {
        try {
          await api('/api/references', { method: 'POST', body: { title: text.slice(0, 60), content: text, platform: item.platform, url: item.url || '', tags: [], note: '' }});
          await loadAll();
          card.querySelector('.save-ref-btn').textContent = 'Saved ✓';
          card.querySelector('.save-ref-btn').disabled = true;
        } catch (e) { showToast('Failed to save: ' + e.message, 'error'); }
      };
      card.querySelector('.remix-btn').onclick = () => {
        state.editingPost = { title: '', content: text, platform: item.platform || 'linkedin', status: 'draft', scheduledAt: '', tags: [], hashtags: [], mediaUrl: '' };
        state.createPlatforms = [item.platform || 'linkedin'];
        location.hash = 'create';
      };
      card.querySelector('.copy-btn').onclick = () => copyToClipboard(text);
      grid.appendChild(card);
    });
  }
  renderItems('');
  filterEl.onchange = () => renderItems(filterEl.value);

  document.getElementById('btn-scan').onclick = () => {
    if (!state.apifyConfigured) {
      showToast('Apify token not configured. Set APIFY_TOKEN environment variable.', 'error');
      return;
    }
    openModal('Scan for Content', body => {
      body.innerHTML = `
        <div class="form-group"><label>Platform</label><select id="scan-platform">${PLATFORMS.map(p => `<option value="${p}">${PLATFORM_LABELS[p]}</option>`).join('')}</select></div>
        <div class="form-group"><label>URLs or Search Terms (one per line)</label><textarea id="scan-urls" rows="4" placeholder="https://linkedin.com/in/someone&#10;marketing tips"></textarea></div>
        <button class="btn btn-primary mt-20" id="scan-go">Start Scan</button>
        <div id="scan-status" class="text-sm text-muted mt-12"></div>`;
      document.getElementById('scan-go').onclick = async () => {
        const platform = document.getElementById('scan-platform').value;
        const urls = document.getElementById('scan-urls').value.split('\n').map(s => s.trim()).filter(Boolean);
        if (!urls.length) { document.getElementById('scan-status').textContent = 'Enter at least one URL or search term.'; return; }
        const btn = document.getElementById('scan-go');
        btn.disabled = true;
        btn.textContent = 'Starting...';
        document.getElementById('scan-status').textContent = 'Starting scan...';
        try {
          const res = await api('/api/scan', { method: 'POST', body: { platform, urls } });
          document.getElementById('scan-status').textContent = 'Scan started. Results will appear in a few minutes.';
          showToast('Scan started');
        } catch (e) {
          document.getElementById('scan-status').textContent = 'Error: ' + e.message;
          btn.disabled = false;
          btn.textContent = 'Start Scan';
        }
      };
    });
  };
}

// ── REFERENCES ───────────────────────────────────────────────────────────────
function renderReferences(container) {
  container.innerHTML = `
    <div class="page-header"><div><h1>References</h1><div class="subtitle">Your saved content library</div></div>
      <button class="btn btn-primary" id="btn-add-ref">Add Reference</button>
    </div>
    <div class="filter-bar mb-20">
      <input type="text" id="ref-search" placeholder="Search references...">
      <select id="ref-platform-filter"><option value="">All Platforms</option>${PLATFORMS.map(p => `<option value="${p}">${PLATFORM_LABELS[p]}</option>`).join('')}</select>
    </div>
    <div class="card-grid card-grid-2" id="ref-grid"></div>
  `;

  const grid = document.getElementById('ref-grid');
  function renderRefs(search, platform) {
    grid.innerHTML = '';
    let refs = state.references;
    if (search) refs = refs.filter(r => (r.title + r.content + r.note).toLowerCase().includes(search.toLowerCase()));
    if (platform) refs = refs.filter(r => r.platform === platform);
    if (!refs.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No references saved</h3><p>Save content from Inspiration or add manually</p></div>';
      return;
    }
    refs.forEach(r => {
      const card = el('div', { className: 'card' });
      card.innerHTML = `
        <div class="flex-between mb-16">${platformBadge(r.platform || 'web')}<span class="text-xs text-muted">${formatDate(r.savedAt)}</span></div>
        <div class="fw-600">${escHtml(r.title || 'Untitled')}</div>
        <div class="text-sm text-muted mt-12" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${escHtml(r.content)}</div>
        ${r.note ? `<div class="text-xs mt-12" style="color:var(--accent)">${escHtml(r.note)}</div>` : ''}
        <div class="flex gap-8 mt-12">
          <button class="btn btn-sm btn-ghost view-btn">View Full</button>
          <button class="btn btn-sm btn-ghost remix-btn">✏️ Remix</button>
          <button class="btn btn-sm btn-ghost copy-btn">📋 Copy</button>
          <button class="btn btn-sm btn-danger del-btn">Delete</button>
        </div>`;
      card.querySelector('.view-btn').onclick = () => openModal(r.title || 'Reference', body => { body.innerHTML = `<div style="white-space:pre-wrap;line-height:1.6">${escHtml(r.content)}</div>${r.url ? `<div class="mt-20"><a href="${escHtml(r.url)}" target="_blank" class="btn btn-sm btn-secondary">Open Source</a></div>` : ''}`; });
      card.querySelector('.remix-btn').onclick = () => {
        state.editingPost = { title: '', content: r.content, platform: r.platform || 'linkedin', status: 'draft', scheduledAt: '', tags: [], hashtags: [], mediaUrl: '' };
        location.hash = 'create';
      };
      card.querySelector('.copy-btn').onclick = () => copyToClipboard(r.content);
      card.querySelector('.del-btn').onclick = async () => {
        if (!confirm('Delete this reference?')) return;
        try {
          await api(`/api/references/${r.id}`, { method: 'DELETE' });
          await loadAll();
          showToast('Reference deleted');
          renderRefs(document.getElementById('ref-search').value, document.getElementById('ref-platform-filter').value);
        } catch (e) { showToast('Failed to delete: ' + e.message, 'error'); }
      };
      grid.appendChild(card);
    });
  }
  renderRefs('', '');

  const debouncedSearch = debounce(() => {
    renderRefs(document.getElementById('ref-search').value, document.getElementById('ref-platform-filter').value);
  }, 250);
  document.getElementById('ref-search').oninput = debouncedSearch;
  document.getElementById('ref-platform-filter').onchange = () => renderRefs(document.getElementById('ref-search').value, document.getElementById('ref-platform-filter').value);

  document.getElementById('btn-add-ref').onclick = () => {
    openModal('Add Reference', body => {
      body.innerHTML = `
        <div class="form-group"><label>Title</label><input type="text" id="ref-title" placeholder="Title"></div>
        <div class="form-group"><label>URL</label><input type="url" id="ref-url" placeholder="https://..."></div>
        <div class="form-group"><label>Platform</label><select id="ref-platform"><option value="">None</option>${PLATFORMS.map(p => `<option value="${p}">${PLATFORM_LABELS[p]}</option>`).join('')}</select></div>
        <div class="form-group"><label>Content</label><textarea id="ref-content" rows="4"></textarea></div>
        <div class="form-group"><label>Note</label><input type="text" id="ref-note" placeholder="Your note"></div>
        <button class="btn btn-primary mt-12" id="ref-save">Save</button>`;
      document.getElementById('ref-save').onclick = async () => {
        const btn = document.getElementById('ref-save');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        try {
          await api('/api/references', { method: 'POST', body: { title: document.getElementById('ref-title').value, url: document.getElementById('ref-url').value, platform: document.getElementById('ref-platform').value, content: document.getElementById('ref-content').value, note: document.getElementById('ref-note').value, tags: [] }});
          await loadAll();
          closeModal();
          showToast('Reference saved ✓');
          renderReferences(container);
        } catch (e) {
          showToast('Failed to save: ' + e.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Save';
        }
      };
    });
  };
}

// ── SCHEDULER ────────────────────────────────────────────────────────────────
function renderScheduler(container) {
  const scheduled = [...state.posts].filter(p => p.status === 'scheduled').sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  container.innerHTML = `
    <div class="page-header"><div><h1>Scheduler</h1><div class="subtitle">Manage your content queue</div></div>
      <button class="btn btn-primary" onclick="location.hash='create'">New Post</button>
    </div>
    <div class="notice-card card mb-20">
      <strong>📋 Content Planning Mode</strong> — Posts are planned here for you to copy and publish manually. Use the copy button to grab content for each platform.
    </div>
    <div class="card" id="scheduler-list" style="padding:0;overflow:hidden"></div>
  `;

  const list = document.getElementById('scheduler-list');
  if (!scheduled.length) {
    list.innerHTML = '<div class="empty-state"><h3>No scheduled posts</h3><p>Create a post and schedule it</p></div>';
    return;
  }

  list.appendChild(el('div', { className: 'list-row list-row-header', innerHTML: '<div>Post</div><div>Platform</div><div>Status</div><div>Scheduled</div><div>Actions</div>' }));

  scheduled.forEach(p => {
    const row = el('div', { className: 'list-row' });
    row.innerHTML = `
      <div><div class="list-title">${escHtml(p.title || p.content.slice(0, 50))}</div><div class="list-content-preview">${escHtml(p.content.slice(0, 80))}</div></div>
      <div>${platformBadge(p.platform)}</div>
      <div>${statusBadge(p.status)}</div>
      <div class="text-sm text-muted">${formatDateTime(p.scheduledAt)}</div>
      <div class="flex gap-8">
        <button class="btn btn-sm btn-ghost copy-btn" title="Copy to clipboard">📋</button>
        <button class="btn btn-sm btn-ghost edit-btn">Edit</button>
        <button class="btn btn-sm btn-ghost mark-pub-btn" title="Mark as published">✅</button>
        <button class="btn btn-sm btn-ghost del-btn" style="color:var(--error)">Del</button>
      </div>`;
    row.querySelector('.edit-btn').onclick = () => editPost(p.id);
    row.querySelector('.del-btn').onclick = () => deletePost(p.id);
    row.querySelector('.copy-btn').onclick = () => copyToClipboard(formatPostForCopy(p));
    row.querySelector('.mark-pub-btn').onclick = async () => {
      try {
        await api(`/api/posts/${p.id}`, { method: 'PUT', body: { status: 'published' } });
        await loadAll();
        showToast('Marked as published ✓');
        renderScheduler(container);
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    };
    list.appendChild(row);
  });
}

// ── ANALYTICS ────────────────────────────────────────────────────────────────
function renderAnalytics(container) {
  const a = state.analytics;
  const trend = a.weeklyTrend || [];
  const platforms = a.platforms || {};
  const hasPlatformData = Object.keys(platforms).length > 0;

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
        <h3 class="fw-600 mb-16">Posts Created This Week</h3>
        <div class="chart-bars" id="weekly-chart"></div>
      </div>
      <div class="card">
        <h3 class="fw-600 mb-16">Posts by Platform</h3>
        <div id="platform-chart"></div>
      </div>
    </div>
  `;

  // Weekly chart — real post counts
  const weeklyChart = document.getElementById('weekly-chart');
  if (trend.every(t => t.posts === 0)) {
    weeklyChart.innerHTML = '<div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center;padding:20px"><p class="text-muted">No posts created this week. Start creating content to see activity here.</p></div>';
  } else {
    trend.forEach(t => {
      const pct = (t.posts / maxPosts) * 100;
      weeklyChart.innerHTML += `<div class="chart-bar-wrap"><div class="chart-bar-value">${t.posts}</div><div class="chart-bar" style="height:${pct}%"></div><div class="chart-bar-label">${t.day}</div></div>`;
    });
  }

  // Platform chart — real post counts
  const platChart = document.getElementById('platform-chart');
  if (!hasPlatformData) {
    platChart.innerHTML = '<div class="empty-state" style="padding:40px 20px"><p class="text-muted">No published posts yet. Mark posts as published to see platform breakdown.</p></div>';
  } else {
    platChart.className = 'chart-bars';
    const maxPlatPosts = Math.max(1, ...Object.values(platforms).map(p => p.posts));
    Object.entries(platforms).forEach(([plat, data]) => {
      const pct = (data.posts / maxPlatPosts) * 100;
      platChart.innerHTML += `<div class="chart-bar-wrap"><div class="chart-bar-value">${data.posts}</div><div class="chart-bar ${plat}" style="height:${pct}%"></div><div class="chart-bar-label">${PLATFORM_LABELS[plat] || plat}</div></div>`;
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
        <div class="form-group"><label>Describe your brand voice and tone</label><textarea id="set-voice">${escHtml(c.brandVoice || '')}</textarea></div>
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
        <h3>Posting</h3>
        <div class="form-group"><label>Posting Frequency</label>
          <select id="set-frequency">
            <option value="daily" ${c.postingFrequency === 'daily' ? 'selected' : ''}>Daily</option>
            <option value="3x-week" ${c.postingFrequency === '3x-week' ? 'selected' : ''}>3x per Week</option>
            <option value="weekly" ${c.postingFrequency === 'weekly' ? 'selected' : ''}>Weekly</option>
          </select>
        </div>
        <div class="form-group"><label>Timezone</label><input type="text" id="set-timezone" value="${escHtml(c.timezone || 'UTC')}" placeholder="UTC"></div>
      </div>
      <button class="btn btn-primary" id="btn-save-settings">Save Settings</button>
    </div>
  `;

  const platContainer = document.getElementById('settings-platforms');
  const activePlatforms = new Set(c.platforms || ['linkedin']);
  PLATFORMS.forEach(plat => {
    const chip = el('div', {
      className: `platform-chip${activePlatforms.has(plat) ? ' selected' : ''}`,
      textContent: PLATFORM_LABELS[plat],
      onClick: () => { chip.classList.toggle('selected'); }
    });
    platContainer.appendChild(chip);
  });

  document.getElementById('btn-save-settings').onclick = async () => {
    const platforms = [...platContainer.querySelectorAll('.platform-chip.selected')].map(c => PLATFORMS[Array.from(platContainer.children).indexOf(c)]);
    if (!platforms.length) { showToast('Select at least one platform', 'error'); return; }
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      await api('/api/config', { method: 'PUT', body: {
        platforms,
        brandVoice: document.getElementById('set-voice').value,
        targetAudience: document.getElementById('set-audience').value,
        competitors: document.getElementById('set-competitors').value.split('\n').map(s => s.trim()).filter(Boolean),
        postingFrequency: document.getElementById('set-frequency').value,
        timezone: document.getElementById('set-timezone').value
      }});
      await loadAll();
      showToast('Settings saved ✓');
    } catch (e) {
      showToast('Failed to save: ' + e.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Save Settings';
  };
}
