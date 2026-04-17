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
