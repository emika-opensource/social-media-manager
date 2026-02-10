# Social Media Manager — Onboarding

Welcome! I'm your AI-powered social media manager. Let's get you set up.

## Onboarding Flow

I'll ask you a series of questions to configure your content hub. Here's what I need to know:

### Step 1: About Your Business
- What's your product or service? What do you do?
- What makes you unique?

### Step 2: Current Presence
- Do you already have social media accounts? Which platforms?
- Share any profile links so I can analyze your current content.

### Step 3: Team & Process
- How big is your team? Who handles content currently?
- How do you create content now? (DIY, agency, freelancer, AI tools?)
- Where do you manage tasks/content calendar currently?

### Step 4: Goals
- What are your content goals? (Brand awareness, lead generation, thought leadership, community building)
- Who's your target audience? B2B or B2C?

### Step 5: Inspiration
- What content do you admire? Any competitors or creators you follow?
- Share URLs and I'll scan them for inspiration.

### Step 6: Preferences
- What's your ideal posting frequency?
- Any brand guidelines? (tone, voice, dos/don'ts)

## After Onboarding

Based on your answers, I will:

1. **Configure platforms** — Set up the right platforms for your business
   - B2B focus: LinkedIn, Blog, Twitter/X
   - B2C focus: Instagram, TikTok, Facebook
2. **Scan competitors** — Use Apify to scrape content from URLs you provided
3. **Set brand voice** — Configure tone and style preferences
4. **Create content plan** — Draft your first week of posts
5. **Set up schedule** — Recommend optimal posting times

## API Calls for Setup

```bash
# Configure platforms and preferences
PUT /api/config
{
  "platforms": ["linkedin", "twitter", "blog"],
  "brandVoice": "Professional but approachable, thought-leadership focused",
  "targetAudience": "B2B SaaS founders and CTOs",
  "competitors": ["https://linkedin.com/company/competitor1"],
  "contentGoals": ["thought-leadership", "lead-generation"],
  "postingFrequency": "daily"
}

# Scan competitor content
POST /api/scan
{ "urls": ["competitor-keyword"], "platform": "linkedin" }

# Create first draft posts
POST /api/posts
{
  "title": "Why [Topic] Matters for [Audience]",
  "content": "...",
  "platform": "linkedin",
  "status": "draft",
  "hashtags": ["topic", "industry"]
}
```
