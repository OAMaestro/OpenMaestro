# OpenMaestro v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build OpenMaestro v1 — an LLM-agnostic, open-source browser automation framework that gives any MCP-capable AI a real browser, intelligent onboarding, and live DOM inspection so users can automate any browser-based workflow on their own machine with no new subscriptions.

**Architecture:** OPENMAESTRO.md is the master brain file (copied by setup to the platform-specific file for each AI). Two Node.js helper scripts handle the critical operations: inspect.js maps a live page's DOM before scripting starts, scaffold-workflow.js creates structured workflow spec files. Setup scripts detect which AI the user has and configure Playwright MCP accordingly.

**Tech Stack:** Node.js, playwright-extra, puppeteer-extra-plugin-stealth, @playwright/mcp, Bash (install.sh), PowerShell (install.ps1), Markdown (all content files)

**Spec:** `docs/superpowers/specs/2026-04-17-openmaestro-design.md`

---

## Pre-Flight: Before Running This Plan

1. Move this project folder to the new `oamaestro` GitHub org location
2. `git init` in the project root
3. Create initial commit with spec + plan files only
4. Run tasks below in order

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Node.js dependencies (playwright, playwright-extra, stealth plugin) |
| `.gitignore` | Exclude generated platform files, node_modules, tmp/ |
| `LICENSE` | MIT |
| `scripts/inspect.js` | Navigate to URL → extract DOM structure + detect bot blockers → JSON to stdout |
| `scripts/scaffold-workflow.js` | Create `workflows/<name>.md` + `workflows/<name>-session.md` from templates |
| `tests/inspect.test.js` | Unit tests for inspect.js logic (mock HTML, bot detection, error handling) |
| `tests/scaffold.test.js` | Unit tests for scaffold-workflow.js (file creation, name sanitisation) |
| `install.sh` | Mac/Linux: AI choice → Node check → Playwright install → MCP config → brain file copy → health check |
| `install.ps1` | Windows: identical logic in PowerShell |
| `OPENMAESTRO.md` | Master brain file: capabilities, onboarding protocol, research+inspection protocol, execution rules, error handling |
| `.mcp.json.template` | Reference MCP server config (setup generates real one per platform) |
| `SESSION-RESUME.md` | Fallback crash recovery template |
| `workflows/examples/higgsfield-content-batch.md` | Runnable workflow: Higgsfield batch generation with JS-clear fix |
| `workflows/examples/linkedin-post-scheduler.md` | Runnable workflow: LinkedIn post scheduling (stealth-aware) |
| `workflows/examples/research-compiler.md` | Runnable workflow: multi-URL research extraction |
| `README.md` | Marketing + documentation: positioning, install, how it works, comparison table |
| `CONTRIBUTING.md` | How to add workflow templates |

---

## Task 1: Repo Foundation

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `tmp/.gitkeep`
- Create: `workflows/examples/.gitkeep`

- [ ] **Step 1.1: Create package.json**

```json
{
  "name": "openmaestro",
  "version": "1.0.0",
  "description": "Give any AI hands. Automate any browser-based workflow on your own machine.",
  "license": "MIT",
  "scripts": {
    "inspect": "node scripts/inspect.js",
    "scaffold": "node scripts/scaffold-workflow.js",
    "test": "node tests/run-tests.js"
  },
  "dependencies": {
    "playwright-extra": "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",
    "playwright": "^1.49.0"
  }
}
```

- [ ] **Step 1.2: Create .gitignore**

```
# Generated platform brain files (created by install scripts)
CLAUDE.md
.cursorrules
.windsurfrules
AGENTS.md

# Generated MCP configs (created by install scripts)
.mcp.json
.cursor/mcp.json
.windsurf/mcp.json
.vscode/mcp.json

# Node
node_modules/

# Inspection screenshots
tmp/*.png
tmp/*.jpg

# User-created workflows (not examples)
workflows/*.md
workflows/*-session.md
!workflows/examples/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 1.3: Create LICENSE (MIT)**

```
MIT License

Copyright (c) 2026 OA Maestro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 1.4: Create directory placeholders**

```bash
mkdir -p tmp workflows/examples scripts tests
touch tmp/.gitkeep workflows/examples/.gitkeep
```

- [ ] **Step 1.5: Commit**

```bash
git add package.json .gitignore LICENSE tmp/.gitkeep workflows/examples/.gitkeep
git commit -m "chore: repo foundation — package.json, license, gitignore"
```

---

## Task 2: inspect.js + Tests

**Files:**
- Create: `scripts/inspect.js`
- Create: `tests/inspect.test.js`
- Create: `tests/run-tests.js`

### Step 2a: Tests first

- [ ] **Step 2.1: Write failing tests for inspect.js**

Create `tests/inspect.test.js`:

