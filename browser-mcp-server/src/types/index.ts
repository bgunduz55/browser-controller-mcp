/**
 * TypeScript Type Definitions
 */

// Error codes
export enum ErrorCode {
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CLOUDFLARE_BLOCK = 'CLOUDFLARE_BLOCK',
  SELECTOR_NOT_FOUND = 'SELECTOR_NOT_FOUND',
  INVALID_PARAMS = 'INVALID_PARAMS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  COMMAND_FAILED = 'COMMAND_FAILED',
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  ELEMENT_NOT_VISIBLE = 'ELEMENT_NOT_VISIBLE',
  ELEMENT_NOT_INTERACTABLE = 'ELEMENT_NOT_INTERACTABLE',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_URL = 'INVALID_URL',
  TAB_NOT_FOUND = 'TAB_NOT_FOUND',
  STORAGE_ERROR = 'STORAGE_ERROR',
  COOKIE_ERROR = 'COOKIE_ERROR',
  SCRIPT_ERROR = 'SCRIPT_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// Error categories
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  SELECTOR = 'SELECTOR',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM'
}

// Retry strategy
export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}

// Error context
export interface ErrorContext {
  command: string;
  params: any;
  timestamp: number;
  retryCount: number;
  category: ErrorCategory;
  recoverable: boolean;
  fallbackStrategies?: string[];
}

// Command types
export type CommandType = 'navigate' | 'click' | 'extract' | 'extract_data' | 'extract_table' | 'extract_links' | 'extract_images' | 'extract_text' | 'extract_attribute' | 'type' | 'select' | 'check' | 'hover' | 'scroll' | 'dragDrop' | 'upload' | 'evaluate' | 'reload' | 'goBack' | 'goForward' | 'newTab' | 'closeTab' | 'switchTab' | 'getTabs' | 'getCookies' | 'setCookie' | 'deleteCookie' | 'clearCookies' | 'getLocalStorage' | 'setLocalStorage' | 'getSessionStorage' | 'setSessionStorage' | 'clearStorage' | 'wait' | 'waitForSelector' | 'waitForText' | 'waitForNavigation' | 'waitForNetworkIdle' | 'analyze' | 'screenshot';

// Priority levels
export type Priority = 'high' | 'normal' | 'low';

// Client status
export type ClientStatus = 'connected' | 'busy' | 'idle';

// MCP Command
export interface MCPCommand {
  id: string;
  type: CommandType;
  params: any;
  timestamp: number;
  timeout?: number; // ms, default: 30000
  retryCount?: number; // default: 0
  maxRetries?: number; // default: 3
  priority?: Priority; // default: 'normal'
  clientId?: string;
}

// MCP Response
export interface MCPResponse {
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
    duration: number; // ms
    retries: number;
    timestamp: number;
    clientId: string;
  };
}

// Heartbeat
export interface Heartbeat {
  type: 'heartbeat';
  timestamp: number;
  clientId: string;
  status: ClientStatus;
  activeCommands: number;
  memoryUsage?: number;
}

// Client state
export interface ClientState {
  id: string;
  connected: boolean;
  connectedAt: number;
  lastHeartbeat: number;
  lastActivity: number;
  activeCommands: Map<string, MCPCommand>;
  commandHistory: MCPCommand[];
  tabId?: number;
  apiKey: string;
  rateLimit: {
    requests: number;
    windowStart: number;
  };
}

// Server configuration
export interface ServerConfig {
  port: number;
  host: string;
  secure: boolean;
  maxConnections: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  maxMessageSize: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

// API Key
export interface ApiKey {
  key: string;
  clientId: string;
  permissions: string[];
  createdAt: number;
  expiresAt?: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

// Filter types
export type FilterType = 'NUMBER' | 'ENUM' | 'BOOLEAN' | 'DATE' | 'STRING';

// Filter
export interface Filter {
  name: string;
  label: string;
  type: FilterType;
  selector: string;
  values?: any;
  rules: {
    min?: number;
    max?: number;
    enumValues?: string[];
    isRequired: boolean;
    isUnique: boolean;
  };
}

// Filter data
export interface FilterData {
  category: string;
  filters: Filter[];
  metadata: {
    extractedAt: number;
    pageUrl: string;
    totalFilters: number;
  };
}

// Page analysis
export interface PageAnalysis {
  url: string;
  title: string;
  structure: {
    forms: number;
    inputs: number;
    selects: number;
    buttons: number;
  };
  performance: {
    loadTime: number;
    domReady: number;
    resourcesLoaded: number;
  };
  cloudflare: {
    detected: boolean;
    challengeType?: string;
  };
}

// Navigation options
export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  bypassCloudflare?: boolean;
}

// Click options
export interface ClickOptions {
  humanLike?: boolean;
  waitForNavigation?: boolean;
  timeout?: number;
}

// Extract options
export interface ExtractOptions {
  includeHidden?: boolean;
  depth?: number;
}

// Migration config
export interface MigrationConfig {
  startId: number;
  categoryId: number;
  noticeTypes: ('SELL' | 'BUY' | 'SWAP')[];
}

