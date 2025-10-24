/**
 * Background Service Worker
 * Handles WebSocket connection to MCP Server and command execution
 */

// Configuration
const CONFIG = {
  serverUrl: 'ws://localhost:8080/ws',
  reconnectDelay: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
};

// State
let ws = null;
let clientId = null;
let reconnectAttempts = 0;
let heartbeatTimer = null;
let commandQueue = new Map();
let activeTab = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
  loadConfig();
});

// Listen for tab removal to clear activeTab
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTab === tabId) {
    console.log('[Background] Active tab closed, clearing activeTab');
    activeTab = null;
  }
});

// Load configuration from storage
async function loadConfig() {
  const stored = await chrome.storage.local.get(['serverHost', 'serverPort']);
  
  const host = stored.serverHost || 'localhost';
  const port = stored.serverPort || '8080';
  
  CONFIG.serverUrl = `ws://${host}:${port}/ws`;
  
  console.log('[Background] Loaded config:', { host, port });
  
  // Auto-connect on startup
  connectToMCP();
}

// Connect to MCP Server
async function connectToMCP() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log('[Background] Already connected or connecting');
    return;
  }

  try {
    console.log(`[Background] Connecting to ${CONFIG.serverUrl}...`);
    ws = new WebSocket(CONFIG.serverUrl);

    ws.onopen = handleConnectionOpen;
    ws.onmessage = handleMessage;
    ws.onerror = handleError;
    ws.onclose = handleConnectionClose;
  } catch (error) {
    console.error('[Background] Connection error:', error);
    scheduleReconnect();
  }
}

// Handle connection open
function handleConnectionOpen() {
  console.log('[Background] Connected to MCP Server');
  reconnectAttempts = 0;
  
  // Authenticate (no API key required)
  sendMessage({
    type: 'auth',
    apiKey: 'no-auth-required'
  });

  // Start heartbeat
  startHeartbeat();
  
  // Notify popup
  notifyPopup({ type: 'connected' });
}

// Handle incoming messages
async function handleMessage(event) {
  try {
    const message = JSON.parse(event.data);
    console.log('📨 [Background] RECEIVED MESSAGE:', JSON.stringify(message, null, 2));

    // Send log to popup
    sendLogToPopup('📨 RECEIVED MESSAGE', message.type, 'info');

    switch (message.type) {
      case 'auth_success':
        clientId = message.clientId;
        console.log(`[Background] Authenticated as ${clientId}`);
        sendLogToPopup('✅ Authenticated', `Client ID: ${clientId}`, 'success');
        break;

      case 'auth_failed':
        console.error('[Background] Authentication failed:', message.error);
        sendLogToPopup('❌ Auth Failed', message.error, 'error');
        break;

      case 'command':
        // MCP server sends: { type: 'command', params: { type: 'navigate', params: {...} } }
        const commandMessage = {
          id: message.id,
          type: message.params.type,
          params: message.params.params
        };
        sendLogToPopup('🚀 EXECUTING COMMAND', commandMessage.type, 'info');
        await handleCommand(commandMessage);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.warn('[Background] Unknown message type:', message.type);
        sendLogToPopup('⚠️ Unknown Message', message.type, 'warning');
    }
  } catch (error) {
    console.error('[Background] Message handling error:', error);
    sendLogToPopup('❌ Message Error', error.message, 'error');
  }
}

