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
