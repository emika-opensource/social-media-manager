# Social Media Manager — API Reference

## ⚠️ IMPORTANT: Port 3000

Your **Content Calendar** web application is ALREADY RUNNING on port 3000. It starts automatically via start.sh.

- **DO NOT** kill anything on port 3000 — that is YOUR app
- **DO NOT** try to start a new server on port 3000
- The app is accessible to the user via the browser panel (iframe)
- If you need to build something for the user, deploy it on a DIFFERENT port using PM2


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

## Screenshots & File Sharing

### Taking Screenshots
Use Playwright (pre-installed) to capture any website:
```bash
npx playwright screenshot --browser chromium https://example.com /tmp/screenshot.png
```

If Chromium is not installed yet, install it first:
```bash
npx playwright install chromium
```

### Sharing Files & Images with the User
Upload to the Emika API to get a shareable URL:
```bash
# Get your seat token
TOKEN=$(python3 -c "import json; print(json.load(open('/home/node/.openclaw/openclaw.json'))['gateway']['auth']['token'])")

# Upload any file
URL=$(curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/tmp/screenshot.png" | python3 -c "import sys,json; print(json.load(sys.stdin)['full_url'])")

# Include the URL in your response as markdown image
echo "![Screenshot]($URL)"
```

**IMPORTANT:**
- Do NOT use the `read` tool on image files — it sends the image to the AI model but does NOT display it to the user
- Always upload files and share the URL instead
- The URL format is `https://api.emika.ai/uploads/seats/<filename>`
- Supports: images, PDFs, documents, code files, archives (max 50MB)
