# Social Media Manager — API Reference

Base URL: `http://localhost:3000`

## Posts

```
GET    /api/posts                    List all posts (?platform=linkedin&status=draft)
POST   /api/posts                    Create post
PUT    /api/posts/:id                Update post
DELETE /api/posts/:id                Delete post
```

Post body:
```json
{ "title": "", "content": "", "platform": "linkedin", "status": "draft|scheduled|published", "scheduledAt": "ISO8601", "tags": [], "hashtags": [], "mediaUrl": "" }
```

## References

```
GET    /api/references               List all references
POST   /api/references               Save reference
DELETE /api/references/:id           Delete reference
```

Reference body:
```json
{ "url": "", "title": "", "content": "", "platform": "", "tags": [], "note": "" }
```

## Schedules

```
GET    /api/schedules                List schedules
POST   /api/schedules                Create schedule
PUT    /api/schedules/:id            Update schedule
DELETE /api/schedules/:id            Delete schedule
```

Schedule body:
```json
{ "postId": "", "platform": "linkedin", "scheduledAt": "ISO8601", "recurring": "none|daily|weekly|monthly", "status": "pending|posted|failed" }
```

## Config

```
GET    /api/config                   Get config
PUT    /api/config                   Update config
```

Config body:
```json
{ "platforms": [], "brandVoice": "", "timezone": "UTC", "competitors": [], "targetAudience": "", "contentGoals": [], "postingFrequency": "daily" }
```

## Scanning

```
POST   /api/scan                     Start Apify scan
GET    /api/scan/results             Get cached results
```

Scan body:
```json
{ "urls": ["search-term-or-url"], "platform": "linkedin" }
```

## Analytics

```
GET    /api/analytics                Get mock analytics
```

Returns: totalPosts, published, drafts, scheduled, thisWeek, platforms breakdown, engagement stats, weeklyTrend.


## Browser & Screenshots (Playwright)

Playwright and Chromium are pre-installed. Use them for browsing websites, taking screenshots, scraping content, and testing.

```bash
# Quick screenshot
npx playwright screenshot --full-page https://example.com screenshot.png

# In Node.js
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://example.com");
await page.screenshot({ path: "screenshot.png", fullPage: true });
await browser.close();
```

Do NOT install Puppeteer or download Chromium — Playwright is already here and ready to use.
