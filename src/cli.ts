#!/usr/bin/env node

import { startServer } from './index.js';

startServer().catch((error: Error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 