// Handle commands from MCP Server
async function handleCommand(message) {
  const { id, type, params } = message;
  const startTime = Date.now();

  try {
    console.log(`🚀 [Background] EXECUTING COMMAND: ${type}`, JSON.stringify(params, null, 2));
    
    let result;
    switch (type) {
      case 'navigate':
        result = await executeNavigate(params);
        break;

      case 'click':
        result = await executeClick(params);
        break;

      case 'extract':
      case 'extract_filters':
      case 'extract_data':
      case 'extract_table':
      case 'extract_links':
      case 'extract_images':
      case 'extract_text':
      case 'extract_attribute':
        result = await executeExtract(params);
        break;

      case 'analyze':
      case 'analyze_page':
        result = await executeAnalyze(params);
        break;

      case 'screenshot':
        result = await executeScreenshot(params);
        break;

      case 'wait':
        result = await executeWait(params);
        break;

      case 'waitForSelector':
        result = await executeWaitForSelector(params);
        break;

      case 'waitForText':
        result = await executeWaitForText(params);
        break;

      case 'waitForNavigation':
        result = await executeWaitForNavigation(params);
        break;

      case 'waitForNetworkIdle':
        result = await executeWaitForNetworkIdle(params);
        break;

      case 'type':
        result = await executeType(params);
        break;

      case 'select':
        result = await executeSelect(params);
        break;

      case 'check':
        result = await executeCheck(params);
        break;

      case 'hover':
        result = await executeHover(params);
        break;

      case 'scroll':
        result = await executeScroll(params);
        break;

      case 'dragDrop':
        result = await executeDragDrop(params);
        break;

      case 'upload':
        result = await executeUpload(params);
        break;

      case 'evaluate':
        result = await executeEvaluate(params);
        break;

      case 'reload':
        result = await executeReload(params);
        break;

      case 'goBack':
        result = await executeGoBack(params);
        break;

      case 'goForward':
        result = await executeGoForward(params);
        break;

      case 'newTab':
        result = await executeNewTab(params);
        break;

      case 'closeTab':
        result = await executeCloseTab(params);
        break;

      case 'switchTab':
        result = await executeSwitchTab(params);
        break;

      case 'getTabs':
        result = await executeGetTabs(params);
        break;

      case 'getCookies':
        result = await executeGetCookies(params);
        break;

      case 'setCookie':
        result = await executeSetCookie(params);
        break;

      case 'deleteCookie':
        result = await executeDeleteCookie(params);
        break;

      case 'clearCookies':
        result = await executeClearCookies(params);
        break;

      case 'getLocalStorage':
        result = await executeGetLocalStorage(params);
        break;

      case 'setLocalStorage':
        result = await executeSetLocalStorage(params);
        break;

      case 'getSessionStorage':
        result = await executeGetSessionStorage(params);
        break;

      case 'setSessionStorage':
        result = await executeSetSessionStorage(params);
        break;

      case 'clearStorage':
        result = await executeClearStorage(params);
        break;

      case 'evaluate':
      case 'evaluate_js':
        result = await executeEvaluate(params);
        break;

      default:
        throw new Error(`Unknown command type: ${type}`);
    }

    // Send success response
    const response = {
      type: 'response',
      id,
      success: true,
      data: result,
      metadata: {
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        clientId
      }
    };
    console.log('✅ [Background] COMMAND SUCCESS:', JSON.stringify(response, null, 2));
    sendLogToPopup('✅ COMMAND SUCCESS', `${type} completed in ${Date.now() - startTime}ms`, 'success');
    sendMessage(response);
  } catch (error) {
    console.error(`❌ [Background] COMMAND ERROR:`, error);
    
    // Send error response
    const errorResponse = {
      type: 'response',
      id,
      success: false,
      error: {
        code: categorizeError(error),
        message: error.message,
        recoverable: isRecoverable(error),
        stack: error.stack
      },
      metadata: {
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        clientId
      }
    };
    console.log('❌ [Background] SENDING ERROR RESPONSE:', JSON.stringify(errorResponse, null, 2));
    sendLogToPopup('❌ COMMAND ERROR', `${type} failed: ${error.message}`, 'error');
    sendMessage(errorResponse);
  }
}

