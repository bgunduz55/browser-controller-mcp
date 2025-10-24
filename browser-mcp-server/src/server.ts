/**
 * WebSocket Server
 * Handles WebSocket connections and message routing
 */

import WebSocket from 'ws';
import { createServer } from 'http';
import { Logger } from './utils/logger';
import { ClientManager } from './state/client-manager';
import { CommandQueue } from './state/command-queue';
import { AuthManager } from './auth/auth-manager';
import { MessageHandler } from './handlers/message-handler';
import { ErrorHandler, createDefaultErrorHandlerConfig } from './error/error-handler';
import { RetryManager, createRetryManager } from './error/retry-manager';
import { MCPCommand, MCPResponse, Heartbeat, ClientState } from './types';

export interface ServerConfig {
  port: number;
  host: string;
  secure: boolean;
  maxConnections: number;
  clientManager: ClientManager;
  commandQueue: CommandQueue;
  errorHandler: ErrorHandler;
  retryManager: RetryManager;
  logger: Logger;
}

export class Server {
  private httpServer: any;
  private wss!: WebSocket.Server;
  private config: ServerConfig;
  private authManager: AuthManager;
  private messageHandler: MessageHandler;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pendingCommands = new Map<string, {
    resolve: (data: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: ServerConfig) {
    this.config = config;
    this.authManager = new AuthManager();
    this.messageHandler = new MessageHandler(
      config.clientManager,
      config.commandQueue,
      config.logger
    );
    
    // Initialize error handling and retry logic
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // Error handling is already configured in the config
    this.config.logger.info('Error handling and retry logic initialized');
  }

  async start(): Promise<void> {
    // Create HTTP server
    this.httpServer = createServer();

    // Create WebSocket server
    this.wss = new WebSocket.Server({
      server: this.httpServer,
      path: '/ws'
    });

    // Handle WebSocket connections
    this.wss.on('connection', this.handleConnection.bind(this));

    // Handle HTTP requests
    this.httpServer.on('request', (req: any, res: any) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // MCP endpoint
      if (req.url === '/mcp' && req.method === 'POST') {
        this.handleMCPRequest(req, res);
        return;
      }

      // Default response
      res.writeHead(404);
      res.end('Not Found');
    });

    // Start HTTP server
    await new Promise<void>((resolve, reject) => {
      this.httpServer.listen(this.config.port, this.config.host, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Start heartbeat
    this.startHeartbeat();

    this.config.logger.info('Server started', {
      port: this.config.port,
      host: this.config.host,
      secure: this.config.secure
    });
  }

  async stop(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.wss.clients.forEach(ws => {
      ws.close(1000, 'Server shutting down');
    });

    // Close WebSocket server
    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });

    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => resolve());
    });

    this.config.logger.info('Server stopped');
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = this.generateClientId();
    const clientIP = req.socket.remoteAddress;

    this.config.logger.info('New connection', { clientId, clientIP });

    // Set up message handler
    ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(ws, clientId, data);
    });

    // Set up close handler
    ws.on('close', (code: number, reason: string) => {
      this.handleDisconnection(clientId, code, reason);
    });

    // Set up error handler
    ws.on('error', (error: Error) => {
      this.config.logger.error('WebSocket error', { clientId, error: error.message });
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: 'welcome',
      clientId,
      serverVersion: '1.0.0',
      timestamp: Date.now()
    });
  }

  private async handleMessage(ws: WebSocket, clientId: string, data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      this.config.logger.info('📨 RECEIVED MESSAGE', { 
        clientId, 
        type: message.type, 
        message: JSON.stringify(message, null, 2) 
      });

      switch (message.type) {
        case 'auth':
          await this.handleAuth(ws, clientId, message);
          break;

        case 'command':
          await this.handleCommand(ws, clientId, message);
          break;

        case 'response':
          await this.handleResponse(clientId, message);
          break;

        case 'heartbeat':
          await this.handleHeartbeat(clientId, message);
          break;

        default:
          this.config.logger.warn('Unknown message type', { clientId, type: message.type });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.logger.error('Message handling error', { clientId, error: errorMessage });
      this.sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
    }
  }

  private async handleAuth(ws: WebSocket, clientId: string, message: any): Promise<void> {
    try {
      // No authentication required - always succeed

      // Create client state
      const clientState: ClientState = {
        id: clientId,
        connected: true,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        lastActivity: Date.now(),
        activeCommands: new Map(),
        commandHistory: [],
        apiKey: 'no-auth-required',
        rateLimit: {
          requests: 0,
          windowStart: Date.now()
        }
      };

      this.config.clientManager.addClient(clientState);

      this.sendMessage(ws, {
        type: 'auth_success',
        clientId,
        timestamp: Date.now()
      });

      this.config.logger.info('Client authenticated', { clientId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.logger.error('Authentication error', { clientId, error: errorMessage });
      this.sendError(ws, 'AUTHENTICATION_FAILED', 'Authentication failed');
    }
  }

  private async handleCommand(ws: WebSocket, clientId: string, message: any): Promise<void> {
    try {
      const command: MCPCommand = {
        id: message.id || this.generateCommandId(),
        type: message.command || message.type,
        params: message.params || {},
        timestamp: Date.now(),
        timeout: message.timeout || 30000,
        retryCount: 0,
        maxRetries: message.maxRetries || 3,
        priority: message.priority || 'normal',
        clientId
      };

      // Validate command
      if (!this.validateCommand(command)) {
        this.sendError(ws, 'INVALID_PARAMS', 'Invalid command parameters');
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(clientId)) {
        this.sendError(ws, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded');
        return;
      }

      // Queue command
      await this.config.commandQueue.enqueue(command);

      this.config.logger.info('🚀 COMMAND QUEUED', { 
        clientId, 
        commandId: command.id, 
        type: command.type,
        params: JSON.stringify(command.params, null, 2)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.logger.error('Command handling error', { clientId, error: errorMessage });
      this.sendError(ws, 'COMMAND_FAILED', 'Failed to process command');
    }
  }

  private async handleResponse(clientId: string, message: any): Promise<void> {
    try {
      const response: MCPResponse = {
        id: message.id,
        success: message.success,
        data: message.data,
        error: message.error,
        metadata: {
          duration: message.metadata?.duration || 0,
          retries: message.metadata?.retries || 0,
          timestamp: Date.now(),
          clientId
        }
      };

      // Update client state
      this.config.clientManager.updateClientState(clientId, {
        lastActivity: Date.now()
      });

      this.config.logger.debug('Response received', { 
        clientId, 
        commandId: response.id, 
        success: response.success 
      });

      // Resolve pending command if exists
      const pendingCommand = this.pendingCommands.get(response.id);
      if (pendingCommand) {
        clearTimeout(pendingCommand.timeout);
        this.pendingCommands.delete(response.id);
        
        if (response.success) {
          pendingCommand.resolve(response.data);
        } else {
          pendingCommand.reject(new Error(response.error?.message || 'Command failed'));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.logger.error('Response handling error', { clientId, error: errorMessage });
    }
  }

  private async handleHeartbeat(clientId: string, message: Heartbeat): Promise<void> {
    try {
      // Update client state
      this.config.clientManager.updateClientState(clientId, {
        lastHeartbeat: Date.now(),
        lastActivity: Date.now()
      });

      this.config.logger.debug('Heartbeat received', { 
        clientId, 
        status: message.status,
        activeCommands: message.activeCommands
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.logger.error('Heartbeat handling error', { clientId, error: errorMessage });
    }
  }

  private handleDisconnection(clientId: string, code: number, reason: string): void {
    this.config.logger.info('Client disconnected', { clientId, code, reason });
    
    // Remove client
    this.config.clientManager.removeClient(clientId);
  }

  private validateCommand(command: MCPCommand): boolean {
    const validTypes = ['navigate', 'click', 'extract', 'extract_data', 'extract_table', 'extract_links', 'extract_images', 'extract_text', 'extract_attribute', 'type', 'select', 'check', 'hover', 'scroll', 'dragDrop', 'upload', 'evaluate', 'reload', 'goBack', 'goForward', 'newTab', 'closeTab', 'switchTab', 'getTabs', 'getCookies', 'setCookie', 'deleteCookie', 'clearCookies', 'getLocalStorage', 'setLocalStorage', 'getSessionStorage', 'setSessionStorage', 'clearStorage', 'wait', 'waitForSelector', 'waitForText', 'waitForNavigation', 'waitForNetworkIdle', 'analyze', 'screenshot'];
    
    if (!validTypes.includes(command.type)) {
      return false;
    }

    if (!command.params || typeof command.params !== 'object') {
      return false;
    }

    return true;
  }

  private checkRateLimit(clientId: string): boolean {
    const client = this.config.clientManager.getClient(clientId);
    if (!client) return false;

    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    // Reset window if needed
    if (now - client.rateLimit.windowStart > windowMs) {
      client.rateLimit.requests = 0;
      client.rateLimit.windowStart = now;
    }

    // Check limit
    if (client.rateLimit.requests >= maxRequests) {
      return false;
    }

    // Increment counter
    client.rateLimit.requests++;
    return true;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000); // Every 30 seconds
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleTimeout = 120000; // 2 minutes

    this.config.clientManager.getAllClients().forEach(client => {
      if (now - client.lastHeartbeat > staleTimeout) {
        this.config.logger.warn('Removing stale client', { clientId: client.id });
        this.config.clientManager.removeClient(client.id);
      }
    });
  }

  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      this.config.logger.info('📤 SENDING MESSAGE', { 
        message: JSON.stringify(message, null, 2) 
      });
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    this.sendMessage(ws, {
      type: 'error',
      code,
      message,
      timestamp: Date.now()
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendMessageToClient(clientId: string, message: any): void {
    const client = this.config.clientManager.getClient(clientId);
    if (client && this.wss) {
      this.wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          // Find the WebSocket for this client
          // For now, send to all connected clients
          this.sendMessage(ws, message);
        }
      });
    }
  }

  private async handleMCPRequest(req: any, res: any): Promise<void> {
    try {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const mcpRequest = JSON.parse(body);
          
          // Handle MCP protocol
          const response = await this.handleMCPProtocol(mcpRequest);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }


    private async handleMCPProtocol(request: any): Promise<any> {
      // MCP protocol implementation
      if (request.method === 'initialize') {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "Browser MCP Server",
              version: "1.0.0"
            }
          }
        };
      }

      if (request.method === 'tools/list') {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
          {
            name: 'browser_navigate',
            description: 'Navigate to URL with Cloudflare bypass',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                waitUntil: { 
                  type: 'string', 
                  enum: ['load', 'domcontentloaded', 'networkidle'],
                  default: 'load'
                },
                timeout: { type: 'number', default: 30000 },
                bypassCloudflare: { type: 'boolean', default: true }
              },
              required: ['url']
            }
          },
          {
            name: 'browser_click',
            description: 'Click element with human-like behavior',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                humanLike: { type: 'boolean', default: true },
                waitForNavigation: { type: 'boolean', default: false },
                timeout: { type: 'number', default: 10000 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_extract_data',
            description: 'Extract structured data from web page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                includeText: { type: 'boolean', default: true },
                includeAttributes: { type: 'boolean', default: false },
                maxElements: { type: 'number', default: 100 },
                extractType: { 
                  type: 'string', 
                  enum: ['generic', 'table', 'links', 'images', 'text', 'attributes'],
                  default: 'generic'
                }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_extract_table',
            description: 'Extract table data as JSON',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                maxElements: { type: 'number', default: 10 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_extract_links',
            description: 'Extract all links with metadata',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                maxElements: { type: 'number', default: 100 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_extract_images',
            description: 'Extract image URLs and alt text',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                maxElements: { type: 'number', default: 100 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_extract_text',
            description: 'Extract visible text from page/element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                maxElements: { type: 'number', default: 100 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_extract_attribute',
            description: 'Get specific attribute values',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                maxElements: { type: 'number', default: 100 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_analyze_page',
            description: 'Analyze page structure and performance',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'browser_screenshot',
            description: 'Take screenshot of current page',
            inputSchema: {
              type: 'object',
              properties: {
                fullPage: { type: 'boolean', default: false },
                format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' }
              }
            }
          },
          {
            name: 'browser_wait',
            description: 'Wait for condition',
            inputSchema: {
              type: 'object',
              properties: {
                type: { 
                  type: 'string', 
                  enum: ['selector', 'timeout', 'navigation', 'cloudflare']
                },
                value: { type: 'string' },
                timeout: { type: 'number', default: 30000 }
              },
              required: ['type']
            }
          },
          {
            name: 'browser_wait_for_selector',
            description: 'Wait for element to appear',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                timeout: { type: 'number', default: 30000 },
                visible: { type: 'boolean', default: true },
                hidden: { type: 'boolean', default: false }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_wait_for_text',
            description: 'Wait for text to appear',
            inputSchema: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                selector: { type: 'string' },
                timeout: { type: 'number', default: 30000 },
                exact: { type: 'boolean', default: false }
              },
              required: ['text']
            }
          },
          {
            name: 'browser_wait_for_navigation',
            description: 'Wait for page load',
            inputSchema: {
              type: 'object',
              properties: {
                timeout: { type: 'number', default: 30000 },
                waitUntil: { 
                  type: 'string', 
                  enum: ['load', 'domcontentloaded', 'networkidle'],
                  default: 'load'
                }
              }
            }
          },
          {
            name: 'browser_wait_for_network_idle',
            description: 'Wait for network requests to complete',
            inputSchema: {
              type: 'object',
              properties: {
                timeout: { type: 'number', default: 30000 },
                idleTime: { type: 'number', default: 500 }
              }
            }
          },
          {
            name: 'browser_type',
            description: 'Type text into input/textarea',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                text: { type: 'string' },
                humanLike: { type: 'boolean', default: true },
                clear: { type: 'boolean', default: false },
                timeout: { type: 'number', default: 10000 }
              },
              required: ['selector', 'text']
            }
          },
          {
            name: 'browser_select',
            description: 'Select dropdown option',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                value: { type: 'string' },
                text: { type: 'string' },
                index: { type: 'number' },
                timeout: { type: 'number', default: 10000 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_check',
            description: 'Check/uncheck checkbox or radio button',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                checked: { type: 'boolean' },
                timeout: { type: 'number', default: 10000 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_hover',
            description: 'Hover over element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                timeout: { type: 'number', default: 10000 }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_scroll',
            description: 'Scroll to element or position',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                behavior: { type: 'string', enum: ['auto', 'smooth'], default: 'smooth' },
                block: { type: 'string', enum: ['start', 'center', 'end', 'nearest'], default: 'center' },
                inline: { type: 'string', enum: ['start', 'center', 'end', 'nearest'], default: 'nearest' },
                timeout: { type: 'number', default: 10000 }
              }
            }
          },
          {
            name: 'browser_drag_drop',
            description: 'Drag and drop elements',
            inputSchema: {
              type: 'object',
              properties: {
                sourceSelector: { type: 'string' },
                targetSelector: { type: 'string' },
                timeout: { type: 'number', default: 10000 }
              },
              required: ['sourceSelector', 'targetSelector']
            }
          },
          {
            name: 'browser_upload_file',
            description: 'Upload file to input',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      content: { type: 'string' }
                    },
                    required: ['name']
                  }
                },
                timeout: { type: 'number', default: 10000 }
              },
              required: ['selector', 'files']
            }
          },
          {
            name: 'browser_evaluate_js',
            description: 'Execute custom JavaScript',
            inputSchema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                timeout: { type: 'number', default: 5000 }
              },
              required: ['code']
            }
          },
          {
            name: 'browser_reload',
            description: 'Reload current page',
            inputSchema: {
              type: 'object',
              properties: {
                bypassCache: { type: 'boolean', default: false }
              }
            }
          },
          {
            name: 'browser_go_back',
            description: 'Browser back button',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'browser_go_forward',
            description: 'Browser forward button',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'browser_new_tab',
            description: 'Open new tab with URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                active: { type: 'boolean', default: true }
              },
              required: ['url']
            }
          },
          {
            name: 'browser_close_tab',
            description: 'Close current or specific tab',
            inputSchema: {
              type: 'object',
              properties: {
                tabId: { type: 'number' }
              }
            }
          },
          {
            name: 'browser_switch_tab',
            description: 'Switch to tab by index or title',
            inputSchema: {
              type: 'object',
              properties: {
                tabId: { type: 'number' },
                index: { type: 'number' },
                title: { type: 'string' }
              }
            }
          },
          {
            name: 'browser_get_tabs',
            description: 'List all open tabs',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'browser_get_cookies',
            description: 'Get all cookies',
            inputSchema: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                name: { type: 'string' }
              }
            }
          },
          {
            name: 'browser_set_cookie',
            description: 'Set cookie',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' },
                domain: { type: 'string' },
                path: { type: 'string', default: '/' },
                secure: { type: 'boolean', default: false },
                httpOnly: { type: 'boolean', default: false },
                expirationDate: { type: 'number' }
              },
              required: ['name', 'value']
            }
          },
          {
            name: 'browser_delete_cookie',
            description: 'Delete cookie',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                domain: { type: 'string' },
                path: { type: 'string', default: '/' }
              },
              required: ['name']
            }
          },
          {
            name: 'browser_clear_cookies',
            description: 'Clear all cookies',
            inputSchema: {
              type: 'object',
              properties: {
                domain: { type: 'string' }
              }
            }
          },
          {
            name: 'browser_get_local_storage',
            description: 'Get localStorage data',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string' }
              }
            }
          },
          {
            name: 'browser_set_local_storage',
            description: 'Set localStorage item',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                value: { type: 'string' }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'browser_get_session_storage',
            description: 'Get sessionStorage data',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string' }
              }
            }
          },
          {
            name: 'browser_set_session_storage',
            description: 'Set sessionStorage item',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                value: { type: 'string' }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'browser_clear_storage',
            description: 'Clear all storage',
            inputSchema: {
              type: 'object',
              properties: {
                storageType: { 
                  type: 'string', 
                  enum: ['localStorage', 'sessionStorage', 'both'],
                  default: 'both'
                }
              }
            }
          }
        ]
        }
      };
    }

    if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;
      
      this.config.logger.info('🔧 MCP TOOL CALL', { 
        tool: name, 
        params: JSON.stringify(args, null, 2) 
      });
      
        // Execute command with retry logic
        const commandType = name.replace('browser_', '');
        const clients = this.config.clientManager.getAllClients();
        
        if (clients.length === 0) {
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32603, message: 'No connected clients' }
          };
        }

        const client = clients[0];
        
        try {
          const result = await this.config.retryManager.executeWithRetry(
            commandType,
            args,
            async () => {
              const command: MCPCommand = {
                id: this.generateCommandId(),
                type: commandType as any,
                params: args,
                timestamp: Date.now(),
                clientId: 'mcp-client'
              };

              this.config.logger.info('📤 SENDING COMMAND TO CLIENT', {
                clientId: client.id,
                command: JSON.stringify(command, null, 2)
              });

              // Create promise for response
              const promise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  this.pendingCommands.delete(command.id);
                  reject(new Error('Command timeout'));
                }, 30000); // 30 second timeout

                this.pendingCommands.set(command.id, {
                  resolve,
                  reject,
                  timeout
                });
              });

              // Send command to client via WebSocket
              this.sendMessageToClient(client.id, {
                type: 'command',
                id: command.id,
                params: {
                  type: command.type,
                  params: command.params
                }
              });

              // Wait for response
              return await promise;
            }
          );
          
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.config.logger.error('Command execution failed after retries', {
            command: commandType,
            error: errorMessage,
            params: args
          });
          
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: { 
              code: -32603, 
              message: `Command failed: ${errorMessage}` 
            }
          };
        }
    }

    return { 
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: 'Unknown method' }
    };
  }
}
