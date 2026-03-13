/**
 * MCP Server for EasyPanel (backward compatibility)
 * Moved from index.ts — preserves all MCP functionality via `ep mcp`
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import HttpTransportServer from '../http-transport.js';
import RestApiServer from '../rest-api.js';
import ClientDetector, { type ClientInfo } from '../client-detection.js';

import { projectTools, handleProjectTool } from '../tools/projects.js';
import { serviceTools, handleServiceTool } from '../tools/services.js';
import { databaseTools, handleDatabaseTool } from '../tools/databases.js';
import { domainTools, handleDomainTool } from '../tools/domains.js';
import { licenseTools, handleLicenseTool } from '../tools/license.js';
import { monitoringTools, handleMonitoringTool } from '../tools/monitoring.js';
import { dockerTools, handleDockerCleanupImages, handleDockerPruneBuilderCache } from '../tools/docker.js';
import { systemTools, handleSystemTool } from '../tools/system.js';

export class EasyPanelMCPServer {
  private server: Server;
  private httpServer?: HttpTransportServer;
  private restApiServer?: RestApiServer;
  private clientDetector: ClientDetector;

  constructor() {
    this.clientDetector = ClientDetector.getInstance();
    this.server = new Server(
      { name: 'mcp-easypanel-server', version: '1.0.1' },
      { capabilities: { tools: {} } },
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => { await this.shutdown(); process.exit(0); });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        ...Object.values(projectTools),
        ...Object.values(serviceTools),
        ...Object.values(databaseTools),
        ...Object.values(domainTools),
        ...Object.values(licenseTools),
        ...Object.values(monitoringTools),
        ...Object.values(dockerTools),
        ...Object.values(systemTools),
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const sessionId = (request as any)._meta?.sessionId || (request as any)._sessionId || undefined;

      let client: ClientInfo | undefined;
      if ((request as any)._meta?.transportRequest) {
        client = this.clientDetector.detectClient((request as any)._meta.transportRequest);
      }

      console.error(`[MCP] Executing tool: ${name}${sessionId ? ` (session: ${sessionId})` : ''} for ${client?.name || 'Unknown'}`);

      try {
        if (name in projectTools) return await handleProjectTool(name, args);
        if (name in serviceTools) return await handleServiceTool(name, args);
        if (name in databaseTools) return await handleDatabaseTool(name, args);
        if (name in domainTools) return await handleDomainTool(name, args);
        if (name in licenseTools) return await handleLicenseTool(name, args);
        if (name in monitoringTools) return await handleMonitoringTool(name, args);
        if (name in dockerTools) {
          switch (name) {
            case 'docker_cleanup_images': return await handleDockerCleanupImages(args || {}, sessionId);
            case 'docker_prune_builder_cache': return await handleDockerPruneBuilderCache(args || {}, sessionId);
          }
        }
        if (name in systemTools) return await handleSystemTool(name, args);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      } catch (error) {
        console.error(`[MCP] Tool execution failed:`, error);
        if (error instanceof McpError) throw error;
        throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
      }
    });
  }

  async run(transport: 'stdio' | 'sse' | 'rest' | 'all' = 'stdio', port?: number, httpPort?: number, restPort?: number) {
    switch (transport) {
      case 'stdio': {
        const t = new StdioServerTransport();
        await this.server.connect(t);
        console.error('[MCP] EasyPanel MCP Server running on stdio');
        break;
      }
      case 'sse':
        this.httpServer = new HttpTransportServer(this.server, port || 3001);
        await this.httpServer.start();
        break;
      case 'rest':
        this.restApiServer = new RestApiServer(this.server, port || 3002);
        await this.restApiServer.start();
        break;
      case 'all':
        this.httpServer = new HttpTransportServer(this.server, httpPort || 3001);
        this.restApiServer = new RestApiServer(this.server, restPort || 3002);
        await Promise.all([this.httpServer.start(), this.restApiServer.start()]);
        break;
      default:
        throw new Error(`Unknown transport: ${transport}`);
    }
  }

  private async shutdown() {
    console.error('[MCP] Shutting down...');
    await this.server.close();
    console.error('[MCP] Shutdown complete');
  }
}
