#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MiroClient } from './MiroClient.js';

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
server.connect(transport).catch((error: Error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 