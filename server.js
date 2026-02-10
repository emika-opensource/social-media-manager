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
    const posts = await readJSON('posts.json');
    const post = {
      id: uid(),
      title: req.body.title || '',
      content: req.body.content || '',
      platform: req.body.platform || 'linkedin',
      status: req.body.status || 'draft',
      scheduledAt: req.body.scheduledAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: req.body.tags || [],
      hashtags: req.body.hashtags || [],
      mediaUrl: req.body.mediaUrl || null
    };
    posts.push(post);
    await writeJSON('posts.json', posts);
    res.status(201).json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
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
      tags: req.body.tags || [],
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
  postingFrequency: 'daily'
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

app.post('/api/scan', async (req, res) => {
  try {
    const { urls = [], platform = 'linkedin' } = req.body;
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
    results.push({
      id: uid(),
      runId: runData.data?.id,
      platform,
      urls,
      status: 'running',
      startedAt: new Date().toISOString(),
      items: []
    });
    await writeJSON('scan-results.json', results);

    // Poll for results (background)
    pollApifyRun(runData.data?.id, results.length - 1);

    res.json({ success: true, runId: runData.data?.id, status: 'running' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function pollApifyRun(runId, resultIdx) {
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
        if (results[resultIdx]) {
          results[resultIdx].status = 'completed';
          results[resultIdx].items = items;
          results[resultIdx].completedAt = new Date().toISOString();
          await writeJSON('scan-results.json', results);
        }
        return;
      } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(statusData.data?.status)) {
        const results = await readJSON('scan-results.json');
        if (results[resultIdx]) {
          results[resultIdx].status = 'failed';
          await writeJSON('scan-results.json', results);
        }
        return;
      }
    } catch {}
  }
}

app.get('/api/scan/results', async (req, res) => {
  try { res.json(await readJSON('scan-results.json')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS (mock) ─────────────────────────────────────────────────────────

app.get('/api/analytics', async (req, res) => {
  try {
    const posts = await readJSON('posts.json');
    const published = posts.filter(p => p.status === 'published');
    const platforms = {};
    published.forEach(p => {
      if (!platforms[p.platform]) platforms[p.platform] = { posts: 0, impressions: 0, engagement: 0 };
      platforms[p.platform].posts++;
      platforms[p.platform].impressions += Math.floor(Math.random() * 5000) + 500;
      platforms[p.platform].engagement += Math.floor(Math.random() * 300) + 20;
    });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const thisWeek = posts.filter(p => p.createdAt >= weekAgo);

    res.json({
      totalPosts: posts.length,
      published: published.length,
      drafts: posts.filter(p => p.status === 'draft').length,
      scheduled: posts.filter(p => p.status === 'scheduled').length,
      thisWeek: thisWeek.length,
      platforms,
      engagement: {
        totalImpressions: Object.values(platforms).reduce((s, p) => s + p.impressions, 0),
        totalEngagement: Object.values(platforms).reduce((s, p) => s + p.engagement, 0),
        avgEngagementRate: published.length > 0 ? ((Object.values(platforms).reduce((s, p) => s + p.engagement, 0) / Math.max(1, Object.values(platforms).reduce((s, p) => s + p.impressions, 0))) * 100).toFixed(2) : 0
      },
      weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
        day: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en', { weekday: 'short' }),
        posts: Math.floor(Math.random() * 5),
        impressions: Math.floor(Math.random() * 3000) + 200,
        engagement: Math.floor(Math.random() * 200) + 10
      }))
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
