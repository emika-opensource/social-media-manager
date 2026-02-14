# TOOLS.md - Local Notes

---
name: social-media-manager
description: AI-powered social media content management with posts, schedules, references, content scanning, and analytics
---

## ⛔ NEVER write data as files. ALWAYS use the API.

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.

## 🚨 Your App is ALREADY RUNNING
Your **Social Media Manager** web application is ALREADY RUNNING on port 3000.
- **DO NOT** kill anything on port 3000
- **DO NOT** try to start a new server
- All API endpoints below are served by this app at `http://localhost:3000`

## 📁 File Uploads
To upload files for media, use the seat proxy:
```bash
curl -X POST http://162.55.102.58:8080/uploads/seat \
  -H "X-Seat-Token: $SEAT_TOKEN" \
  -F "file=@image.png"
```
The response includes a public URL you can use as `mediaUrl` in posts.

## API Endpoints Summary

| Category | Endpoints |
|----------|-----------|
| Posts | `GET/POST /api/posts`, `PUT/DELETE /api/posts/:id` |
| References | `GET/POST /api/references`, `DELETE /api/references/:id` |
| Schedules | `GET/POST /api/schedules`, `PUT/DELETE /api/schedules/:id` |
| Config | `GET/PUT /api/config` |
| Scan (Apify) | `GET /api/scan/status`, `POST /api/scan`, `GET /api/scan/results` |
| Analytics | `GET /api/analytics` |

## Detailed API Reference

### Posts

**List posts** (with optional filters):
```bash
curl http://localhost:3000/api/posts
curl http://localhost:3000/api/posts?platform=linkedin
curl http://localhost:3000/api/posts?status=draft
curl "http://localhost:3000/api/posts?platform=instagram&status=published"
```
Response: Array of post objects.

**Create a post**:
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Post Title",
    "content": "Post content here (required)",
    "platform": "linkedin",
    "status": "draft",
    "scheduledAt": "2025-03-01T10:00:00Z",
    "tags": ["marketing", "ai"],
    "hashtags": ["#AI", "#Marketing"],
    "mediaUrl": "https://example.com/image.png"
  }'
```
- `content` (required): Post text
- `platform`: `linkedin` | `instagram` | `facebook` | `tiktok` | `twitter` | `blog` (default: `linkedin`)
- `status`: `draft` | `scheduled` | `published` (default: `draft`)
- `scheduledAt`: ISO date string (optional)
- `tags`: array of strings (optional)
- `hashtags`: array of strings (optional)
- `mediaUrl`: URL string (optional)

Response: Created post object with `id`, `createdAt`, `updatedAt`.

**Update a post**:
```bash
curl -X PUT http://localhost:3000/api/posts/POST_ID \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content",
    "status": "scheduled",
    "platform": "instagram"
  }'
```
Response: Updated post object.

**Delete a post**:
```bash
curl -X DELETE http://localhost:3000/api/posts/POST_ID
```
Response: `{ "success": true }`

### References

**List all references**:
```bash
curl http://localhost:3000/api/references
```
Response: Array of reference objects.

**Create a reference**:
```bash
curl -X POST http://localhost:3000/api/references \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "title": "Great Content Example",
    "content": "Summary or notes about this reference",
    "platform": "linkedin",
    "tags": ["inspiration", "b2b"],
    "note": "Good hook structure"
  }'
```
Response: Created reference object with `id`, `savedAt`.

**Delete a reference**:
```bash
curl -X DELETE http://localhost:3000/api/references/REF_ID
```
Response: `{ "success": true }`

### Schedules

**List all schedules**:
```bash
curl http://localhost:3000/api/schedules
```
Response: Array of schedule objects.

**Create a schedule**:
```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "POST_ID",
    "platform": "linkedin",
    "scheduledAt": "2025-03-01T10:00:00Z",
    "recurring": "weekly",
    "status": "pending"
  }'
```
- `recurring`: `none` | `daily` | `weekly` | `monthly` (default: `none`)
- `status`: default `pending`

Response: Created schedule object with `id`.

**Update a schedule**:
```bash
curl -X PUT http://localhost:3000/api/schedules/SCHEDULE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledAt": "2025-03-02T14:00:00Z",
    "status": "completed"
  }'
```
Response: Updated schedule object.

**Delete a schedule**:
```bash
curl -X DELETE http://localhost:3000/api/schedules/SCHEDULE_ID
```
Response: `{ "success": true }`

### Config

**Get config**:
```bash
curl http://localhost:3000/api/config
```
Response:
```json
{
  "platforms": ["linkedin"],
  "brandVoice": "",
  "timezone": "UTC",
  "competitors": [],
  "targetAudience": "",
  "contentGoals": [],
  "postingFrequency": "daily",
  "onboardingComplete": false
}
```

**Update config**:
```bash
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["linkedin", "instagram", "twitter"],
    "brandVoice": "Professional but approachable",
    "targetAudience": "B2B SaaS founders",
    "contentGoals": ["thought leadership", "lead generation"],
    "postingFrequency": "daily",
    "onboardingComplete": true
  }'
```
Response: Updated config object.

### Scan (Apify Content Scanning)

**Check scan status** (whether Apify token is configured):
```bash
curl http://localhost:3000/api/scan/status
```
Response: `{ "configured": true|false }`

**Start a content scan**:
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["AI marketing trends", "SaaS growth"],
    "platform": "linkedin"
  }'
```
- `urls` (required): Array of URLs or search terms
- `platform`: `linkedin` | `instagram` | `twitter` | `tiktok` | `facebook` | `web`

Response: `{ "success": true, "runId": "...", "status": "running" }`

**Get scan results**:
```bash
curl http://localhost:3000/api/scan/results
```
Response: Array of scan result objects with `status` (`running`|`completed`|`failed`) and `items`.

### Analytics

**Get analytics dashboard data**:
```bash
curl http://localhost:3000/api/analytics
```
Response:
```json
{
  "totalPosts": 10,
  "published": 3,
  "drafts": 5,
  "scheduled": 2,
  "thisWeek": 4,
  "platforms": { "linkedin": { "posts": 2 }, "instagram": { "posts": 1 } },
  "weeklyTrend": [{ "day": "Mon", "posts": 1 }, ...]
}
```