```javascript
// tests/inspect.test.js
// Tests for inspect.js helper logic
// Runs without launching a real browser — tests the extraction and detection logic

const assert = require('assert');

// --- Helpers under test (extracted for testability) ---
// These functions will be exported from scripts/inspect.js

const {
  sanitiseSelector,
  detectBotSignals,
  detectCaptcha,
  detectLoginRedirect,
  buildElementEntry,
} = require('../scripts/inspect.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n--- inspect.js unit tests ---\n');

// sanitiseSelector: prefer id, then data-testid, then name, then class, else fallback
test('sanitiseSelector: uses id when present', () => {
  const el = { id: 'generate-btn', className: 'btn primary', tagName: 'BUTTON' };
  assert.strictEqual(sanitiseSelector(el), '#generate-btn');
});

test('sanitiseSelector: uses data-testid when no id', () => {
  const el = { id: '', dataset: { testid: 'submit' }, tagName: 'BUTTON', className: '' };
  assert.strictEqual(sanitiseSelector(el), '[data-testid="submit"]');
});

test('sanitiseSelector: falls back to tagName when nothing else', () => {
  const el = { id: '', dataset: {}, tagName: 'BUTTON', className: '' };
  assert.strictEqual(sanitiseSelector(el), 'button');
});

// detectBotSignals: scans page HTML string for known signatures
test('detectBotSignals: detects Cloudflare', () => {
  const html = '<html><div class="cf-browser-verification">verify</div></html>';
  const signals = detectBotSignals(html);
  assert.ok(signals.includes('cloudflare'));
});

test('detectBotSignals: detects DataDome', () => {
  const html = '<script src="https://dd.datadome.co/tags.js"></script>';
  const signals = detectBotSignals(html);
  assert.ok(signals.includes('datadome'));
});

test('detectBotSignals: detects PerimeterX', () => {
  const html = '<script>window._pxAppId = "PXabc123";</script>';
  const signals = detectBotSignals(html);
  assert.ok(signals.includes('perimeterx'));
});

test('detectBotSignals: returns empty array for clean page', () => {
  const html = '<html><body><h1>Hello</h1></body></html>';
  const signals = detectBotSignals(html);
  assert.deepStrictEqual(signals, []);
});

// detectCaptcha: checks iframe src for known captcha providers
test('detectCaptcha: detects hCaptcha', () => {
  const iframeSrcs = ['https://hcaptcha.com/captcha/v1/abc'];
  const result = detectCaptcha(iframeSrcs);
  assert.strictEqual(result.detected, true);
  assert.strictEqual(result.type, 'hcaptcha');
});

test('detectCaptcha: detects reCAPTCHA', () => {
  const iframeSrcs = ['https://www.google.com/recaptcha/api2/anchor'];
  const result = detectCaptcha(iframeSrcs);
  assert.strictEqual(result.detected, true);
  assert.strictEqual(result.type, 'recaptcha');
});

test('detectCaptcha: detects Cloudflare Turnstile', () => {
  const iframeSrcs = ['https://challenges.cloudflare.com/turnstile/v0/api.js'];
  const result = detectCaptcha(iframeSrcs);
  assert.strictEqual(result.detected, true);
  assert.strictEqual(result.type, 'cloudflare-turnstile');
});

test('detectCaptcha: returns not detected for clean page', () => {
  const result = detectCaptcha([]);
  assert.strictEqual(result.detected, false);
  assert.strictEqual(result.type, 'none');
});

// detectLoginRedirect: checks if current URL suggests login redirect
test('detectLoginRedirect: detects /login in URL', () => {
  assert.strictEqual(detectLoginRedirect('https://app.example.com/login?next=/dashboard'), true);
});

test('detectLoginRedirect: detects /signin in URL', () => {
  assert.strictEqual(detectLoginRedirect('https://example.com/signin'), true);
});

test('detectLoginRedirect: returns false for normal URL', () => {
  assert.strictEqual(detectLoginRedirect('https://higgsfield.ai/image/nano_banana_2'), false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2.2: Create tests/run-tests.js**

```javascript
// tests/run-tests.js
require('./inspect.test.js');
require('./scaffold.test.js');
```

- [ ] **Step 2.3: Run tests — expect FAIL (module not found)**

```bash
node tests/run-tests.js
```

Expected output: `Error: Cannot find module '../scripts/inspect.js'`

### Step 2b: Implement inspect.js

- [ ] **Step 2.4: Create scripts/inspect.js**

```javascript
#!/usr/bin/env node
// scripts/inspect.js
// Inspects a URL: opens stealth browser, maps interactive elements, detects blockers.
// Usage: node scripts/inspect.js <url>
// Output: JSON to stdout

'use strict';

const path = require('path');
const fs = require('fs');

// --- Pure logic functions (exported for testing) ---

function sanitiseSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.dataset && el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;
  if (el.name) return `[name="${el.name}"]`;
  if (el.className && typeof el.className === 'string' && el.className.trim()) {
    return `.${el.className.trim().split(/\s+/)[0]}`;
  }
  return el.tagName ? el.tagName.toLowerCase() : 'unknown';
}

function detectBotSignals(html) {
  const signals = [];
  if (html.includes('cf-browser-verification') || html.includes('__cf_chl') || html.includes('cf_clearance')) {
    signals.push('cloudflare');
  }
  if (html.includes('datadome') || html.includes('dd.datadome.co')) {
    signals.push('datadome');
  }
  if (html.includes('PerimeterX') || html.includes('_pxAppId') || html.includes('px-captcha')) {
    signals.push('perimeterx');
  }
  if (html.includes('akamai') && html.includes('bmak')) {
    signals.push('akamai');
  }
  return signals;
}

function detectCaptcha(iframeSrcs) {
  for (const src of iframeSrcs) {
    if (src.includes('hcaptcha.com')) return { detected: true, type: 'hcaptcha' };
    if (src.includes('recaptcha')) return { detected: true, type: 'recaptcha' };
    if (src.includes('turnstile') || (src.includes('cloudflare.com') && src.includes('challenge'))) {
      return { detected: true, type: 'cloudflare-turnstile' };
    }
  }
  return { detected: false, type: 'none' };
}

function detectLoginRedirect(url) {
  return /\/(login|signin|sign-in|auth|log-in)/i.test(url);
}

// --- Main inspection (browser required) ---

