# Navigator

An AI automation desktop assistant that automates file management, document creation, and browser tasks using your own AI API keys.

## Features

- **Browser Automation** - Control web browsers, navigate sites, fill forms, click buttons
- **File Management** - Sort, rename, and move files based on content or rules
- **Document Creation** - Generate documents, spreadsheets, and presentations
- **Privacy First** - Runs locally on your machine, your data stays on your device
- **Multiple AI Providers** - OpenAI, Anthropic, Google, xAI, Ollama, and more

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Development

```bash
pnpm install
pnpm dev
```

### Building

```bash
pnpm build
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for full architecture details.

Key packages:

- `@navigator_ai/agent-core` - Core business logic, types, storage, MCP tools
- `@navigator/web` - Standalone React UI (Vite + React Router + Zustand)
- `@navigator/desktop` - Thin Electron shell (main process + preload)

## License

MIT License--
