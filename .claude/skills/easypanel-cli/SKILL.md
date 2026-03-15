---
name: easypanel-cli
description: |
  Skill for managing EasyPanel servers via the ep CLI.
  Covers deploy, projects, services, databases, domains, monitoring and multi-server contexts.
  Triggers: "easypanel", "ep", "deploy easypanel", "manage server", "panel"

allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - Agent

permissionMode: default
memory: project
---

# EasyPanel CLI Skill

## Identity

**Role:** EasyPanel operations specialist — manages projects, services, deploys, databases, domains and infrastructure via the `ep` CLI.

## Prerequisites

1. **CLI installed:** `ep` must be in PATH (link via `sudo npm link /srv/projetos/easypanel-cli`)
2. **Authenticated:** `ep whoami` should return server info
3. **If not authenticated:** guide the user with `ep login`

Quick check:
```bash
which ep || sudo npm link /srv/projetos/easypanel-cli
ep --version && ep whoami
```

## Commands Quick Reference

### Authentication
```bash
ep login --server-url https://YOUR-SERVER --api-token TOKEN --name CONTEXT
ep login                          # Interactive (prompts for email/password)
ep logout                         # Remove all saved credentials
ep whoami                         # Show current user + active server
ep context list                   # List configured contexts
ep context add NAME --server-url URL --api-token TOKEN
ep context use NAME               # Switch server
ep context remove NAME
```

### Projects
```bash
ep projects list                  # List all projects (alias: ep ps)
ep projects create my-app         # Create project
ep projects inspect my-app        # Details + services
ep projects destroy my-app -f     # Delete project (DESTRUCTIVE)
```

### Services
```bash
ep services create PROJECT SERVICE    # Create app service
ep services start PROJECT SERVICE
ep services stop PROJECT SERVICE
ep services restart PROJECT SERVICE   # Top-level alias: ep restart
ep services redeploy PROJECT SERVICE  # Trigger new deploy
ep services destroy PROJECT SERVICE -f

# Environment variables
ep services env get PROJECT SERVICE
ep services env set PROJECT SERVICE KEY1=val1 KEY2=val2

# Resources
ep services resources PROJECT SERVICE --mem-limit 512 --cpu-limit 1

# Logs
ep services logs PROJECT SERVICE              # Alias: ep logs
ep services logs PROJECT SERVICE --follow      # Real-time stream (WebSocket)
ep services logs PROJECT SERVICE --lines 50
ep services logs PROJECT SERVICE --search "error"

# Stats & Build
ep services stats PROJECT SERVICE
ep services build-status PROJECT SERVICE
```

### Deploy (shortcuts)
```bash
# Deploy Docker image (alias: ep up)
ep deploy image PROJECT SERVICE nginx:latest
ep deploy image PROJECT SERVICE ghcr.io/user/app:v1.0 --wait

# Deploy from Git repo (Nixpacks)
ep deploy git PROJECT SERVICE https://github.com/user/repo --ref main

# Deploy with Dockerfile
ep deploy dockerfile PROJECT SERVICE https://github.com/user/repo --dockerfile ./Dockerfile
```

### Databases
```bash
# Redis
ep db redis create PROJECT NAME --password SECRET
ep db redis inspect PROJECT NAME

# MySQL
ep db mysql create PROJECT NAME --db mydb --user admin --password pass --root-password rootpass

# PostgreSQL
ep db postgres create PROJECT NAME --db mydb --user admin --password pass

# Destroy (any type)
ep db destroy redis PROJECT NAME -f
ep db destroy mysql PROJECT NAME -f
ep db destroy postgres PROJECT NAME -f
```

### Domains & SSL
```bash
ep domains list PROJECT SERVICE
ep domains add PROJECT SERVICE example.com --port 80 --https
ep domains remove PROJECT SERVICE DOMAIN-ID
ep domains validate example.com
ep domains ssl enable PROJECT SERVICE example.com
ep domains ssl status PROJECT SERVICE example.com
ep domains ssl renew PROJECT SERVICE example.com
```

### Monitoring
```bash
ep monitor stats                  # Advanced system stats
ep monitor system                 # CPU/mem/disk
ep monitor docker                 # Docker containers
ep monitor docker --project NAME --sort cpu
ep monitor health                 # Full health check
ep monitor health --verbose
```

### Docker
```bash
ep docker cleanup                 # Remove unused images
ep docker cleanup --force
ep docker prune                   # Clean builder cache
ep docker prune --all
```

### System
```bash
ep system ip                      # Server IPs
ep system ip --public-only
ep system domain                  # Panel domain
ep system info                    # Full system info
ep system restart easypanel -f    # Restart EasyPanel
ep system restart traefik -f      # Restart Traefik
```