async function inspectPage(url) {
  const { chromium } = require('playwright-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  chromium.use(StealthPlugin());

  const tmpDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const result = {
    url,
    title: '',
    screenshot: '',
    interactive_elements: [],
    potential_blockers: {
      login_required: false,
      captcha_detected: false,
      captcha_type: 'none',
      bot_detection_signals: [],
      rate_limit_message: false,
    },
    notes: '',
  };

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    result.notes = e.message.includes('timeout')
      ? 'Page load timed out after 15s — partial results returned'
      : `Navigation error: ${e.message}`;
  }

  result.title = await page.title();
  result.potential_blockers.login_required = detectLoginRedirect(page.url());

  // Screenshot
  const screenshotPath = path.join(tmpDir, `inspect-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  result.screenshot = screenshotPath;

  // Bot detection from page source
  const html = await page.content();
  result.potential_blockers.bot_detection_signals = detectBotSignals(html);

  // Rate limit detection
  if (/rate.?limit|too many requests|429/i.test(html)) {
    result.potential_blockers.rate_limit_message = true;
  }

  // CAPTCHA detection
  const iframeElements = await page.$$('iframe');
  const iframeSrcs = await Promise.all(iframeElements.map(f => f.getAttribute('src').catch(() => '')));
  const captchaResult = detectCaptcha(iframeSrcs.filter(Boolean));
  result.potential_blockers.captcha_detected = captchaResult.detected;
  result.potential_blockers.captcha_type = captchaResult.type;

  // Extract interactive elements via page.evaluate
  const elements = await page.evaluate(() => {
    const out = [];

    function getSelector(el) {
      if (el.id) return `#${el.id}`;
      const testid = el.getAttribute('data-testid');
      if (testid) return `[data-testid="${testid}"]`;
      if (el.name) return `[name="${el.name}"]`;
      const cls = (el.className || '').trim().split(/\s+/)[0];
      if (cls) return `.${cls}`;
      return el.tagName.toLowerCase();
    }

    // Buttons
    document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').forEach(el => {
      if (!el.offsetParent) return;
      const rect = el.getBoundingClientRect();
      out.push({
        type: 'button',
        text: (el.textContent || el.value || '').trim().slice(0, 100),
        selector: getSelector(el),
        aria_label: el.getAttribute('aria-label') || '',
        visible: rect.width > 0 && rect.height > 0,
        position: { x: Math.round(rect.x), y: Math.round(rect.y) },
      });
    });

    // Text inputs + textareas
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').forEach(el => {
      if (!el.offsetParent) return;
      const rect = el.getBoundingClientRect();
      out.push({
        type: 'input',
        input_type: el.type || 'text',
        selector: getSelector(el),
        placeholder: el.placeholder || '',
        aria_label: el.getAttribute('aria-label') || '',
        visible: rect.width > 0 && rect.height > 0,
        position: { x: Math.round(rect.x), y: Math.round(rect.y) },
      });
    });

    // Contenteditable divs
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      if (!el.offsetParent) return;
      const rect = el.getBoundingClientRect();
      out.push({
        type: 'contenteditable',
        selector: getSelector(el),
        placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '',
        aria_label: el.getAttribute('aria-label') || '',
        visible: rect.width > 0 && rect.height > 0,
        position: { x: Math.round(rect.x), y: Math.round(rect.y) },
        note: 'Clear via JS before typing: el.innerHTML = "<p><br></p>"; el.dispatchEvent(new Event("input", {bubbles:true}))',
      });
    });

    // Selects
    document.querySelectorAll('select').forEach(el => {
      if (!el.offsetParent) return;
      out.push({
        type: 'select',
        selector: getSelector(el),
        options: Array.from(el.options).map(o => o.text),
        current_value: el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '',
      });
    });

    return out;
  });

  result.interactive_elements = elements;

  await browser.close();
  return result;
}

// --- CLI entry point ---
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error(JSON.stringify({ error: 'URL required. Usage: node scripts/inspect.js <url>' }));
    process.exit(1);
  }
  inspectPage(url)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => {
      console.error(JSON.stringify({ error: err.message, url }));
      process.exit(1);
    });
}

// --- Exports for testing ---
module.exports = { sanitiseSelector, detectBotSignals, detectCaptcha, detectLoginRedirect };
```

- [ ] **Step 2.5: Run tests — expect PASS**

```bash
node tests/inspect.test.js
```
(Run inspect tests directly — scaffold.test.js doesn't exist yet at this point. Full suite runs in Task 9.)

Expected output:
```
--- inspect.js unit tests ---

  ✅ sanitiseSelector: uses id when present
  ✅ sanitiseSelector: uses data-testid when no id
  ✅ sanitiseSelector: falls back to tagName when nothing else
  ✅ detectBotSignals: detects Cloudflare
  ✅ detectBotSignals: detects DataDome
  ✅ detectBotSignals: detects PerimeterX
  ✅ detectBotSignals: returns empty array for clean page
  ✅ detectCaptcha: detects hCaptcha
  ✅ detectCaptcha: detects reCAPTCHA
  ✅ detectCaptcha: detects Cloudflare Turnstile
  ✅ detectCaptcha: returns not detected for clean page
  ✅ detectLoginRedirect: detects /login in URL
  ✅ detectLoginRedirect: detects /signin in URL
  ✅ detectLoginRedirect: returns false for normal URL

Results: 14 passed, 0 failed
```

- [ ] **Step 2.6: Smoke test inspect.js against a real URL**

```bash
npm install
node scripts/inspect.js https://example.com
```

Expected: JSON output with `title: "Example Domain"`, at least one interactive_element, screenshot path, no potential_blockers flagged.

- [ ] **Step 2.7: Commit**

```bash
git add scripts/inspect.js tests/inspect.test.js tests/run-tests.js
git commit -m "feat: add inspect.js — stealth DOM inspection with bot detection"
```

---

## Task 3: scaffold-workflow.js + Tests

**Files:**
- Create: `scripts/scaffold-workflow.js`
- Create: `tests/scaffold.test.js`

- [ ] **Step 3.1: Write failing tests for scaffold-workflow.js**

Create `tests/scaffold.test.js`:

```javascript
// tests/scaffold.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { sanitiseName, buildWorkflowContent, buildSessionContent } = require('../scripts/scaffold-workflow.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n--- scaffold-workflow.js unit tests ---\n');

test('sanitiseName: lowercases and replaces spaces with hyphens', () => {
  assert.strictEqual(sanitiseName('My Higgsfield Batch'), 'my-higgsfield-batch');
});

test('sanitiseName: removes special characters', () => {
  assert.strictEqual(sanitiseName('LinkedIn Post! @2026'), 'linkedin-post--2026');
});

test('sanitiseName: trims leading/trailing hyphens', () => {
  assert.strictEqual(sanitiseName('  test  '), 'test');
});

test('buildWorkflowContent: contains workflow name in heading', () => {
  const content = buildWorkflowContent('my-workflow', '2026-04-17');
  assert.ok(content.includes('# Workflow: my-workflow'));
});

test('buildWorkflowContent: contains Created date', () => {
  const content = buildWorkflowContent('my-workflow', '2026-04-17');
  assert.ok(content.includes('2026-04-17'));
});

test('buildWorkflowContent: contains all required sections', () => {
  const content = buildWorkflowContent('my-workflow', '2026-04-17');
  assert.ok(content.includes('## What This Workflow Does'));
  assert.ok(content.includes('## Onboarding Answers'));
  assert.ok(content.includes('## Research Notes'));
  assert.ok(content.includes('## Observed Selectors'));
  assert.ok(content.includes('## Automation Steps'));
  assert.ok(content.includes('## Known Issues'));
});

test('buildSessionContent: contains workflow name in heading', () => {
  const content = buildSessionContent('my-workflow', '2026-04-17');
  assert.ok(content.includes('# Session: my-workflow'));
});

test('buildSessionContent: contains recovery command', () => {
  const content = buildSessionContent('my-workflow', '2026-04-17');
  assert.ok(content.includes('Resume my my-workflow workflow'));
});

