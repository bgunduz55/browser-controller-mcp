# Browser MCP Server

A powerful MCP (Model Context Protocol) server that provides browser automation capabilities through WebSocket communication with Chrome extensions. This server enables AI agents to control real browsers with advanced stealth features and Cloudflare bypass capabilities.

## Features

- **MCP Protocol Support**: Full compliance with MCP specification for AI agent integration
- **WebSocket Communication**: Real-time bidirectional communication with browser extensions
- **HTTP Endpoint**: RESTful API for MCP clients like Cursor
- **Stealth Mode**: Advanced fingerprint randomization and bot detection bypass
- **Cloudflare Bypass**: Automatic detection and handling of Cloudflare challenges
- **Command Queue**: Robust command management with retry logic and priority handling
- **Client Management**: Multi-client support with connection health monitoring
- **Authentication**: API key-based authentication system
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Comprehensive Logging**: Structured logging with multiple levels

## Architecture

```
AI Agent (Cursor/Claude)
    ↓
MCP Server (HTTP/WebSocket)
    ↓
Chrome Extension (Background + Content Scripts)
    ↓
Real Browser (Chrome/Edge)
    ↓
Target Websites (with Bot Detection Bypass)
```

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome browser (for extension)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd browser-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   ```

### Development Mode

```bash
npm run dev
```

This will start the server in development mode with hot reloading.

## Configuration

### Server Configuration

Create `config/server.config.json`:

```json
{
  "server": {
    "port": 8080,
    "host": "localhost",
    "secure": false,
    "maxConnections": 10,
    "corsOrigins": ["http://localhost:*"]
  },
  "websocket": {
    "heartbeatInterval": 30000,
    "connectionTimeout": 60000,
    "maxMessageSize": 1048576,
    "pingInterval": 10000
  },
  "authentication": {
    "enabled": true,
    "apiKeyLength": 32,
    "tokenExpiration": 86400000
  },
  "rateLimit": {
    "enabled": true,
    "maxRequests": 100,
    "windowMs": 60000
  },
  "logging": {
    "level": "info",
    "file": "logs/server.log",
    "maxSize": 10485760,
    "maxFiles": 5
  }
}
```

### Environment Variables

```bash
PORT=8080
HOST=localhost
LOG_LEVEL=info
API_KEY_SECRET=your-secret-key
```

## Usage

### MCP Integration (Cursor)

Add to your Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "browser-mcp": {
      "type": "http",
      "url": "http://localhost:8080/mcp",
      "headers": {}
    }
  }
}
```

### Available Tools

#### `browser_navigate`
Navigate to URLs with Cloudflare bypass.

```typescript
await mcp.call('browser_navigate', {
  url: 'https://example.com',
  waitUntil: 'load',
  timeout: 30000,
  bypassCloudflare: true
});
```

#### `browser_click`
Click elements with human-like behavior.

```typescript
await mcp.call('browser_click', {
  selector: '.button',
  humanLike: true,
  waitForNavigation: false,
  timeout: 10000
});
```

#### `browser_extract_data`
Extract structured data from web pages.

```typescript
await mcp.call('browser_extract_data', {
  selector: '.content',
  includeText: true,
  includeAttributes: false,
  maxElements: 100
});
```

#### `browser_analyze_page`
Analyze page structure and performance.

```typescript
await mcp.call('browser_analyze_page', {});
```

#### `browser_screenshot`
Capture screenshots.

```typescript
await mcp.call('browser_screenshot', {
  fullPage: false,
  format: 'png'
});
```

#### `browser_wait`
Wait for specific conditions.

```typescript
await mcp.call('browser_wait', {
  type: 'selector',
  value: '.loaded-content',
  timeout: 30000
});
```

### WebSocket API

For direct WebSocket communication:

```typescript
const ws = new WebSocket('ws://localhost:8080/ws');

// Send command
ws.send(JSON.stringify({
  type: 'command',
  id: 'cmd-123',
  params: {
    type: 'navigate',
    params: { url: 'https://example.com' }
  }
}));

// Receive response
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('Response:', response);
};
```

## API Reference

### WebSocket Messages

#### Command Format
```typescript
interface MCPCommand {
  id: string;
  type: 'navigate' | 'click' | 'extract' | 'analyze' | 'screenshot' | 'wait';
  params: any;
  timestamp: number;
  timeout?: number;
  retryCount?: number;
  maxRetries?: number;
  priority?: 'high' | 'normal' | 'low';
  clientId?: string;
}
```

#### Response Format
```typescript
interface MCPResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: {
    code: ErrorCode;
    message: string;
    recoverable: boolean;
    stack?: string;
    context?: any;
  };
  metadata: {
    duration: number;
    retries: number;
    timestamp: number;
    clientId: string;
  };
}
```

### Error Codes

- `TIMEOUT`: Command execution timeout
- `NETWORK_ERROR`: Network connectivity issues
- `CLOUDFLARE_BLOCK`: Cloudflare challenge detected
- `SELECTOR_NOT_FOUND`: Element selector not found
- `INVALID_PARAMS`: Invalid command parameters
- `AUTHENTICATION_FAILED`: API key authentication failed
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `COMMAND_FAILED`: Command execution failed
- `UNKNOWN`: Unknown error

## Development

### Project Structure

```
browser-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Main server implementation
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   ├── handlers/             # Command handlers
│   │   └── message-handler.ts
│   ├── state/                # State management
│   │   ├── client-manager.ts
│   │   └── command-queue.ts
│   ├── auth/                 # Authentication
│   │   └── auth-manager.ts
│   ├── utils/                # Utility functions
│   │   ├── logger.ts
│   │   ├── config-loader.ts
│   │   └── retry.ts
│   └── migration/            # Migration generator
│       ├── generator.ts
│       └── templates.ts
├── tests/                    # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── config/                   # Configuration files
│   └── server.config.json
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
# Development build
npm run build

# Production build
npm run build:prod

# Watch mode
npm run build:watch
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Linting

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY config/ ./config/

EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name browser-mcp-server
pm2 save
pm2 startup
```

### Systemd Service

```ini
[Unit]
Description=Browser MCP Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/path/to/browser-mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

### Metrics

The server provides metrics for:
- Active connections
- Commands per minute
- Success rate
- Average response time
- Error rate by type

### Logging

Structured logging with multiple levels:
- `debug`: Detailed debugging information
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages

## Security

### Authentication

- API key-based authentication
- Configurable key length and expiration
- Rate limiting per client

### Network Security

- CORS configuration
- WebSocket origin validation
- Request size limits

### Data Protection

- No sensitive data logging
- Secure WebSocket connections
- Input validation and sanitization

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if server is running
   - Verify port configuration
   - Check firewall settings

2. **Authentication Failed**
   - Verify API key configuration
   - Check key expiration
   - Ensure proper headers

3. **Command Timeout**
   - Increase timeout values
   - Check network connectivity
   - Verify extension is connected

4. **Cloudflare Detection**
   - Enable stealth mode
   - Check fingerprint randomization
   - Verify human-like behavior

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Extension Debugging

1. Open Chrome DevTools
2. Go to Extensions tab
3. Click "Inspect views: background page"
4. Monitor console logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on the project repository
- Check the Chrome extension documentation