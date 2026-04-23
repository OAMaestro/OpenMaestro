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
        "--viewport-size", "1920x1080",
        "--init-script", "scripts/stealth.init.js"
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
