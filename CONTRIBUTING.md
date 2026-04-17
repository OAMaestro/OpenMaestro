# Contributing to OpenMaestro

The most valuable contribution is a new workflow template. No code required.

---

## Adding a Workflow Template

A workflow template is a structured markdown file that documents how to automate a specific tool or task. Others can clone it, run `node scripts/inspect.js` to verify the selectors, and adapt it to their account.

### Format

Copy this structure:

```markdown
# Workflow: [Tool Name] — [What It Does]
**Type:** Example
**Target URL:** [url]
**Status:** ready
**Bot Detection Risk:** LOW / MEDIUM / HIGH

## What This Workflow Does
[One paragraph description]

## ⚠️ Important Notes (if any)
[Known quirks, critical fixes like the Higgsfield JS clear]

## Settings to Confirm Before Starting
[Questions to ask the user before running]

## Observed Selectors (verify with inspect.js before use)
[JSON block with key selectors]

## Automation Steps
[Numbered checkbox list]

## Known Issues & Workarounds
[Table]
```

### Submission

1. Fork the repo
2. Add your workflow to `workflows/examples/[tool-name]-[action].md`
3. Run `node scripts/inspect.js <url>` and verify your selectors are current
4. Open a PR with the title: `workflow: add [Tool Name] — [what it does]`

---

## Improving the Brain File

If you find that `OPENMAESTRO.md` handles a situation poorly (wrong error behaviour, missing capability, unclear instruction), open an issue describing what happened and what the AI should have done instead. PRs to `OPENMAESTRO.md` are welcome — just explain the scenario it fixes.

---

## Bugs in Scripts

`scripts/inspect.js` and `scripts/scaffold-workflow.js` have tests in `tests/`. Run `npm test` before submitting. Add a test for any bug you fix.

---

## Code of Conduct

Be kind. This is a tool built to help people, not to enable harmful automation. PRs that enable bypassing paywalls, scraping personal data without consent, or automating interactions people haven't agreed to will be declined.
