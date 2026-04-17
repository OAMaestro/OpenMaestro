# Workflow: Higgsfield Content Batch
**Type:** Example (customise before use)
**Target URL:** varies — see model URLs below
**Status:** ready

---

## What This Workflow Does
Automates batch image or video generation on Higgsfield. Iterates through a prompt list, generates at specified settings, waits for each to complete.

**Supported model URLs:**
- NanoBanana 2: `https://higgsfield.ai/image/nano_banana_2`
- Soul 2.0: `https://higgsfield.ai/image/soul_2_0`
- Seedance 2.0: `https://higgsfield.ai/create/video?model=seedance_2_0`
- Cinema Studio: `https://higgsfield.ai/video/cinema_studio`
- Kling 3.0: `https://higgsfield.ai/video/kling_3_0`

---

## ⚠️ Critical: Prompt Bar Fix

**The most important thing in this workflow.**

Higgsfield's prompt input is a `contenteditable` div. Between generations, previous prompt text bleeds into the next one unless you clear it via JavaScript. Standard Playwright `.clear()` does not work.

**Clear the prompt bar before EVERY prompt:**
```javascript
const editor = document.querySelector('[id="hf:tour-image-prompt"] [contenteditable]')
  || document.querySelector('[contenteditable="true"]');
editor.innerHTML = '<p><br></p>';
editor.dispatchEvent(new Event('input', { bubbles: true }));
```

After clearing: take a screenshot and visually confirm the bar is empty. If any text remains, clear again before typing.

---

## Settings to Confirm Before Starting
Ask the user:
- Which model URL?
- Aspect ratio (e.g. 9:16, 1:1, 16:9)?
- Image/video count per prompt?
- Quality setting (e.g. 2K unlimited ON/OFF)?
- Should you review outputs between prompts or run the full batch unattended?

---

## Observed Selectors (verify with inspect.js before use)
```json
{
  "prompt_input": { "selector": "[contenteditable='true']", "note": "ALWAYS clear via JS before typing" },
  "generate_button": { "selector": "button:has-text('Generate')", "fallback": "[aria-label='Generate']" },
  "aspect_ratio_control": { "note": "varies by model page — run inspect.js to find" }
}
```

Run `node scripts/inspect.js <model-url>` to get current selectors before running.

---

## Automation Steps

**Setup (once per session):**
1. [ ] Navigate to model URL
2. [ ] Take screenshot — verify page loaded and user is logged in
3. [ ] Confirm settings with user (aspect ratio, count, quality)
4. [ ] Take screenshot of settings panel — confirm they match

**For each prompt in the list:**
5. [ ] Run JS clear on prompt bar
6. [ ] Take screenshot — verify bar is empty (no previous text)
7. [ ] If not empty: run JS clear again, re-verify before proceeding
8. [ ] Type prompt with `slowly: true`
9. [ ] Verify typed text matches prompt (screenshot)
10. [ ] Click Generate button
11. [ ] Wait for generation to complete (loading indicator disappears)
12. [ ] Take screenshot of result
13. [ ] Update session tracker — mark this prompt ✅ Done
14. [ ] Run JS clear immediately after generate
15. [ ] Wait 7 seconds before next prompt

**After all prompts:**
16. [ ] Take screenshot of gallery showing all generated items
17. [ ] Tell user: "All [N] prompts generated. Your outputs are in the Higgsfield gallery."

---

## Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| Prompt bar retains previous text | Always JS clear before typing — this is mandatory |
| Settings reset between generations | Re-confirm settings panel before each generation |
| Generation queues multiple jobs if clicked twice | Wait for loading indicator — never double-click Generate |
| Model URL changed | Run `node scripts/inspect.js https://higgsfield.ai` to find updated model paths |
| Extra free gens toggle affects quality | Confirm OFF before starting if user doesn't want it |
