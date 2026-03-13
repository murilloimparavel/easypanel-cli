# Contributing to easypanel-cli

Thank you for your interest in contributing. This document covers how to set up a development environment, add new commands, and submit a pull request.

---

## Development environment

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- An EasyPanel instance (or access to one for manual testing)

### Setup

```bash
git clone https://github.com/murilloimparavel/easypanel-cli.git
cd easypanel-cli
npm install
```

### Build and run

```bash
# Compile TypeScript
npm run build

# Run directly with tsx (no build needed during development)
npm run dev -- projects list

# Link the binary globally for manual testing
npm link
ep projects list
```

### Watch mode

```bash
npm run watch   # Recompiles on file changes
```

---

## Project structure

```
src/
  index.ts              # Entry point, program setup, command registration
  commands/             # One file per command group
    login.ts            # ep login / logout / whoami
    context.ts          # ep context
    projects.ts         # ep projects
    services.ts         # ep services
    deploy.ts           # ep deploy
    db.ts               # ep db
    domains.ts          # ep domains
    monitor.ts          # ep monitor
    docker.ts           # ep docker
    system.ts           # ep system
    status.ts           # ep status
  api/
    client.ts           # EasyPanel API client (thin wrapper around axios)
  mcp/
    server.ts           # MCP server for AI IDE integration
  utils/
    config.ts           # Config file read/write, context management
    output.ts           # Shared CLI helpers: spinner, table, colors, JSON
    errors.ts           # Error handling utilities
```

---

## Adding a new command

1. Create `src/commands/mycommand.ts` and export a `registerMyCommand(program: Command)` function.
2. Import and call it in `src/index.ts`.
3. Follow the existing pattern: load config, require auth, call the API client, handle `--json`, handle errors via `handleCliError`.

A minimal example:

```typescript
import { Command } from 'commander';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import { type GlobalOptions, printJson, handleCliError, requireAuth } from '../utils/output.js';

export function registerMyCommand(program: Command): void {
  const cmd = program.command('mycommand').description('Do something useful');

  cmd
    .command('list')
    .description('List things')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.listThings();
        if (opts.json) { printJson(result); return; }
        // pretty-print result
      } catch (err) {
        handleCliError(err, opts);
      }
    });
}
```

---

## Code style

- **Language:** TypeScript with ESM (`"type": "module"` in package.json)
- **Imports:** Always use `.js` extensions in import paths (TypeScript ESM convention)
- **Error handling:** Use the shared `handleCliError` helper; avoid raw `console.error` in command actions
- **Output:** Use helpers from `utils/output.ts` — `printSuccess`, `printError`, `printTable`, `printJson`, `spinner`
- **Confirmation prompts:** Use the shared `confirm` helper for destructive operations
- **No linter config is currently set up** — follow the style of existing files (2-space indent, single quotes, trailing commas)

---

## Pull request process

1. Fork the repository and create a branch from `master`.
2. Make your changes. If you are adding a command, include at least a brief manual test in the PR description.
3. Run `npm run build` to confirm there are no TypeScript errors.
4. Open a pull request against `master` with a clear title and description of what changed and why.
5. Address any review feedback.

---

## Reporting issues

Open a GitHub issue with:
- The command you ran
- The error message or unexpected output
- Your Node.js version (`node --version`)
- Your EasyPanel version if known
