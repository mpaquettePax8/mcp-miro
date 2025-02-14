import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MiroClient } from './MiroClient.js';

export async function startServer() {
  // Create the transport and server
  const transport = new StdioServerTransport();
  const implementation = {
    name: 'mcp-miro',
    version: '0.1.1'
  };

  const server = new Server(implementation, {
    capabilities: {
      tools: {}
    }
  });

  // Connect the server to the transport
  await server.connect(transport);
} 