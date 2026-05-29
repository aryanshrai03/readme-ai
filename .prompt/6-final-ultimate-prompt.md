

Build the complete readme-ai project from scratch. Overwrite all existing files. This is the final complete version. Full permission to create, write, and overwrite all files.

**PACKAGE SETUP**
Package name: `readme-ai`, version 1.0.0, description: "AI-powered README generator using NVIDIA NIM — free, no API keys needed", author: "aryanshrai03", license MIT, type module, bin field maps `readme-ai` to `./src/index.js`. Dependencies: openai, node-fetch, chalk, ora, inquirer, figlet, gradient-string, boxen, fs-extra, glob, commander, diff.

**BRANDING**
Every run shows: giant ASCII art "README-AI" using figlet with gradient-string rainbow gradient, then boxen box containing "by github.com/aryanshrai03" and "AI-Powered README Generator — Free, No Setup Required". Use chalk for all colored output throughout. Show version number in branding box.

**PROJECT STRUCTURE**
Create these files and folders:
```
/api
  /middleware
    rateLimit.js
    validate.js
    logger.js
    security.js
  generate-readme.js
  generate-image.js
  upload-image.js
  update-readme.js
  analyse-readme.js
  health.js
/src
  index.js
  branding.js
  config.js
  scanner.js
  generator.js
  imageGen.js
  uploader.js
  updater.js
  analyser.js
  rateLimiter.js
  filePicker.js
  preview.js
  differ.js
vercel.json
package.json
.npmignore
.gitignore
LICENSE
CONTRIBUTING.md
README.md
```

**VERCEL BACKEND — MIDDLEWARE**

`/api/middleware/rateLimit.js` — IP-based rate limiting using in-memory Map with sliding window. Rules: max 5 requests per IP per 5 minutes (1 per minute effectively). Track array of timestamps per IP. If limit exceeded return HTTP 429 with JSON `{ error: "Rate limit exceeded. 1 README per minute, 5 per 5 minutes.", retryAfter: secondsRemaining }`. Abuse detection: if IP sends 10+ requests in 2 minutes ban for 24 hours, log IP and timestamp. Export a `rateLimit(req, res)` function that returns true if blocked.

`/api/middleware/validate.js` — Check Content-Type is application/json. Check body size under 100kb. Check required fields per endpoint. Return HTTP 400 with clear error message if validation fails. Export `validate(requiredFields)` function.

`/api/middleware/logger.js` — Log every request with timestamp, IP, endpoint, response time in ms. Export `logger(req, res, startTime)` function.

`/api/middleware/security.js` — Block requests with no User-Agent header returning HTTP 403. Honeypot: if request body contains field named `website` return HTTP 200 with fake success but do nothing. Add security headers to all responses: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection. Export `security(req, res)` function that returns true if blocked.

**VERCEL BACKEND — ENDPOINTS**

`/api/generate-readme.js` — Apply security, rateLimit, validate middleware. Required fields: `projectContext` (string under 50000 chars). Read `NVIDIA_API_KEY` from process.env. Use openai SDK with baseURL `https://integrate.api.nvidia.com/v1` and apiKey from env. Call model `openai/gpt-oss-120b` with system prompt: "You are a professional README.md writer. Generate a complete beautiful production-grade README.md in markdown format. Always include: title with emoji, shields.io badges for npm/license/downloads, description, features section with emoji icons, tech stack table, prerequisites, installation with code blocks, usage examples, configuration section, API reference if applicable, contributing guide, license, star history section, show your support section. Leave exactly two image placeholders marked as IMAGE_URL_1 and IMAGE_URL_2 at logical positions." Max tokens 4000. Return `{ readme: generatedMarkdown }`. Log request with logger.

`/api/generate-image.js` — Apply security, rateLimit, validate middleware. Required fields: `prompt` (string under 500 chars). Read `NVIDIA_API_KEY` from process.env. POST to `https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b` with node-fetch. Headers: `Authorization: Bearer {key}`, `Accept: application/json`, `Content-Type: application/json`. Body: `{ prompt, width: 1024, height: 1024, steps: 4, seed: Math.floor(Math.random()*9999) }`. If response status not 200 throw error with status. Parse response JSON, extract `response_body.artifacts[0].base64`. Return `{ base64: imageBase64 }`.

`/api/upload-image.js` — Apply security, rateLimit, validate middleware. Required fields: `image` (base64 string). Read `IMGBB_API_KEY` from process.env. POST to `https://api.imgbb.com/1/upload` using URLSearchParams with fields `key` and `image`. Parse response JSON extract `data.url`. Return `{ url: imageUrl }`.

