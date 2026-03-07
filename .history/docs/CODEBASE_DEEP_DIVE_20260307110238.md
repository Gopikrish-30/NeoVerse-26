# Navigator — Complete Codebase Deep Dive

> A comprehensive technical guide covering architecture, skills, agents, MCP tools, tech stack, workflows, and extensibility.

---

## Table of Contents

1. [What is Navigator?](#1-what-is-navigator)
2. [Tech Stack Overview](#2-tech-stack-overview)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Agents — What They Are & How They Work](#5-agents--what-they-are--how-they-work)
6. [Skills — What They Are & How They Work](#6-skills--what-they-are--how-they-work)
7. [MCP (Model Context Protocol) — What It Is & How It's Integrated](#7-mcp-model-context-protocol--what-it-is--how-its-integrated)
8. [Agentic Orchestration Platform](#8-agentic-orchestration-platform)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Backend / Desktop Architecture](#10-backend--desktop-architecture)
11. [Core Features](#11-core-features)
12. [Agent Capabilities & Available Skills](#12-agent-capabilities--available-skills)
13. [Multi-Agent Architecture](#13-multi-agent-architecture)
14. [How to Create & Extend Agents, Skills, and MCP](#14-how-to-create--extend-agents-skills-and-mcp)
15. [Complete End-to-End Workflow: User Prompt → Task Completion](#15-complete-end-to-end-workflow-user-prompt--task-completion)
16. [Security Model](#16-security-model)
17. [AI Provider Support](#17-ai-provider-support)
18. [Key Files Reference](#18-key-files-reference)

---

## 1. What is Navigator?

Navigator is an **AI-powered desktop automation assistant** that can:

- **Automate browser tasks** (fill forms, scrape data, navigate websites)
- **Manage files** (sort, rename, move, create, delete with user permission)
- **Execute code** (run shell commands, scripts)
- **Research the web** (search, gather info, summarize)
- **Interact with external services** (via MCP connectors with OAuth)
- **Follow specialized workflows** (via Skills)

It uses a **split architecture**: a React-based UI running inside an Electron desktop shell, powered by the OpenCode CLI agent framework under the hood.

---

## 2. Tech Stack Overview

### Frontend (Web UI — `apps/web`)

| Technology     | Version | Purpose                                     |
| -------------- | ------- | ------------------------------------------- |
| React          | 19      | UI framework                                |
| React Router   | 7       | Client-side routing (hash-based)            |
| Vite           | 6       | Dev server & bundler                        |
| TypeScript     | 5.7     | Type safety                                 |
| Zustand        | 5       | State management (single store)             |
| Tailwind CSS   | 3.4     | Utility-first styling                       |
| shadcn/ui      | —       | Reusable UI component library (Radix-based) |
| Framer Motion  | 12      | Animations                                  |
| i18next        | —       | Internationalization (EN, ZH-CN)            |
| React Markdown | —       | Rendering agent responses                   |
| Phosphor Icons | —       | Icon library                                |

### Desktop Shell (`apps/desktop`)

| Technology       | Version | Purpose                          |
| ---------------- | ------- | -------------------------------- |
| Electron         | 35      | Cross-platform desktop app       |
| Electron Builder | 25      | App packaging & signing          |
| Vite             | 6       | Main/preload compilation         |
| node-pty         | —       | Pseudo-terminal for spawning CLI |
| better-sqlite3   | —       | Embedded SQL database            |
| Bundled Node.js  | 20.18.1 | Shipped with app for MCP servers |

### Agent Core (`packages/agent-core`)

| Technology                | Purpose                           |
| ------------------------- | --------------------------------- | ------------------------- |
| OpenCode CLI              | 1.2.10                            | Agent execution framework |
| better-sqlite3            | SQLite storage with WAL mode      |
| gray-matter               | YAML frontmatter parsing (skills) |
| Zod                       | 3.24                              | Schema validation         |
| @modelcontextprotocol/sdk | MCP tool protocol                 |
| Playwright                | Browser automation (CDP)          |
| AWS SDK                   | Bedrock provider support          |
| Azure SDK                 | Azure OpenAI/Foundry support      |

### Development & Testing

| Tool       | Purpose     |
| ---------- | ----------- | -------------------------- |
| pnpm       | 9.15        | Monorepo package manager   |
| Vitest     | 4           | Unit & integration testing |
| Playwright | E2E testing |
| ESLint     | 9           | Linting (flat config)      |
| Prettier   | 3.8         | Code formatting            |

---

## 3. Monorepo Structure

```
Navigator/
├── apps/
│   ├── web/                          # @navigator/web — React UI
│   │   ├── src/client/
│   │   │   ├── components/           # UI components (execution, settings, skills, etc.)
│   │   │   ├── stores/               # Zustand stores (taskStore.ts)
│   │   │   ├── pages/                # Home, Execution, History
│   │   │   ├── lib/                  # Utilities, API wrappers, animations
│   │   │   └── router.tsx            # Hash-based routing
│   │   ├── locales/                  # i18n translations
│   │   └── public/assets/            # Static assets
│   │
│   └── desktop/                      # @navigator/desktop — Electron shell
│       ├── src/main/                 # Electron main process
│       │   ├── ipc/                  # IPC handlers (100+ handlers)
│       │   ├── opencode/             # Config generation for OpenCode CLI
│       │   ├── skills/               # Desktop skills manager wrapper
│       │   ├── permission-api.ts     # HTTP bridge for file permissions
│       │   └── thought-stream-api.ts # HTTP bridge for thought streaming
│       ├── src/preload/              # Preload bridge (~500 lines)
│       ├── bundled-skills/           # 6 official skills shipped with app
│       ├── e2e/                      # Playwright E2E tests
│       └── scripts/                  # Build, packaging, dev scripts
│
├── packages/
│   └── agent-core/                   # @navigator_ai/agent-core — Core logic (ESM)
│       ├── src/
│       │   ├── opencode/             # Config generator, CLI resolver, stream parser
│       │   ├── internal/classes/     # TaskManager, OpenCodeAdapter
│       │   ├── storage/              # SQLite repos, migrations (v1-v6)
│       │   ├── connectors/           # OAuth MCP connector logic
│       │   ├── browser/              # Browser server (Playwright/CDP)
│       │   ├── common/types/         # Shared TypeScript types
│       │   └── factories/            # Factory functions (public API)
│       ├── mcp-tools/                # 9 MCP tool implementations
│       │   ├── start-task/           # Mandatory — registers task plan
│       │   ├── complete-task/        # Mandatory — finalizes task
│       │   ├── ask-user-question/    # Asks user questions via UI dialog
│       │   ├── file-permission/      # Requests file operation permission
│       │   ├── report-thought/       # Streams thoughts to UI
│       │   ├── report-checkpoint/    # Reports progress milestones
│       │   ├── dev-browser/          # Browser HTTP server (Playwright)
│       │   ├── dev-browser-mcp/      # Browser MCP tool interface
│       │   └── safe-file-deletion/   # Safe deletion workflow
│       └── tests/                    # Unit tests
│
├── docs/                             # Documentation
├── scripts/                          # Root-level dev scripts
└── package.json                      # Monorepo root (pnpm workspaces)
```

---

## 4. Architecture Overview

Navigator follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REACT UI (apps/web)                         │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Home    │  │  Execution   │  │  Settings   │  │  History   │  │
│  │  Page    │  │  Page        │  │  Dialog     │  │  Page      │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘  │
│       │               │                 │                │         │
│  ┌────┴───────────────┴─────────────────┴────────────────┴──────┐  │
│  │              ZUSTAND STORE (taskStore.ts)                    │  │
│  │  State: currentTask, messages, todos, permissionRequest     │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                             │ IPC calls                           │
├─────────────────────────────┼─────────────────────────────────────┤
│                    PRELOAD BRIDGE                                  │
│              window.navigatorApp.* API                            │
├─────────────────────────────┼─────────────────────────────────────┤
│                    ELECTRON MAIN PROCESS                          │
│  ┌──────────────┐  ┌───────┴────────┐  ┌───────────────────────┐  │
│  │ IPC Handlers │  │ Permission API │  │ Thought Stream API   │  │
│  │ (100+)       │  │ (HTTP :9226)   │  │ (HTTP :9228)         │  │
│  └──────┬───────┘  └───────┬────────┘  └───────────┬───────────┘  │
│         │                  │                       │              │
│  ┌──────┴──────────────────┴───────────────────────┴───────────┐  │
│  │              AGENT-CORE (@navigator_ai/agent-core)          │  │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │  │
│  │  │ TaskManager  │  │ OpenCodeAdapter│  │ SkillsManager    │ │  │
│  │  │ (lifecycle)  │  │ (CLI spawn)    │  │ (skill registry) │ │  │
│  │  └──────┬───────┘  └───────┬────────┘  └──────────────────┘ │  │
│  │         │                  │                                 │  │
│  │  ┌──────┴──────────────────┴───────────────────────────────┐ │  │
│  │  │           OPENCODE CLI (node-pty subprocess)            │ │  │
│  │  │  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │ │  │
│  │  │  │AI Model  │  │ MCP Servers  │  │ Stream Parser    │ │ │  │
│  │  │  │(API call)│  │ (9 built-in) │  │ (JSON messages)  │ │ │  │
│  │  │  └──────────┘  └──────────────┘  └───────────────────┘ │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
User types prompt in React UI
    → Zustand action dispatches IPC call
    → Electron main process receives via IPC handler
    → TaskManager creates OpenCodeAdapter
    → OpenCodeAdapter spawns OpenCode CLI via node-pty
    → OpenCode CLI calls AI model API (Anthropic, OpenAI, etc.)
    → AI model responds with tool calls + text
    → OpenCode executes tools (MCP servers)
    → Streaming JSON messages flow back via PTY
    → StreamParser extracts messages
    → IPC events sent to renderer
    → Zustand store updates
    → React components re-render with live updates
```

---

## 5. Agents — What They Are & How They Work

### What is an Agent?

In Navigator, an **agent** is an AI-powered entity that receives a user's task, plans how to accomplish it, and executes a series of actions (tool calls) to complete it. The agent has:

- **A system prompt** — Instructions on who it is, what it can do, and how to behave
- **Access to MCP tools** — Browser automation, file operations, user interaction, etc.
- **A selected AI model** — The LLM powering its reasoning (Claude, GPT-4, Gemini, etc.)
- **Skills** — Specialized knowledge it can load for specific task types

### How Many Agents?

Currently, Navigator uses **a single agent** called **"navigator"**. It runs in **primary mode** and handles all tasks. The architecture supports future multi-agent execution (the data model includes `agentName` fields), but currently one agent handles everything.

### How the Agent Works

1. **Agent receives** the user's prompt + system instructions + available tools
2. **Calls `start_task`** (mandatory first tool call) to register its plan:
   - Original request
   - Whether planning is needed
   - Goal, steps, verification criteria
   - Which skills to load
3. **Executes tools** based on its plan:
   - Browser actions (`browser_click`, `browser_type`, `browser_navigate`, etc.)
   - File operations (with mandatory permission requests)
   - Shell commands
   - User questions (via dialog)
   - Thought reporting (for UI visibility)
4. **Updates todos** as it progresses through steps
5. **Calls `complete_task`** when finished, with status: `success`, `partial`, or `blocked`

### Agent Configuration

The agent is configured via a dynamically-generated `opencode.json` file that includes:

```json
{
  "provider": { ... },           // AI provider settings
  "model": "anthropic/claude-sonnet-4-20250514",
  "agents": {
    "navigator": {
      "instructions": "...",     // System prompt (dynamic)
      "model": "...",
      "mode": "primary"
    }
  },
  "mcp": {
    "file-permission": { ... },  // MCP server configs
    "ask-user-question": { ... },
    "start-task": { ... },
    "complete-task": { ... },
    "dev-browser-mcp": { ... },
    "connector-github": { ... }  // Remote MCP connectors
  }
}
```

### The System Prompt

The agent's system prompt is dynamically generated based on:

- **Platform** (Windows PowerShell vs macOS/Linux bash)
- **Browser mode** (builtin/remote/none)
- **Enabled skills** (listed with file paths)
- **Available connectors** (remote MCP servers)

Structure:

```xml
<identity>You are Navigator, a [browser automation|task automation] assistant.</identity>
<environment>Platform-specific instructions (shell, paths, temp dirs)</environment>
<behavior name="task-planning">
  MANDATORY: Call start_task FIRST
  Plan with goal, steps, verification
  Track progress with todos
  Call complete_task when done
</behavior>
<capabilities>Browser control, file management, web research, etc.</capabilities>
<important name="filesystem-rules">
  ALWAYS request file permission before file operations
</important>
<available-skills>List of enabled skills with paths</available-skills>
```

### Completion Enforcement

The **CompletionEnforcer** is a state machine that ensures tasks complete properly:

| State                          | Meaning                                            |
| ------------------------------ | -------------------------------------------------- |
| `IDLE`                         | No `complete_task` called yet                      |
| `BLOCKED`                      | Agent reported a blocker                           |
| `PARTIAL_CONTINUATION_PENDING` | Incomplete todos, will retry                       |
| `CONTINUATION_PENDING`         | Agent stopped without `complete_task`, needs retry |
| `MAX_RETRIES_REACHED`          | Exceeded 10 continuation attempts                  |
| `DONE`                         | Task successfully completed                        |

If the agent stops without calling `complete_task` or has incomplete todos, the system automatically resumes it with a continuation prompt (up to 10 retries).

---

## 6. Skills — What They Are & How They Work

### What is a Skill?

A **Skill** is a specialized set of instructions (a prompt file) that teaches the agent how to handle a specific type of task. Skills are like **plugins for the agent's knowledge** — they extend what the agent knows how to do.

Each skill is a `SKILL.md` file with:

- **YAML frontmatter** — Metadata (name, description, slash command)
- **Markdown body** — Detailed instructions, workflows, best practices

### How Skills Work

```
1. User types: "/code-review my app.js"
   or Agent detects relevant skill from task description

2. Agent calls start_task with skills: ["code-review"]

3. Agent reads the SKILL.md file to load specialized instructions

4. Agent follows the skill's workflow during execution

5. Results follow the skill's output format
```

### Skill File Structure

```
skill-name/
├── SKILL.md           # Required: frontmatter + instructions
├── scripts/           # Optional: executable scripts
│   └── helper.py
├── references/        # Optional: reference docs
│   └── api_docs.md
└── assets/            # Optional: templates, images
    └── template.html
```

### SKILL.md Format

```yaml
---
name: my-skill
description: What this skill does and when to use it
command: /my-skill
verified: true          # Only for official skills
hidden: false           # Hidden from user UI but still available
---

## Instructions

Detailed markdown instructions for the agent to follow...

### Workflow
1. Step one
2. Step two
3. Step three

### Output Format
- What format results should be in
```

### Skill Sources

| Source        | Location                             | Can Delete? |
| ------------- | ------------------------------------ | ----------- |
| **Official**  | `bundled-skills/` (shipped with app) | No          |
| **Community** | Downloaded from GitHub               | Yes         |
| **Custom**    | User-created locally                 | Yes         |

### Skill ID Format

Skills are identified by: `{source}-{sanitized-name}`

Examples:

- `official-code-review`
- `community-github-pr-helper`
- `custom-my-workflow`

### Skill Storage

Skills are tracked in SQLite:

```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('official', 'community', 'custom')),
  is_enabled INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,
  github_url TEXT,
  updated_at TEXT NOT NULL
);
```

### SkillsManager API

```typescript
// Factory function
const skillsManager = createSkillsManager({
  bundledSkillsPath: '/path/to/bundled-skills',
  userSkillsPath: '/path/to/user/skills',
});

// Core operations
await skillsManager.initialize(); // Load from disk
await skillsManager.resync(); // Reload and sync
skillsManager.getAllSkills(); // List all
skillsManager.getEnabledSkills(); // Only active ones
skillsManager.getSkillContent(id); // Read SKILL.md content
skillsManager.setSkillEnabled(id, true); // Toggle on/off
await skillsManager.addSkill(source); // Install from file or GitHub URL
skillsManager.deleteSkill(id); // Remove (custom/community only)
```

### 6 Available Built-in Skills

#### 1. **Code Review** (`/code-review`)

- Reviews code for bugs, security issues, performance problems, best practices
- Structured output: location, severity, issue description, fix suggestion
- Categories: correctness, security, performance, maintainability

#### 2. **Download File** (`/download-file`)

- Reliable file downloading via browser automation (Chrome on Windows/macOS)
- 8-step process: trigger download → detect popups → verify completion → locate file
- Handles safety bars, interstitials, OS dialogs, save dialogs
- Platform-aware (Windows vs macOS path differences)

#### 3. **Git Commit** (`/git-commit`)

- Creates well-structured git commits following conventional commit format
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Workflow: git status → diff review → staging → commit message → commit

#### 4. **Google Sheets** (`/google-sheets`)

- Browser automation for Google Sheets (canvas-based app)
- Reliable keyboard shortcuts over DOM manipulation
- Data entry, formulas, formatting, sheet tabs, menus
- Error recovery with Cmd+Z / Ctrl+Z

#### 5. **Skill Creator** (`/skill-creator`) _(hidden)_

- Meta-skill: guides users in creating new skills
- Teaches SKILL.md anatomy, frontmatter rules, content structure
- Mandatory verification workflow for new skills

#### 6. **Web Research** (`/web-research`)

- Research topics across multiple web sources
- 5-step process: define question → search → gather → verify → summarize
- Output: summary, detailed findings, sources list, caveats

---

## 7. MCP (Model Context Protocol) — What It Is & How It's Integrated

### What is MCP?

**MCP (Model Context Protocol)** is an open standard that lets AI agents communicate with external tools and services. Think of it as a **universal plugin system for AI agents** — each MCP server exposes tools that the agent can call.

In Navigator, MCP is the backbone of all agent-tool communication. Every capability the agent has (browser control, file permissions, user questions) is exposed via MCP.

### How MCP Works in Navigator

```
┌─────────────────────┐     ┌──────────────────────────────────┐
│   OpenCode CLI      │     │     MCP Servers (9 built-in)     │
│   (Agent Runtime)   │────▶│                                  │
│                     │◀────│  start-task        (stdio)       │
│  "I need to click   │     │  complete-task     (stdio)       │
│   a button on the   │     │  file-permission   (stdio+HTTP)  │
│   webpage"          │     │  ask-user-question (stdio+HTTP)  │
│                     │     │  report-thought    (stdio+HTTP)  │
│                     │     │  report-checkpoint (stdio+HTTP)  │
│                     │     │  dev-browser-mcp   (stdio)       │
│                     │     │  dev-browser       (HTTP server)  │
│                     │     │  safe-file-deletion(stdio)       │
│                     │     │                                  │
│                     │     │  + Remote MCP connectors (OAuth)  │
└─────────────────────┘     └──────────────────────────────────┘
```

### 9 Built-in MCP Tools

#### Lifecycle Tools (Mandatory)

| Tool              | Purpose                                                        | Protocol |
| ----------------- | -------------------------------------------------------------- | -------- |
| **start-task**    | Agent MUST call first. Registers plan: goal, steps, skills.    | stdio    |
| **complete-task** | Agent MUST call last. Reports status: success/partial/blocked. | stdio    |

#### User Interaction Tools

| Tool                  | Purpose                                                                     | Protocol     | Port |
| --------------------- | --------------------------------------------------------------------------- | ------------ | ---- |
| **file-permission**   | Requests permission before any file operation (create/delete/rename/modify) | stdio + HTTP | 9226 |
| **ask-user-question** | Asks user questions via UI dialog with options, multi-select, free text     | stdio + HTTP | 9227 |

#### Streaming/Visibility Tools

| Tool                  | Purpose                                                                             | Protocol     | Port |
| --------------------- | ----------------------------------------------------------------------------------- | ------------ | ---- |
| **report-thought**    | Streams agent's thinking to UI in real-time (observation/reasoning/decision/action) | stdio + HTTP | 9228 |
| **report-checkpoint** | Reports progress milestones (progress/complete/stuck)                               | stdio + HTTP | 9228 |

#### Browser Automation

| Tool                | Purpose                                                                   | Protocol |
| ------------------- | ------------------------------------------------------------------------- | -------- |
| **dev-browser**     | HTTP server managing Playwright/Chrome browser instance                   | HTTP     |
| **dev-browser-mcp** | MCP interface for browser tools (click, type, navigate, screenshot, etc.) | stdio    |

Browser tools available to the agent:

- `browser_snapshot()` — Screenshot with AI-friendly element references
- `browser_click()` — Click elements by reference or coordinates
- `browser_type()` — Type text into elements
- `browser_keyboard()` — Press keyboard shortcuts
- `browser_navigate()` — Go to URL
- `browser_scroll()` — Scroll page
- `browser_wait()` — Wait for network/time
- `browser_tabs()` — Tab management
- `browser_script()` / `browser_evaluate()` — Execute JavaScript
- `browser_batch_actions()` — Multi-URL data extraction
- `browser_sequence()` — Multi-action batching

#### File Safety

| Tool                   | Purpose                                 | Protocol |
| ---------------------- | --------------------------------------- | -------- |
| **safe-file-deletion** | Safe deletion workflow (future feature) | stdio    |

### HTTP Bridge Architecture (How MCP Talks to UI)

MCP tools run as **separate Node.js processes** (spawned by OpenCode CLI). They can't directly access Electron's IPC. The solution: **HTTP API bridges** running in the main process.

```
MCP Tool Process                  Electron Main Process                 React UI
(e.g., file-permission)           (HTTP Server :9226)                   (Renderer)

1. Agent calls tool    ─────▶  2. POST /permission        ─────▶  3. IPC 'permission:request'
                                  Creates Promise                       Shows dialog
                                  WAITS for resolution     ◀─────  4. User clicks Allow/Deny
                               5. Promise resolved                      IPC 'permission:respond'
6. Tool returns result ◀─────  HTTP response sent back
```

### Remote MCP Connectors (OAuth)

Navigator supports connecting to **external MCP servers** via OAuth 2.0:

```
1. User opens Settings → Connectors → Add
2. App discovers OAuth metadata from server URL
3. PKCE challenge generated
4. User authorizes in browser
5. Auth code exchanged for access/refresh tokens
6. Tokens stored encrypted (AES-256-GCM)
7. Connector added to OpenCode config as remote MCP server

Config entry:
{
  "connector-github-abc123": {
    "type": "remote",
    "url": "https://mcp-server.example.com",
    "headers": { "Authorization": "Bearer <access_token>" },
    "enabled": true
  }
}
```

Token refresh happens automatically before each task — if a token is expired, it's refreshed; if refresh fails, the connector is marked as errored.

### MCP Extensibility

The MCP system is **fully extensible**:

1. **Add official skills** — Ship new `SKILL.md` files in `bundled-skills/`
2. **Install community skills** — From GitHub URLs
3. **Create custom skills** — Write `SKILL.md` files locally
4. **Connect remote MCP servers** — Any OAuth-compatible MCP server
5. **Build new MCP tools** — Add a new directory in `mcp-tools/` with stdio transport

---

## 8. Agentic Orchestration Platform

### What Framework Runs the Agent?

Navigator uses **[OpenCode CLI](https://github.com/navigator-ai/opencode)** (v1.2.10) as its agentic execution framework. It is **not** built on LangChain, CrewAI, AutoGPT, or any other popular agent framework.

### What is OpenCode CLI?

OpenCode is a **CLI-based AI agent runtime** that provides:

- **LLM integration** — Connects to 15+ AI providers
- **MCP protocol support** — Runs MCP servers and routes tool calls
- **Streaming JSON output** — Real-time message streaming (text, tool calls, reasoning)
- **Session management** — Resume interrupted tasks
- **Model routing** — Switch between providers/models

### How Navigator Uses OpenCode

Navigator treats OpenCode as a **black-box subprocess**:

```
Navigator (Electron)                    OpenCode CLI
┌─────────────────────┐                ┌──────────────────┐
│                     │   pty.spawn()  │                  │
│  OpenCodeAdapter    │───────────────▶│  opencode run    │
│                     │                │  --format json   │
│  Writes:            │                │  --model X       │
│  - opencode.json    │                │  --session Y     │
│  - auth.json        │                │  "user prompt"   │
│                     │                │                  │
│  Reads:             │                │  Outputs:        │
│  - JSON messages    │◀───────────────│  - text chunks   │
│  - Tool calls       │   PTY stdout   │  - tool calls    │
│  - Screenshots      │                │  - tool results  │
│  - Completion       │                │  - screenshots   │
└─────────────────────┘                └──────────────────┘
```

### CLI Resolution

The OpenCode binary is resolved based on platform:

- **Windows**: Checks for AVX2 CPU support → uses `opencode-x64.exe` or `opencode-baseline.exe`
- **macOS/Linux**: Resolves from `opencode-ai` npm package

### CLI Arguments

```bash
opencode run \
  --format json \                    # Structured JSON output
  --model anthropic/claude-sonnet-4-20250514 \  # Selected model
  --session <sessionId> \            # For session resumption
  --agent navigator \                # Agent name
  "User's task prompt here"
```

### Why Not LangChain/CrewAI/etc.?

Navigator chose OpenCode CLI because it provides:

- **Native MCP support** — First-class MCP protocol integration
- **CLI-based isolation** — Agent runs in a subprocess (crash-safe)
- **Multi-provider** — Works with 15+ AI providers out of the box
- **Streaming** — Real-time JSON message output
- **No Python dependency** — Pure Go/Node binary, no Python runtime needed

---

## 9. Frontend Architecture

### Technology Stack

- **React 19** with functional components and hooks
- **Zustand 5** for state management (single `taskStore`)
- **React Router 7** with hash-based routing
- **Tailwind CSS 3.4** + **shadcn/ui** for styling
- **Framer Motion 12** for animations
- **i18next** for internationalization

### Page Structure

```
/ (Home)
├── Task launcher (prompt input)
├── Use case examples
├── Settings dialog
└── Sidebar (task history)

/execution/:id
├── Message list (streaming messages)
├── Tool progress indicator
├── Permission dialogs
├── Todo sidebar
└── Thought stream
```

### Zustand Store (`taskStore.ts`)

Single store managing all UI state:

```typescript
interface TaskStore {
  // State
  currentTask: Task | null; // Active task
  tasks: Task[]; // Task history
  permissionRequest: PermissionRequest; // Current permission dialog
  setupProgress: string; // Tool download progress
  startupStage: StartupStageInfo; // Model loading status
  todos: TodoItem[]; // Task todos
  authError: { providerId; message }; // Auth failures
  isLauncherOpen: boolean; // Command palette visibility

  // Actions
  startTask(config); // Create new task via IPC
  sendFollowUp(message); // Continue conversation
  cancelTask(); // Cancel running task
  interruptTask(); // Interrupt with new instruction
  respondToPermission(resp); // Answer permission dialog
  addTaskUpdate(event); // Process streaming message
  addTaskUpdateBatch(event); // Process batched messages
}
```

### UI Components

| Component           | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `MessageList`       | Renders conversation (user, assistant, tool messages) |
| `StreamingText`     | Character-by-character text animation                 |
| `ToolProgress`      | Shows current tool + elapsed time                     |
| `PermissionDialog`  | File permission or user question modal                |
| `TodoSidebar`       | Task progress tracking                                |
| `DebugPanel`        | Debug log viewer                                      |
| `BrowserScriptCard` | Browser action visualization                          |
| `TaskLauncher`      | Command palette (Cmd+K)                               |
| `SettingsDialog`    | Providers, skills, connectors management              |

### IPC Event Subscriptions (in Execution page)

```typescript
// Set up event listeners when Execution page mounts
useEffect(() => {
  const unsub1 = navigatorApp.onTaskUpdate((event) => addTaskUpdate(event));
  const unsub2 = navigatorApp.onTaskUpdateBatch((event) => addTaskUpdateBatch(event));
  const unsub3 = navigatorApp.onPermissionRequest((req) => setPermissionRequest(req));
  const unsub4 = navigatorApp.onTaskProgress((info) => setSetupProgress(info));
  const unsub5 = navigatorApp.onTodoUpdate((todos) => setTodos(todos));
  const unsub6 = navigatorApp.onThought((thought) => addThought(thought));

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
    unsub5();
    unsub6();
  };
}, []);
```

---

## 10. Backend / Desktop Architecture

### Electron Main Process

The main process manages:

- **IPC handlers** — 100+ registered handlers for all UI-to-backend communication
- **HTTP API servers** — Permission API (:9226), Question API (:9227), Thought Stream (:9228)
- **Task management** — Spawning/managing OpenCode CLI processes
- **Storage** — SQLite database operations
- **Skills** — Loading, syncing, managing skill files
- **Providers** — API key storage, model discovery
- **Connectors** — OAuth flows, token management

### IPC Handler Categories

| Category       | Examples                                                               |
| -------------- | ---------------------------------------------------------------------- |
| **Task**       | `task:start`, `task:cancel`, `task:interrupt`, `task:get`, `task:list` |
| **Session**    | `session:resume`                                                       |
| **Permission** | `permission:respond`                                                   |
| **Settings**   | `settings:api-keys`, `settings:debug-mode`, `settings:theme`           |
| **Providers**  | `provider-settings:get`, `provider-settings:set-active`                |
| **Models**     | `model:get`, `model:set`                                               |
| **Skills**     | `skills:list`, `skills:set-enabled`, `skills:add-from-github`          |
| **Connectors** | `connectors:list`, `connectors:add`, `connectors:start-oauth`          |
| **Speech**     | `speech:transcribe`, `speech:validate`                                 |
| **Cloud**      | `bedrock:validate`, `vertex:validate`, `azure-foundry:*`               |

### Preload Bridge

The preload script exposes a typed API via `contextBridge.exposeInMainWorld()`:

```typescript
window.navigatorApp = {
  // Task operations
  createTask: (config) => ipcRenderer.invoke('task:start', config),
  cancelTask: (id) => ipcRenderer.invoke('task:cancel', id),
  sendInput: (id, input) => ipcRenderer.invoke('task:input', id, input),

  // Event listeners (return unsubscribe functions)
  onTaskUpdate: (cb) => { ipcRenderer.on('task:update', cb); return () => ... },
  onPermissionRequest: (cb) => { ipcRenderer.on('permission:request', cb); return () => ... },
  onTodoUpdate: (cb) => { ipcRenderer.on('todo:update', cb); return () => ... },

  // Settings
  getApiKey: (provider) => ipcRenderer.invoke('settings:api-key', provider),
  setApiKey: (provider, key) => ipcRenderer.invoke('settings:set-api-key', provider, key),

  // Skills
  getSkillContent: (id) => ipcRenderer.invoke('get-skill-content', id),
  // ... 50+ more methods
};
```

### SQLite Storage

- **File**: `navigator.db` (production) or `navigator-dev.db` (development)
- **Mode**: WAL (Write-Ahead Logging) for concurrent access
- **Schema version**: 6 (auto-migrated on startup)

Tables:
| Table | Purpose |
|-------|---------|
| `app_settings` | Debug mode, onboarding, selected model |
| `provider_settings` | Connected providers, API keys (AES-256-GCM encrypted) |
| `task_history` | Tasks with paginated messages & attachments |
| `task_todos` | Task-specific todo items |
| `skills` | Registered skills (name, source, path, enabled) |

---

## 11. Core Features

### 1. Browser Automation

- Playwright-based browser control via Chrome DevTools Protocol (CDP)
- Screenshot with AI-friendly element references
- Click, type, navigate, scroll, JavaScript execution
- Tab management, batch actions
- Canvas app support (Google Docs/Sheets/Figma with coordinate-based clicks)
- Visual feedback (CSS glow border on active page)

### 2. File Management

- Create, modify, rename, move, delete files
- **Always with user permission** — agent must call `file-permission` tool first
- User sees operation details in permission dialog before approving

### 3. Real-time Streaming

- Character-by-character text animation
- Tool progress with elapsed time
- Thought stream sidebar (observation/reasoning/decision/action)
- Checkpoint milestones
- Batched message updates (50ms window) for performance

### 4. Task Planning & Tracking

- Automatic planning: goal, steps, verification criteria
- Todo tracking updated in real-time
- Completion enforcement (auto-retry up to 10 times)
- Task history with resumable sessions

### 5. Multi-Provider AI Support

- 15 AI providers supported (see [Provider Support](#17-ai-provider-support))
- Model discovery via provider APIs
- Encrypted API key storage (AES-256-GCM)
- Automatic credential validation

### 6. Skills System

- 6 built-in skills, community + custom skill support
- Install from GitHub URLs or local files
- Enable/disable per skill
- YAML frontmatter + Markdown instruction format

### 7. MCP Connectors

- OAuth 2.0 + PKCE external MCP server connections
- Automatic token refresh
- Extensible — connect any MCP-compatible service

### 8. Speech-to-Text

- Voice input for task prompts
- Configurable speech service

### 9. Internationalization

- English and Simplified Chinese
- i18next framework for translations

### 10. Security

- AES-256-GCM encryption for API keys and tokens
- Context isolation in Electron
- File permission gates
- Path traversal protection for skills
- HTTPS-only for remote connections

---

## 12. Agent Capabilities & Available Skills

### What Tasks Can the Agent Do?

| Category               | Examples                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Browser Automation** | Navigate websites, fill forms, click buttons, extract data, take screenshots |
| **Web Research**       | Search multiple sources, verify information, summarize findings              |
| **File Operations**    | Create, edit, rename, move, delete files (with user permission)              |
| **Code Tasks**         | Review code, write scripts, run commands                                     |
| **Data Entry**         | Google Sheets automation, form filling                                       |
| **Downloads**          | Download files from websites with popup handling                             |
| **Git Operations**     | Stage changes, write commit messages, commit                                 |
| **General Tasks**      | Answer questions, plan workflows, automate multi-step processes              |

### Available Skills Summary

| #   | Skill         | Command          | What It Does                                                        |
| --- | ------------- | ---------------- | ------------------------------------------------------------------- |
| 1   | Code Review   | `/code-review`   | Reviews code for bugs, security issues, performance, best practices |
| 2   | Download File | `/download-file` | Reliable file downloads with popup/dialog handling                  |
| 3   | Git Commit    | `/git-commit`    | Conventional commit workflow with staging and messaging             |
| 4   | Google Sheets | `/google-sheets` | Browser automation for spreadsheet operations                       |
| 5   | Skill Creator | `/skill-creator` | Guides creation of new custom skills (hidden)                       |
| 6   | Web Research  | `/web-research`  | Multi-source research with verification                             |

---

## 13. Multi-Agent Architecture

### Current State: Single Agent

Navigator currently runs **one agent** ("navigator" in primary mode) per task. There is no multi-agent orchestration, routing, or delegation between agents.

### Architecture Readiness for Multi-Agent

The codebase has **forward-looking design** that enables future multi-agent support:

| Feature                     | Status       | Details                                            |
| --------------------------- | ------------ | -------------------------------------------------- |
| `agentName` field in events | ✅ Exists    | ThoughtEvent, CheckpointEvent include agentName    |
| Agent mode support          | ✅ Exists    | Config supports `'primary' \| 'subagent' \| 'all'` |
| Per-task validation         | ✅ Exists    | ThoughtStreamHandler validates active taskId       |
| Multi-agent dispatch        | ❌ Not built | No routing/delegation logic                        |
| Inter-agent communication   | ❌ Not built | No message passing between agents                  |
| Agent registry              | ❌ Not built | Only one hardcoded agent "navigator"               |

### How Multi-Agent Could Work (Future)

```
User Task
    ↓
Router Agent (primary)
    ├── Research Agent (subagent) → Web research
    ├── Code Agent (subagent) → Code generation/review
    └── Browser Agent (subagent) → Web automation
    ↓
Results aggregated → complete_task
```

The existing `report-checkpoint` tool with its `agentName` field is designed for exactly this — tracking progress across multiple sub-agents working on parts of a task.

---

## 14. How to Create & Extend Agents, Skills, and MCP

### Creating a New Skill

1. **Create a directory** with your skill name in your user skills folder:
   - **macOS**: `~/Library/Application Support/Navigator/skills/my-skill/`
   - **Windows**: `%APPDATA%\Navigator\skills\my-skill\`
   - **Linux**: `~/.config/Navigator/skills/my-skill/`

2. **Create `SKILL.md`** with frontmatter:

```yaml
---
name: my-skill
description: What this skill does and when the agent should use it
command: /my-skill
---

## Instructions

Detailed instructions for the agent...

### Workflow
1. First, do X
2. Then, do Y
3. Finally, do Z

### Output Format
- Expected output structure
```

3. **Resync skills** in Settings → Skills → Resync

4. **Use the skill** — Type the command (e.g., `/my-skill`) or include the skill name in your task description.

### Installing Community Skills

From the UI: Settings → Skills → Add from GitHub → paste URL

Programmatically:

```typescript
await skillsManager.addSkill('https://github.com/user/repo/blob/main/SKILL.md');
```

Only `github.com` and `raw.githubusercontent.com` URLs are accepted (HTTPS only).

### Connecting Remote MCP Servers

1. **Settings → Connectors → Add Connector**
2. Enter the MCP server URL (must support OAuth 2.0)
3. App discovers OAuth metadata (`/.well-known/oauth-authorization-server`)
4. Authorize in browser (PKCE flow)
5. Connector appears in list, automatically included in agent config

The agent now has access to all tools exposed by the remote MCP server.

### Adding a New Built-in MCP Tool

1. Create directory: `packages/agent-core/mcp-tools/my-tool/`
2. Add `package.json` and `src/index.ts`
3. Implement using `@modelcontextprotocol/sdk`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({ name: 'my-tool', version: '1.0.0' }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'my_tool',
    description: 'What this tool does',
    inputSchema: { type: 'object', properties: { ... } }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Tool implementation
  return { content: [{ type: 'text', text: 'Result' }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

4. Register in `config-generator.ts`:

```typescript
mcpServers['my-tool'] = {
  command: [nodeBinPath, toolPath],
  env: { MY_TOOL_PORT: '9229' },
};
```

5. Add tool instructions to the system prompt template.

### Extending the Agent's System Prompt

Modify `packages/agent-core/src/opencode/config-generator.ts`:

```typescript
// Add new capability section
const myCapability = `
<behavior name="my-feature">
  Instructions for the agent about your new feature...
</behavior>
`;

// Include in system prompt
instructions += myCapability;
```

---

## 15. Complete End-to-End Workflow: User Prompt → Task Completion

Here's the **complete lifecycle** of a task from the moment the user types a prompt to final completion:

### Phase 1: User Input

```
┌────────────────────────────────────────────────────┐
│  User types: "Research the top 5 JavaScript       │
│  frameworks and create a comparison file"          │
│                                                    │
│  [Submit] button clicked                           │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
```

### Phase 2: UI → IPC → Main Process

```
1. React Component (Home.tsx)
   └── User clicks Submit

2. Zustand Store (taskStore.ts)
   └── startTask({
         prompt: "Research the top 5...",
         model: { provider: "anthropic", model: "claude-sonnet-4-20250514" },
         attachments: []
       })
   └── Sets isLoading = true
   └── Navigates to /execution/:id

3. IPC Invoke
   └── window.navigatorApp.createTask(config)
   └── → ipcRenderer.invoke('task:start', config)

4. Electron Main Process (handlers.ts)
   └── ipcMain.handle('task:start', async (event, config) => {
         // Validate config
         // Generate task ID
         // Create callbacks object
         // Store task in SQLite
         // Call taskManager.startTask()
       })
```

### Phase 3: Config Generation

```
5. Desktop Config Generator
   ├── Load enabled skills from SkillsManager
   ├── Load connected MCP connectors
   ├── Refresh expired OAuth tokens
   ├── Build provider configs (15 providers)
   ├── Generate system prompt (platform-aware)
   ├── Build MCP server registry
   └── Write opencode.json to disk

   Config includes:
   ├── System prompt with identity, capabilities, rules
   ├── AI provider settings (API keys, endpoints)
   ├── MCP servers (9 built-in + remote connectors)
   ├── Available skills (names, descriptions, paths)
   └── Selected model (e.g., anthropic/claude-sonnet-4-20250514)
```

### Phase 4: CLI Spawn

```
6. TaskManager.startTask()
   └── Creates OpenCodeAdapter instance
   └── Wires all callbacks (onMessage, onPermission, onComplete, etc.)

7. OpenCodeAdapter.start()
   ├── Resolves OpenCode binary path
   │   └── Windows: Check AVX2 → opencode-x64.exe or opencode-baseline.exe
   │   └── macOS: Resolve from opencode-ai npm package
   │
   ├── Build CLI args:
   │   └── opencode run --format json --model anthropic/claude-sonnet-4-20250514
   │       --agent navigator "Research the top 5 JavaScript frameworks..."
   │
   ├── Build environment:
   │   └── OPENCODE_CONFIG=/path/to/opencode.json
   │   └── NODE_BIN_PATH=/path/to/bundled/node
   │
   └── pty.spawn(binaryPath, args, { cols: 32000, env })
       └── Pseudo-terminal created
       └── OpenCode CLI starts executing
```

### Phase 5: Agent Initialization

```
8. OpenCode CLI Process
   ├── Reads OPENCODE_CONFIG environment variable
   ├── Loads opencode.json (system prompt, providers, MCP servers)
   ├── Starts MCP servers (9 local processes):
   │   ├── start-task (stdio)
   │   ├── complete-task (stdio)
   │   ├── file-permission (stdio + HTTP :9226)
   │   ├── ask-user-question (stdio + HTTP :9227)
   │   ├── report-thought (stdio + HTTP :9228)
   │   ├── report-checkpoint (stdio + HTTP :9228)
   │   ├── dev-browser-mcp (stdio)
   │   ├── dev-browser (HTTP server)
   │   └── + any remote MCP connectors
   │
   ├── Connects to AI provider (Anthropic API)
   ├── Sends system prompt + user message to AI model
   └── Streams response back via JSON messages

   ┌─ JSON Stream Output ─────────────────────┐
   │ {"type":"step_start","stepId":"1",...}     │
   │ {"type":"text","content":"I'll research..."}│
   │ {"type":"tool_call","name":"start_task",...}│
   │ {"type":"tool_result","result":"Plan..."}  │
   │ ...                                       │
   └───────────────────────────────────────────┘
```

### Phase 6: Agent Execution (Example Task)

```
9. Agent calls: start_task
   └── MCP Tool receives:
       {
         "original_request": "Research the top 5 JavaScript frameworks...",
         "needs_planning": true,
         "goal": "Research and compare top 5 JS frameworks",
         "steps": [
           "Search for top JavaScript frameworks",
           "Gather details on each",
           "Create comparison file"
         ],
         "verification": ["File contains accurate comparison"],
         "skills": ["web-research"]
       }
   └── Returns: "Plan registered. Proceed with execution."

10. Agent reads SKILL.md
    └── Calls file read tool for web-research/SKILL.md
    └── Loads research methodology instructions

11. Agent calls: report_thought
    └── { content: "Starting web research on JS frameworks",
          category: "action" }
    └── HTTP POST to :9228/thought
    └── IPC → UI shows thought in sidebar

12. Agent calls: browser_navigate
    └── { url: "https://www.google.com" }
    └── Browser opens Google
    └── Returns: page loaded

13. Agent calls: browser_type
    └── Types search query in search box

14. Agent calls: browser_click
    └── Clicks search button

15. Agent calls: browser_snapshot
    └── Takes screenshot
    └── Returns AI-friendly element references + base64 image

16. Agent processes search results, extracts info
    (Multiple browser_navigate, browser_snapshot cycles)

17. Agent calls: todowrite
    └── Updates todo: "Research React" ✅
    └── IPC → UI updates todo sidebar

18. Agent calls: report_thought
    └── { content: "Found data on all 5 frameworks, creating comparison",
          category: "reasoning" }

19. Agent wants to create a file
    └── Calls: request_file_permission
        {
          "operation": "create",
          "paths": ["/Users/user/Desktop/js-frameworks-comparison.md"]
        }
    └── HTTP POST to :9226/permission
    └── Main process creates Promise
    └── IPC 'permission:request' → UI shows dialog

    ┌────────────────────────────────────────┐
    │  Permission Request                     │
    │                                        │
    │  Navigator wants to CREATE:            │
    │  📄 js-frameworks-comparison.md        │
    │                                        │
    │  [Deny]                    [Allow]     │
    └────────────────────────────────────────┘

    └── User clicks [Allow]
    └── IPC 'permission:respond' → resolves Promise
    └── HTTP response: { allowed: true }

20. Agent creates the file via shell command
    └── Writes markdown comparison to disk

21. Agent calls: complete_task
    └── {
          "status": "success",
          "summary": "Created js-frameworks-comparison.md with detailed
                      comparison of React, Vue, Angular, Svelte, and Next.js"
        }
```

### Phase 7: Stream Processing

```
22. Throughout execution, PTY stdout emits JSON messages:

    OpenCode CLI stdout → PTY → OpenCodeAdapter.onData()
                                     │
                                     ▼
                              StreamParser.parse()
                                     │
                              ┌──────┴──────┐
                              │ JSON message │
                              │ extraction   │
                              │ & validation │
                              └──────┬──────┘
                                     │
                              ┌──────┴──────────────┐
                              │ Screenshot detection │
                              │ (base64 → attachment)│
                              └──────┬──────────────┘
                                     │
                              MessageBatcher (50ms window)
                                     │
                              ┌──────┴──────────┐
                              │ IPC Events      │
                              │ task:update      │
                              │ task:update:batch │
                              │ task:progress    │
                              └──────┬──────────┘
                                     │
                              Zustand Store
                                     │
                              React Re-render
```

### Phase 8: Completion

```
23. CompletionEnforcer receives complete_task call
    ├── Checks: All todos completed? Yes ✅
    ├── Checks: Status = 'success'? Yes ✅
    └── State: IDLE → DONE

24. OpenCodeAdapter emits 'complete' event
    └── TaskManager receives
    └── Updates task status in SQLite
    └── Fires onComplete callback

25. IPC Events fired:
    ├── task:status-change → { status: 'completed' }
    ├── task:summary → "Created comparison of 5 JS frameworks"
    └── task:update → Final completion message

26. UI Updates:
    ├── Zustand: currentTask.status = 'completed'
    ├── MessageList: Shows completion message
    ├── TodoSidebar: All items checked ✅
    └── Task saved to history

27. Task Process Cleanup:
    ├── PTY process terminated
    ├── MCP servers shut down
    ├── HTTP API servers cleaned up
    └── Task queue: processQueue() → start next queued task (if any)
```

### Phase 9: Failure Recovery (If the agent fails)

```
If agent stops WITHOUT calling complete_task:
    └── CompletionEnforcer detects
    └── State: IDLE → CONTINUATION_PENDING
    └── Generates continuation prompt:
        "Continue working on the task. Here's what happened..."
    └── Spawns new OpenCode session (retry #1 of 10)
    └── Agent resumes from where it left off

If agent calls complete_task with incomplete todos:
    └── CompletionEnforcer downgrades status to 'partial'
    └── State: IDLE → PARTIAL_CONTINUATION_PENDING
    └── Resume with partial continuation prompt
    └── Agent finishes remaining todos

If max retries (10) reached:
    └── State: MAX_RETRIES_REACHED
    └── Task marked as failed
    └── User notified
```

### Visual Timeline

```
Time →

User      │ Type prompt │                    │ Click Allow │              │ See results │
          ├─────────────┤                    ├─────────────┤              ├─────────────┤
          │             │                    │             │              │             │

UI        │   Submit    │  Show messages →→  │ Permission  │ More msgs →→ │  Complete   │
          ├─────────────┤  tool progress     │   dialog    │ todo updates │   status    │
          │             │  thoughts stream   │             │              │             │

IPC       │ task:start  │ task:update:batch  │ perm:respond│ task:update  │ status:done │
          ├─────────────┤ task:thought       ├─────────────┤ todo:update  ├─────────────┤
          │             │ task:progress      │             │              │             │

Agent     │ start_task  │ browser_* tools    │ file_perm   │ write file   │complete_task│
          │ read skill  │ report_thought     │ (waits)     │ todowrite    │             │
          ├─────────────┤ browser_snapshot   ├─────────────┤──────────────┤─────────────┤
          │             │ todowrite          │             │              │             │

OpenCode  │ Spawn CLI   │ LLM API calls ←→  │ MCP call    │ Shell exec   │ Process end │
          │ Start MCP   │ Tool execution     │ HTTP bridge │ MCP calls    │ Cleanup     │
          ├─────────────┤────────────────────┤─────────────┤──────────────┤─────────────┤
```

---

## 16. Security Model

| Feature                       | Implementation                                                  |
| ----------------------------- | --------------------------------------------------------------- |
| **API Key Encryption**        | AES-256-GCM via SecureStorage class                             |
| **Context Isolation**         | Electron's contextBridge, no nodeIntegration                    |
| **File Permission Gate**      | Mandatory `file-permission` tool call before any file operation |
| **Path Traversal Protection** | `isPathWithinDirectory()` check, name sanitization              |
| **HTTPS Only**                | Remote MCP connectors require HTTPS                             |
| **OAuth PKCE**                | S256 PKCE for connector authentication                          |
| **Domain Allowlist**          | Skill URLs only from github.com / raw.githubusercontent.com     |
| **Token Refresh**             | Automatic before task start, error on failure                   |
| **Schema Migration Safety**   | FutureSchemaError blocks downgrade attempts                     |

---

## 17. AI Provider Support

Navigator supports **15 AI providers**:

| #   | Provider             | Type       | Models Example                           |
| --- | -------------------- | ---------- | ---------------------------------------- |
| 1   | **Anthropic**        | Cloud      | Claude Sonnet, Claude Opus, Claude Haiku |
| 2   | **OpenAI**           | Cloud      | GPT-4, GPT-4o, GPT-4o-mini               |
| 3   | **Google**           | Cloud      | Gemini Pro, Gemini Ultra                 |
| 4   | **DeepSeek**         | Cloud      | DeepSeek-V3, DeepSeek-Coder              |
| 5   | **Qwen (Moonshot)**  | Cloud      | Qwen-Max, Qwen-Plus                      |
| 6   | **xAI**              | Cloud      | Grok-2, Grok-3                           |
| 7   | **MiniMax**          | Cloud      | MiniMax models                           |
| 8   | **OpenRouter**       | Aggregator | Access 100+ models                       |
| 9   | **LiteLLM**          | Proxy      | Unified API for any provider             |
| 10  | **Amazon Bedrock**   | Cloud      | Claude on AWS, Titan, etc.               |
| 11  | **Google Vertex AI** | Cloud      | Gemini on GCP                            |
| 12  | **Azure OpenAI**     | Cloud      | GPT-4 on Azure                           |
| 13  | **Azure Foundry**    | Cloud      | Azure AI models                          |
| 14  | **Ollama**           | Local      | Llama, Mistral, CodeLlama                |
| 15  | **LM Studio**        | Local      | Any GGUF model locally                   |
| 16  | **Custom**           | Any        | OpenAI-compatible endpoints              |
| 17  | **Zai**              | Regional   | Regional endpoints                       |

Each provider has:

- Credential validation functions
- Model discovery APIs
- Configuration schemas (Zod-validated)

---

## 18. Key Files Reference

### Agent Core

| File                                                                 | Purpose                                    |
| -------------------------------------------------------------------- | ------------------------------------------ |
| `packages/agent-core/src/opencode/config-generator.ts`               | System prompt & OpenCode config generation |
| `packages/agent-core/src/opencode/config-builder.ts`                 | Provider & model config building           |
| `packages/agent-core/src/opencode/cli-resolver.ts`                   | OpenCode binary resolution                 |
| `packages/agent-core/src/internal/classes/TaskManager.ts`            | Task lifecycle, queuing, concurrency       |
| `packages/agent-core/src/internal/classes/OpenCodeAdapter.ts`        | CLI spawning via node-pty                  |
| `packages/agent-core/src/internal/classes/StreamParser.ts`           | JSON stream parsing from PTY               |
| `packages/agent-core/src/internal/classes/SkillsManager.ts`          | Skill loading, parsing, management         |
| `packages/agent-core/src/opencode/completion/completion-enforcer.ts` | Task completion state machine              |
| `packages/agent-core/src/opencode/tool-classification.ts`            | Tool type classification                   |
| `packages/agent-core/src/connectors/mcp-oauth.ts`                    | OAuth flow for MCP connectors              |
| `packages/agent-core/src/storage/repositories/`                      | SQLite repository functions                |
| `packages/agent-core/src/factories/`                                 | Public API factory functions               |

### MCP Tools

| Tool              | Location                                                       |
| ----------------- | -------------------------------------------------------------- |
| start-task        | `packages/agent-core/mcp-tools/start-task/src/index.ts`        |
| complete-task     | `packages/agent-core/mcp-tools/complete-task/src/index.ts`     |
| file-permission   | `packages/agent-core/mcp-tools/file-permission/src/index.ts`   |
| ask-user-question | `packages/agent-core/mcp-tools/ask-user-question/src/index.ts` |
| report-thought    | `packages/agent-core/mcp-tools/report-thought/src/index.ts`    |
| report-checkpoint | `packages/agent-core/mcp-tools/report-checkpoint/src/index.ts` |
| dev-browser       | `packages/agent-core/mcp-tools/dev-browser/src/index.ts`       |
| dev-browser-mcp   | `packages/agent-core/mcp-tools/dev-browser-mcp/src/index.ts`   |

### Desktop

| File                                                 | Purpose                             |
| ---------------------------------------------------- | ----------------------------------- |
| `apps/desktop/src/main/index.ts`                     | App initialization, window creation |
| `apps/desktop/src/main/ipc/handlers.ts`              | 100+ IPC handler registrations      |
| `apps/desktop/src/main/ipc/task-callbacks.ts`        | Message forwarding to renderer      |
| `apps/desktop/src/main/opencode/config-generator.ts` | Desktop config wrapper              |
| `apps/desktop/src/main/permission-api.ts`            | HTTP bridge for permissions         |
| `apps/desktop/src/main/thought-stream-api.ts`        | HTTP bridge for thoughts            |
| `apps/desktop/src/main/skills/SkillsManager.ts`      | Desktop skills wrapper              |
| `apps/desktop/src/preload/index.ts`                  | Preload bridge API (~500 lines)     |

### Web UI

| File                                                            | Purpose                |
| --------------------------------------------------------------- | ---------------------- |
| `apps/web/src/client/stores/taskStore.ts`                       | All UI state & actions |
| `apps/web/src/client/pages/Execution.tsx`                       | Main execution view    |
| `apps/web/src/client/pages/Home.tsx`                            | Task launcher          |
| `apps/web/src/client/components/execution/MessageList.tsx`      | Message rendering      |
| `apps/web/src/client/components/execution/PermissionDialog.tsx` | Permission UI          |
| `apps/web/src/client/lib/navigator-app.ts`                      | API wrapper & types    |
| `apps/web/src/client/router.tsx`                                | Hash-based routing     |

### Skills

| Skill         | Location                                             |
| ------------- | ---------------------------------------------------- |
| Code Review   | `apps/desktop/bundled-skills/code-review/SKILL.md`   |
| Download File | `apps/desktop/bundled-skills/download-file/SKILL.md` |
| Git Commit    | `apps/desktop/bundled-skills/git-commit/SKILL.md`    |
| Google Sheets | `apps/desktop/bundled-skills/google-sheets/SKILL.md` |
| Skill Creator | `apps/desktop/bundled-skills/skill-creator/SKILL.md` |
| Web Research  | `apps/desktop/bundled-skills/web-research/SKILL.md`  |

---

## Summary

Navigator is a **production-grade AI automation desktop application** built with:

- **Electron + React + Zustand** for the UI
- **OpenCode CLI** as the agent execution framework (not LangChain/CrewAI)
- **MCP (Model Context Protocol)** for tool integration (9 built-in tools)
- **SQLite** for persistent storage with AES-256-GCM encryption
- **Playwright/CDP** for browser automation
- **15 AI providers** with pluggable architecture
- **Skills system** for extensible agent knowledge
- **OAuth MCP connectors** for third-party service integration

The architecture follows a clean separation: UI (React) → IPC Bridge (Electron) → Agent Core (TypeScript) → OpenCode CLI (subprocess) → AI Model + MCP Tools. Everything streams in real-time, with human-in-the-loop permission gates for file operations and user questions.

The system is currently **single-agent** but architecturally prepared for future multi-agent orchestration.
