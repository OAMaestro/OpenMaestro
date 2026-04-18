# OpenMaestro
<p align="center">
  <img src="assets/banner.png" alt="OpenMaestro" width="600">
</p>
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
