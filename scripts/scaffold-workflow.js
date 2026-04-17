#!/usr/bin/env node
// scripts/scaffold-workflow.js
// Creates workflow spec and session tracker files.
// Usage: node scripts/scaffold-workflow.js <workflow-name>

'use strict';

const fs = require('fs');
const path = require('path');

function sanitiseName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{3,}/g, '--')   // collapse 3+ consecutive hyphens → 2 (special-char runs)
    .replace(/^-+|-+$/g, '');
}

function buildWorkflowContent(name, date) {
  return `# Workflow: ${name}
**Created:** ${date}
**Target URL:** [fill in after running: node scripts/inspect.js <url>]
**AI used:** [fill in]
**Status:** draft

---

## What This Workflow Does
[Describe the task this automates — what it does start to finish]

---

## Onboarding Answers

**Tool/URL:** [url]

**Manual steps (what the user does manually):**
1. [step 1]
2. [step 2]
3. [step 3]

**Decision points:** [are any steps variable, or always the same every time?]

**Success looks like:** [how do you know the task is done correctly?]

**Never do:** [anything the AI must never click, change, or touch]

**Run mode:** [watched / unattended]

**User-specific notes:** [anything about how this particular user does it differently — personal style, quality bars, business rules]

---

## Research Notes
[Findings from web search: known quirks of the tool, Playwright-specific issues, keyboard shortcuts, bot detection status]

---

## Observed Selectors (from inspect.js)

Run: \`node scripts/inspect.js <url>\` and paste relevant entries here.

\`\`\`json
{
  "primary_input": { "selector": "[fill in]", "type": "[fill in]" },
  "submit_button": { "selector": "[fill in]", "text": "[fill in]" },
  "key_elements": []
}
\`\`\`

---

## Automation Steps

Follow in exact order. Update the session tracker after each completed step.

1. [ ] Navigate to [url] — take screenshot to verify page loaded
2. [ ] [step 2]
3. [ ] [step 3]

---

## Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| [issue] | [workaround] |

---

## Notes
[Any other observations about this workflow]
`;
}

function buildSessionContent(name, date) {
  return `# Session: ${name}
**Last updated:** ${date}
**Status:** pending

---

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | [step 1] | ⏳ Pending | |
| 2 | [step 2] | ⏳ Pending | |
| 3 | [step 3] | ⏳ Pending | |

---

## Recovery Command
Tell your AI: "Resume my ${name} workflow"
→ AI reads this file and continues from the last ✅ Done step.
`;
}

function createWorkflowFiles(name, workflowsDir, date) {
  const sanitised = sanitiseName(name);
  const workflowPath = path.join(workflowsDir, `${sanitised}.md`);
  const sessionPath = path.join(workflowsDir, `${sanitised}-session.md`);

  if (fs.existsSync(workflowPath)) {
    throw new Error(`Workflow already exists: ${workflowPath}`);
  }

  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }

  fs.writeFileSync(workflowPath, buildWorkflowContent(sanitised, date));
  fs.writeFileSync(sessionPath, buildSessionContent(sanitised, date));

  return { workflowPath, sessionPath };
}

// CLI entry
if (require.main === module) {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: node scripts/scaffold-workflow.js <workflow-name>');
    process.exit(1);
  }

  const date = new Date().toISOString().split('T')[0];
  const workflowsDir = path.join(__dirname, '..', 'workflows');

  try {
    const { workflowPath, sessionPath } = createWorkflowFiles(name, workflowsDir, date);
    console.log(`✅ Created: ${workflowPath}`);
    console.log(`✅ Created: ${sessionPath}`);
    console.log('\nNext steps:');
    console.log(`  1. Run: node scripts/inspect.js <your-target-url>`);
    console.log(`  2. Fill in the workflow file with onboarding answers + selectors`);
    console.log(`  3. Tell your AI: "Run my ${path.basename(workflowPath, '.md')} workflow"`);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { sanitiseName, buildWorkflowContent, buildSessionContent, createWorkflowFiles };
