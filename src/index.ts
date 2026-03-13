#!/usr/bin/env node
/**
 * EasyPanel CLI — Unofficial command-line tool for EasyPanel
 * Manage projects, services, deployments, domains and more from the terminal
 *
 * Also supports MCP server mode via `ep mcp` for AI IDE integration
 */

import { program } from 'commander';
import { registerLoginCommand } from './commands/login.js';
import { registerContextCommand } from './commands/context.js';
import { registerProjectsCommand } from './commands/projects.js';
import { registerServicesCommand } from './commands/services.js';
import { registerDeployCommand } from './commands/deploy.js';
import { registerDbCommand } from './commands/db.js';
import { registerDomainsCommand } from './commands/domains.js';
import { registerMonitorCommand } from './commands/monitor.js';
import { registerDockerCommand } from './commands/docker.js';
import { registerSystemCommand } from './commands/system.js';
import { registerStatusCommand } from './commands/status.js';

program
  .name('ep')
  .description('Unofficial CLI for EasyPanel — manage projects, services, and deployments')
  .version('0.1.0')
  .option('--json', 'Output raw JSON (for piping/automation)')
  .option('--quiet', 'Minimal output')
  .option('--verbose', 'Enable debug logging')
  .option('--url <url>', 'Override EasyPanel URL')
  .option('--token <token>', 'Override API token');

// Register all commands
registerLoginCommand(program);
registerContextCommand(program);
registerStatusCommand(program);
registerProjectsCommand(program);
registerServicesCommand(program);
registerDeployCommand(program);
registerDbCommand(program);
registerDomainsCommand(program);
registerMonitorCommand(program);
registerDockerCommand(program);
registerSystemCommand(program);

// MCP backward compatibility
program
  .command('mcp')
  .description('Start MCP server for AI IDE integration (Claude, Cursor, etc.)')
  .option('-t, --transport <type>', 'Transport: stdio, sse, rest, all', 'stdio')
  .option('-p, --port <number>', 'SSE/HTTP port', '3001')
  .option('--rest-port <number>', 'REST API port', '3002')
  .option('--http-port <number>', 'HTTP port for "all" mode', '3001')
  .option('--rest-api-port <number>', 'REST API port for "all" mode', '3002')
  .option('-c, --client <type>', 'Force client type')
  .option('--list-clients', 'List supported AI clients')
  .action(async (opts) => {
    // Set env vars for MCP mode
    if (opts.verbose || program.opts().verbose) process.env.DEBUG = 'true';
    if (opts.client) process.env.MCP_CLIENT = opts.client.toLowerCase();

    const { EasyPanelMCPServer } = await import('./mcp/server.js');
    const server = new EasyPanelMCPServer();

    const transport = opts.transport as 'stdio' | 'sse' | 'rest' | 'all';
    const port = parseInt(opts.port) || 3001;
    const httpPort = parseInt(opts.httpPort) || 3001;
    const restPort = parseInt(opts.restPort || opts.restApiPort) || 3002;

    console.error(`[MCP] Starting EasyPanel MCP Server with ${transport} transport`);
    await server.run(transport, port, httpPort, restPort);
  });

// Handle invocation as `easypanel-mcp` (backward compat binary name)
const binName = process.argv[1]?.split('/').pop() || '';
if (binName === 'easypanel-mcp' && !process.argv.slice(2).some(a => ['mcp', 'login', 'logout', 'whoami', 'status', 'projects', 'services', 'deploy', 'db', 'domains', 'monitor', 'docker', 'system', 'context'].includes(a))) {
  // If called as easypanel-mcp without a known CLI subcommand, auto-inject 'mcp'
  process.argv.splice(2, 0, 'mcp');
}

program.parse();