// File creation test using a temp directory
test('scaffold creates both files in correct location', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openmaestro-test-'));
  const { createWorkflowFiles } = require('../scripts/scaffold-workflow.js');
  createWorkflowFiles('test-flow', tmpDir, '2026-04-17');
  assert.ok(fs.existsSync(path.join(tmpDir, 'test-flow.md')));
  assert.ok(fs.existsSync(path.join(tmpDir, 'test-flow-session.md')));
  fs.rmSync(tmpDir, { recursive: true });
});

test('scaffold throws when workflow already exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openmaestro-test-'));
  const { createWorkflowFiles } = require('../scripts/scaffold-workflow.js');
  createWorkflowFiles('duplicate', tmpDir, '2026-04-17');
  assert.throws(() => createWorkflowFiles('duplicate', tmpDir, '2026-04-17'), /already exists/);
  fs.rmSync(tmpDir, { recursive: true });
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 3.2: Run tests — expect FAIL (module not found)**

```bash
node tests/scaffold.test.js
```

Expected: `Error: Cannot find module '../scripts/scaffold-workflow.js'`

- [ ] **Step 3.3: Create scripts/scaffold-workflow.js**

```javascript
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
```

- [ ] **Step 3.4: Run tests — expect PASS**

```bash
node tests/run-tests.js
```

Expected: All tests pass (14 inspect + 9 scaffold = 23 total).

- [ ] **Step 3.5: Smoke test scaffold**

```bash
node scripts/scaffold-workflow.js "my-test-workflow"
ls workflows/
```

Expected: `my-test-workflow.md` and `my-test-workflow-session.md` created in `workflows/`.

Clean up: `rm workflows/my-test-workflow*.md`

- [ ] **Step 3.6: Commit**

```bash
git add scripts/scaffold-workflow.js tests/scaffold.test.js
git commit -m "feat: add scaffold-workflow.js — creates workflow spec + session tracker"
```

---

## Task 4: install.sh (Mac/Linux)

**Files:**
- Create: `install.sh`

- [ ] **Step 4.1: Create install.sh**

```bash
#!/usr/bin/env bash
# OpenMaestro Setup — Mac/Linux
# Usage: bash install.sh
# Or via one-liner: git clone https://github.com/oamaestro/openmaestro && cd openmaestro && bash install.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║             OpenMaestro Setup              ║${NC}"
echo -e "${BLUE}║  Give any AI hands. Automate anything.     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Node.js ─────────────────────────────────────────────────────────
echo -e "${BLUE}[1/6] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found.${NC}"
  echo "  Install Node.js LTS from: https://nodejs.org"
  echo "  Then re-run: bash install.sh"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# ── Step 2: Choose AI ───────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}[2/6] Which AI are you using?${NC}"
echo "  [1] Claude Code"
echo "  [2] Cursor"
echo "  [3] Windsurf"
echo "  [4] GitHub Copilot (VS Code)"
echo "  [5] Other — I'll configure manually"
echo ""
read -p "Enter number (1-5): " AI_CHOICE

case "$AI_CHOICE" in
  1) AI_NAME="Claude Code" ;;
  2) AI_NAME="Cursor" ;;
  3) AI_NAME="Windsurf" ;;
  4) AI_NAME="GitHub Copilot (VS Code)" ;;
  5) AI_NAME="Manual" ;;
  *) echo -e "${YELLOW}⚠ Unrecognised choice — defaulting to manual.${NC}"; AI_CHOICE=5; AI_NAME="Manual" ;;
esac

echo -e "${GREEN}✓ Configuring for: $AI_NAME${NC}"

# ── Step 3: Playwright + stealth ────────────────────────────────────────────
echo ""
echo -e "${BLUE}[3/6] Installing Playwright + stealth browser stack...${NC}"
npm install --silent playwright playwright-extra puppeteer-extra-plugin-stealth
npx playwright install chromium --quiet 2>/dev/null || npx playwright install chromium
echo -e "${GREEN}✓ Playwright + stealth installed${NC}"

# ── Step 4: MCP config ──────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}[4/6] Configuring Playwright MCP for $AI_NAME...${NC}"

MCP_JSON='{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headed",
        "--browser", "chrome",
        "--launch-option", "--disable-blink-features=AutomationControlled",
        "--launch-option", "--window-size=1920,1080"
      ]
    }
  }
}'

case "$AI_CHOICE" in
  1)
    # Write .mcp.json to project root — Claude Code reads this automatically
    echo "$MCP_JSON" > .mcp.json
    echo -e "${GREEN}✓ .mcp.json written (Claude Code reads from project root automatically)${NC}"
    if ! command -v claude &> /dev/null; then
      echo -e "${YELLOW}⚠ Claude Code CLI not installed yet.${NC}"
      echo "  Install: npm install -g @anthropic-ai/claude-code"
    fi
    ;;
  2) mkdir -p .cursor && echo "$MCP_JSON" > .cursor/mcp.json && echo -e "${GREEN}✓ .cursor/mcp.json written${NC}" ;;
  3) mkdir -p .windsurf && echo "$MCP_JSON" > .windsurf/mcp.json && echo -e "${GREEN}✓ .windsurf/mcp.json written${NC}" ;;
  4) mkdir -p .vscode && echo "$MCP_JSON" > .vscode/mcp.json && echo -e "${GREEN}✓ .vscode/mcp.json written${NC}" ;;
  5) cp .mcp.json.template .mcp.json && echo -e "${YELLOW}⚠ Manual: configure your AI using .mcp.json${NC}" ;;
esac

# ── Step 5: Brain file ──────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}[5/6] Writing brain file for $AI_NAME...${NC}"

case "$AI_CHOICE" in
  1) cp OPENMAESTRO.md CLAUDE.md && echo -e "${GREEN}✓ CLAUDE.md created${NC}" ;;
  2) cp OPENMAESTRO.md .cursorrules && echo -e "${GREEN}✓ .cursorrules created${NC}" ;;
  3) cp OPENMAESTRO.md .windsurfrules && echo -e "${GREEN}✓ .windsurfrules created${NC}" ;;
  4) cp OPENMAESTRO.md AGENTS.md && echo -e "${GREEN}✓ AGENTS.md created${NC}" ;;
  5) echo -e "${YELLOW}⚠ Manual: paste OPENMAESTRO.md content as your AI's system prompt${NC}" ;;
esac

# ── Step 6: Health check ────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}[6/6] Running health check...${NC}"
mkdir -p tmp

node -e "
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
chromium.launch({ headless: true }).then(b => {
  b.close().then(() => { console.log('ok'); process.exit(0); });
}).catch(e => { console.error(e.message); process.exit(1); });
" && echo -e "${GREEN}✓ Browser health check passed${NC}" || {
  echo -e "${RED}✗ Health check failed.${NC}"
  echo "  Try: npx playwright install chromium"
}

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          OpenMaestro is ready.             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Open this folder in $AI_NAME and say:"
echo ""
echo -e "  ${BLUE}\"Read your instructions and tell me what you can do.\"${NC}"
echo ""
echo "Useful commands:"
echo "  node scripts/inspect.js <url>        — map any page before automating"
echo "  node scripts/scaffold-workflow.js <name>  — create a new workflow file"
echo "  workflows/examples/                  — see example workflows"
echo ""
```