### Status Dashboard
```bash
ep status                         # Quick overview
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Raw JSON output (for piping/automation) |
| `--quiet` | Minimal output |
| `--verbose` | Debug logging |
| `--url <url>` | Override server URL |
| `--token <token>` | Override API token (visible in ps — prefer ep login or env vars) |
| `--no-color` | Disable colored output |

## Aliases

| Alias | Full command |
|-------|-------------|
| `ep ps` / `ep ls` | `ep projects list` |
| `ep logs` | `ep services logs` |
| `ep restart` | `ep services restart` |
| `ep rm` | `ep services destroy` |
| `ep up` | `ep deploy image` |

## Best Practices

### Deploy
1. **Always use `--wait`** in scripts/CI to wait for deploy completion
2. **Use `--json`** when chaining with other commands (jq, pipes)
3. **Check build status** after deploy: `ep services build-status PROJECT SERVICE`
4. **Monitor with `ep services logs --follow`** after deploy to catch errors

### Security
1. **Never use `--token` in shared scripts** — use `ep login` or env vars instead
2. **Always HTTPS** in production — CLI warns when connecting over HTTP
3. **`--force` with caution** — destructive operations are irreversible
4. **Sensitive env vars**: `ep services env get` may expose secrets

### Multi-server
1. **Create named contexts**: `ep context add staging --server-url ... --api-token ...`
2. **Switch with `ep context use`** before operating
3. **Verify active server**: `ep whoami` shows the current context
4. **Config stored at**: `~/.config/easypanel/config.json` (perms 0o600, dir 0o700)

### CI/CD Automation
```bash
# Example: deploy in CI pipeline
export EASYPANEL_URL=https://panel.example.com
export EASYPANEL_TOKEN=$EP_TOKEN
ep deploy image my-project my-service $IMAGE_TAG --wait --json
```

### Troubleshooting
```bash
# Server responding?
ep system info

# Service stuck?
ep services restart PROJECT SERVICE
ep services logs PROJECT SERVICE --lines 50

# Out of disk space?
ep docker cleanup --force
ep docker prune --all
ep monitor system

# Health check
ep monitor health --verbose
```

## Common Workflows

### 1. Initial project setup
```bash
ep projects create my-app
ep services create my-app web
ep deploy image my-app web nginx:latest --wait
ep domains add my-app web app.example.com --https
ep domains ssl enable my-app web app.example.com
```

### 2. Add database to a project
```bash
ep db postgres create my-app db --db appdb --user app --password $(openssl rand -base64 32)
ep services env set my-app web DATABASE_URL=postgresql://app:PASS@my-app_db:5432/appdb
ep services restart my-app web
```

### 3. Quick monitoring
```bash
ep status                         # Overview
ep monitor health --verbose       # Detailed health check
ep monitor docker --sort cpu      # Containers by CPU usage
```

### 4. Disaster recovery
```bash
ep services logs PROJECT SERVICE --search "error" --lines 500
ep services restart PROJECT SERVICE
ep services build-status PROJECT SERVICE
ep system restart easypanel -f    # Last resort
```

## Operational Learnings (Battle-Tested)

### Private GHCR — Always configure credentials

Images from private GHCR repos are **not accessible** without authentication.
EasyPanel needs `username` + `password` (GitHub PAT with `read:packages`) in the image source.

**Via panel:** Service > Source > Registry Credentials
**Via tRPC API:**
```bash
curl -s -X POST "https://${EP_URL}/api/trpc/services.deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-token: ${EP_TOKEN}" \
  -d '{"json":{
    "projectName":"PROJECT",
    "serviceName":"SERVICE",
    "source":{
      "type":"image",
      "image":"ghcr.io/user/repo:latest",
      "username":"GH_USERNAME",
      "password":"GH_PAT_READ_PACKAGES"
    }
  }}'
