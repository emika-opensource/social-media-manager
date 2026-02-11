# AUDIT.md — Social Media Manager

**Date:** 2026-02-11  
**Auditor:** AI (subagent)  
**Goal:** Minimize time-to-first-value for new users

---

## 1. First-Run Experience

**Verdict: No onboarding exists in the UI. Cold empty dashboard.**

When a new user opens the dashboard for the first time, they see:
- 4 stat cards all showing **0**
- "No scheduled posts yet" empty state
- Quick action buttons (Create Post, Browse Inspiration, View Calendar, Analytics)

There is **zero guided onboarding**. No welcome modal, no setup wizard, no "get started" prompt. The BOOTSTRAP.md describes a conversational onboarding flow the AI agent should drive via chat — but if the user opens the web dashboard directly (which they will), they're completely on their own.

**Steps to first value (creating a draft post):** Open dashboard → click "Create Post" → fill in content → click "Save Draft" = **3 clicks + writing**. That's actually fine mechanically, but the user has no idea *what* to write, *why* they're here, or what the AI is supposed to do for them.

**Steps to first value via AI agent:** The agent asks ~6 categories of questions (business, presence, team, goals, inspiration, preferences) before doing anything. That's **way too many questions before any value**. A user could easily lose interest during Step 3.

**The real problem:** The onboarding assumes the AI drives everything via chat. But the dashboard is the first thing users see, and it's a ghost town with no context.

---

## 2. UI/UX Issues

### Good
- Clean dark theme, well-structured sidebar navigation
- Platform badges and color coding are visually clear
- Character count with warnings is genuinely useful
- Live preview in the post editor is nice
- Calendar view is functional
- Empty states exist (though they're generic)

### Bad
- **No loading states anywhere.** `loadAll()` fires 6 API calls on page load with no spinner, skeleton, or feedback. If the server is slow, the user sees nothing.
- **`alert()` for notifications.** Settings save confirmation uses `window.alert()`. Post scheduling validation uses `alert()`. This is 2026.
- **No toast/notification system.** Successfully saving a post, deleting a reference — no feedback beyond the state re-rendering.
- **Inspiration page is useless without Apify.** If `APIFY_TOKEN` isn't set (it's empty by default), the Scan button will fire an API call that fails silently on the backend. The user gets "Scan started" but results never appear. No error feedback.
- **Analytics are completely fake.** `Math.random()` generates different numbers on every page load. The data is meaningless noise. Users who notice will lose trust immediately.
- **Calendar day click:** Opens a modal, but if there are no posts, the "Create One" button in the modal navigates away without closing properly (it does call `closeModal()` first, but the UX feels janky).
- **Scheduler list header:** Uses `innerHTML` for the header row, but the grid template for the header doesn't match the data rows' column count. The header has 5 columns as text in one `innerHTML` dump, but the `.list-row` CSS grid has 5 columns. It works but it's fragile.
- **No confirm on reference delete.** Posts get `confirm()`, references just delete immediately.
- **Mobile experience:** Sidebar collapses to 60px icon-only mode which is fine, but the 2-column editor layout doesn't stack the preview below the form — it actually does via the `@media (max-width: 900px)` rule, but the preview pane still renders below. OK, this works.
- **"Remix" button** copies content to the editor with no indication of what "Remix" means. Users unfamiliar with the concept will be confused.

---

## 3. Feature Completeness

### Fully Implemented
- CRUD for posts, references, schedules
- Content calendar with month navigation
- Post editor with platform selection, hashtags, preview
- Reference library with search/filter
- Settings page with config persistence
- Apify scanning integration (if token provided)

### Stubbed / Incomplete
- **Analytics are 100% fake.** Random numbers generated server-side on every request. No actual tracking, no persistence. This is a mock that ships as if it's real. The engagement rate, impressions, weekly trend — all `Math.random()`.
- **Schedules don't actually post anything.** You can schedule a post, but there's no publishing mechanism. No integration with any social media API. The `status` field is just a label.
- **Recurring schedules** (`daily`, `weekly`, `monthly` options in API) — the field exists but nothing processes recurrence. Dead feature.
- **`contentGoals`** in config — accepted by the API, never used anywhere in UI or logic.
- **Tags on posts** — the data model accepts `tags`, but the UI only exposes `hashtags`. Tags are never shown or editable.
- **Media URL** — you can enter a URL, but it's never rendered in the preview or anywhere else. It's just stored.
- **No actual publishing.** The biggest gap. This is a content *planning* tool that can never actually post. For an "AI Social Media Manager," this is a showstopper for perceived value.

