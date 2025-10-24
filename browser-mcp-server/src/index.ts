/**
 * MCP Server Entry Point
 * Handles MCP protocol and WebSocket communication
 */

import { Server } from './server';
import { Logger } from './utils/logger';
import { loadConfig } from './utils/config-loader';
import { ClientManager } from './state/client-manager';
import { CommandQueue } from './state/command-queue';
import { ErrorHandler, createDefaultErrorHandlerConfig } from './error/error-handler';
import { createRetryManager } from './error/retry-manager';

// Load configuration
const config = loadConfig();

// Initialize logger
const logger = new Logger(config.logging);

// Initialize state managers
const clientManager = new ClientManager();
const commandQueue = new CommandQueue();

// Initialize error handling and retry logic
const errorHandlerConfig = createDefaultErrorHandlerConfig(logger);
const errorHandler = new ErrorHandler(errorHandlerConfig);
const retryManager = createRetryManager(logger);

// Initialize server
const server = new Server({
  port: config.server.port,
  host: config.server.host,
  secure: config.server.secure,
  maxConnections: config.server.maxConnections,
  clientManager,
  commandQueue,
  errorHandler,
  retryManager,
  logger
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

// Start server
server.start().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

logger.info('Browser MCP Server starting...', {
  port: config.server.port,
  host: config.server.host,
  version: '1.0.0'
});

export { server, clientManager, commandQueue, logger };