```

**NEVER make packages/repos public as a workaround.** Always ask the user for a token.

### Lazy Initialization of EasyPanelClient

`EasyPanelClient` uses **lazy initialization**. The constructor is empty — credentials are loaded from `process.env` only on first API use via `ensureInitialized()`. This fixes the "EASYPANEL_URL environment variable is required" error that occurred when the config file existed but env vars were not set at instantiation time.

**Implication:** The client can be instantiated without env vars. Credential validation only happens when an API call is actually made.

### CLI v0.1.0 — Known Limitations

| Command | Status | Workaround |
|---------|--------|------------|
| `ep domains add` | **FIXED** | Uses `domains.createDomain` (tRPC) |
| `ep domains remove` | **FIXED** | Uses `domains.deleteDomain` (tRPC) |
| `ep domains list` | **FIXED** | Uses `domains.listDomains` (tRPC) |
| `ep services build-status` | **BROKEN** (404) | Check logs: `ep services logs` |
| `ep projects list` | OK | — |
| `ep projects inspect` | OK | — |
| `ep services create` | OK | — |
| `ep deploy image` | OK | — |
| `ep services logs` | OK | — |
| `ep services stats` | OK | — |
| `ep services env set/get` | OK | — |
| `ep system ip` | OK | — |
| `ep monitor *` | OK | — |

**Note:** Domain fix applied via lazy initialization + correct tRPC procedures (see section below).

### Traefik — Port and routing

- **Traefik** (EasyPanel's reverse proxy) routes automatically to the container
- The `port` field in the domain defines which **container port** Traefik forwards to
- If the app listens on port **3001**, set `port: 3001` on the domain
- If using port **80** (default), no special configuration needed
- EasyPanel generates automatic domains: `{service}-{project}.{IP}.sslip.io`
- HTTPS via Let's Encrypt is automatic when `https: true`

### Container won't start (0B memory)

**Quick diagnosis:**
```bash
ep services stats PROJECT SERVICE    # If memory = 0B, container crashed
ep services logs PROJECT SERVICE     # See startup error
ep projects inspect PROJECT --json   # Check source.username/password
```

**Common causes:**
1. **Private image without credentials** — container can't pull
2. **Wrong port** — app listens on one port, domain points to another
3. **Missing environment variables** — app crashes on startup
4. **Native dependencies** — node-pty, better-sqlite3 need build tools in Dockerfile

### Deploy with GitHub Actions + GHCR (recommended pattern)

**Flow:**
```
Push → GitHub Actions (build Docker image) → GHCR → EasyPanel (pull image)
```

**Benefits:** Zero build on VPS, optimized image, versioning by SHA.

### EasyPanel tRPC API — Domain Procedures (CORRECTED)

EasyPanel uses tRPC. The correct procedures for domains are:

| CLI Command | tRPC Procedure | Auth Header |
|-------------|---------------|-------------|
| `ep domains add` | `domains.createDomain` | `Authorization: Bearer TOKEN` |
| `ep domains list` | `domains.listDomains` | `Authorization: Bearer TOKEN` |
| `ep domains remove` | `domains.deleteDomain` | `Authorization: Bearer TOKEN` |

**IMPORTANT:** Domain procedures require `Authorization: Bearer TOKEN` (NOT `x-api-token`). Service/project procedures work with both headers.

**Correct payload for `domains.createDomain`:**
```bash
curl -s -X POST "https://${EP_URL}/api/trpc/domains.createDomain" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${EP_TOKEN}" \
  -d '{"json":{
    "id": "unique-domain-id",
    "host": "example.com",
    "https": true,
    "port": 8080,
    "path": "/",
    "middlewares": [],
    "certificateResolver": "",
    "wildcard": false,
    "internalProtocol": "http",
    "destinationType": "service",
    "serviceDestination": {
      "projectName": "my-project",
      "serviceName": "my-service",
      "protocol": "http",
      "port": 8080
    }
  }}'
```

**Other discovered domain procedures:**
- `domains.updateDomain`
- `domains.getPrimaryDomain`
- `domains.setPrimaryDomain`
- `settings.setServiceDomain`
- `settings.getServiceDomain`
- `settings.setPanelDomain`
- `settings.getPanelDomain`

### EasyPanel tRPC API (when CLI fails — general procedures)

For operations not supported by the CLI, use the API directly:

```bash
# Inspect project (works)
curl -s "https://${EP_URL}/api/trpc/projects.inspect?input=%7B%22json%22%3A%7B%22projectName%22%3A%22NAME%22%7D%7D" \
  -H "x-api-token: ${EP_TOKEN}"

# CLI config stored at:
~/.config/easypanel/config.json
```

**Confirmed working procedures:**
- `projects.listProjects` / `projects.inspectProject`
- `services.createService` / `services.deployImage`
- `domains.createDomain` / `domains.listDomains` / `domains.deleteDomain`
- `monitor.*` / `system.*`

## MCP Server Mode

The CLI includes backward-compatible MCP server mode for AI IDE integration:

```bash
ep mcp                            # Start MCP server (stdio)
ep mcp --list-clients             # Show supported IDE configs
```

Configure in your IDE (Claude Code, Cursor, etc.) to get AI-powered EasyPanel management.

## References

- API coverage: `.claude/skills/easypanel-cli/references/api-coverage.md`
- Architecture: `.claude/skills/easypanel-cli/references/architecture.md`
