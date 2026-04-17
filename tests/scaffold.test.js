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
