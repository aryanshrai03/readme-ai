

Complete UI and UX overhaul of the entire CLI. The current CLI is completely broken — no ASCII art, no colors, no auto-launch, nothing. Fix everything.

**CRITICAL ISSUE 1 — AUTO LAUNCH**
When user runs `readme-ai` with no arguments or subcommands, it must immediately launch the full interactive flow automatically. Do NOT show a help menu. Do NOT require `readme-ai generate`. Just running `readme-ai` starts everything. Remove the commander subcommand structure entirely and replace with a single direct flow.

**CRITICAL ISSUE 2 — BRANDING**
Every single run must start with:
1. Clear the terminal using `console.clear()`
2. Generate ASCII art "README-AI" using figlet with font "Big" 
3. Apply gradient-string rainbow gradient to the ASCII art
4. Show a boxen box below it containing:
   - "✨ AI-Powered README Generator"
   - "by github.com/aryanshrai03"
   - "🆓 Free — No Setup Required"
   - "⚡ Powered by NVIDIA NIM"
   All in chalk cyan, box border style "round", padding 1

**CRITICAL ISSUE 3 — FULL INTERACTIVE FLOW**
After branding, run this exact flow every time:

Step 1 — File picker using inquirer list:
```
? Which markdown file would you like to work on?
❯ 📄 README.md (exists / new)
  📄 CONTRIBUTING.md
  ✨ Create new .md file
  ❌ Cancel
```
Scan cwd for all .md files using glob. Show each with size if exists.

Step 2 — Action menu using inquirer list:
```
? What would you like to do with README.md?
❯ ✨ Generate — Create brand new README with AI + images
  ✏️  Update — Chat with AI to improve existing content
  🔍 Analyse — Deep AI analysis and scoring
  👀 Preview — View stats and content summary
  ❌ Cancel
```

Step 3 — Run selected action with ora spinners, chalk colors, boxen output boxes throughout.

**CRITICAL ISSUE 4 — ORA SPINNERS**
Every API call must show an ora spinner. Use these exact messages:
- "🧠 Scanning your project..."
- "✨ Generating README with GPT-OSS 120B..."
- "🎨 Generating images with Flux Klein..."
- "☁️ Uploading images to ImgBB..."
- "💾 Saving README.md..."

**CRITICAL ISSUE 5 — CHALK COLORS**
Use chalk throughout:
- Success messages: chalk.green
- Error messages: chalk.red  
- Info messages: chalk.cyan
- Warnings: chalk.yellow
- Labels: chalk.bold
- URLs: chalk.blue.underline
Never use plain console.log anywhere — always chalk

**CRITICAL ISSUE 6 — SUCCESS OUTPUT**
After generation show a beautiful boxen success box:
```
╭─────────────────────────────────────╮
│  ✅ README.md generated!            │
│  📁 Saved to: /path/README.md       │
│  📊 Words: 523 | Images: 2          │
│  ⏱️  Generated in: 12.3s            │
│  ⭐ Star: github.com/aryanshrai03   │
╰─────────────────────────────────────╯
```

**CRITICAL ISSUE 7 — FLAGS**
Keep these flags working:
- `readme-ai --version` → show version
- `readme-ai --help` → show styled help with chalk colors and emoji
- `readme-ai --update` → skip to update/chat flow
- `readme-ai --analyse` → skip to analyse flow  
- `readme-ai --preview` → skip to preview flow
- `readme-ai --remake` → skip to generation flow
- `readme-ai --health` → check backend health and show status

**CRITICAL ISSUE 8 — ERROR HANDLING**
All errors must show styled boxen error boxes in red. Never show raw stack traces to users.

**BACKEND URL**
Make sure all API calls go to `https://readme-ai-74865994a872918.vercel.app`

Rewrite these files completely: `src/index.js`, `src/branding.js`. Fix these files: `src/generator.js`, `src/imageGen.js`, `src/uploader.js`, `src/analyser.js`, `src/updater.js`, `src/preview.js`, `src/filePicker.js`, `src/rateLimiter.js`.

After all fixes run `node src/index.js` to verify it launches with ASCII art and interactive menu automatically.