`/api/update-readme.js` — Apply security, rateLimit, validate middleware. Required fields: `currentContent`, `instructions`, `conversationHistory`, `activeFile`. Read `NVIDIA_API_KEY` from process.env. Call GPT-OSS-120B with system prompt: "You are a README editing expert. You ONLY edit markdown content. NEVER reference or modify any code files. Apply the user's requested changes precisely. You understand surgical editing commands: 'between paragraph X and Y add: text' means insert at exact location. 'add image from path' means add markdown image tag. 'add video from path' means add HTML video embed. 'replace section NAME' means replace that heading section. 'delete section NAME' means remove that section. 'add badge TYPE' means add shields.io badge. 'make it more professional/casual' means rewrite tone. Always return the complete updated markdown." Include full conversationHistory array as previous messages for context continuity. Max tokens 4000. Return `{ readme: updatedMarkdown }`.

`/api/analyse-readme.js` — Apply security, rateLimit, validate middleware. Required fields: `content`. Read `NVIDIA_API_KEY` from process.env. Call GPT-OSS-120B with system prompt: "You are a README quality analyst. Analyse the provided README and return ONLY valid JSON with no markdown formatting, no backticks, no preamble." User prompt: "Analyse this README and return JSON with exactly these fields: overallScore (0-100 number), readabilityScore (0-100), seoScore (0-100), completenessScore (0-100), wordCount (number), estimatedReadTime (string like '3 min read'), sections (array of objects with fields: name string, exists boolean, score number 0-100, suggestion string), missingCriticalSections (string array), strengths (string array max 5), improvements (string array max 5 prioritized), suggestions (string array max 5 specific actionable items)." Parse response as JSON. Return the parsed analysis object directly.

`/api/health.js` — No middleware. Return `{ status: 'ok', version: '1.0.0', timestamp: Date.now(), endpoints: ['generate-readme','generate-image','upload-image','update-readme','analyse-readme'] }`.

**VERCEL CONFIG**
`vercel.json`:
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "POST, GET, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    }
  ]
}
```

**CLI — `src/branding.js`**
Export `showBranding()` function. Show figlet ASCII art "README-AI" with gradient-string rainbow. Below it show boxen box with: "by github.com/aryanshrai03", "AI-Powered README Generator", "✨ Free — No API Keys Needed", "v1.0.0". Use chalk cyan for box border.

**CLI — `src/rateLimiter.js`**
Store array of last 5 request timestamps in `~/.readme-ai/ratelimit.json`. Export `checkRateLimit()` async function. Before every API call: load timestamps array. Filter to only timestamps within last 5 minutes. If count >= 5: calculate wait time, show "⏳ Rate limit reached (5 per 5 min). Next slot in Xs..." with live countdown using setInterval updating in place with `process.stdout.write('\r')`. After countdown resolve. Also check: if last timestamp exists and less than 60 seconds ago: show "⏳ Please wait Xs before next request..." with live countdown, auto-proceed after. Export `recordRequest()` to push current timestamp and save. Always call recordRequest after successful API call.

**CLI — `src/config.js`**
No API keys needed anymore — users use the hosted backend. Config file at `~/.readme-ai/config.json` only stores: `{ lastUsed: timestamp, totalGenerated: number, preferredBackend: 'https://readme-ai-backend.vercel.app' }`. Export `loadConfig()`, `saveConfig()`, `getBackendUrl()` functions. Backend URL defaults to `https://readme-ai-backend.vercel.app` but can be overridden with env var `README_AI_BACKEND`.

**CLI — `src/filePicker.js`**
Export `pickFile()` async function. Scan current working directory for all `.md` files using glob pattern `**/*.md` (exclude node_modules). Build list of found files with their sizes. Show inquirer list:
```
Which markdown file would you like to work on?
❯ 📄 README.md (2.3 KB) — exists
  📄 CONTRIBUTING.md (1.1 KB) — exists
  ✨ Create new markdown file
  ❌ Cancel and exit
```
If "Create new": ask "Enter filename (without .md extension):" create empty file with that name and return path. If cancel: process.exit(0). Return selected file path as string. This is the ONLY way to select a file — AI operations only ever touch this selected file.