// Execute navigate command
async function executeNavigate(params) {
  const { url, waitUntil = 'load', timeout = 30000, bypassCloudflare = true } = params;

  // Create or get tab
  if (!activeTab) {
    const tab = await chrome.tabs.create({ url, active: true });
    activeTab = tab.id;
  } else {
    // Check if tab still exists
    try {
      await chrome.tabs.get(activeTab);
      await chrome.tabs.update(activeTab, { url });
    } catch (error) {
      // Tab doesn't exist, create new one
      console.log('[Background] Active tab not found, creating new tab');
      const tab = await chrome.tabs.create({ url, active: true });
      activeTab = tab.id;
    }
  }

  // Wait for page load
  await waitForPageLoad(activeTab, waitUntil, timeout);

  // Check for Cloudflare challenge
  if (bypassCloudflare) {
    const hasChallenge = await checkCloudflareChallenge(activeTab);
    if (hasChallenge) {
      console.log('[Background] Cloudflare challenge detected, waiting...');
      await waitForChallengeResolution(activeTab, timeout);
    }
  }

  // Get page info
  const pageInfo = await getPageInfo(activeTab);
  return pageInfo;
}

// Execute click command
async function executeClick(params) {
  const { selector, humanLike = true, waitForNavigation = false, timeout = 10000 } = params;

  if (!activeTab) {
    throw new Error('No active tab');
  }

  // Send click command to content script
  const result = await chrome.tabs.sendMessage(activeTab, {
    type: 'click',
    selector,
    humanLike,
    timeout
  });

  if (waitForNavigation) {
    await waitForPageLoad(activeTab, 'load', timeout);
  }

  return result;
}

// Execute extract command
async function executeExtract(params) {
  const { 
    selector, 
    extractType = 'generic', 
    includeText = true, 
    includeAttributes = false, 
    maxElements = 100 
  } = params;

  if (!activeTab) {
    throw new Error('No active tab');
  }

  // Send extract command to content script
  const result = await chrome.tabs.sendMessage(activeTab, {
    type: 'extract',
    selector,
    extractType,
    includeText,
    includeAttributes,
    maxElements
  });

  return result;
}

// Execute analyze command
async function executeAnalyze(params) {
  if (!activeTab) {
    throw new Error('No active tab');
  }

  // Send analyze command to content script
  const result = await chrome.tabs.sendMessage(activeTab, {
    type: 'analyze'
  });

  return result;
}

// Execute screenshot command
async function executeScreenshot(params) {
  const { fullPage = false, format = 'png' } = params;

  if (!activeTab) {
    throw new Error('No active tab');
  }

  const screenshot = await chrome.tabs.captureVisibleTab(null, {
    format
  });

  return { screenshot };
}

// Execute wait command
async function executeWait(params) {
  const { type, value, timeout = 30000 } = params;

  switch (type) {
    case 'timeout':
      await sleep(parseInt(value));
      break;

    case 'selector':
      await waitForSelector(activeTab, value, timeout);
      break;

    case 'navigation':
      await waitForPageLoad(activeTab, 'load', timeout);
      break;

    case 'cloudflare':
      await waitForChallengeResolution(activeTab, timeout);
      break;

    default:
      throw new Error(`Unknown wait type: ${type}`);
  }

  return { waited: true };
}

// Helper: Wait for page load
function waitForPageLoad(tabId, waitUntil, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Page load timeout'));
    }, timeout);

    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

// Helper: Check for Cloudflare challenge
async function checkCloudflareChallenge(tabId) {
  try {
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'checkCloudflare'
    });
    return result.detected;
  } catch (error) {
    return false;
  }
}

// Helper: Wait for Cloudflare challenge resolution
async function waitForChallengeResolution(tabId, timeout) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const hasChallenge = await checkCloudflareChallenge(tabId);
    if (!hasChallenge) {
      console.log('[Background] Cloudflare challenge resolved');
      return;
    }
    await sleep(1000);
  }
  
  throw new Error('Cloudflare challenge timeout');
}

// Helper: Wait for selector
async function waitForSelector(tabId, selector, timeout) {
  const result = await chrome.tabs.sendMessage(tabId, {
    type: 'waitForElement',
    selector,
    timeout
  });
  return result;
}

// Helper: Get page info
async function getPageInfo(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return {
    url: tab.url,
    title: tab.title,
    loaded: tab.status === 'complete'
  };
}

