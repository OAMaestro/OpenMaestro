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