**CLI — `src/scanner.js`**
Export `scanProject()` async function. Scan current working directory. Read package.json if exists — extract name, description, version, scripts, dependencies, devDependencies, repository url. Read selected .md file content if exists. Use glob to find source files: .js .ts .py .go .rs .java .cpp .cs .rb .php files (max 20 files, max 150 lines each, skip node_modules, skip dist, skip .git). Build folder tree 2 levels deep (skip node_modules, .git, dist). Detect project type from files found: if package.json exists → Node.js, if requirements.txt → Python, if go.mod → Go, if Cargo.toml → Rust, if pom.xml → Java, etc. Detect if it has tests folder. Detect framework from dependencies: react/vue/angular/next/express/fastapi etc. Return structured object: `{ projectName, description, version, projectType, framework, hasTests, repoUrl, ownerName, repoName, dependencies, devDependencies, sourceFiles, folderTree, existingReadme }`. Extract ownerName and repoName from repository url or git remote — needed for star history.

**CLI — `src/generator.js`**
Export `generateReadme(projectContext, activeFile)` async function. Show spinner "🧠 Generating README with GPT-OSS 120B...". Call `${backendUrl}/api/generate-readme` with POST, Content-Type application/json, body `{ projectContext: JSON.stringify(projectContext) }`. Handle 429 with retryAfter from response — pass to rateLimiter countdown. Handle 500 — show error and retry once after 10s. Handle network error — show "❌ Cannot reach readme-ai servers. Check your internet." Return readme string.

`src/imageGen.js` — Export `generateImages(projectContext)` async function. Based on projectType and framework craft 2 specific image prompts. Image 1: hero banner style for the project type (e.g. "modern Node.js web application dashboard, dark theme, professional hero banner, ultra detailed, 4k"). Image 2: features showcase style. Call `${backendUrl}/api/generate-image` for each with body `{ prompt }`. Handle errors gracefully — if image generation fails return null for that image and warn user. Return array of 2 base64 strings or nulls.

`src/uploader.js` — Export `uploadImages(base64Array)` async function. For each non-null base64 in array: call `${backendUrl}/api/upload-image` with body `{ image: base64 }`. Handle errors — if upload fails return placeholder text. Return array of URLs or placeholder strings.

`src/analyser.js` — Export `analyseReadme(content)` async function. Show spinner "🔍 Performing deep AI analysis...". Call `${backendUrl}/api/analyse-readme` with body `{ content }`. Parse response. Then display beautiful multi-section analysis report:

Section 1 — Overall Score: show large styled score like "Overall Score: 87/100" with unicode progress bar `████████░░` 20 chars wide, colored green if >75, yellow if >50, red if lower.

Section 2 — Sub-scores: show readability, SEO, completeness each as mini progress bar on one line: `Readability  ████████░░  82/100`.

Section 3 — Section Checklist: list standard README sections (Title, Badges, Description, Features, Installation, Usage, Configuration, API Reference, Contributing, License, Star History, Support) each with ✅ if exists or ❌ if missing, plus score and suggestion.

Section 4 — Strengths: list in chalk green with ✨ prefix.

Section 5 — Priority Improvements: list in chalk yellow with 🔧 prefix numbered 1-5.

Section 6 — Missing Critical Sections: list in chalk red with ❗ prefix.

Section 7 — Stats: word count, estimated read time, image count, badge count, link count all in a boxen box.

After displaying ask with inquirer: "Would you like to auto-fix the issues found? (Y/n)" — if yes enter updater chat flow with analysis pre-loaded as context.

`src/differ.js` — Export `showDiff(oldContent, newContent)` function. Compare old and new markdown line by line. Show compact diff: lines added shown in chalk green with "+" prefix, lines removed in chalk red with "-" prefix. Show summary: "+X lines added, -Y lines removed" in chalk bold. Limit diff display to 20 lines max — if more show first 10 and last 10 with "... and N more changes ..." in middle.