// Helper: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Error categorization
function categorizeError(error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout')) return 'TIMEOUT';
  if (message.includes('network')) return 'NETWORK_ERROR';
  if (message.includes('cloudflare')) return 'CLOUDFLARE_BLOCK';
  if (message.includes('selector')) return 'SELECTOR_NOT_FOUND';
  if (message.includes('auth')) return 'AUTHENTICATION_FAILED';
  
  return 'UNKNOWN';
}

// Check if error is recoverable
function isRecoverable(error) {
  const code = categorizeError(error);
  return ['TIMEOUT', 'NETWORK_ERROR', 'SELECTOR_NOT_FOUND'].includes(code);
}

// Send message to MCP Server
function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('📤 [Background] SENDING MESSAGE:', JSON.stringify(message, null, 2));
    ws.send(JSON.stringify(message));
  } else {
    console.error('[Background] WebSocket not connected');
  }
}

// Start heartbeat
function startHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    sendMessage({
      type: 'heartbeat',
      timestamp: Date.now(),
      clientId,
      status: commandQueue.size > 0 ? 'busy' : 'idle',
      activeCommands: commandQueue.size
    });
  }, CONFIG.heartbeatInterval);
}

// Handle connection error
function handleError(error) {
  console.error('[Background] WebSocket error:', error);
}

// Handle connection close
function handleConnectionClose(event) {
  console.log('[Background] Connection closed:', event.code, event.reason);
  
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // Notify popup
  notifyPopup({ type: 'disconnected' });

  // Schedule reconnect
  scheduleReconnect();
}

// Schedule reconnect
function scheduleReconnect() {
  if (reconnectAttempts >= CONFIG.maxReconnectAttempts) {
    console.error('[Background] Max reconnect attempts reached');
    return;
  }

  reconnectAttempts++;
  const delay = CONFIG.reconnectDelay * reconnectAttempts;
  
  console.log(`[Background] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  
  setTimeout(() => {
    connectToMCP();
  }, delay);
}

// Notify popup
function notifyPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup not open, ignore
  });
}

// Send log to popup
function sendLogToPopup(title, message, type = 'info') {
  notifyPopup({
    type: 'log',
    title,
    message,
    logType: type,
    timestamp: new Date().toLocaleTimeString()
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getStatus') {
    sendResponse({
      connected: ws && ws.readyState === WebSocket.OPEN,
      clientId,
      activeTab,
      commandQueue: commandQueue.size
    });
  } else if (message.type === 'updateConfig') {
    handleConfigUpdate(message.config);
    sendResponse({ success: true });
  } else if (message.type === 'connect') {
    connectToMCP();
    sendResponse({ success: true });
  } else if (message.type === 'disconnect') {
    if (ws) {
      ws.close();
    }
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open
});

// Disconnect from MCP Server
function disconnectFromMCP() {
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  
  clientId = null;
  reconnectAttempts = 0;
  
  console.log('[Background] Disconnected from MCP Server');
  notifyPopup({ type: 'disconnected' });
}

// Handle configuration update
async function handleConfigUpdate(config) {
  try {
    const { host, port, key } = config;
    
    // Update CONFIG
    CONFIG.serverUrl = `ws://${host}:${port}/ws`;
    CONFIG.apiKey = key;
    
    console.log('[Background] Config updated:', { host, port, key: key ? '***' : 'none' });
    
    // If connected, disconnect and reconnect with new config
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[Background] Reconnecting with new config...');
      disconnectFromMCP();
      setTimeout(() => connectToMCP(), 1000);
    }
  } catch (error) {
    console.error('[Background] Failed to update config:', error);
  }
}

// ========================================
// DOM MANIPULATION EXECUTE FUNCTIONS
// ========================================

// Execute type command
async function executeType(params) {
  const { selector, text, humanLike, clear, timeout } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'type',
      selector,
      text,
      humanLike,
      clear,
      timeout
    });
    
    return result;
  } catch (error) {
    throw new Error(`Type execution failed: ${error.message}`);
  }
}

