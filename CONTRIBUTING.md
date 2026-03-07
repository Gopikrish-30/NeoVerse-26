# Contributing to Navigator

Thank you for your interest in contributing!

## Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Start development: `pnpm dev`

## Code Style

- TypeScript everywhere
- ESLint + Prettier for formatting
- Always use braces for if/else/for/while
- Avoid nested ternaries

## Testing

```bash
pnpm -F @navigator/web test
pnpm -F @navigator/desktop test
pnpm -F @navigator_ai/agent-core test
```

## Pull Requests

1. Create a feature branch
2. Make your changes
3. Run `pnpm typecheck && pnpm lint:eslint && pnpm format:check`
4. Submit a pull request