- [ ] **Step 4.2: Make executable**

```bash
chmod +x install.sh
```

- [ ] **Step 4.3: Verify script runs without errors on a dry pass**

Run it and choose option 5 (manual) to verify all steps execute cleanly without needing an AI installed:

```bash
bash install.sh
# Enter: 5
```

Expected: All 6 steps print, no unhandled errors, health check passes.

- [ ] **Step 4.4: Commit**

```bash
git add install.sh
git commit -m "feat: add install.sh — one-command Mac/Linux setup with AI choice"
```

---

## Task 5: install.ps1 (Windows)

**Files:**
- Create: `install.ps1`

- [ ] **Step 5.1: Create install.ps1**

```powershell
# OpenMaestro Setup — Windows PowerShell
# Usage: .\install.ps1
# Or: git clone https://github.com/oamaestro/openmaestro; cd openmaestro; .\install.ps1

param()
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║             OpenMaestro Setup              ║" -ForegroundColor Cyan
Write-Host "║  Give any AI hands. Automate anything.     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Node.js ──────────────────────────────────────────────────────────
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Cyan
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "✗ Node.js not found." -ForegroundColor Red
  Write-Host "  Install Node.js LTS from: https://nodejs.org"
  Write-Host "  Then re-run: .\install.ps1"
  exit 1
}
$nodeVer = node --version
Write-Host "✓ Node.js $nodeVer" -ForegroundColor Green

# ── Step 2: Choose AI ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/6] Which AI are you using?" -ForegroundColor Cyan
Write-Host "  [1] Claude Code"
Write-Host "  [2] Cursor"
Write-Host "  [3] Windsurf"
Write-Host "  [4] GitHub Copilot (VS Code)"
Write-Host "  [5] Other — I'll configure manually"
Write-Host ""
$aiChoice = Read-Host "Enter number (1-5)"
$aiName = switch ($aiChoice) {
  "1" { "Claude Code" }
  "2" { "Cursor" }
  "3" { "Windsurf" }
  "4" { "GitHub Copilot (VS Code)" }
  "5" { "Manual" }
  default { Write-Host "⚠ Unrecognised — defaulting to manual." -ForegroundColor Yellow; $aiChoice = "5"; "Manual" }
}
Write-Host "✓ Configuring for: $aiName" -ForegroundColor Green

# ── Step 3: Playwright + stealth ─────────────────────────────────────────────
Write-Host ""
Write-Host "[3/6] Installing Playwright + stealth browser stack..." -ForegroundColor Cyan
npm install --silent playwright playwright-extra puppeteer-extra-plugin-stealth
npx playwright install chromium 2>$null
Write-Host "✓ Playwright + stealth installed" -ForegroundColor Green

# ── Step 4: MCP config ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/6] Configuring Playwright MCP for $aiName..." -ForegroundColor Cyan

$mcpJson = @'
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headed",
        "--browser", "chrome",
        "--launch-option", "--disable-blink-features=AutomationControlled",
        "--launch-option", "--window-size=1920,1080"
      ]
    }
  }
}
'@

switch ($aiChoice) {
  "1" {
    # Write .mcp.json to project root — Claude Code reads this automatically
    $mcpJson | Out-File -Encoding utf8 .mcp.json
    Write-Host "✓ .mcp.json written (Claude Code reads from project root automatically)" -ForegroundColor Green
    $claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
    if (-not $claudeCmd) {
      Write-Host "⚠ Claude Code CLI not installed yet." -ForegroundColor Yellow
      Write-Host "  Install: npm install -g @anthropic-ai/claude-code"
    }
  }
  "2" { New-Item -Force -ItemType Directory .cursor | Out-Null; $mcpJson | Out-File -Encoding utf8 .cursor\mcp.json; Write-Host "✓ .cursor\mcp.json written" -ForegroundColor Green }
  "3" { New-Item -Force -ItemType Directory .windsurf | Out-Null; $mcpJson | Out-File -Encoding utf8 .windsurf\mcp.json; Write-Host "✓ .windsurf\mcp.json written" -ForegroundColor Green }
  "4" { New-Item -Force -ItemType Directory .vscode | Out-Null; $mcpJson | Out-File -Encoding utf8 .vscode\mcp.json; Write-Host "✓ .vscode\mcp.json written" -ForegroundColor Green }
  "5" { Copy-Item .mcp.json.template .mcp.json; Write-Host "⚠ Manual: configure using .mcp.json" -ForegroundColor Yellow }
}

# ── Step 5: Brain file ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/6] Writing brain file for $aiName..." -ForegroundColor Cyan
switch ($aiChoice) {
  "1" { Copy-Item OPENMAESTRO.md CLAUDE.md; Write-Host "✓ CLAUDE.md created" -ForegroundColor Green }
  "2" { Copy-Item OPENMAESTRO.md .cursorrules; Write-Host "✓ .cursorrules created" -ForegroundColor Green }
  "3" { Copy-Item OPENMAESTRO.md .windsurfrules; Write-Host "✓ .windsurfrules created" -ForegroundColor Green }
  "4" { Copy-Item OPENMAESTRO.md AGENTS.md; Write-Host "✓ AGENTS.md created" -ForegroundColor Green }
  "5" { Write-Host "⚠ Manual: use OPENMAESTRO.md as your AI's system prompt" -ForegroundColor Yellow }
}

# ── Step 6: Health check ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "[6/6] Running health check..." -ForegroundColor Cyan
New-Item -Force -ItemType Directory tmp | Out-Null

$healthScript = @'
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
chromium.launch({ headless: true })
  .then(b => b.close().then(() => { console.log("ok"); process.exit(0); }))
  .catch(e => { console.error(e.message); process.exit(1); });
'@

$healthScript | node
if ($LASTEXITCODE -eq 0) {
  Write-Host "✓ Browser health check passed" -ForegroundColor Green
} else {
  Write-Host "✗ Health check failed. Try: npx playwright install chromium" -ForegroundColor Red
}

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          OpenMaestro is ready.             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Open this folder in $aiName and say:"
Write-Host ""
Write-Host "  `"Read your instructions and tell me what you can do.`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  node scripts\inspect.js <url>               — map any page"
Write-Host "  node scripts\scaffold-workflow.js <name>    — create workflow"
Write-Host "  workflows\examples\                          — see examples"
Write-Host ""
```

- [ ] **Step 5.2: Verify PowerShell syntax**

```powershell
powershell -File install.ps1 -WhatIf
```

If `-WhatIf` not supported: open PowerShell ISE and use syntax check, or run with option 5 selected.

- [ ] **Step 5.3: Commit**

```bash
git add install.ps1
git commit -m "feat: add install.ps1 — Windows setup with AI choice"
```

---

## Task 6: OPENMAESTRO.md — The Brain

**Files:**
- Create: `OPENMAESTRO.md`
- Create: `.mcp.json.template`
- Create: `SESSION-RESUME.md`

This is the most important file. Every word matters.

- [ ] **Step 6.1: Create OPENMAESTRO.md**

```markdown
# OpenMaestro — Agent Brain

