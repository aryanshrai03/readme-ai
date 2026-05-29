# readme‑ai  
**AI‑powered README generator using NVIDIA NIM – free, no API keys needed**  

| ![npm version](https://img.shields.io/npm/v/readme-ai.svg?color=38bdf8&label=npm) | ![license](https://img.shields.io/npm/l/readme-ai.svg?color=38bdf8&label=license) | ![downloads](https://img.shields.io/npm/dt/readme-ai.svg?color=38bdf8&label=downloads) |
|---|---|---|

![Banner](https://via.placeholder.com/1200x300/0d1117/38bdf8?text=readme-ai)

## 📖 Description
`readme-ai` scans your project, extracts key metadata, and generates a polished, developer‑focused README in seconds. Powered by NVIDIA NIM (GPT‑OSS‑120B + FLUX.2), it runs completely locally—no external API keys, no rate limits.

<div align="center">
  <img src="https://via.placeholder.com/800x400/0d/1117/38bdf8?text=CLI+Demo" alt="CLI demo showing readme-ai in action" />
</div>

## ✨ Features
| Feature | Description |
|:---|:---|
| **Zero‑API‑Key** | Runs locally with NVIDIA NIM; no OpenAI or other keys required |
| **Full‑Project Scan** | Detects `package.json`, source files, folder tree (2‑level depth) |
| **Dynamic Banner** | Optional AI‑generated banner (fallback to placeholder) |
| **Rich Output** | Tables, code fences, emojis, shields, and a custom footer |
| **CLI Ready** | Simple `npm start` or one‑liner installation & execution |
| **Extensible** | Built on common Node libs (`commander`, `inquirer`, `chalk`, …) |

<div align="center">
  <img src="https://via.placeholder.com/900x300/0d1117/38bdf8?text=Feature+Overview+Graphic" alt="Graphic summarizing readme-ai features" />
</div>

## 📦 Installation
```bash
# Global install (recommended)
npm i -g readme-ai

# Or run directly without installing
npx readme-ai
```

## 🚀 Usage
```bash
# From any project root
readme-ai          # generates/overwrites README.md
```

<div align="center">
  <img src="https://via.placeholder.com/800x400/0d1117/38bdf8?text=Terminal+Output+Demo" alt="Terminal output after running readme-ai" />
</div>

### Quick Start (one‑liner)
```bash
npm i -g readme-ai && readme-ai
```

### CLI Options
| Option | Description |
|:---|:---|
| `--cwd <path>` | Path to the project root (defaults to `process.cwd()`) |
| `--output <file>` | Write output to a custom file (default: `README.md`) |
| `--no-banner` | Skip AI banner generation (uses placeholder) |

## ⚙️ Configuration
`readme-ai` respects the following environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` | Base URL for NVIDIA NIM |
| `NVIDIA_MODEL` | `openai/gpt-oss-120b` | Model used for text generation |
| `NVIDIA_IMAGE_URL` | `https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b` | Endpoint for banner images |
| `NVIDIA_API_KEY` | *(empty)* | **Optional** – required only for AI‑generated banners |
| `IMGBB_API_KEY` | *(empty)* | Optional Imgbb key for uploading generated images |

Create a `.env` file in the project root to set any of the above, e.g.:

```dotenv
NVIDIA_API_KEY=your-nim-key
IMGBB_API_KEY=your-imgbb-key
```

<div align="center">
  <img src="https://via.placeholder.com/900x300/0d1117/38bdf8?text=Configuration+Flowchart" alt="Flowchart showing how environment variables are used" />
</div>

## 🤝 Contributing
1. Fork the repository  
2. Create a feature branch (`git checkout -b feat/awesome-feature`)  
3. Install dev dependencies (`npm ci`) – *none required at the moment*  
4. Submit a Pull Request with clear description and tests (if applicable)  

All contributions are welcomed; please follow the existing code style and run `npm run lint` before submitting.

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for full text.

---

*Note: This README was generated with NVIDIA NIM.*

**Built with ❤️ by [aryanshrai03](https://github.com/aryanshrai03)**