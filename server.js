const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory with fallback
const DATA_DIR = fs.existsSync('/home/node/emika/content-hub')
  ? '/home/node/emika/content-hub'
  : path.join(__dirname, 'data');

fs.ensureDirSync(DATA_DIR);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers ──────────────────────────────────────────────────────────────────

function dataFile(name) { return path.join(DATA_DIR, name); }

async function readJSON(name, fallback = []) {
  try { return await fs.readJSON(dataFile(name)); }
  catch { return fallback; }
}

async function writeJSON(name, data) {
  await fs.writeJSON(dataFile(name), data, { spaces: 2 });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const VALID_PLATFORMS = ['linkedin','instagram','facebook','tiktok','twitter','blog'];
const VALID_STATUSES = ['draft','scheduled','published'];

// ── POSTS CRUD ───────────────────────────────────────────────────────────────

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await readJSON('posts.json');
    const { platform, status } = req.query;
    let filtered = posts;
    if (platform) filtered = filtered.filter(p => p.platform === platform);
    if (status) filtered = filtered.filter(p => p.status === status);
    res.json(filtered);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { content, platform, status } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    if (platform && !VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (req.body.scheduledAt && isNaN(Date.parse(req.body.scheduledAt))) {
      return res.status(400).json({ error: 'Invalid scheduledAt date format' });
    }

    const posts = await readJSON('posts.json');
    const post = {
      id: uid(),
      title: (req.body.title || '').slice(0, 500),
      content: content.trim(),
      platform: platform || 'linkedin',
      status: status || 'draft',
      scheduledAt: req.body.scheduledAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      hashtags: Array.isArray(req.body.hashtags) ? req.body.hashtags : [],
      mediaUrl: req.body.mediaUrl || null
    };
    posts.push(post);
    await writeJSON('posts.json', posts);
    res.status(201).json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    if (req.body.platform && !VALID_PLATFORMS.includes(req.body.platform)) {
      return res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    }
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (req.body.content !== undefined && (!req.body.content || !req.body.content.trim())) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }
    const posts = await readJSON('posts.json');
    const idx = posts.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Post not found' });
    posts[idx] = { ...posts[idx], ...req.body, id: posts[idx].id, updatedAt: new Date().toISOString() };
    await writeJSON('posts.json', posts);
    res.json(posts[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    let posts = await readJSON('posts.json');
    posts = posts.filter(p => p.id !== req.params.id);
    await writeJSON('posts.json', posts);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── REFERENCES ───────────────────────────────────────────────────────────────

app.get('/api/references', async (req, res) => {
  try {
    const refs = await readJSON('references.json');
    res.json(refs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/references', async (req, res) => {
  try {
    const refs = await readJSON('references.json');
    const ref = {
      id: uid(),
      url: req.body.url || '',
      title: req.body.title || '',
      content: req.body.content || '',
      platform: req.body.platform || '',
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      note: req.body.note || '',
      savedAt: new Date().toISOString()
    };
    refs.push(ref);
    await writeJSON('references.json', refs);
    res.status(201).json(ref);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/references/:id', async (req, res) => {
  try {
    let refs = await readJSON('references.json');
    refs = refs.filter(r => r.id !== req.params.id);
    await writeJSON('references.json', refs);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SCHEDULES ────────────────────────────────────────────────────────────────

app.get('/api/schedules', async (req, res) => {
  try { res.json(await readJSON('schedules.json')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const schedules = await readJSON('schedules.json');
    const sched = {
      id: uid(),
      postId: req.body.postId || null,
      platform: req.body.platform || 'linkedin',
      scheduledAt: req.body.scheduledAt || null,
      recurring: req.body.recurring || 'none',
      status: req.body.status || 'pending'
    };
    schedules.push(sched);
    await writeJSON('schedules.json', schedules);
    res.status(201).json(sched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/schedules/:id', async (req, res) => {
  try {
    const schedules = await readJSON('schedules.json');
    const idx = schedules.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Schedule not found' });
    schedules[idx] = { ...schedules[idx], ...req.body, id: schedules[idx].id };
    await writeJSON('schedules.json', schedules);
    res.json(schedules[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    let schedules = await readJSON('schedules.json');
    schedules = schedules.filter(s => s.id !== req.params.id);
    await writeJSON('schedules.json', schedules);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CONFIG ───────────────────────────────────────────────────────────────────

const defaultConfig = {
  platforms: ['linkedin'],
  brandVoice: '',
  timezone: 'UTC',
  competitors: [],
  targetAudience: '',
  contentGoals: [],
  postingFrequency: 'daily',
  onboardingComplete: false
};

app.get('/api/config', async (req, res) => {
  try {
    const config = await readJSON('config.json', defaultConfig);
    res.json({ ...defaultConfig, ...config });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/config', async (req, res) => {
  try {
    const current = await readJSON('config.json', defaultConfig);
    const updated = { ...current, ...req.body };
    await writeJSON('config.json', updated);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── APIFY SCAN ───────────────────────────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';

const APIFY_ACTORS = {
  linkedin: 'curious_coder/linkedin-post-search-scraper',
  instagram: 'apify/instagram-post-scraper',
  twitter: 'quacker/twitter-scraper',
  tiktok: 'clockworks/tiktok-scraper',
  facebook: 'apify/facebook-posts-scraper',
  web: 'apify/web-scraper'
};

app.get('/api/scan/status', (req, res) => {
  res.json({ configured: !!APIFY_TOKEN });
});

app.post('/api/scan', async (req, res) => {
  try {
    if (!APIFY_TOKEN) {
      return res.status(400).json({ error: 'Apify token not configured. Set APIFY_TOKEN environment variable to enable content scanning.' });
    }

    const { urls = [], platform = 'linkedin' } = req.body;
    if (!urls.length) {
      return res.status(400).json({ error: 'At least one URL or search term is required' });
    }

    const actorId = APIFY_ACTORS[platform] || APIFY_ACTORS.web;

    const input = platform === 'linkedin'
      ? { searchTerms: urls, limit: 20 }
      : platform === 'instagram'
      ? { directUrls: urls, resultsLimit: 20 }
      : { startUrls: urls.map(u => ({ url: u })), maxPages: 10 };

    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`;
    const runRes = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const runData = await runRes.json();

    if (!runRes.ok) {
      return res.status(400).json({ error: 'Apify error', details: runData });
    }

    // Store run info
    const results = await readJSON('scan-results.json');
    const resultId = uid();
    results.push({
      id: resultId,
      runId: runData.data?.id,
      platform,
      urls,
      status: 'running',
      startedAt: new Date().toISOString(),
      items: []
    });
    await writeJSON('scan-results.json', results);

    // Poll for results (background) — use ID not index
    pollApifyRun(runData.data?.id, resultId);

    res.json({ success: true, runId: runData.data?.id, status: 'running' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function pollApifyRun(runId, resultId) {
  if (!runId) return;
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 10000));
    try {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusRes.json();
      if (statusData.data?.status === 'SUCCEEDED') {
        const datasetId = statusData.data.defaultDatasetId;
        const itemsRes = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=50`
        );
        const items = await itemsRes.json();
        const results = await readJSON('scan-results.json');
        const idx = results.findIndex(r => r.id === resultId);
        if (idx !== -1) {
          results[idx].status = 'completed';
          results[idx].items = items;
          results[idx].completedAt = new Date().toISOString();
          await writeJSON('scan-results.json', results);
        }
        return;
      } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(statusData.data?.status)) {
        const results = await readJSON('scan-results.json');
        const idx = results.findIndex(r => r.id === resultId);
        if (idx !== -1) {
          results[idx].status = 'failed';
          results[idx].error = statusData.data?.status;
          await writeJSON('scan-results.json', results);
        }
        return;
      }
    } catch (e) {
      console.error(`Polling error for run ${runId}:`, e.message);
    }
  }
  // Max attempts reached — mark as timed out
  try {
    const results = await readJSON('scan-results.json');
    const idx = results.findIndex(r => r.id === resultId);
    if (idx !== -1 && results[idx].status === 'running') {
      results[idx].status = 'failed';
      results[idx].error = 'Polling timed out';
      await writeJSON('scan-results.json', results);
    }
  } catch {}
}

app.get('/api/scan/results', async (req, res) => {
  try { res.json(await readJSON('scan-results.json')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS (real data only) ───────────────────────────────────────────────

app.get('/api/analytics', async (req, res) => {
  try {
    const posts = await readJSON('posts.json');
    const published = posts.filter(p => p.status === 'published');
    const platforms = {};
    published.forEach(p => {
      if (!platforms[p.platform]) platforms[p.platform] = { posts: 0 };
      platforms[p.platform].posts++;
    });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const thisWeek = posts.filter(p => p.createdAt >= weekAgo);

    // Build real weekly post counts
    const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.now() - (6 - i) * 86400000);
      const dayStr = day.toISOString().slice(0, 10);
      const dayPosts = posts.filter(p => p.createdAt && p.createdAt.startsWith(dayStr));
      return {
        day: day.toLocaleDateString('en', { weekday: 'short' }),
        posts: dayPosts.length
      };
    });

    res.json({
      totalPosts: posts.length,
      published: published.length,
      drafts: posts.filter(p => p.status === 'draft').length,
      scheduled: posts.filter(p => p.status === 'scheduled').length,
      thisWeek: thisWeek.length,
      platforms,
      weeklyTrend
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SPA fallback ─────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Social Media Manager running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