`src/preview.js` — Export `showPreview(content, filePath)` async function. Parse markdown content and extract: word count (split by spaces), heading counts (count # ## ### lines), image count (count ![), badge count (count shields.io), link count (count [text](url) patterns), video count (count <video), has star history (check for star-history.com), has contributors section, estimated read time (wordCount / 200 rounded). Display as beautiful boxen dashboard with chalk colored stats. Show first 300 chars of content as preview snippet at bottom.

`src/updater.js` — Export `startUpdateChat(activeFile, preloadedContext)` async function. Read current content of activeFile. Show header box: "🤖 README AI Assistant" with tips. Show hint line: "💡 Commands: 'add image from path/file.png' • 'add video from assets/demo.mp4' • 'between para 2 and 3 add: text' • 'replace section Features with: text' • 'delete section Contributing' • 'add badge npm/license/stars' • 'make it more professional' • type 'done' to save • 'preview' to see stats • 'diff' to see changes • 'exit' to cancel". 

Keep conversationHistory array and originalContent string. Each loop iteration: check client-side rate limit first. Then ask user input with inquirer. Handle special local commands without API call: if 'done' → save file, show diff from original, show success. If 'preview' → call showPreview then continue loop. If 'diff' → call showDiff(originalContent, currentContent) then continue loop. If 'exit' → confirm "Discard all changes? (y/N)" then exit or continue. Otherwise: add message to conversationHistory, show spinner "✨ Applying changes...", call `${backendUrl}/api/update-readme` with `{ currentContent, instructions: userInput, conversationHistory, activeFile: path.basename(activeFile) }`. Replace currentContent with response. Show compact diff of just this change using differ. Show "✅ Applied! Keep improving or type 'done' to save." Record rate limit timestamp. Continue loop.

`src/index.js` — Main CLI entry point using commander. On run: show branding. Parse flags. If no special flag: run main interactive flow. Main flow: call filePicker to get activeFile. Then show main action menu:
```
What would you like to do with [filename]?
❯ ✨ Generate — Create brand new README with AI + images
  ✏️  Update — Chat with AI to improve existing content  
  🔍 Analyse — Deep AI analysis and scoring
  👀 Preview — View stats and content summary
  ❌ Cancel
```
If Generate: check if file has content → confirm "File has existing content. Replace completely? (y/N)" → if yes run full generation pipeline (scan → generate → images → upload → assemble → save). If Update: call startUpdateChat. If Analyse: read file → call analyseReadme. If Preview: read file → call showPreview.

Full generation pipeline in detail: call scanProject() → call generateReadme(context, activeFile) with spinner → call generateImages(context) with spinner → call uploadImages(base64Array) with spinner → replace IMAGE_URL_1 and IMAGE_URL_2 in readme text with actual URLs → also inject star history section if ownerName and repoName detected: add at bottom `## ⭐ Star History\n[![Star History Chart](https://api.star-history.com/svg?repos=OWNER/REPO&type=Date)](https://star-history.com/#OWNER/REPO&Date)` → write final content to activeFile → show success output.

Success output after generation: show animated boxen success box with: "✅ [filename] generated successfully!", file size in KB, word count, image count, time taken in seconds, star history included yes/no, random tip from array: ["💡 Use --update to chat with AI anytime", "💡 Use --analyse to score your README", "💡 Type 'add badge npm' in chat to add badges", "💡 Use --preview for quick stats", "💡 Star the repo if this helped you!", "💡 Share your README on Twitter/X!", "💡 Run on any project — it detects the stack automatically", "💡 Use 'add image from path' in chat to embed local images"].

**CLI FLAGS**
- `readme-ai` — main interactive flow
- `readme-ai --analyse` — file picker then straight to analysis
- `readme-ai --update` — file picker then straight to chat
- `readme-ai --remake` — file picker then straight to generation with confirm
- `readme-ai --preview` — file picker then straight to preview then exit
- `readme-ai --file <name>` — skip file picker and use specified file directly
- `readme-ai --setup-guide` — show beautiful guide explaining: no setup needed, just run npx readme-ai, rate limits explained, all commands listed
- `readme-ai --version` — show version
- `readme-ai --health` — call `/api/health` and show server status

**STAR HISTORY AND MODERN README ELEMENTS**
Always instruct the AI in generate-readme system prompt to include these modern README elements: shields.io badges row at top (npm version, license, npm downloads, GitHub stars), "What's New" or changelog section, beautiful features grid using markdown table or HTML table with emoji icons, tech stack section with emoji per technology, prerequisites section, step by step installation, usage with multiple code examples, configuration table, contributors section with placeholder, "Show Your Support" section with star encouragement, star history chart at bottom. These are 2025 modern README standards.

**PROJECT README**
Write the project's own README.md at root documenting everything: big header with badges, description, features list (file picker, AI generation, AI chat editing, surgical editing, deep analysis, star history auto-gen, image/video embedding, free no setup), how it works with ASCII flow diagram, all CLI commands with examples, surgical editing commands reference table, rate limits section, tech stack, contributing guide, license. Make it a showcase README that itself demonstrates what the tool generates.

**GITIGNORE AND NPMIGNORE**
`.gitignore`: node_modules, .env, *.log, dist, .DS_Store, coverage
`.npmignore`: .env, .git, .github, test, tests, *.test.js, .eslintrc, coverage, .prompt

**LICENSE**
MIT License, Copyright 2026 Aryansh Rai (aryanshrai03)

**CONTRIBUTING.md**
Full contributing guide: how to fork, clone, install, run locally, submit PR, code style guide, how to report bugs.

Keep ALL branding, ASCII art, gradient-string rainbow, ora spinners, chalk colors, boxen styling throughout every single feature. Every user-facing message should be styled. No plain console.log anywhere — always use chalk. Make it feel premium and polished end to end.
