# Browser MCP Extension

A Chrome extension that connects to a Browser MCP Server for advanced web automation capabilities. This extension provides stealth mode browsing, Cloudflare bypass, and seamless integration with MCP (Model Context Protocol) servers.

## Features

- **WebSocket Connection**: Real-time communication with MCP Server
- **Stealth Mode**: Advanced fingerprint randomization and bot detection bypass
- **Cloudflare Bypass**: Automatic detection and handling of Cloudflare challenges
- **Human-like Behavior**: Simulates natural user interactions
- **Command Queue**: Manages and executes browser automation commands
- **Auto-reconnection**: Robust connection management with automatic retry
- **Popup Interface**: User-friendly control panel for monitoring and configuration

## Architecture

```
MCP Server (WebSocket/HTTP)
    ↓
Chrome Extension (Background + Content Scripts)
    ↓
Real Browser (Chrome/Edge)
    ↓
Target Websites (with Bot Detection Bypass)
```

## Installation

1. Clone or download this extension
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your extensions list

## Configuration

The extension connects to a local MCP Server by default. You can configure:

- **Server URL**: WebSocket endpoint (default: `ws://localhost:8080/ws`)
- **API Key**: Authentication key for the MCP Server
- **Reconnection Settings**: Retry attempts and delays

### Configuration via Popup

1. Click the extension icon in your browser toolbar
2. Use the popup interface to:
   - View connection status
   - Configure server settings
   - Monitor active commands
   - View real-time logs

### Configuration via Storage API

```javascript
// Set configuration programmatically
chrome.storage.local.set({
  serverUrl: 'ws://your-server:8080/ws',
  apiKey: 'your-api-key'
});
```

## Usage

### Basic Workflow

1. **Start MCP Server**: Ensure your MCP Server is running on the configured port
2. **Load Extension**: Install and enable the extension
3. **Auto-connect**: The extension automatically connects to the MCP Server
4. **Execute Commands**: Commands are sent from the MCP Server and executed in the browser

### Supported Commands

- `navigate`: Navigate to URLs with Cloudflare bypass
- `click`: Click elements with human-like behavior
- `extract`: Extract data from web pages
- `analyze`: Analyze page structure and performance
- `screenshot`: Capture screenshots
- `wait`: Wait for specific conditions

### Example MCP Integration

```typescript
// From your MCP Server
const response = await mcp.call('browser_navigate', {
  url: 'https://example.com',
  bypassCloudflare: true,
  waitUntil: 'load'
});

const data = await mcp.call('browser_extract', {
  selector: '.content',
  includeText: true
});
```

## Stealth Features

### Fingerprint Randomization

- **Navigator Properties**: Randomized user agent, platform, languages
- **Canvas Fingerprint**: Noise injection to prevent tracking
- **WebGL Fingerprint**: Randomized vendor and renderer
- **Audio Context**: Subtle audio fingerprint randomization
- **Font Detection**: Randomized font availability

### Human-like Behavior

- **Mouse Movements**: Bezier curve-based natural movements
- **Click Patterns**: Randomized timing and positioning
- **Typing Simulation**: Variable speed with occasional mistakes
- **Scroll Behavior**: Natural scrolling patterns
- **Page Interaction**: Realistic delays and micro-movements

### Cloudflare Bypass

- **Challenge Detection**: Automatic detection of Cloudflare challenges
- **Wait Mechanisms**: Intelligent waiting for challenge resolution
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Recovery**: Graceful handling of detection failures

## Development

### Project Structure

```
browser-extension/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── popup/                # Popup interface
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── lib/                  # Utility libraries
│   ├── stealth.js       # Stealth mode implementation
│   └── websocket-client.js
├── config/              # Configuration
│   └── config.json
└── icons/               # Extension icons
    ├── icon16.svg
    ├── icon48.svg
    └── icon128.svg
```

### Building from Source

1. Clone the repository
2. No build process required - the extension runs directly from source
3. Load the extension folder in Chrome's developer mode

### Testing

- Use Chrome DevTools to debug the extension
- Monitor WebSocket connections in the Network tab
- Check console logs for debugging information
- Use the popup interface to monitor real-time status

## Security Considerations

- **API Key Storage**: Keys are stored locally in Chrome's storage
- **Permission Scope**: Extension requests minimal necessary permissions
- **Content Security**: Content scripts run in isolated contexts
- **Network Security**: WebSocket connections use localhost by default

## Troubleshooting

### Connection Issues

1. **Check MCP Server**: Ensure the server is running on the correct port
2. **Verify URL**: Check that the WebSocket URL is correct
3. **API Key**: Verify the API key matches the server configuration
4. **Firewall**: Ensure localhost connections are not blocked

### Performance Issues

1. **Memory Usage**: Monitor extension memory usage in Chrome Task Manager
2. **Command Queue**: Check for stuck commands in the popup interface
3. **WebSocket**: Monitor connection stability and reconnection frequency

### Cloudflare Detection

1. **Stealth Mode**: Ensure stealth mode is enabled
2. **Behavior Patterns**: Check that human-like behavior is active
3. **Fingerprint**: Verify fingerprint randomization is working
4. **Retry Logic**: Monitor retry attempts and success rates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the Chrome extension documentation
- Open an issue on the project repository