You are an AI browser automation agent running with OpenMaestro. You have access to a real, visible browser through Playwright MCP. This file is your complete operating manual. Read it fully before responding.

---

## Your Capabilities (Playwright MCP)

You can control a real browser. These tools are available to you:

**Navigation**
- Go to any URL and wait for it to load
- Handle redirects, popups, and new tabs

**Interaction**
- Click any element (by selector, visible text, or ARIA role)
- Type text into inputs — always use `slowly: true` on sites with bot detection
- Hover, scroll (up/down/to element), drag and drop
- Press keyboard shortcuts

**Forms**
- Fill text inputs and textareas
- Select options from dropdowns
- Check/uncheck checkboxes and radio buttons
- Upload files from local paths

**Reading the page**
- Take screenshots (full page or specific element)
- Read the text content of any element
- Get element attributes and properties
- Extract structured data from tables and lists

**JavaScript**
- Execute any JavaScript on the page
- Use this for operations that clicks and types cannot handle (e.g. clearing contenteditable fields)

**Downloads**
- Save files downloaded by the browser to a local path

---

## Stealth Mode

Your browser is configured with stealth settings to minimise bot detection signals. Stealth mode handles most common detection (navigator.webdriver exposure, standard fingerprinting). It does NOT guarantee success against enterprise-grade anti-bot systems (Cloudflare Enterprise, DataDome, PerimeterX). When you detect these systems (via inspect.js output), warn the user before proceeding.

The browser is always visible. The user can watch everything and type "stop" at any time.

You never store, display, or log passwords or API keys. The user must be already logged in before you start. If you see a login page, stop and tell them.

---

## Onboarding Protocol

When a user wants to automate something new, run this sequence **before opening any browser**. Ask one question at a time and wait for the answer.

**Q1:** "What tool or website do you want me to work in? Give me the exact URL."

**Q2:** "Walk me through what you do manually, step by step. Be as specific as possible — what you click, what you type, what order you do things in."

**Q3:** "Are there any steps where you make a judgement or decision? Or is every step identical every time?"

**Q4:** "What does success look like? How do you know the task is done correctly?"

**Q5:** "Is there anything I should never do, never click, or never change — even if it seems like the right thing?"

**Q6:** "Should I work while you watch, or can I run this unattended?"

**Q7:** "Is there anything about how YOU specifically do this that's different from how most people would? Personal preferences, quality standards, business rules?"

**Video option:** If Video Vision MCP is available (check with `/mcp`), offer: "If you have a screen recording of yourself doing this workflow, I can analyse it instead of walking me through it step by step."

After all answers: summarise what you understood back to the user and ask them to confirm before proceeding to research.

---

## Research + Inspection Protocol

After onboarding is confirmed, before writing any automation script:

### Phase 1: Web Research

Search for these in order:
1. "[tool name] automation known issues"
2. "[tool name] Playwright OR Selenium selectors quirks"
3. "[tool name] bot detection OR anti-automation"
4. "[tool name] keyboard shortcuts" (often more reliable than clicking)

Record findings. Pay particular attention to: dynamic selectors that change between sessions, required delays, JavaScript-only operations, and known anti-bot measures.

### Phase 2: Live Inspection

Call inspect.js on the target URL:
```
node scripts/inspect.js <url>
```

Read the JSON output:
- **`interactive_elements`** — use these actual selectors, not guesses
- **`potential_blockers.login_required: true`** — stop, tell user to log in manually, then restart
- **`potential_blockers.captcha_detected: true`** — warn user before proceeding
- **`potential_blockers.bot_detection_signals`** — if not empty, say: "This site has [signal] anti-bot systems. Stealth mode is active but I cannot guarantee success. Shall I proceed?"
- **`screenshot`** — review this image to confirm the page loaded as expected

### Phase 3: Generate Workflow Spec

Call scaffold-workflow.js:
```
node scripts/scaffold-workflow.js <descriptive-name>
```

Fill in every section of the created file with what you learned from onboarding, research, and inspection. Show the completed file to the user and confirm they're happy with it before executing.

---

## Execution Rules

**Before every workflow run:**
- Verify user is logged in — first screenshot must show an authenticated state, not a login page
- Read the saved workflow spec if one exists (do not re-run onboarding for known workflows)
- Read the session tracker — if status is `in_progress`, offer to resume instead of restart

**During execution:**

Always use `slowly: true` for all text input on sites with known bot detection (LinkedIn, Upwork, Fiverr, any site where inspect.js flagged bot detection signals).

Always clear contenteditable fields via JavaScript before typing:
```javascript
const editor = document.querySelector('[contenteditable="true"]');
editor.innerHTML = '<p><br></p>';
editor.dispatchEvent(new Event('input', { bubbles: true }));
```
Take a screenshot after clearing to visually confirm it is empty. If not empty, clear again.

