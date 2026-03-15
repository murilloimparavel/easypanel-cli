# EasyPanel CLI — Architecture

## Project Structure
```
src/
├── api/
│   ├── client.ts          # EasyPanelClient (~3759 lines) — core business logic (DO NOT MODIFY)
│   └── index.ts
├── commands/              # CLI modules (Commander.js)
│   ├── login.ts           # ep login / logout / whoami
│   ├── context.ts         # ep context add/use/list/remove
│   ├── status.ts          # ep status (dashboard)
│   ├── projects.ts        # ep projects list/create/inspect/destroy
│   ├── services.ts        # ep services (lifecycle, env, logs, stats)
│   ├── deploy.ts          # ep deploy image/git/dockerfile
│   ├── db.ts              # ep db redis/mysql/postgres
│   ├── domains.ts         # ep domains add/remove/list/ssl
│   ├── monitor.ts         # ep monitor stats/system/docker/health
│   ├── docker.ts          # ep docker cleanup/prune
│   └── system.ts          # ep system ip/domain/info/restart
├── utils/
│   ├── config.ts          # Auth config (~/.config/easypanel/config.json)
│   ├── output.ts          # Tables, spinners, formatDate, timeAgo, confirm
│   ├── errors.ts          # EasyPanelError class
│   ├── validation.ts      # Zod validators
│   └── progress.ts        # Progress utilities
├── mcp/
│   └── server.ts          # EasyPanelMCPServer (backward compat via ep mcp)
├── tools/                 # MCP tool handlers (49 tools) — DO NOT MODIFY
├── types/                 # TypeScript types — DO NOT MODIFY
└── index.ts               # CLI entry point (Commander.js root)
```

## Tech Stack
- **Runtime:** Node.js >= 18
- **Language:** TypeScript (tsc)
- **CLI Framework:** Commander.js
- **HTTP Client:** axios
- **Output:** chalk + cli-table3 + ora
- **Prompts:** @inquirer/prompts
- **WebSocket:** ws (log streaming)
- **API Protocol:** tRPC over HTTP (not REST)

## Code Patterns

### Command pattern
```typescript
command
  .command('verb <required> [optional]')
  .description('What it does')
  .option('-f, --flag', 'Description')
  .action(async (required, optional, cmdOpts, cmd) => {
    const opts = cmd.optsWithGlobals() as GlobalOptions;
    loadConfig(opts.url, opts.token);    // Inject env vars from config
    requireAuth(opts);                    // Check authentication

    try {
      const client = getClient();        // EasyPanelClient singleton
      const result = await client.someMethod(...);
      if (opts.json) { printJson(result); return; }
      // Human-friendly formatting...
    } catch (err) {
      handleCliError(err, opts);
    }
  });
```

### Config resolution order
```
CLI flags (--url, --token)
  → Environment variables (EASYPANEL_URL, EASYPANEL_TOKEN)
    → Config file (~/.config/easypanel/config.json)
```

### API Protocol (tRPC)
```
Queries:  GET /api/trpc/procedure.name?input={"json":...}
Mutations: POST /api/trpc/procedure.name  body: {"json":...}
Auth: Authorization: Bearer <token>
```

## Binaries
```json
"bin": {
  "ep": "./dist/index.js",
  "easypanel": "./dist/index.js",
  "easypanel-mcp": "./dist/index.js"
}
```

## Critical files (DO NOT MODIFY)
- `src/api/client.ts` — Core API client (upstream)
- `src/tools/*.ts` — MCP tool handlers (upstream)
- `src/types/*.ts` — Type definitions (upstream)
- `src/utils/validation.ts` — Zod validators (upstream)

## Repository
- Origin: https://github.com/murilloimparavel/easypanel-cli
- Upstream: https://github.com/sitp2k/easypanel-mcp
- Branch: master
- CI: Node 18/20/22 matrix
- Publish: tag-based (v*)
