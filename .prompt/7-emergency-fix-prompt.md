

EMERGENCY FULL REPAIR. Read every single file in the entire project first before touching anything. Then perform a complete repair.

**STEP 1 — READ EVERYTHING FIRST**
Read all files in: `/api`, `/api/middleware`, `/src`, root directory. Understand the current broken state completely before making any changes.

**STEP 2 — NUKE AND REBUILD ENTIRE /api FOLDER**
Delete all existing files in `/api` and `/api/middleware`. Rebuild everything from scratch correctly. The backend is a standalone Vercel serverless backend. It must NEVER import anything from `/src`. It is completely independent.

**CORRECT ENVIRONMENT VARIABLES — ONLY THESE TWO:**
```
NVIDIA_API_KEY=your_nvidia_key
IMGBB_API_KEY=your_imgbb_key
```
Delete every single reference to: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, Anthropic, Claude, claude-sonnet, openai.anthropic.com anywhere in the entire project.

**CORRECT NVIDIA ARCHITECTURE:**
Text generation — use openai npm package as OpenAI-compatible client ONLY:
```js
import OpenAI from 'openai';
const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});
const response = await client.chat.completions.create({
  model: 'openai/gpt-oss-120b',
  messages: [...],
  max_tokens: 4000
});
```

Image generation — use node-fetch directly, NOT openai SDK:
```js
import fetch from 'node-fetch';
const response = await fetch('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: imagePrompt,
    width: 1024,
    height: 1024,
    steps: 4,
    seed: Math.floor(Math.random() * 9999)
  })
});
const body = await response.json();
const base64 = body.artifacts[0].base64;
```

ImgBB upload — use node-fetch with URLSearchParams:
```js
import fetch from 'node-fetch';
const params = new URLSearchParams();
params.append('key', process.env.IMGBB_API_KEY);
params.append('image', base64String);
const response = await fetch('https://api.imgbb.com/1/upload', {
  method: 'POST',
  body: params
});
const data = await response.json();
const url = data.data.url;
```

**REBUILD THESE BACKEND FILES:**

`/api/middleware/rateLimit.js` — in-memory Map, sliding window, max 5 requests per IP per 5 minutes. Return true if blocked, send 429 with `{ error: "Rate limit exceeded", retryAfter: secondsRemaining }`. Ban IPs with 10+ requests in 2 minutes for 24 hours.

`/api/middleware/validate.js` — check Content-Type is application/json, body under 100kb, required fields present. Return true if invalid, send 400 with error message.

`/api/middleware/logger.js` — log timestamp, IP, endpoint, response time. Export logger function.

`/api/middleware/security.js` — block missing User-Agent with 403. Honeypot: if body has field `website` return fake 200 silently. Add security headers. Return true if blocked.

`/api/generate-readme.js` — apply all middleware. Required field: `projectContext` string under 50000 chars. Use NVIDIA NIM openai-compatible client to call `openai/gpt-oss-120b`. System prompt: "You are a professional README.md writer. Generate a complete beautiful production-grade README.md in markdown. Always include: title with emoji, shields.io badges, description, features with emoji, tech stack table, prerequisites, installation with code blocks, usage examples, configuration, contributing, license, star history section, show your support section. Leave exactly two image placeholders marked as IMAGE_URL_1 and IMAGE_URL_2." Max tokens 4000. Return `{ readme: generatedMarkdown }`.

`/api/generate-image.js` — apply all middleware. Required field: `prompt` under 500 chars. Use node-fetch to call NVIDIA Flux Klein endpoint. Return `{ base64: imageBase64 }`.

`/api/upload-image.js` — apply all middleware. Required field: `image` base64 string. Use node-fetch URLSearchParams to POST to ImgBB. Return `{ url: imageUrl }`.

`/api/update-readme.js` — apply all middleware. Required fields: `currentContent`, `instructions`, `conversationHistory`, `activeFile`. Call NVIDIA GPT-OSS-120B with system prompt: "You are a README editing expert. You ONLY edit markdown. NEVER touch code files. Understand surgical commands: 'between paragraph X and Y add text', 'add image from path', 'add video from path', 'replace section NAME', 'delete section NAME', 'add badge TYPE', 'make it more professional/casual'. Return complete updated markdown only." Pass conversationHistory as messages array for context. Return `{ readme: updatedMarkdown }`.

`/api/analyse-readme.js` — apply all middleware. Required field: `content`. Call NVIDIA GPT-OSS-120B with system prompt: "You are a README quality analyst. Return ONLY valid JSON, no markdown, no backticks, no preamble." Ask for JSON with: overallScore, readabilityScore, seoScore, completenessScore, wordCount, estimatedReadTime, sections array (name, exists, score, suggestion), missingCriticalSections array, strengths array, improvements array, suggestions array. Parse and return JSON directly.

`/api/health.js` — no middleware. Return `{ status: 'ok', version: '1.0.0', timestamp: Date.now(), nvidia: 'gpt-oss-120b + flux-klein', endpoints: ['generate-readme','generate-image','upload-image','update-readme','analyse-readme'] }`.

`api/.env.example`:
```
NVIDIA_API_KEY=your_nvidia_nim_api_key_here
IMGBB_API_KEY=your_imgbb_api_key_here
```

`vercel.json`:
```json
{
  "functions": {
    "api/**/*.js": { "maxDuration": 60 }
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

**STEP 3 — FIX CLI /src FILES**
After backend is fully rebuilt, fix all CLI files in `/src`. Every file that calls the backend must use `https://readme-ai-backend.vercel.app` as base URL (or from config). Remove ALL references to any API keys in CLI code — users never need keys. Fix any broken imports. Make sure all spinner messages, chalk colors, boxen styling still work.

**STEP 4 — VERIFY**
After all fixes: read every file once more and confirm: zero references to OpenAI API key, zero references to Anthropic, zero references to Claude Sonnet, zero hardcoded API keys, all backend files are self-contained, all CLI files call correct backend URL.

Do ALL of this in one session. When asked for permission press option 2 "Yes allow all edits during this session". Do not stop between files. Do not ask for confirmation. Rebuild everything completely.