Take a screenshot after each major step to verify state.

Wait for network idle after every navigation before interacting.

Update the session tracker (`workflows/<name>-session.md`) after each completed step — change ⏳ Pending to ✅ Done.

**After completion:**
- Take a final screenshot showing completed state
- Mark session tracker as completed
- Tell user what was done and where outputs are saved

---

## Error Handling

| Situation | Action |
|---|---|
| Element not found | Screenshot → wait 3s → retry once → if still missing, stop and describe exactly what you see on screen |
| Page load timeout | Wait for networkidle → retry navigation once → if still failing, stop and report the error message |
| CAPTCHA appeared | Stop immediately: "A CAPTCHA appeared. Please solve it in the browser window, then tell me to continue." |
| Unexpected modal/popup | Screenshot → try to dismiss/close → if unable, stop and ask user how to handle it |
| Rate limit message | Stop: "The site is rate-limiting requests. I recommend waiting [suggest reasonable time based on the message]. Tell me when to continue." |
| Session expired mid-workflow | Stop: "My session appears to have expired. Please log in again in the browser window, then tell me to continue." |
| JavaScript error | Note the error, try one alternative approach. If that also fails, stop and report. |

**Recovery:** User says "Resume [workflow-name]"
→ Read `workflows/[workflow-name]-session.md`
→ Find the last ✅ Done step
→ Say: "Resuming [workflow-name] from step N: [description]"
→ Continue from the next step

---

## Working With Helper Scripts

**inspect.js — map a page before automating it**
```bash
node scripts/inspect.js https://example.com/page
```
Returns JSON: interactive elements with selectors, bot detection signals, screenshot path. Call this any time the page UI seems to have changed unexpectedly.

**scaffold-workflow.js — create a new workflow**
```bash
node scripts/scaffold-workflow.js my-workflow-name
```
Creates `workflows/my-workflow-name.md` (spec) and `workflows/my-workflow-name-session.md` (session tracker).

---

## Workflow Files

Saved workflows live in `workflows/`. Each has:
- `workflows/<name>.md` — the full spec (selectors, steps, known issues)
- `workflows/<name>-session.md` — session tracker (you update this as you work)

On "run my X workflow": read both files. If session is `in_progress`, offer to resume. If `completed` or `pending`, start fresh.

Study `workflows/examples/` to understand the expected format.

---

## What You Must Never Do

- Store, log, or display passwords or API keys
- Attempt to log in on behalf of the user — they must already be authenticated
- Submit forms that cause irreversible actions (purchases, sends, deletes) without explicit user confirmation
- Proceed past a CAPTCHA without the user solving it
- Run unattended without the user's explicit instruction (Q6 in onboarding)
- Skip the inspect.js step for unfamiliar sites — always map the environment first
```

- [ ] **Step 6.2: Create .mcp.json.template**

```json
{
  "_comment": "Reference MCP config. Copy to the appropriate location for your AI (see install script).",
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headed",
        "--browser", "chrome",
        "--launch-option", "--disable-blink-features=AutomationControlled",
        "--launch-option", "--window-size=1920,1080"
      ]
    }
  }
}
```

- [ ] **Step 6.3: Create SESSION-RESUME.md (fallback template)**

```markdown
# Session Resume

Use this file if your AI doesn't have a workflow-specific session tracker.

---

## Current Workflow
**Name:** [workflow name]
**Target URL:** [url]
**Model/tool:** [e.g. NanoBanana 2, Seedance 2.0]

## Settings Confirmed
- [setting 1]: [value]
- [setting 2]: [value]

## Progress

| # | Description | Status |
|---|-------------|--------|
| 1 | [step] | ✅ Done |
| 2 | [step] | ✅ Done |
| 3 | [step] | 🔄 In progress |
| 4 | [step] | ⏳ Pending |

## Resume From
Step #3 — [description of where to pick up]

---

## Recovery Command
Tell your AI: "Read SESSION-RESUME.md and continue from where we left off."
```

- [ ] **Step 6.4: Commit**

```bash
git add OPENMAESTRO.md .mcp.json.template SESSION-RESUME.md
git commit -m "feat: add OPENMAESTRO.md brain file, MCP template, session resume"
```

---

## Task 7: Workflow Templates

**Files:**
- Create: `workflows/examples/higgsfield-content-batch.md`
- Create: `workflows/examples/linkedin-post-scheduler.md`
- Create: `workflows/examples/research-compiler.md`

- [ ] **Step 7.1: Create workflows/examples/higgsfield-content-batch.md**

```markdown
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
```

- [ ] **Step 7.2: Create workflows/examples/linkedin-post-scheduler.md**

```markdown
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
```

- [ ] **Step 7.3: Create workflows/examples/research-compiler.md**

```markdown
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
```

- [ ] **Step 7.4: Commit**

```bash
git add workflows/examples/
git commit -m "feat: add 3 example workflow templates (Higgsfield, LinkedIn, research)"
```

---

## Task 8: README + CONTRIBUTING + package.json scripts

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`

- [ ] **Step 8.1: Create README.md**

