/**
 * Configuration Loader
 * Loads and validates configuration from files
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ServerConfig {
  server: {
    port: number;
    host: string;
    secure: boolean;
    maxConnections: number;
    corsOrigins: string[];
  };
  websocket: {
    heartbeatInterval: number;
    connectionTimeout: number;
    maxMessageSize: number;
    pingInterval: number;
  };
  authentication: {
    enabled: boolean;
    apiKeyLength: number;
    tokenExpiration: number;
  };
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  cloudflare: {
    maxRetries: number;
    retryDelay: number;
    challengeTimeout: number;
    bypassEnabled: boolean;
  };
  extraction: {
    pageLoadTimeout: number;
    elementWaitTimeout: number;
    maxConcurrentExtractions: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  logging: {
    level: string;
    file?: string;
    maxSize?: number;
    maxFiles?: number;
  };
}

export function loadConfig(): ServerConfig {
  const configPath = path.join(__dirname, '../../config/server.config.json');
  
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Validate required fields
    validateConfig(config);
    
    return config;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
  }
}

function validateConfig(config: any): void {
  const required = [
    'server.port',
    'server.host',
    'websocket.heartbeatInterval',
    'authentication.enabled',
    'rateLimit.enabled',
    'logging.level'
  ];

  for (const field of required) {
    const value = getNestedValue(config, field);
    if (value === undefined || value === null) {
      throw new Error(`Missing required configuration field: ${field}`);
    }
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

