# PRD — EasyPanel CLI: Agentic & Developer Experience Improvements

**Versão:** 1.0
**Data:** 2026-04-03
**Autor:** Murillo Alves + Claude Code
**Status:** Draft
**Repo:** github.com/murilloimparavel/easypanel-cli

---

## 1. Contexto

O `ep` CLI (0.1.0, ~11K lines TypeScript) já é funcional pra uso humano e tem base agentic (MCP server, `--json`, `--quiet`). Porém, agentes IA (Claude Code, Gemini CLI, Codex, Cursor) são os **principais operadores** em nosso workflow — eles gerenciam infra 24/7 via CLI.

Este PRD lista melhorias pra tornar o CLI **agent-first** sem perder a usabilidade humana.

---

## 2. Problemas Identificados

### 2.1 Output & Parseabilidade

| Problema | Impacto | Exemplo |
|----------|---------|---------|
| `--json` não funciona em todos os comandos | Agente não consegue parsear output | `ep monitor system` ignora `--json` |
| Sem `--format` (json/table/yaml/csv) | Agente precisa de JSON, humano prefere tabela | Forçar `--json` perde legibilidade humana |
| Códigos ANSI no output mesmo com `--no-color` | Agentes parseiam caracteres de escape | `[90m┌───[39m` no output |
| Sem schema dos campos JSON | Agente não sabe quais campos esperar | `ep services stats` retorna JSON sem docs |
| Logs não têm formato estruturado | Agente não consegue filtrar logs por level/timestamp | `ep services logs` retorna texto livre |

### 2.2 Comandos Faltantes

| Comando ausente | Necessidade |
|----------------|-------------|
| `ep services list <project>` | Listar serviços sem ter que inspecionar projeto inteiro |
| `ep services command <project> <service> <cmd>` | Setar custom start command (preciso pra Celery worker vs api vs beat) |
| `ep health <project>` | Health check de todos os serviços de um projeto de uma vez |
| `ep services inspect <project> <service>` | Ver config completa de 1 serviço (source, build, env, domains, ports) |
| `ep deploy status <project>` | Ver build/deploy status de todos os serviços do projeto |
| `ep env export <project> <service>` | Exportar env vars como .env file |
| `ep env import <project> <service> --file .env` | Importar .env file |

### 2.3 Help & Discoverability

| Problema | Impacto |
|----------|---------|
| `ep --help` não mostra exemplos quick-start | Agente não sabe por onde começar |
| Sem `ep examples` ou `ep quickstart` | Novo usuário/agente perdido |
| Subcommands não linkam uns pros outros | `ep services create` não sugere `ep deploy` depois |
| Sem man pages ou `--help-full` | Agente precisa de docs inline detalhados |

### 2.4 Agentic Workflow

| Problema | Impacto |
|----------|---------|
| Sem `--wait` em todos os comandos de deploy | Agente não sabe quando deploy terminou |
| Sem exit codes semânticos | Agente não diferencia "serviço não existe" de "auth falhou" |
| Sem `--dry-run` | Agente não pode simular antes de executar |
| `ep mcp` existe mas tools são limitadas | MCP server não cobre todos os comandos |

---

## 3. Melhorias Propostas

### 3.1 Output Universal JSON/Format

**Prioridade:** Alta

Todos os comandos devem suportar `--format json|table|yaml|csv`:

```bash
ep services list prospector --format json
# [{"name":"worker","type":"app","status":"running","image":"..."},...]

ep services list prospector --format table
# ┌──────────┬──────┬─────────┐
# │ Name     │ Type │ Status  │
# ...

ep services list prospector --format csv
# name,type,status
# worker,app,running
# ...
```

**Implementação:** Centralizar formatação em `src/formatters/`, wrapper `formatOutput(data, format)` em todo comando.

### 3.2 Novos Comandos

**Prioridade:** Alta

```bash
# Listar serviços de um projeto (atalho pra inspect)
ep services list <project>
ep services list <project> --format json

# Inspecionar 1 serviço específico
ep services inspect <project> <service>
# Retorna: source, build, env, domains, ports, resources, status

# Custom start command
ep services command <project> <service> "celery -A app worker"

# Health check de projeto inteiro
ep health <project>
# Retorna: status de cada serviço, uptime, restarts, memory

# Deploy status de todos os serviços
ep deploy status <project>
# Retorna: build status, last deploy, commit hash

# Env export/import
ep services env export <project> <service> > .env
ep services env import <project> <service> --file .env
```