```markdown
# OpenMaestro

**Give any AI hands. Automate anything you do in a browser — on your machine, with tools you already pay for, using whatever AI you already have.**

No new subscriptions. No credential sharing. Watch it work in real time. Stop it any time.

---

## Why

Every week, more AI agent services launch asking for your browser access. They run on external servers. They need your passwords. They're black boxes you can't stop.

OpenMaestro is the alternative: your AI, your machine, your browser. You're already logged into every tool you pay for. OpenMaestro uses that — without ever touching your credentials.

| | OpenClaw / Manus | Anthropic Operator | **OpenMaestro** |
|---|---|---|---|
| Cost | Subscription | Subscription | **Free** |
| Runs on | Their servers | Their servers | **Your machine** |
| Credential sharing | Required | Required | **Never — you're already logged in** |
| Visible | No | No | **Yes — watch it work** |
| Stoppable | Limited | No | **Yes — type "stop"** |
| Works with any AI | No | No | **Yes** |
| Open source | No | No | **Yes (MIT)** |

---

## Works With

| AI | Status |
|---|---|
| Claude Code | ✅ Tested |
| Cursor | ✅ Supported |
| Windsurf | ✅ Supported |
| GitHub Copilot (VS Code) | ✅ Supported |
| Local LLMs (Ollama, etc.) | 🔜 v2 |

---

## Install

**Requires:** Git + Node.js ([nodejs.org](https://nodejs.org))

**Mac / Linux:**
```bash
git clone https://github.com/oamaestro/openmaestro && cd openmaestro && bash install.sh
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/oamaestro/openmaestro; cd openmaestro; .\install.ps1
```

The setup script will:
1. Ask which AI you're using
2. Install Playwright + stealth browser
3. Configure Playwright MCP for your AI
4. Set up the brain file
5. Run a health check

That's it.

---

## How It Works

**1. Open this folder in your AI**

For Claude Code: `claude` in the terminal.  
For Cursor/Windsurf: open the folder in the IDE.

**2. Say what you want to automate**

> "I want to automate my Higgsfield content generation"

Your AI runs a structured onboarding — 7 questions to understand your workflow. Then it inspects the live page to map its UI. Then it writes a workflow spec and saves it.

**3. Watch it work**

A real browser window opens. Your AI operates it. You watch. You can type "stop" at any time.

**4. Next time: one line**

> "Run my Higgsfield workflow"

Your AI reads the saved spec and runs it. No re-onboarding.

---

## What You Can Automate

Anything you do in a browser. Literally anything.

**Content creation:** Batch generate in Higgsfield, Runway, Kling, Pika — iterate through prompt lists, download outputs  
**Social media:** Write and schedule posts on LinkedIn, X, Instagram  
**Freelance:** Monitor Upwork job listings, draft proposals from templates  
**Data work:** Transfer data between browser-based tools, fill forms from spreadsheets, compile research from a URL list  
**Overnight tasks:** Set it running before bed, review output in the morning

---

## Helper Tools

```bash
# Map any page before automating (returns selectors + bot detection status)
node scripts/inspect.js https://example.com

# Create a new workflow file
node scripts/scaffold-workflow.js my-workflow-name
```

---

## Example Workflows

Ready-to-use examples in `workflows/examples/`:

- **`higgsfield-content-batch.md`** — batch image/video generation with JS clear fix
- **`linkedin-post-scheduler.md`** — schedule posts (stealth mode active)
- **`research-compiler.md`** — extract and compile content from URL lists

---

## Limitations (be honest with yourself)

- **CAPTCHAs will stop it.** Your AI will pause and ask you to solve them.
- **Enterprise anti-bot systems** (Cloudflare Enterprise, PerimeterX) may block even stealth mode. The inspector will warn you.
- **You must be logged in** to the target tool before starting. OpenMaestro never handles login.
- **Local LLMs** are v2. MCP bridge tooling needs to mature first.

---

## Contribute

The best way to contribute is **adding workflow templates.** See [CONTRIBUTING.md](CONTRIBUTING.md).

No code required. If you've automated something with OpenMaestro, write up the workflow file and submit a PR. Every template is a new use case for everyone.

---

## License

MIT — build on it.

Made by [OA Maestro](https://github.com/oamaestro).
```

- [ ] **Step 8.2: Create CONTRIBUTING.md**

```markdown
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
```

- [ ] **Step 8.3: Commit**

```bash
git add README.md CONTRIBUTING.md
git commit -m "docs: add README and CONTRIBUTING"
```

---

## Task 9: Integration Test + Final Check

- [ ] **Step 9.1: Run full test suite**

```bash
npm test
```

Expected: All 23 tests pass (14 inspect + 9 scaffold).

- [ ] **Step 9.2: Run install.sh (manual mode) end-to-end**

```bash
bash install.sh
# Choose: 5 (manual)
```

Verify: all 6 steps complete, health check passes, no script errors.

- [ ] **Step 9.3: Run install.ps1 (Windows — if on Windows)**

```powershell
.\install.ps1
# Choose: 5 (manual)
```

- [ ] **Step 9.4: Smoke test inspect.js on a real URL**

```bash
node scripts/inspect.js https://example.com
```

Verify: JSON output contains title, at least one interactive element, screenshot file created in `tmp/`.

- [ ] **Step 9.5: Smoke test scaffold-workflow.js**

```bash
node scripts/scaffold-workflow.js "smoke-test-workflow"
cat workflows/smoke-test-workflow.md | head -20
cat workflows/smoke-test-workflow-session.md
rm workflows/smoke-test-workflow*.md
```

Verify: Both files created with correct structure, name appears in headings, recovery command includes workflow name.

- [ ] **Step 9.6: Verify repo structure matches spec**

```bash
find . -not -path './node_modules/*' -not -path './.git/*' -not -path './tmp/*' | sort
```

Expected files present: `install.sh`, `install.ps1`, `OPENMAESTRO.md`, `README.md`, `CONTRIBUTING.md`, `LICENSE`, `SESSION-RESUME.md`, `.mcp.json.template`, `.gitignore`, `package.json`, `scripts/inspect.js`, `scripts/scaffold-workflow.js`, `tests/inspect.test.js`, `tests/scaffold.test.js`, `tests/run-tests.js`, `workflows/examples/higgsfield-content-batch.md`, `workflows/examples/linkedin-post-scheduler.md`, `workflows/examples/research-compiler.md`.

- [ ] **Step 9.7: Final commit**

```bash
git add .
git status  # verify no unwanted files
git commit -m "chore: final integration check — all tests pass, all files verified"
```

- [ ] **Step 9.8: Tag v1.0.0**

```bash
git tag -a v1.0.0 -m "OpenMaestro v1.0.0 — initial release"
```

- [ ] **Step 9.9: Push to GitHub**

```bash
git remote add origin https://github.com/oamaestro/openmaestro.git
git push -u origin main --tags
```

---

## Post-Ship Checklist (not Antigravity's job — yours)

- [ ] Record demo video: Claude autonomously running Higgsfield batch generation
- [ ] Add demo GIF to README (update the README with the GIF URL after recording)
- [ ] Pin repo in oamaestro GitHub org
- [ ] Add `good first issue` labels to these issues: "Add [Runway] workflow template", "Add [Canva] workflow template", "Add [Upwork proposals] workflow template"
- [ ] DM 3-5 content creators who post about Higgsfield/AI tools with the repo link
- [ ] Post on X/Twitter: the "I automated X without giving anyone my password" angle

---

## v1.1 (After Traction)

1. Publish `openmaestro` package to npm — enables `npx openmaestro` one-liner
2. Add 2-3 community-contributed workflow templates
3. Improve inspect.js selector confidence (add `data-pw`, `data-cy`, `aria-*` priority)