// Execute select command
async function executeSelect(params) {
  const { selector, value, text, index, timeout } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'select',
      selector,
      value,
      text,
      index,
      timeout
    });
    
    return result;
  } catch (error) {
    throw new Error(`Select execution failed: ${error.message}`);
  }
}

// Execute check command
async function executeCheck(params) {
  const { selector, checked, timeout } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'check',
      selector,
      checked,
      timeout
    });
    
    return result;
  } catch (error) {
    throw new Error(`Check execution failed: ${error.message}`);
  }
}

// Execute hover command
async function executeHover(params) {
  const { selector, timeout } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'hover',
      selector,
      timeout
    });
    
    return result;
  } catch (error) {
    throw new Error(`Hover execution failed: ${error.message}`);
  }
}

// Execute scroll command
async function executeScroll(params) {
  const { selector, x, y, behavior, block, inline, timeout } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'scroll',
      selector,
      x,
      y,
      behavior,
      block,
      inline,
      timeout
    });
    
    return result;
  } catch (error) {
    throw new Error(`Scroll execution failed: ${error.message}`);
  }
}

// Execute drag drop command
async function executeDragDrop(params) {
  const { sourceSelector, targetSelector, timeout } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'dragDrop',
      sourceSelector,
      targetSelector,
      timeout
    });
    
    return result;
  } catch (error) {
    throw new Error(`DragDrop execution failed: ${error.message}`);
  }
}

// Execute upload command
async function executeUpload(params) {
  const { selector, files, timeout } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'upload',
      selector,
      files,
      timeout
    });
    
    return result;
  } catch (error) {
    throw new Error(`Upload execution failed: ${error.message}`);
  }
}

// Execute evaluate command
// async function executeEvaluate(params) {
//   const { code, timeout } = params;
  
//   try {
//     const result = await chrome.tabs.sendMessage(activeTab, {
//       type: 'evaluate',
//       code,
//       timeout
//     });
    
//     return result;
//   } catch (error) {
//     throw new Error(`Evaluate execution failed: ${error.message}`);
//   }
// }

// ========================================
// NAVIGATION & TAB MANAGEMENT FUNCTIONS
// ========================================

