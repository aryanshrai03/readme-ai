Build a complete npm CLI package called `readme-ai` that generates AI-powered README files. Here are all the details:

**PACKAGE SETUP**
Package name: `readme-ai`, version 1.0.0, description: "AI-powered README generator using NVIDIA NIM", author: "aryanshrai03", license MIT, type module, bin field maps `readme-ai` to `./src/index.js`. Dependencies: openai, node-fetch, chalk, ora, inquirer, figlet, gradient-string, boxen, fs-extra, glob.

**BRANDING**
Every run shows: giant ASCII art "README-AI" using figlet with gradient-string rainbow gradient, then boxen box containing "by github.com/aryanshrai03" and "AI-Powered README Generator". Use chalk for all colored output throughout.

**CONFIG SYSTEM**
Store keys globally at `~/.readme-ai/config.json` containing `{ nvidia_api_key, imgbb_api_key }`. On every run, check if config exists. If not, trigger first-time setup automatically before proceeding.

**FIRST TIME SETUP FLOW**
Show welcome message. Use inquirer to ask: "Paste your NVIDIA API key:" and "Paste your ImgBB API key:". Validate both are non-empty. Save to ~/.readme-ai/config.json. Show success message "✅ Keys saved! You're all set forever."

**CLI FLAGS**
- `readme-ai` — main command, runs full generation
- `readme-ai --setup-guide` — shows a beautiful step-by-step guide: how to get NVIDIA API key (visit build.nvidia.com, sign up, go to API Keys), how to get ImgBB API key (visit imgbb.com, sign up, go to API settings), then triggers setup prompts
- `readme-ai --reset-keys` — deletes config and re-runs setup
- `readme-ai --version` — shows version

**PROJECT SCANNING**
Scan the current working directory. Read package.json if exists (name, description, scripts, dependencies). Read README.md if exists (to understand existing content). Use glob to find all .js .ts .py .go .rs .java files (max 20 files, max 200 lines each). Read folder structure 2 levels deep. Collect all this into a structured context object.

**TEXT GENERATION — NVIDIA GPT-OSS-120B**
Use openai SDK with baseURL `https://integrate.api.nvidia.com/v1` and apiKey from config. Model: `openai/gpt-oss-120b`. Send a detailed system prompt: "You are a professional README.md writer. Generate a complete, beautiful, production-grade README.md in markdown format." User prompt includes all scanned project context. Ask it to generate sections: title with badges, description, features list, tech stack, prerequisites, installation, usage with code examples, configuration, API reference if applicable, contributing guide, license, and leave 2 placeholder spots marked exactly as `![hero-image](IMAGE_URL_1)` and `![feature-image](IMAGE_URL_2)` at logical positions. Max tokens 4000. Show ora spinner "🧠 Generating README with GPT-OSS 120B..." while waiting.

**IMAGE GENERATION — NVIDIA FLUX KLEIN**
After text generation, generate 2 images. Use node-fetch to POST to `https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b` with headers `Authorization: Bearer {nvidia_key}` and `Accept: application/json`. For image 1: craft a prompt based on the project type detected (e.g. for a web app: "modern web application dashboard interface, dark theme, professional, hero banner style, ultra detailed"). For image 2: craft a prompt about the project features. Payload: width 1024, height 1024, steps 4, seed random. Response returns base64 image in `response_body.artifacts[0].base64` — decode it. Show spinner "🎨 Generating images with Flux Klein..." while waiting.

**IMGBB UPLOAD**
For each base64 image, POST to `https://api.imgbb.com/1/upload` with form params: `key={imgbb_api_key}` and `image={base64string}`. Parse response JSON, extract `data.url`. Show spinner "☁️ Uploading images to ImgBB..." while waiting.

**FINAL ASSEMBLY**
Replace `IMAGE_URL_1` and `IMAGE_URL_2` in the generated README text with the actual ImgBB URLs. Write the final content to `README.md` in the current working directory.

**SUCCESS OUTPUT**
Show a beautiful boxen success box: "✅ README.md generated successfully!", "📸 2 images generated and hosted", "📁 Saved to: {cwd}/README.md", "⭐ Star the repo: github.com/aryanshrai03/readme-ai"

**ERROR HANDLING**
Wrap everything in try/catch. If NVIDIA API fails: show clear error with the status and suggest checking API key. If ImgBB fails: still save README but with placeholder image text and warn user. If project scan finds nothing: still proceed with minimal context.

**GITHUB REPO FILES TO INCLUDE**
Create these files: `src/index.js` (CLI entry), `src/config.js` (key management), `src/scanner.js` (project scanner), `src/generator.js` (NVIDIA text generation), `src/imageGen.js` (Flux image generation), `src/uploader.js` (ImgBB upload), `src/branding.js` (ASCII art and styling). Also create: `.npmignore` (ignore .env, node_modules, .git, test/), `.gitignore` (ignore node_modules, .env, *.log), `LICENSE` (MIT, Aryan Shrai, 2025), `CONTRIBUTING.md` (how to contribute), `README.md` for the readme-ai repo itself (ironic — hand-written, with install instructions `npm install -g readme-ai`, usage, and all flags documented).

**PACKAGE.JSON SCRIPTS**
`"start": "node src/index.js"`, `"test": "echo no tests yet"`.
