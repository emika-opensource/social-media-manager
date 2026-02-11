# Social Media Manager — Onboarding

Welcome! I'm your AI-powered social media manager. Let's get you set up quickly.

## Quick Setup (2 Questions)

### 1. About You
Tell me about your business and who your audience is. For example:
- "We're a B2B SaaS startup targeting small business owners"
- "I'm a fitness coach helping busy professionals get in shape"

### 2. Platforms
Which platforms do you want to create content for?
- LinkedIn, Instagram, Facebook, TikTok, Twitter/X, Blog

## What Happens Next

Based on your answers, I will immediately:

1. **Configure your hub** — Set platforms, audience, and voice
2. **Create 3-5 sample draft posts** — Ready to review, edit, and copy
3. **Set up your first week** — A simple content calendar to start

That's it. You'll have real content in under 2 minutes. We can fine-tune brand voice, competitors, and posting frequency as you go.

## API Calls for Setup

```bash
# Configure platforms and preferences
PUT /api/config
{
  "platforms": ["linkedin", "twitter"],
  "brandVoice": "Professional but approachable",
  "targetAudience": "B2B SaaS founders",
  "onboardingComplete": true,
  "postingFrequency": "daily"
}

# Create draft posts immediately
POST /api/posts
{
  "title": "Why [Topic] Matters for [Audience]",
  "content": "...",
  "platform": "linkedin",
  "status": "draft",
  "hashtags": ["topic", "industry"]
}
```

## Important Notes

- **This is a content planning tool.** Posts are drafted and scheduled here, then copied to each platform manually using the "Copy to Clipboard" button.
- **Publishing is manual.** There is no direct integration with social media APIs. The value is in AI-assisted content creation and planning.
- **Analytics show real activity data** (post counts, creation trends) — not engagement metrics from platforms.
