# easypanel-cli

> Unofficial command-line tool for EasyPanel

`easypanel-cli` (binary: `ep`) is a community-built CLI for [EasyPanel](https://easypanel.io) — the modern server control panel for Docker-based deployments. It covers the full lifecycle: authentication, project management, service deployment, database provisioning, domain/SSL management, log streaming, and system monitoring, all from your terminal.

This project was forked from [`sitp2k/easypanel-mcp`](https://github.com/sitp2k/easypanel-mcp) and transformed from an MCP server into a proper CLI tool. MCP server mode is preserved for backward compatibility and AI IDE integration.

**Not affiliated with or endorsed by EasyPanel.**

---

## Features

- Multi-context support — manage multiple EasyPanel instances from a single config
- One-command deploys — `ep deploy image`, `ep deploy git`, `ep deploy dockerfile`
- Full service lifecycle — create, start, stop, restart, redeploy, destroy
- Environment variable management — get and set env vars per service
- Database provisioning — Redis, MySQL, PostgreSQL with connection string output
- Domain and SSL management — add domains, request and renew Let's Encrypt certificates
- Real-time log streaming — WebSocket-backed `--follow` mode
- Resource monitoring — CPU, memory, disk, Docker container stats, health checks
- System management — IP info, panel domain, restart EasyPanel/Traefik
- Docker cleanup — prune unused images and builder cache
- JSON output mode — `--json` flag for every command, suitable for scripting and piping
- MCP server mode — `ep mcp` for Claude, Cursor, Windsurf integration

---

## Quick Start

```bash
npm install -g easypanel-cli

# Authenticate
ep login

# List projects
ep projects list

# Deploy a Docker image and wait for completion
ep deploy image myproject myapp nginx:latest --wait

# Stream live logs
ep services logs myproject myapp --follow
```

---

## Installation

### npm (global)

```bash
npm install -g easypanel-cli
```

### npx (no install)

```bash
npx easypanel-cli login
npx easypanel-cli projects list
```

### From source

```bash
git clone https://github.com/YOUR_ORG/easypanel-cli.git
cd easypanel-cli
npm install
npm run build
npm link
```

Node.js 18 or later is required.

---

## Authentication

### Interactive login

```bash
ep login
```

Prompts for your EasyPanel URL, email, and password. Saves credentials to `~/.config/easypanel/config.json`.

### Token-based login

```bash
ep login --url https://panel.example.com --token YOUR_API_TOKEN
```

### Named contexts (multi-server)

```bash
ep login --url https://panel.example.com --token TOKEN --name production
ep login --url https://staging.example.com --token TOKEN --name staging
```

### Environment variables

You can override the active context with environment variables:

```bash
export EASYPANEL_URL=https://panel.example.com
export EASYPANEL_TOKEN=your_api_token
```

Environment variables take precedence over the config file when `--url` or `--token` are not passed on the command line.

### Show current config

```bash
ep login --show
ep whoami
ep logout
```

---

## Commands

### Global flags

These flags work with every command:

| Flag | Description |
|---|---|
| `--json` | Output raw JSON (suitable for piping and scripting) |
| `--quiet` | Minimal output |
| `--verbose` | Enable debug logging |
| `--url <url>` | Override EasyPanel URL for this invocation |
| `--token <token>` | Override API token for this invocation |

---

### context — Multi-server management

```bash
ep context list                                    # List all configured contexts
ep context add staging --url <url> --token <tok>   # Add a context
ep context use staging                             # Switch active context
ep context remove staging                          # Remove a context
```

---

### projects — Project management

```bash
ep projects list                  # List all projects
ep projects create myproject      # Create a project
ep projects inspect myproject     # Show project details and services
ep projects destroy myproject     # Delete a project and all its services
ep projects destroy myproject -f  # Skip confirmation prompt
```

---

### services — Service lifecycle

```bash
# Create and lifecycle
ep services create myproject myapp
ep services start myproject myapp
ep services stop myproject myapp
ep services restart myproject myapp
ep services redeploy myproject myapp
ep services destroy myproject myapp

# Environment variables
ep services env get myproject myapp
ep services env set myproject myapp NODE_ENV=production PORT=3000

# Resource limits
ep services resources myproject myapp --mem-limit 512 --cpu-limit 0.5

# Logs
ep services logs myproject myapp                  # Last 100 lines
ep services logs myproject myapp -n 500           # Last 500 lines
ep services logs myproject myapp --follow         # Stream in real-time
ep services logs myproject myapp --search "error"

# Stats and build status
ep services stats myproject myapp
ep services build-status myproject myapp
```

---

### deploy — One-step deploy shortcuts

These commands create the service (if it does not exist) and trigger a deployment in a single step.

```bash
# From a Docker image
ep deploy image myproject myapp nginx:latest
ep deploy image myproject myapp ghcr.io/org/app:sha-abc --username user --password token
ep deploy image myproject myapp nginx:latest --wait

# From a Git repo (Nixpacks build)
ep deploy git myproject myapp https://github.com/org/repo
ep deploy git myproject myapp https://github.com/org/repo --ref develop
ep deploy git myproject myapp https://github.com/org/repo --wait

# From a Dockerfile in a Git repo
ep deploy dockerfile myproject myapp https://github.com/org/repo
ep deploy dockerfile myproject myapp https://github.com/org/repo --dockerfile ./docker/Dockerfile
ep deploy dockerfile myproject myapp https://github.com/org/repo --wait
```

`--wait` polls until the deployment finishes and exits with a non-zero code on failure, making it suitable for CI pipelines.

---

### db — Database services

```bash
# Redis
ep db redis create myproject myredis --password secret
ep db redis inspect myproject myredis

# MySQL
ep db mysql create myproject mydb --db appdb --user appuser --password secret --root-password rootsecret

# PostgreSQL
ep db postgres create myproject mydb --db appdb --user appuser --password secret

# Destroy any database type
ep db destroy redis myproject myredis
ep db destroy postgres myproject mydb -f
```

Connection strings are printed on creation.

---

### domains — Domain and SSL management

```bash
# Domains
ep domains list myproject myapp
ep domains add myproject myapp app.example.com --port 3000 --https
ep domains remove myproject myapp <domainId>
ep domains validate app.example.com

# SSL certificates (Let's Encrypt)
ep domains ssl enable myproject myapp app.example.com --email admin@example.com
ep domains ssl status myproject myapp app.example.com
ep domains ssl renew myproject myapp app.example.com
```

---

### monitor — System monitoring

```bash
ep monitor system                            # CPU, memory, disk, uptime
ep monitor stats                             # Advanced system statistics
ep monitor docker                            # Docker container resource usage
ep monitor docker --project myproject        # Filter by project
ep monitor docker --sort memory              # Sort by memory usage
ep monitor health                            # Full health check
ep monitor health --checks disk,memory,ssl  # Specific checks only
ep monitor health --verbose                  # Include details
```

---

### docker — Docker cleanup

```bash
ep docker cleanup        # Remove unused images
ep docker cleanup -f     # Skip confirmation
ep docker prune          # Prune builder cache
ep docker prune --all    # Remove all cache
```

---

### system — System information

```bash
ep system ip                   # Server IP addresses
ep system ip --public-only     # Public IPs only
ep system domain               # Panel domain
ep system info                 # Full system information
ep system restart              # Restart EasyPanel
ep system restart traefik      # Restart Traefik
```

---

### status

```bash
ep status    # Connection status and server info
```

---

## MCP Server Mode

`ep mcp` starts an MCP (Model Context Protocol) server, making your EasyPanel instance available as a tool in AI IDEs. This mode preserves full backward compatibility with [`easypanel-mcp`](https://github.com/sitp2k/easypanel-mcp) — the binary `easypanel-mcp` maps to `ep mcp` automatically.

```bash
# Default: stdio transport (for Claude Desktop, Cursor, Windsurf)
ep mcp

# SSE transport
ep mcp --transport sse --port 3001

# All transports simultaneously
ep mcp --transport all --http-port 3001 --rest-api-port 3002
```

### Claude Desktop (`~/.config/claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "easypanel": {
      "command": "ep",
      "args": ["mcp"],
      "env": {
        "EASYPANEL_URL": "https://panel.example.com",
        "EASYPANEL_TOKEN": "your_token"
      }
    }
  }
}
```

### Cursor / Windsurf

Add an MCP entry pointing to `ep mcp` with `EASYPANEL_URL` and `EASYPANEL_TOKEN` in the environment.

---

## Configuration

### Config file

Credentials and contexts are stored at:

```
~/.config/easypanel/config.json
```

The file contains an array of named contexts. The active context is used for all commands unless overridden with `--url`/`--token` or environment variables.

### Environment variables

| Variable | Description |
|---|---|
| `EASYPANEL_URL` | EasyPanel instance URL |
| `EASYPANEL_TOKEN` | API token |

### `.env` file (local projects)

You can place a `.env` file in your project directory:

```env
EASYPANEL_URL=https://panel.example.com
EASYPANEL_TOKEN=your_api_token
```

---

## Credits

- Original MCP server: [sitp2k/easypanel-mcp](https://github.com/sitp2k/easypanel-mcp) — the foundation this CLI was built on
- [EasyPanel](https://easypanel.io) — the server control panel this CLI targets

This project is not affiliated with, endorsed by, or officially supported by the EasyPanel team.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, and the PR process.

---

## License

MIT — see [LICENSE](LICENSE).
