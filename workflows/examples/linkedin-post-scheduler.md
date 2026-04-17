# Workflow: LinkedIn Post Scheduler
**Type:** Example (customise before use)
**Target URL:** https://www.linkedin.com
**Status:** ready
**⚠️ Bot Detection Risk:** HIGH — use slowly:true on all interactions

---

## What This Workflow Does
Given a list of posts and publish times, opens LinkedIn, navigates to the post composer, writes each post, and schedules it for the specified time.

---

## ⚠️ Bot Detection Warning

LinkedIn actively monitors for automation. Stealth mode is active but:
- Always use `slowly: true` for all typing
- Add a 3-5 second random wait between posts
- If LinkedIn shows a security challenge, stop and tell the user

---

## Settings to Confirm Before Starting
Ask the user to provide posts in this format:
```
Post 1:
Text: [post content]
Schedule: [date and time, e.g. "April 18 at 10:00 AM"]

Post 2:
Text: [post content]
Schedule: [date and time]
```

Ask: Should posts include any images/attachments? If yes, user must provide file paths.

---

## Observed Selectors (verify with inspect.js before use)
```json
{
  "start_post_button": { "selector": "button:has-text('Start a post')", "aria_label": "Start a post" },
  "post_composer": { "selector": ".ql-editor[contenteditable='true']", "note": "clear via JS before typing" },
  "schedule_toggle": { "selector": "button[aria-label*='schedule' i]", "note": "look for clock icon near Post button" },
  "post_button": { "selector": "button:has-text('Post')" }
}
```

Run `node scripts/inspect.js https://www.linkedin.com/feed/` after logging in to verify current selectors.

---

## Automation Steps

**For each post in the list:**
1. [ ] Navigate to LinkedIn feed (https://www.linkedin.com/feed/)
2. [ ] Take screenshot — verify logged in (shows feed, not login page)
3. [ ] Click "Start a post" button
4. [ ] Wait for post composer to open
5. [ ] Run JS clear on composer: `.ql-editor[contenteditable]` → clear innerHTML
6. [ ] Type post text with `slowly: true`
7. [ ] Verify text appears correctly (screenshot)
8. [ ] Click the schedule toggle (clock icon near Post button)
9. [ ] Select date and time from the date picker
10. [ ] Confirm scheduled time is correct (screenshot)
11. [ ] Click "Schedule" or "Next" button
12. [ ] Verify confirmation message appears
13. [ ] Update session tracker — this post ✅ Done
14. [ ] Wait 4 seconds before next post

---

## Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| LinkedIn shows security challenge | Stop — tell user, do not attempt to bypass |
| Composer doesn't open | Wait 3s, try clicking "Start a post" once more |
| Schedule picker UI changes | Run inspect.js on the feed page to get updated selectors |
| Post fails to schedule | Take screenshot, describe error to user |
