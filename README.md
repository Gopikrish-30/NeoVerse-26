<div align="center">

# Navigator

**The open-source AI coworker that lives on your desktop.**

Navigator is a privacy-first AI automation assistant that runs entirely on your machine — automating browser tasks, file management, and document creation using your own AI API keys. Your data never leaves your device.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)
[![Electron](https://img.shields.io/badge/Electron-35-47848F)](https://www.electronjs.org)

</div>


## Overview

Navigator is a desktop application that acts as your personal AI coworker. It combines the power of state-of-the-art AI models with local execution — giving you full control over your data, workflows, and automation tasks.

Built on **Electron**, **React**, and a custom **agent-core** library, Navigator spawns the OpenCode CLI under the hood (via `node-pty`) and bridges real-time AI task execution directly into a polished UI. All API keys are stored locally with **AES-256-GCM encryption**.

---

## Features

| Feature | Description |
|---------|-------------|
| 🌐 **Browser Automation** | Control web browsers, navigate sites, fill forms, and click buttons using Playwright |
| 📁 **File Management** | Sort, rename, move, and organize files based on content or user-defined rules |
| 📄 **Document Creation** | Generate documents, spreadsheets, and presentations on demand |
| 🔒 **Privacy First** | Runs 100% locally — your files and keys never leave your device |
| 🤖 **15+ AI Providers** | OpenAI, Anthropic, Google, xAI, Ollama, AWS Bedrock, Azure, and more |
| 🧠 **Thought Streaming** | Watch the AI's real-time reasoning, decisions, and actions as they happen |
| 🎙️ **Speech-to-Text** | Voice input via ElevenLabs transcription |
| 🛡️ **Permission System** | Explicit user consent required for any file or system operation |
| 📦 **Custom Skills** | Bundle and manage prompt-based automation skills |
| 📜 **Task History** | Full searchable history of every task and its message log |
| 🌍 **Internationalization** | Multi-language support via i18next |
| 💬 **Telegram Integration** | Control Navigator remotely via a Telegram bot |

---

## AI Providers

Navigator supports **15 AI providers** out of the box:

| Provider | Type |
|----------|------|
| OpenAI | Cloud |
| Anthropic (Claude) | Cloud |
| Google (Gemini) | Cloud |
| xAI (Grok) | Cloud |
| DeepSeek | Cloud |
| Moonshot | Cloud |
| MiniMax | Cloud |
| ZAI | Cloud |
| AWS Bedrock | Cloud (managed) |
| Azure AI Foundry | Cloud (managed) |
| OpenRouter | Aggregator |
| LiteLLM | Proxy |
| Ollama | Local |
| LM Studio | Local |
| Custom Endpoint | Self-hosted |

---

## Tech Stack

### Desktop App (`apps/desktop`)

| Technology | Purpose |
|-----------|---------|
| Electron 35 | Desktop application framework |
| electron-builder | App packaging (macOS, Windows) |
| node-pty | Spawns OpenCode CLI with PTY support |
| better-sqlite3 | Local SQLite database |
| grammy | Telegram bot integration |

### Web UI (`apps/web`)

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| React Router 7 | Client-side routing |
| Zustand 5 | Application state management |
| Vite 6 | Build tool and dev server |
| Tailwind CSS 3 | Utility-first styling |
| Radix UI | Accessible component primitives |
| Framer Motion | Animations and transitions |
| i18next | Internationalization |

### Agent Core (`packages/agent-core`)

| Technology | Purpose |
|-----------|---------|
| TypeScript 5.7 (ESM) | Language and module system |
| better-sqlite3 | Task and settings storage |
| Zod | Runtime schema validation |
| AWS SDK / Azure SDK | Cloud provider integrations |
| Playwright | Browser automation engine |
| Vitest | Unit and integration testing |

---

## Architecture

Navigator uses a **monorepo** structure with three main packages:

```
navigator/
├── apps/
│   ├── desktop/          # Electron shell (main process + preload)
│   └── web/              # React UI (Vite + React Router + Zustand)
└── packages/
    └── agent-core/       # Core library (@navigator_ai/agent-core)
```

### How It Works

```
React UI (taskStore)
    │  window.navigatorApp.*
    ▼
Preload (contextBridge)
    │  ipcRenderer.invoke / ipcRenderer.on
    ▼
Electron Main Process (ipc/handlers.ts)
    │  agent-core factories
    ▼
TaskManager → OpenCode CLI (node-pty)
    │  streaming events
    ▼
IPC back to Renderer → UI updates
```

The **main process** manages the full task lifecycle: spawning the OpenCode CLI, routing permissions, streaming thought events, and writing structured logs. The **preload** exposes a type-safe `window.navigatorApp` API via Electron's `contextBridge`. The **React UI** consumes this through a Zustand store.

### Key IPC Events

| Channel | Direction | Description |
|---------|-----------|-------------|
| `task:update` | Main → Renderer | New message from the AI |
| `task:update:batch` | Main → Renderer | Batched messages (50 ms window) |
| `task:progress` | Main → Renderer | Startup stage / tool progress |
| `task:status-change` | Main → Renderer | Task state transitions |
| `permission:request` | Main → Renderer | File/tool permission request |
| `todo:update` | Main → Renderer | Todo list changes |
| `auth:error` | Main → Renderer | OAuth token expiry |

### Agent Core Public API

`@navigator_ai/agent-core` exports seven factory functions:

| Factory | Purpose |
|---------|---------|
| `createTaskManager()` | Spawn and manage OpenCode CLI tasks |
| `createStorage()` | SQLite storage with AES-256-GCM encryption |
| `createPermissionHandler()` | File operation permission request/response |
| `createThoughtStreamHandler()` | Real-time AI reasoning event stream |
| `createLogWriter()` | Structured rotating log file writer |
| `createSkillsManager()` | Custom prompt skill management |
| `createSpeechService()` | Speech-to-text via ElevenLabs |

For a deep dive, see [docs/architecture.md](docs/architecture.md) and [docs/CODEBASE_DEEP_DIVE.md](docs/CODEBASE_DEEP_DIVE.md).

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 20.0.0 |
| pnpm | ≥ 9.0.0 |

### Installation

```bash
# Clone the repository
git clone https://github.com/navigator-ai/navigator.git
cd navigator

# Install all workspace dependencies
pnpm install
```

### Run in Development Mode

```bash
# Launch the full desktop app with hot reload
pnpm dev

# Or run just the web UI (Vite dev server on http://localhost:5173)
pnpm dev:web

# Dev mode with a clean slate (clears all stored data)
pnpm dev:clean
```

### Configure Your AI Provider

1. Open the **Settings** panel in the app
2. Select your preferred AI provider
3. Enter your API key (stored locally with AES-256-GCM encryption)
4. Choose a model and start automating

---

## Development

### Code Style

- **TypeScript everywhere** — no plain JavaScript for application logic
- **ESM-first** — `agent-core` uses `"type": "module"`, all imports require `.js` extensions
- **Always use braces** for `if`/`else`/`for`/`while` (enforced by ESLint)
- **No nested ternaries** — use mapper objects or `if/else` for readability
- **No unnecessary comments** — comments explain *why*, not *what*

### Linting & Formatting

```bash
# Run TypeScript type checking + ESLint (all workspaces)
pnpm lint

# TypeScript type checking only
pnpm typecheck

# ESLint only
pnpm lint:eslint

# Check formatting
pnpm format:check

# Auto-fix formatting
pnpm format
```

### Workspace Commands

```bash
# Run a command in a specific workspace
pnpm -F @navigator/web <command>
pnpm -F @navigator/desktop <command>
pnpm -F @navigator_ai/agent-core <command>
```

---

## Testing

### Web UI Tests

```bash
pnpm -F @navigator/web test              # All tests
pnpm -F @navigator/web test:unit         # Unit tests only
pnpm -F @navigator/web test:integration  # Integration tests only
```

### Desktop Tests

```bash
pnpm -F @navigator/desktop test          # All tests
pnpm -F @navigator/desktop test:unit     # Unit tests only
pnpm -F @navigator/desktop test:e2e      # Playwright E2E (Docker)
pnpm -F @navigator/desktop test:e2e:native  # Playwright E2E (native, serial)
```

### Agent Core Tests

```bash
pnpm -F @navigator_ai/agent-core test    # All agent-core tests
```

### Full Test Suite

```bash
pnpm lint && pnpm format:check && \
  pnpm -F @navigator/web test && \
  pnpm -F @navigator/desktop test && \
  pnpm -F @navigator_ai/agent-core test
```

---

## Building & Packaging

```bash
# Build all workspaces
pnpm build

# Build web UI only
pnpm build:web

# Build and package the Electron desktop app
pnpm build:desktop

# Clean all build outputs and node_modules
pnpm clean
```

### Supported Platforms

| Platform | Architecture |
|----------|-------------|
| macOS | Intel (x64) + Apple Silicon (arm64) |
| Windows | x64 (NSIS installer) |

---

## Project Structure

```
navigator/
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── main/              # Electron main process
│   │   │   │   ├── ipc/           # IPC handlers and callbacks
│   │   │   │   ├── opencode/      # OpenCode CLI wrapper
│   │   │   │   ├── store/         # Storage singletons
│   │   │   │   ├── skills/        # Skills manager
│   │   │   │   ├── logging/       # Log file writer
│   │   │   │   ├── telegram/      # Telegram bot
│   │   │   │   └── security/      # URL validation
│   │   │   └── preload/           # contextBridge (window.navigatorApp)
│   │   ├── e2e/                   # Playwright E2E tests
│   │   └── resources/             # Icons and packaging assets
│   └── web/
│       ├── src/client/
│       │   ├── components/        # UI components (ui/, layout/, execution/)
│       │   ├── pages/             # Home, Execution, History
│       │   ├── stores/            # Zustand taskStore
│       │   ├── hooks/             # Custom React hooks
│       │   ├── lib/               # Typed IPC wrappers, utilities
│       │   └── i18n/              # Localization setup
│       ├── public/                # Static assets
│       └── locales/               # Translation files
├── packages/
│   └── agent-core/
│       ├── src/
│       │   ├── common/            # Shared types, schemas, constants
│       │   ├── factories/         # Public API factory functions
│       │   ├── internal/          # Core class implementations
│       │   ├── storage/           # SQLite schema, migrations, repos
│       │   ├── opencode/          # CLI adapter, config, stream parsing
│       │   ├── providers/         # 15 AI provider integrations
│       │   ├── services/          # Permission, speech, thought-stream
│       │   └── browser/           # Browser detection, Playwright setup
│       └── mcp-tools/             # Model Context Protocol tool servers
├── docs/
│   ├── architecture.md
│   └── CODEBASE_DEEP_DIVE.md
├── scripts/                       # Build and dev scripts
├── AGENTS.md                      # Developer guidelines
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started, code style requirements, and the pull request process.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and run the full test suite
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a pull request

---

## Security

Navigator is designed with security as a core principle:

- **Encrypted storage** — API keys use AES-256-GCM encryption, stored only on your device
- **No telemetry** — zero data collection, no analytics, no external beacons
- **Local-first** — all processing happens on your machine; only your chosen AI provider receives prompts
- **Permission gating** — every file system operation requires explicit user approval
- **Process isolation** — Electron's native process isolation and V8 code caching

To report a security vulnerability, please follow the guidelines in [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with ❤️ by the Navigator team
</div>