// Execute reload command
async function executeReload(params) {
  const { bypassCache } = params;
  
  try {
    await chrome.tabs.reload(activeTab, { bypassCache });
    
    // Wait for reload to complete
    await new Promise((resolve) => {
      const listener = (tabId, changeInfo) => {
        if (tabId === activeTab && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    
    const tab = await chrome.tabs.get(activeTab);
    return {
      success: true,
      url: tab.url,
      title: tab.title,
      status: tab.status
    };
  } catch (error) {
    throw new Error(`Reload execution failed: ${error.message}`);
  }
}

// Execute go back command
async function executeGoBack(params) {
  try {
    await chrome.tabs.goBack(activeTab);
    
    // Wait for navigation to complete
    await new Promise((resolve) => {
      const listener = (tabId, changeInfo) => {
        if (tabId === activeTab && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    
    const tab = await chrome.tabs.get(activeTab);
    return {
      success: true,
      url: tab.url,
      title: tab.title,
      status: tab.status
    };
  } catch (error) {
    throw new Error(`Go back execution failed: ${error.message}`);
  }
}

// Execute go forward command
async function executeGoForward(params) {
  try {
    await chrome.tabs.goForward(activeTab);
    
    // Wait for navigation to complete
    await new Promise((resolve) => {
      const listener = (tabId, changeInfo) => {
        if (tabId === activeTab && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    
    const tab = await chrome.tabs.get(activeTab);
    return {
      success: true,
      url: tab.url,
      title: tab.title,
      status: tab.status
    };
  } catch (error) {
    throw new Error(`Go forward execution failed: ${error.message}`);
  }
}

// Execute new tab command
async function executeNewTab(params) {
  const { url, active } = params;
  
  try {
    const tab = await chrome.tabs.create({
      url,
      active: active !== false
    });
    
    if (active !== false) {
      activeTab = tab.id;
    }
    
    return {
      success: true,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      active: tab.active
    };
  } catch (error) {
    throw new Error(`New tab execution failed: ${error.message}`);
  }
}

// Execute close tab command
async function executeCloseTab(params) {
  const { tabId } = params;
  const targetTabId = tabId || activeTab;
  
  try {
    await chrome.tabs.remove(targetTabId);
    
    // If we closed the active tab, find a new active tab
    if (targetTabId === activeTab) {
      const tabs = await chrome.tabs.query({});
      if (tabs.length > 0) {
        activeTab = tabs[0].id;
      } else {
        activeTab = null;
      }
    }
    
    return {
      success: true,
      closedTabId: targetTabId,
      newActiveTab: activeTab
    };
  } catch (error) {
    throw new Error(`Close tab execution failed: ${error.message}`);
  }
}

// Execute switch tab command
async function executeSwitchTab(params) {
  const { tabId, index, title } = params;
  
  try {
    let targetTabId;
    
    if (tabId !== undefined) {
      targetTabId = tabId;
    } else if (index !== undefined) {
      const tabs = await chrome.tabs.query({});
      if (index >= 0 && index < tabs.length) {
        targetTabId = tabs[index].id;
      } else {
        throw new Error(`Tab index ${index} out of range`);
      }
    } else if (title) {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.title && t.title.includes(title));
      if (tab) {
        targetTabId = tab.id;
      } else {
        throw new Error(`Tab with title containing "${title}" not found`);
      }
    } else {
      throw new Error('Must specify tabId, index, or title');
    }
    
    await chrome.tabs.update(targetTabId, { active: true });
    activeTab = targetTabId;
    
    const tab = await chrome.tabs.get(targetTabId);
    return {
      success: true,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      active: tab.active
    };
  } catch (error) {
    throw new Error(`Switch tab execution failed: ${error.message}`);
  }
}

// Execute get tabs command
async function executeGetTabs(params) {
  try {
    const tabs = await chrome.tabs.query({});
    
    const tabList = tabs.map(tab => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      active: tab.active,
      status: tab.status,
      index: tab.index,
      windowId: tab.windowId
    }));
    
    return {
      success: true,
      tabs: tabList,
      count: tabList.length,
      activeTab: activeTab
    };
  } catch (error) {
    throw new Error(`Get tabs execution failed: ${error.message}`);
  }
}

// ========================================
// STORAGE & COOKIE MANAGEMENT FUNCTIONS
// ========================================

// Execute get cookies command
async function executeGetCookies(params) {
  const { domain, name } = params;
  
  try {
    const cookies = await chrome.cookies.getAll({ domain, name });
    
    const cookieList = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate,
      storeId: cookie.storeId
    }));
    
    return {
      success: true,
      cookies: cookieList,
      count: cookieList.length,
      domain: domain || 'all'
    };
  } catch (error) {
    throw new Error(`Get cookies execution failed: ${error.message}`);
  }
}

// Execute set cookie command
async function executeSetCookie(params) {
  const { name, value, domain, path, secure, httpOnly, expirationDate } = params;
  
  try {
    const cookieDetails = {
      name,
      value,
      domain: domain || undefined,
      path: path || '/',
      secure: secure || false,
      httpOnly: httpOnly || false,
      expirationDate: expirationDate || undefined
    };
    
    const cookie = await chrome.cookies.set(cookieDetails);
    
    return {
      success: true,
      cookie: {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate
      }
    };
  } catch (error) {
    throw new Error(`Set cookie execution failed: ${error.message}`);
  }
}

// Execute delete cookie command
async function executeDeleteCookie(params) {
  const { name, domain, path } = params;
  
  try {
    const url = domain ? `http${domain.startsWith('.') ? 's' : ''}://${domain}${path || '/'}` : undefined;
    
    await chrome.cookies.remove({
      name,
      url
    });
    
    return {
      success: true,
      deletedCookie: {
        name,
        domain: domain || 'all',
        path: path || '/'
      }
    };
  } catch (error) {
    throw new Error(`Delete cookie execution failed: ${error.message}`);
  }
}

// Execute clear cookies command
async function executeClearCookies(params) {
  const { domain } = params;
  
  try {
    const cookies = await chrome.cookies.getAll({ domain });
    
    for (const cookie of cookies) {
      await chrome.cookies.remove({
        url: `http${cookie.domain.startsWith('.') ? 's' : ''}://${cookie.domain}${cookie.path}`,
        name: cookie.name
      });
    }
    
    return {
      success: true,
      clearedCount: cookies.length,
      domain: domain || 'all'
    };
  } catch (error) {
    throw new Error(`Clear cookies execution failed: ${error.message}`);
  }
}

// Execute get localStorage command
async function executeGetLocalStorage(params) {
  const { key } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'getLocalStorage',
      key
    });
    
    return result;
  } catch (error) {
    throw new Error(`Get localStorage execution failed: ${error.message}`);
  }
}

// Execute set localStorage command
async function executeSetLocalStorage(params) {
  const { key, value } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'setLocalStorage',
      key,
      value
    });
    
    return result;
  } catch (error) {
    throw new Error(`Set localStorage execution failed: ${error.message}`);
  }
}