### TODO / Placeholder Code
- No explicit TODO comments found, but the analytics endpoint is clearly a placeholder with random data generation.

---

## 4. Error Handling

### Server-side
- All routes have try/catch with `res.status(500).json({ error: e.message })`. Basic but functional.
- No input validation whatsoever. You can POST a post with empty content, garbage platform values, invalid dates, XSS in content. Everything gets stored as-is.
- The Apify polling function (`pollApifyRun`) silently swallows all errors in the catch block. If polling fails, the scan result stays "running" forever with no way to recover.

### Client-side
- **No error handling on API calls.** Every `api()` call assumes success. If the server returns an error, the app will break silently or show undefined values.
- **No network error handling.** If fetch fails (server down, network issue), the entire app crashes with an unhandled promise rejection.
- **Empty states exist** for most views, which is good.
- **No loading states.** Already mentioned but critical — the app feels broken during data loading.

---

## 5. Code Quality

### Bugs
- **Race condition in Apify polling:** `pollApifyRun` uses array index (`resultIdx`) to update results, but other scans could shift the array between polls. Should use the result `id` instead.
- **XSS potential in `showDayPosts`:** The `onclick` handler uses `editPost('${p.id}')` — if a post ID ever contained a quote, it would break. IDs are generated internally so low risk, but it's still inline string interpolation in HTML.
- **Analytics randomness on every load** means the dashboard stats change every time you navigate away and back. Users will notice.

### Anti-patterns
- **Global mutable state** (`state` object) with no reactivity. Every state change requires manually re-rendering the correct view. Easy to get out of sync.
- **Inline HTML strings everywhere.** `innerHTML = \`...\`` throughout app.js is XSS-prone and hard to maintain. `escHtml()` is used in some places but not consistently.
- **`window.editPost = editPost`** — exposing functions on window for onclick handlers. Standard vanilla JS pattern but fragile.
- **No debounce on search input** in references view — fires on every keystroke.
- **JSON file storage** with no locking — concurrent writes could corrupt data. Fine for single-user, but the server has no request queuing.

### Security
- **No authentication.** Anyone with the URL can CRUD all data.
- **No CSRF protection.** CORS is wide open (`cors()` with defaults).
- **No rate limiting.** The scan endpoint proxies to Apify with the server's token — anyone could burn through API credits.
- **Apify token in environment** but no validation that it exists before making calls.
- **No input sanitization.** POST bodies go straight to JSON files.

---

## 6. BOOTSTRAP.md Quality

**Verdict: Decent structure, but too many questions before value.**

The onboarding is a 6-step interrogation:
1. Business description
2. Current social presence
3. Team & process
4. Goals
5. Inspiration/competitors
6. Preferences

**Problems:**
- **Steps 2-3 are unnecessary for first value.** Knowing the team size and current tools doesn't help create the first post. These are "nice to have" context.
- **No quick-start path.** There should be a "just get me started" option that asks platform + audience, then creates sample content immediately.
- **API calls section at the bottom** is useful for the AI agent but could be more opinionated about what to do with the answers.
- **Missing:** What to do if the user doesn't have competitors, doesn't know their audience, or just wants to try the tool.

**Recommendation:** Compress to 2 steps: (1) What's your business + who's your audience? (2) Which platforms? Then immediately generate sample posts. Gather the rest later as the user engages.

---

## 7. SKILL.md Quality

**Verdict: Good reference, but missing critical context.**

### Good
- Platform-specific guidelines with character limits and tone advice
- Clear API reference in TOOLS.md
- Content creation workflow steps
- Proactive tasks section (morning review, weekly scan)