### 3.3 Help Melhorado

**Prioridade:** Média

```bash
# Top-level help com exemplos quick-start
ep --help
# ...
# Quick Start:
#   ep login                                    # Authenticate
#   ep projects list                            # See projects
#   ep projects inspect <project>               # See services
#   ep deploy image <project> <svc> nginx       # Deploy image
#   ep services logs <project> <svc> --follow   # Watch logs
#   ep monitor health                           # System health

# Exemplos por subcommand com contexto
ep deploy --help
# ...
# Workflows:
#   Deploy from Docker Hub:
#     ep deploy image myapp web nginx:latest
#     ep domains add myapp web example.com --https
#
#   Deploy from GitHub (private repo):
#     ep deploy git myapp api https://TOKEN@github.com/user/repo.git --ref main
#
#   Deploy with custom Dockerfile:
#     ep deploy dockerfile myapp worker https://github.com/user/repo.git --dockerfile docker/worker/Dockerfile
```

### 3.4 Exit Codes Semânticos

**Prioridade:** Média

| Exit Code | Significado |
|-----------|------------|
| 0 | Sucesso |
| 1 | Erro genérico |
| 2 | Erro de validação (input inválido) |
| 3 | Erro de autenticação (token inválido/expirado) |
| 4 | Recurso não encontrado (projeto/serviço inexistente) |
| 5 | Conflito (recurso já existe) |
| 6 | Timeout (operação demorou demais) |
| 7 | Erro de rede (servidor inacessível) |

Agentes usam exit codes pra decidir: retry? abort? pedir ajuda ao humano?

### 3.5 Flags Agentic

**Prioridade:** Média

```bash
# --wait: bloqueia até operação completar (deploy, start, stop)
ep deploy image prospector worker nginx:latest --wait --timeout 120
# Bloqueia até container estar running ou timeout

# --dry-run: mostra o que faria sem executar
ep services destroy prospector worker --dry-run
# Would destroy service "worker" in project "prospector"

# --assert: falha se condição não for verdadeira (pra scripts)
ep services stats prospector worker --assert "status=running"
# Exit 0 se running, exit 1 se não

# --retry: retry automático em caso de falha
ep deploy image prospector worker nginx:latest --retry 3 --retry-delay 10
```

### 3.6 Logs Estruturados

**Prioridade:** Baixa

```bash
ep services logs prospector worker --format json
# {"timestamp":"2026-04-03T23:50:56Z","level":"info","message":"celery@40ddf877ce5b v5.6.3","service":"worker"}

ep services logs prospector worker --level error
# Filtra só erros

ep services logs prospector worker --since 1h
# Últimas 1 hora
```

### 3.7 MCP Server Expandido

**Prioridade:** Baixa

Garantir que TODOS os comandos novos tenham tools MCP correspondentes em `src/mcp/` e `src/tools/`. Agentes usando MCP (Claude Desktop, Cursor) devem ter acesso completo.

---

## 4. Não-Objetivos (Out of Scope)

- Reescrever o CLI do zero
- Mudar de Commander pra outro framework
- Dashboard web embutido no CLI
- Suporte a EasyPanel Cloud (foco: self-hosted)
- Testes E2E (não tem infra de teste hoje)

---

## 5. Priorização

| Sprint | Stories | Esforço |
|--------|---------|---------|
| **S1** | `--format json/table` universal + `services list` + `services inspect` + `health <project>` | M |
| **S2** | `services command` + `env export/import` + `deploy status` + exit codes | M |
| **S3** | Help melhorado + `--wait` + `--dry-run` + `--assert` | S |
| **S4** | Logs estruturados + MCP tools expandido + `--retry` | S |

---

## 6. Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Comandos com `--json` funcional | ~60% | 100% |
| Comandos que agente consegue usar sem ajuda | ~70% | 95% |
| Exit codes diferenciados | 2 (0/1) | 8 |
| MCP tools disponíveis | ~15 | ~25 |
| Tempo pra agente diagnosticar problema | ~5 commands | 1-2 commands |

---

## 7. Referências

- Repo: `github.com/murilloimparavel/easypanel-cli`
- Codebase: ~11K lines TypeScript
- Stack: Commander.js, Axios, Chalk, Ora
- MCP: `src/mcp/` (já implementado, stdio/sse/rest)
- EasyPanel API: tRPC em `/api/trpc/`
- Skill AIOS: `.claude/skills/easypanel-cli/SKILL.md`