// Execute get sessionStorage command
async function executeGetSessionStorage(params) {
  const { key } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'getSessionStorage',
      key
    });
    
    return result;
  } catch (error) {
    throw new Error(`Get sessionStorage execution failed: ${error.message}`);
  }
}

// Execute set sessionStorage command
async function executeSetSessionStorage(params) {
  const { key, value } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'setSessionStorage',
      key,
      value
    });
    
    return result;
  } catch (error) {
    throw new Error(`Set sessionStorage execution failed: ${error.message}`);
  }
}

// Execute clear storage command
async function executeClearStorage(params) {
  const { storageType } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'clearStorage',
      storageType
    });
    
    return result;
  } catch (error) {
    throw new Error(`Clear storage execution failed: ${error.message}`);
  }
}

// ========================================
// ENHANCED WAIT STRATEGIES
// ========================================

// Execute wait for selector command
async function executeWaitForSelector(params) {
  const { selector, timeout, visible, hidden } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'waitForSelector',
      selector,
      timeout,
      visible,
      hidden
    });
    
    return result;
  } catch (error) {
    throw new Error(`Wait for selector execution failed: ${error.message}`);
  }
}

// Execute wait for text command
async function executeWaitForText(params) {
  const { text, selector, timeout, exact } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'waitForText',
      text,
      selector,
      timeout,
      exact
    });
    
    return result;
  } catch (error) {
    throw new Error(`Wait for text execution failed: ${error.message}`);
  }
}

// Execute wait for navigation command
async function executeWaitForNavigation(params) {
  const { timeout, waitUntil } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'waitForNavigation',
      timeout,
      waitUntil
    });
    
    return result;
  } catch (error) {
    throw new Error(`Wait for navigation execution failed: ${error.message}`);
  }
}

// Execute wait for network idle command
async function executeWaitForNetworkIdle(params) {
  const { timeout, idleTime } = params;
  
  try {
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'waitForNetworkIdle',
      timeout,
      idleTime
    });
    
    return result;
  } catch (error) {
    throw new Error(`Wait for network idle execution failed: ${error.message}`);
  }
}

// Execute evaluate JavaScript command
async function executeEvaluate(params) {
  const { code } = params;

  if (!activeTab) {
    throw new Error('No active tab');
  }

  try {
    // Send evaluate command to content script
    const result = await chrome.tabs.sendMessage(activeTab, {
      type: 'evaluate',
      code
    });

    return result;
  } catch (error) {
    throw new Error(`Evaluate execution failed: ${error.message}`);
  }
}

console.log('[Background] Service worker initialized');