### Missing
- **No instructions for handling the empty-state first-run.** The AI doesn't know to check if the user has zero posts and offer to help.
- **No guidance on how to use the dashboard.** The AI can't help users navigate the UI because it doesn't know the UI exists in any detail.
- **No error recovery instructions.** What should the AI do if the scan fails? If the server is down?
- **No personality/tone definition for the AI itself.** "Professional but approachable" is mentioned as a brand voice option, not as the AI's own voice.
- **Analytics are described as real** ("Track engagement metrics") when they're completely fake. The AI will reference fake data and lose credibility.
- **No mention that publishing is not implemented.** The AI might tell users their post will be published, but it won't be.

---

## 8. Specific Improvements (Ranked by Impact)

### Critical (blocks first value)

1. **Add a welcome/onboarding screen to the dashboard.** When `posts.json` is empty and `config.json` is default, show a guided setup instead of empty stat cards. "Welcome! Let's set up your content hub in 2 minutes." Platform selection → audience → generate sample posts. This alone could cut time-to-first-value from "never" to 2 minutes.

2. **Compress BOOTSTRAP.md to 2 essential questions.** Business + audience, and platforms. Everything else can be gathered later. The AI should create 3-5 sample draft posts within the first interaction, not after a 6-step interview.

3. **Fix analytics to not be random.** Either (a) remove the analytics page until real tracking exists, (b) show honest "No data yet — publish posts to see analytics" empty state, or (c) persist mock data so it at least stays consistent. Random numbers on every load is worse than no analytics.

4. **Add loading states.** Spinner or skeleton UI while `loadAll()` resolves. The app feels broken without this.

### High Impact

5. **Add a toast/notification system.** Replace all `alert()` calls with non-blocking toast notifications. "Post saved as draft ✓", "Settings updated ✓", "Reference deleted".

6. **Add error handling to all API calls in app.js.** Wrap `api()` in try/catch, show user-friendly errors. Handle network failures gracefully.

7. **Document that publishing is not implemented** in SKILL.md. The AI should know this is a planning tool, not a publishing tool, and set expectations accordingly. Or better: add a "Copy to clipboard" button so users can at least manually post the content.

8. **Add "Copy content" button to posts.** Since you can't actually publish, let users one-click copy formatted content for manual posting. This is the actual value delivery mechanism.

9. **Validate API inputs server-side.** At minimum: required `content` field on posts, valid platform values, valid date formats. Return 400 with clear error messages.

10. **Fix the Apify scan UX.** Check if `APIFY_TOKEN` is configured before allowing scans. If not set, show "Configure Apify token to enable content scanning" instead of silently failing.

### Medium Impact

11. **Make the Inspiration page useful without Apify.** Pre-populate with content templates, writing prompts, or trending topic suggestions. An empty inspiration page with a broken scan button is a dead end.

12. **Add "Duplicate post" / "Repurpose to platform" button.** The SKILL.md talks about repurposing content — the UI should support it. Click a LinkedIn post → "Adapt for Twitter" → creates a new draft with truncated content.

13. **Show media URL in preview.** If a user enters a media URL, render it (or at least show a placeholder image) in the preview pane.

14. **Add post status workflow buttons.** "Mark as Published" button on scheduled posts. Currently, the only way to change status is to edit the post and manually change it.

15. **Fix the polling race condition** in `pollApifyRun`. Use result ID instead of array index.

16. **Add authentication.** Even basic token auth would prevent unauthorized access.

### Low Impact (polish)

17. **Add keyboard shortcuts.** Cmd+Enter to save post, Escape to close modal.

18. **Debounce the reference search input.**

19. **Add post character count enforcement.** Currently just a visual warning — should prevent saving if over limit (or at least warn more aggressively).

20. **Add dark/light theme toggle.** The dark theme is beautiful but some users prefer light.

21. **Render hashtags as tags in post lists** (dashboard, scheduler) so users can see them at a glance.

22. **Add "Draft → Scheduled → Published" visual pipeline** to the scheduler page, like a kanban board.

---

## Summary

The app is a **solid CRUD skeleton with a beautiful UI** but delivers almost no actual value out of the box. The critical path is:

1. New user opens dashboard → sees nothing → doesn't know what to do → leaves
2. AI agent asks 6 questions → user gets bored → leaves
3. User creates a post → can't publish it → leaves

