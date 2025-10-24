/**
 * Popup UI Script
 * Handles UI interactions and displays extension status
 */

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const clientId = document.getElementById('clientId');
const activeTab = document.getElementById('activeTab');
const commandQueue = document.getElementById('commandQueue');
const logContainer = document.getElementById('logContainer');
const serverUrl = document.getElementById('serverUrl');

// Config elements
const serverHost = document.getElementById('serverHost');
const serverPort = document.getElementById('serverPort');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const resetConfigBtn = document.getElementById('resetConfigBtn');

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');

const testUrl = document.getElementById('testUrl');
const navigateBtn = document.getElementById('navigateBtn');
const testSelector = document.getElementById('testSelector');
const clickBtn = document.getElementById('clickBtn');
const extractBtn = document.getElementById('extractBtn');
const analyzeBtn = document.getElementById('analyzeBtn');

// Initialize
init();

async function init() {
  // Load config and status
  await loadConfig();
  await updateStatus();

  // Set up event listeners
  saveConfigBtn.addEventListener('click', handleSaveConfig);
  resetConfigBtn.addEventListener('click', handleResetConfig);
  connectBtn.addEventListener('click', handleConnect);
  disconnectBtn.addEventListener('click', handleDisconnect);
  clearLogsBtn.addEventListener('click', handleClearLogs);
  navigateBtn.addEventListener('click', handleNavigate);
  clickBtn.addEventListener('click', handleClick);
  extractBtn.addEventListener('click', handleExtract);
  analyzeBtn.addEventListener('click', handleAnalyze);

  // Update server URL when config changes
  serverHost.addEventListener('input', updateServerUrl);
  serverPort.addEventListener('input', updateServerUrl);

  // Listen for status updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'connected') {
      updateStatus();
      addLog('Connected to MCP Server', 'success');
    } else if (message.type === 'disconnected') {
      updateStatus();
      addLog('Disconnected from MCP Server', 'error');
    } else if (message.type === 'log') {
      addLog(`${message.title}: ${message.message}`, message.logType);
    }
  });

  // Update status every 2 seconds
  setInterval(updateStatus, 2000);
}

// Load configuration
async function loadConfig() {
  try {
    const config = await chrome.storage.local.get(['serverHost', 'serverPort']);
    
    serverHost.value = config.serverHost || 'localhost';
    serverPort.value = config.serverPort || '8080';
    
    updateServerUrl();
  } catch (error) {
    console.error('Failed to load config:', error);
    addLog('Failed to load configuration', 'error');
  }
}

// Save configuration
async function handleSaveConfig() {
  try {
    const host = serverHost.value.trim();
    const port = serverPort.value.trim();
    
    if (!host || !port) {
      addLog('Host and port are required', 'error');
      return;
    }
    
    // Validate port
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      addLog('Port must be a number between 1 and 65535', 'error');
      return;
    }
    
    // Save to storage
    await chrome.storage.local.set({
      serverHost: host,
      serverPort: port
    });
    
    // Update server URL
    updateServerUrl();
    
    // Send config update to background script
    await chrome.runtime.sendMessage({
      type: 'updateConfig',
      config: { host, port, key }
    });
    
    addLog('Configuration saved', 'success');
  } catch (error) {
    console.error('Failed to save config:', error);
    addLog('Failed to save configuration', 'error');
  }
}

// Reset configuration
async function handleResetConfig() {
  try {
    serverHost.value = 'localhost';
    serverPort.value = '8080';
    
    updateServerUrl();
    
    // Save default config
    await chrome.storage.local.set({
      serverHost: 'localhost',
      serverPort: '8080'
    });
    
    // Send config update to background script
    await chrome.runtime.sendMessage({
      type: 'updateConfig',
      config: { host: 'localhost', port: '8080' }
    });
    
    addLog('Configuration reset to defaults', 'info');
  } catch (error) {
    console.error('Failed to reset config:', error);
    addLog('Failed to reset configuration', 'error');
  }
}

// Update server URL display
function updateServerUrl() {
  const host = serverHost.value.trim() || 'localhost';
  const port = serverPort.value.trim() || '8080';
  serverUrl.textContent = `ws://${host}:${port}/ws`;
}

// Update status
async function updateStatus() {
  try {
    const status = await chrome.runtime.sendMessage({ type: 'getStatus' });
    
    if (status.connected) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Connected';
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
    } else {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Disconnected';
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
    }

    clientId.textContent = status.clientId || '-';
    activeTab.textContent = status.activeTab || '-';
    commandQueue.textContent = status.commandQueue || '0';
  } catch (error) {
    console.error('Failed to get status:', error);
  }
}

// Handle connect
async function handleConnect() {
  try {
    await chrome.runtime.sendMessage({ type: 'connect' });
    addLog('Connecting to MCP Server...', 'info');
  } catch (error) {
    addLog(`Connection failed: ${error.message}`, 'error');
  }
}

// Handle disconnect
async function handleDisconnect() {
  try {
    await chrome.runtime.sendMessage({ type: 'disconnect' });
    addLog('Disconnected', 'info');
  } catch (error) {
    addLog(`Disconnect failed: ${error.message}`, 'error');
  }
}

// Handle clear logs
function handleClearLogs() {
  logContainer.innerHTML = '';
  addLog('Logs cleared', 'info');
}

// Handle navigate
async function handleNavigate() {
  const url = testUrl.value.trim();
  if (!url) {
    addLog('Please enter a URL', 'error');
    return;
  }

  try {
    addLog(`Navigating to ${url}...`, 'info');
    
    // This would be sent through the MCP Server in production
    // For now, just open a new tab
    await chrome.tabs.create({ url, active: true });
    
    addLog('Navigation started', 'success');
  } catch (error) {
    addLog(`Navigation failed: ${error.message}`, 'error');
  }
}

// Handle click
async function handleClick() {
  const selector = testSelector.value.trim();
  if (!selector) {
    addLog('Please enter a selector', 'error');
    return;
  }

  try {
    addLog(`Clicking ${selector}...`, 'info');
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'click',
      selector,
      humanLike: true,
      timeout: 10000
    });
    
    addLog('Click successful', 'success');
  } catch (error) {
    addLog(`Click failed: ${error.message}`, 'error');
  }
}

// Handle extract
async function handleExtract() {
  try {
    addLog('Extracting filters...', 'info');
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'extract',
      category: 'current',
      includeHidden: false
    });
    
    addLog(`Extracted ${result.filters.length} filters`, 'success');
    console.log('Filters:', result.filters);
  } catch (error) {
    addLog(`Extract failed: ${error.message}`, 'error');
  }
}

// Handle analyze
async function handleAnalyze() {
  try {
    addLog('Analyzing page...', 'info');
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'analyze'
    });
    
    addLog(`Page analyzed: ${result.structure.forms} forms, ${result.structure.inputs} inputs`, 'success');
    console.log('Analysis:', result);
  } catch (error) {
    addLog(`Analyze failed: ${error.message}`, 'error');
  }
}

// Add log entry
function addLog(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = new Date().toLocaleTimeString();
  
  const msg = document.createElement('span');
  msg.className = 'log-message';
  msg.textContent = message;
  
  entry.appendChild(time);
  entry.appendChild(msg);
  
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

console.log('[Popup] Initialized');


