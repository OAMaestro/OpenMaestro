# Workflow: Research Compiler
**Type:** Example (customise before use)
**Target URL:** varies — any list of URLs
**Status:** ready
**Bot Detection Risk:** LOW (reading public pages)

---

## What This Workflow Does
Given a list of URLs, visits each one, extracts the main content, and compiles it into a single structured markdown document. Ideal first workflow for new users — works reliably on most public websites.

---

## Settings to Confirm Before Starting
Ask the user:
- What is the list of URLs to visit?
- What specific information to extract from each? (e.g. "main article text", "prices and product names", "contact information")
- What should the output file be called? (saved to `output/research-[date].md`)

---

## Automation Steps

**Setup:**
1. [ ] Create output directory: `mkdir -p output`
2. [ ] Create output file: `output/research-[YYYY-MM-DD].md` with a header

**For each URL in the list:**
3. [ ] Run `node scripts/inspect.js <url>` — read screenshot to confirm page loaded
4. [ ] If inspect.js shows `login_required: true` — skip this URL, note it in output as "requires login"
5. [ ] Navigate to URL via Playwright MCP
6. [ ] Wait for page to load (network idle)
7. [ ] Extract main content (use page.evaluate to get text from main content area, article, or body)
8. [ ] Extract the specific information the user requested
9. [ ] Append to output file in this format:
   ```markdown
   ## [Page Title]
   **URL:** [url]
   **Extracted:** [date]
   
   [extracted content]
   
   ---
   ```
10. [ ] Take screenshot for reference
11. [ ] Update session tracker — this URL ✅ Done
12. [ ] Wait 2 seconds before next URL (polite crawling)

**Completion:**
13. [ ] Tell user: "Research complete. Compiled [N] pages into output/research-[date].md"

---

## Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| Page behind paywall | Skip and note as "paywall — skipped" |
| Dynamic content (JS-rendered) | Wait for specific element to appear before extracting |
| Very long page | Extract only the first 2000 words or use page section selector |
| Anti-bot on some URLs | inspect.js will flag it — skip or warn user |
