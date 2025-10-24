# Browser Controller MCP

A comprehensive solution for browser automation through MCP (Model Context Protocol) integration. This project consists of a Chrome extension and an MCP server that work together to provide AI agents with powerful browser automation capabilities, including stealth mode and Cloudflare bypass.

## 🚀 Features

- **MCP Protocol Support**: Full compliance with MCP specification
- **Chrome Extension**: Real browser automation with stealth capabilities
- **WebSocket Communication**: Real-time bidirectional communication
- **Cloudflare Bypass**: Advanced bot detection evasion
- **Stealth Mode**: Fingerprint randomization and human-like behavior
- **Command Queue**: Robust command management with retry logic
- **Multi-client Support**: Handle multiple AI agents simultaneously
- **Comprehensive Logging**: Structured logging with multiple levels
- **Rate Limiting**: Built-in protection against abuse

## 📁 Project Structure

```
browser-controller-mcp/
├── README.md                    # This file
├── browser-extension/           # Chrome Extension
│   ├── manifest.json          # Extension manifest
│   ├── background.js          # Service worker
│   ├── content.js            # Content script
│   ├── popup/                # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── lib/                  # Utility libraries
│   │   └── stealth.js       # Stealth mode implementation
│   ├── config/              # Configuration
│   │   └── config.json
│   ├── icons/               # Extension icons
│   │   ├── icon16.svg
│   │   ├── icon48.svg
│   │   └── icon128.svg
│   ├── package.json
│   └── README.md
│
└── browser-mcp-server/        # MCP Server
    ├── src/                   # TypeScript source
    │   ├── index.ts          # Entry point
    │   ├── server.ts         # WebSocket/HTTP server
    │   ├── types/            # TypeScript types
    │   ├── handlers/         # Command handlers
    │   ├── state/            # State management
    │   ├── auth/             # Authentication
    │   ├── utils/            # Utility functions
    │   └── migration/        # Migration generator
    ├── tests/                # Test suite
    ├── config/               # Configuration files
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- Chrome browser
- npm or yarn

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd browser-controller-mcp
   ```

2. **Setup MCP Server**
   ```bash
   cd browser-mcp-server
   npm install
   npm run build
   npm start
   ```

3. **Load Chrome Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `browser-extension` folder

4. **Configure Cursor MCP**
   Add to your Cursor `mcp.json`:
   ```json
   {
     "mcpServers": {
       "browser-controller": {
         "type": "http",
         "url": "http://localhost:8080/mcp",
         "headers": {}
       }
     }
   }
   ```

## 🎯 Usage

### Basic Browser Automation

```typescript
// Navigate to a website
await mcp.call('browser_navigate', {
  url: 'https://example.com',
  bypassCloudflare: true,
  waitUntil: 'load'
});

// Click an element
await mcp.call('browser_click', {
  selector: '.button',
  humanLike: true
});

// Extract data
const data = await mcp.call('browser_extract_data', {
  selector: '.content',
  includeText: true
});

// Take screenshot
await mcp.call('browser_screenshot', {
  fullPage: false,
  format: 'png'
});
```

### Advanced Features

```typescript
// Wait for specific conditions
await mcp.call('browser_wait', {
  type: 'selector',
  value: '.loaded-content',
  timeout: 30000
});

// Analyze page structure
const analysis = await mcp.call('browser_analyze_page', {});
```

## 🔧 Configuration

### MCP Server Configuration

Create `browser-mcp-server/config/server.config.json`:

```json
{
  "server": {
    "port": 8080,
    "host": "localhost",
    "secure": false
  },
  "websocket": {
    "heartbeatInterval": 30000,
    "connectionTimeout": 60000
  },
  "authentication": {
    "enabled": true,
    "apiKeyLength": 32
  },
  "rateLimit": {
    "enabled": true,
    "maxRequests": 100,
    "windowMs": 60000
  }
}
```

### Extension Configuration

The extension automatically connects to `ws://localhost:8080/ws`. You can modify the connection settings through the popup interface or by updating the configuration in `background.js`.

## 🧪 Testing

### MCP Server Tests

```bash
cd browser-mcp-server
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
```

### Extension Testing

- Use Chrome DevTools to debug the extension
- Monitor WebSocket connections in the Network tab
- Check console logs for debugging information
- Use the popup interface to monitor real-time status

## 🚀 Deployment

### Development

```bash
# Start MCP Server in development mode
cd browser-mcp-server
npm run dev

# Load extension in Chrome
# chrome://extensions/ -> Load unpacked -> select browser-extension folder
```

### Production

```bash
# Build and start MCP Server
cd browser-mcp-server
npm run build
npm start

# Extension runs directly from source (no build required)
```

### Docker

```dockerfile
# MCP Server Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY config/ ./config/
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

### Metrics

- Active connections
- Commands per minute
- Success rate
- Average response time
- Error rate by type

### Logging

Structured logging with levels:
- `debug`: Detailed debugging information
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages

## 🔒 Security

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

## 🐛 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if MCP Server is running
   - Verify port configuration
   - Check firewall settings

2. **Extension Not Connecting**
   - Verify WebSocket URL in extension
   - Check Chrome extension permissions
   - Monitor extension console logs

3. **Cloudflare Detection**
   - Enable stealth mode
   - Check fingerprint randomization
   - Verify human-like behavior

4. **Command Timeout**
   - Increase timeout values
   - Check network connectivity
   - Verify extension is connected

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- MCP (Model Context Protocol) specification
- Chrome Extension API
- WebSocket protocol
- Cloudflare bypass techniques

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the individual README files
- Open an issue on the project repository
- Check the Chrome extension documentation

---

**Note**: This project is designed for legitimate automation purposes. Please ensure you comply with website terms of service and applicable laws when using this tool.