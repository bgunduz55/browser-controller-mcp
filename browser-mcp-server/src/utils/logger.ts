/**
 * Logger Utility
 * Structured logging with different levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogConfig {
  level: string;
  file?: string;
  maxSize?: number;
  maxFiles?: number;
}

export class Logger {
  private level: LogLevel;
  private config: LogConfig;

  constructor(config: LogConfig) {
    this.config = config;
    this.level = this.parseLevel(config.level);
  }

  private parseLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  debug(message: string, meta?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, meta);
    }
  }

  info(message: string, meta?: any): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, meta);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, meta);
    }
  }

  error(message: string, meta?: any): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, meta);
    }
  }

  private log(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta })
    };

    // Console output
    console.log(JSON.stringify(logEntry));

    // TODO: File output if configured
    if (this.config.file) {
      // Implement file logging
    }
  }
}

