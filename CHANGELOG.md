# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-03-13

### Added
- Full CLI with 40+ commands across 11 command groups
- Project management: list, create, inspect, destroy
- Service lifecycle: create, start, stop, restart, redeploy, destroy
- Deploy shortcuts: image, git, dockerfile with --wait support
- Database management: Redis, MySQL, PostgreSQL create/inspect/destroy
- Domain management: add, remove, list, validate, SSL enable/status/renew
- Environment variable management: get, set
- Resource limits: memory and CPU configuration
- Log viewing with WebSocket streaming (--follow)
- Service stats and build status
- System monitoring: stats, docker containers, health checks
- Docker cleanup: image cleanup, builder cache prune
- Multi-server context management
- Interactive login with email/password or direct token auth
- MCP server backward compatibility (ep mcp)
- JSON output mode (--json) for all commands
- Colorized table output with spinners

### Security
- Token masking in CLI output
- File permissions (0o600) for config storage
- Confirmation prompts for destructive operations
- HTTP connection warnings