**The #1 fix is a first-run onboarding experience in the web UI** that generates sample content immediately. The #2 fix is giving users a way to actually *use* the content (copy-to-clipboard at minimum). The #3 fix is being honest about what's fake (analytics) and what's not implemented (publishing).

Time-to-first-value today: **∞ (no clear path to value)**  
Time-to-first-value with fixes 1+2+8: **~2 minutes**

---

## Fixes Applied

**Date:** 2026-02-11

### Critical (all done)

1. **✅ First-run welcome/onboarding screen** — When `onboardingComplete` is false and no posts exist, the dashboard shows a guided welcome screen with 2 questions (business/audience + platforms). Users can also skip to explore freely. Config gains `onboardingComplete` flag.

2. **✅ BOOTSTRAP.md compressed to 2 questions** — Removed the 6-step interrogation. Now asks business/audience + platforms, then immediately creates sample drafts. Added honest notes about planning-only nature and manual publishing.

3. **✅ Fake analytics completely removed** — All `Math.random()` removed from server and client. Analytics now shows only real data: post counts (total, drafts, scheduled, published), weekly post creation trend (actual counts), and platform breakdown by published posts. Empty states say "No posts created this week" instead of showing fake numbers.

4. **✅ Loading states added** — Spinner shown during initial `loadAll()`. If server is unreachable, shows error with retry button instead of blank screen.

### High Impact (all done)

5. **✅ Toast notification system** — Replaced all `alert()` calls with non-blocking toast notifications (success/error). Toasts appear top-right, auto-dismiss after 3 seconds. Used for: post saved, settings updated, reference deleted, copy to clipboard, errors.

6. **✅ Error handling on all API calls** — `api()` helper now checks `res.ok` and throws with server error message. All callers wrapped in try/catch with user-friendly error toasts. Network failures on initial load show error state with retry button.

7. **✅ SKILL.md updated for honesty** — Explicitly documents: no automatic publishing (planning tool only), analytics show activity data not engagement metrics, Apify requires configuration. Added first-run detection guidance and error recovery section.

8. **✅ "Copy to Clipboard" buttons everywhere** — Added to: post editor preview pane, scheduler list rows, calendar day modal, inspiration cards, reference cards. Uses `navigator.clipboard` with fallback. `formatPostForCopy()` formats title + content + hashtags.

9. **✅ Server-side input validation** — Posts require non-empty `content`. Platform must be one of the valid 6. Status must be draft/scheduled/published. Invalid dates rejected. Arrays validated. Returns 400 with clear error messages.

10. **✅ Apify scan UX fixed** — New `/api/scan/status` endpoint exposes whether `APIFY_TOKEN` is configured. Inspiration page shows warning banner when not configured. Scan button shows error toast if unconfigured. Scan modal validates non-empty URLs.

### Medium Impact (done)

11. **✅ Reference delete confirmation** — References now require `confirm()` before deletion, matching posts behavior.

12. **✅ Polling race condition fixed** — `pollApifyRun` now uses result `id` instead of array index. Finds by ID on each poll iteration so concurrent scans can't corrupt each other. Also logs polling errors and marks timed-out scans as failed.

13. **✅ Media URL shown in preview** — Post editor preview now renders media URL as an image (with fallback to text URL if image fails to load).

14. **✅ "Mark as Published" button** — Scheduler list rows have a ✅ button to mark scheduled posts as published without editing.

15. **✅ Debounced reference search** — Search input debounced at 250ms instead of firing on every keystroke.

16. **✅ Scheduler explains planning mode** — Notice card at top explains that posts are for manual publishing via copy button.

17. **✅ Editor validation UX** — Inline error messages below save buttons (not alerts). Content field marked as required. Buttons show "Saving..." state while API calls are in progress.

18. **✅ Apify polling error handling** — Catch block now logs errors instead of silently swallowing. Max-attempt timeout marks scan as failed instead of leaving it "running" forever.

### Summary

All critical, high-impact, and several medium-impact items from the audit have been addressed. The app now has:
- A clear first-run experience (welcome → 2 questions → ready)
- Honest data everywhere (no fake analytics)
- Copy-to-clipboard as the primary value delivery mechanism
- Proper error handling and loading states throughout
- Input validation on both client and server
- Toast notifications instead of `alert()`
