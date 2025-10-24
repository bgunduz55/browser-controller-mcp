/**
 * Error Handler
 * Comprehensive error handling with categorization, retry logic, and fallback strategies
 */

import { ErrorCode, ErrorCategory, RetryStrategy, ErrorContext } from '../types';
import { Logger } from '../utils/logger';

export interface ErrorHandlerConfig {
  defaultRetryStrategy: RetryStrategy;
  commandRetryStrategies: Map<string, RetryStrategy>;
  fallbackStrategies: Map<ErrorCode, string[]>;
  logger: Logger;
}

export class ErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config: ErrorHandlerConfig) {
    this.config = config;
  }

  /**
   * Categorize error based on error code and context
   */
  categorizeError(errorCode: ErrorCode, context: any): ErrorCategory {
    switch (errorCode) {
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.CLOUDFLARE_BLOCK:
      case ErrorCode.NAVIGATION_FAILED:
        return ErrorCategory.NETWORK;
      
      case ErrorCode.SELECTOR_NOT_FOUND:
      case ErrorCode.ELEMENT_NOT_FOUND:
      case ErrorCode.ELEMENT_NOT_VISIBLE:
      case ErrorCode.ELEMENT_NOT_INTERACTABLE:
        return ErrorCategory.SELECTOR;
      
      case ErrorCode.PERMISSION_DENIED:
      case ErrorCode.TAB_NOT_FOUND:
        return ErrorCategory.PERMISSION;
      
      case ErrorCode.TIMEOUT:
        return ErrorCategory.TIMEOUT;
      
      case ErrorCode.INVALID_PARAMS:
      case ErrorCode.INVALID_URL:
        return ErrorCategory.VALIDATION;
      
      case ErrorCode.STORAGE_ERROR:
      case ErrorCode.COOKIE_ERROR:
      case ErrorCode.SCRIPT_ERROR:
      case ErrorCode.UNKNOWN:
        return ErrorCategory.SYSTEM;
      
      default:
        return ErrorCategory.SYSTEM;
    }
  }

  /**
   * Determine if error is recoverable
   */
  isRecoverable(errorCode: ErrorCode, context: any): boolean {
    const recoverableErrors = [
      ErrorCode.TIMEOUT,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.SELECTOR_NOT_FOUND,
      ErrorCode.ELEMENT_NOT_FOUND,
      ErrorCode.ELEMENT_NOT_VISIBLE,
      ErrorCode.ELEMENT_NOT_INTERACTABLE,
      ErrorCode.NAVIGATION_FAILED,
      ErrorCode.CLOUDFLARE_BLOCK
    ];

    return recoverableErrors.includes(errorCode);
  }

  /**
   * Get retry strategy for command
   */
  getRetryStrategy(command: string): RetryStrategy {
    return this.config.commandRetryStrategies.get(command) || this.config.defaultRetryStrategy;
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  calculateRetryDelay(strategy: RetryStrategy, retryCount: number): number {
    const delay = Math.min(
      strategy.baseDelay * Math.pow(strategy.backoffMultiplier, retryCount),
      strategy.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(errorCode: ErrorCode, retryCount: number, strategy: RetryStrategy): boolean {
    if (retryCount >= strategy.maxRetries) {
      return false;
    }

    return strategy.retryableErrors.includes(errorCode);
  }

  /**
   * Get fallback strategies for error
   */
  getFallbackStrategies(errorCode: ErrorCode): string[] {
    return this.config.fallbackStrategies.get(errorCode) || [];
  }

  /**
   * Create error context
   */
  createErrorContext(command: string, params: any, errorCode: ErrorCode, retryCount: number = 0): ErrorContext {
    const category = this.categorizeError(errorCode, params);
    const recoverable = this.isRecoverable(errorCode, params);
    const fallbackStrategies = this.getFallbackStrategies(errorCode);

    return {
      command,
      params,
      timestamp: Date.now(),
      retryCount,
      category,
      recoverable,
      fallbackStrategies
    };
  }

  /**
   * Handle error with retry logic
   */
  async handleError(
    error: Error,
    command: string,
    params: any,
    retryCount: number = 0
  ): Promise<{ shouldRetry: boolean; delay?: number; fallbackStrategies?: string[] }> {
    const errorCode = this.extractErrorCode(error);
    const strategy = this.getRetryStrategy(command);
    const context = this.createErrorContext(command, params, errorCode, retryCount);

    this.config.logger.error('Error occurred', {
      command,
      errorCode,
      category: context.category,
      retryCount,
      recoverable: context.recoverable,
      error: error.message
    });

    const shouldRetry = this.shouldRetry(errorCode, retryCount, strategy);
    
    if (shouldRetry) {
      const delay = this.calculateRetryDelay(strategy, retryCount);
      this.config.logger.info('Retrying command', {
        command,
        retryCount: retryCount + 1,
        delay,
        errorCode
      });
      
      return {
        shouldRetry: true,
        delay,
        fallbackStrategies: context.fallbackStrategies
      };
    }

    return {
      shouldRetry: false,
      fallbackStrategies: context.fallbackStrategies
    };
  }

  /**
   * Extract error code from error message
   */
  private extractErrorCode(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return ErrorCode.TIMEOUT;
    if (message.includes('network')) return ErrorCode.NETWORK_ERROR;
    if (message.includes('cloudflare')) return ErrorCode.CLOUDFLARE_BLOCK;
    if (message.includes('selector') || message.includes('not found')) return ErrorCode.SELECTOR_NOT_FOUND;
    if (message.includes('element not visible')) return ErrorCode.ELEMENT_NOT_VISIBLE;
    if (message.includes('element not interactable')) return ErrorCode.ELEMENT_NOT_INTERACTABLE;
    if (message.includes('navigation')) return ErrorCode.NAVIGATION_FAILED;
    if (message.includes('permission')) return ErrorCode.PERMISSION_DENIED;
    if (message.includes('invalid url')) return ErrorCode.INVALID_URL;
    if (message.includes('tab not found')) return ErrorCode.TAB_NOT_FOUND;
    if (message.includes('storage')) return ErrorCode.STORAGE_ERROR;
    if (message.includes('cookie')) return ErrorCode.COOKIE_ERROR;
    if (message.includes('script')) return ErrorCode.SCRIPT_ERROR;

    return ErrorCode.UNKNOWN;
  }
}

/**
 * Default error handler configuration
 */
export function createDefaultErrorHandlerConfig(logger: Logger): ErrorHandlerConfig {
  const defaultRetryStrategy: RetryStrategy = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorCode.TIMEOUT,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.SELECTOR_NOT_FOUND,
      ErrorCode.ELEMENT_NOT_FOUND,
      ErrorCode.ELEMENT_NOT_VISIBLE,
      ErrorCode.ELEMENT_NOT_INTERACTABLE,
      ErrorCode.NAVIGATION_FAILED,
      ErrorCode.CLOUDFLARE_BLOCK
    ]
  };

  const commandRetryStrategies = new Map<string, RetryStrategy>([
    ['navigate', {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      retryableErrors: [
        ErrorCode.NETWORK_ERROR,
        ErrorCode.CLOUDFLARE_BLOCK,
        ErrorCode.NAVIGATION_FAILED,
        ErrorCode.TIMEOUT
      ]
    }],
    ['click', {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 3000,
      backoffMultiplier: 1.5,
      retryableErrors: [
        ErrorCode.SELECTOR_NOT_FOUND,
        ErrorCode.ELEMENT_NOT_FOUND,
        ErrorCode.ELEMENT_NOT_VISIBLE,
        ErrorCode.ELEMENT_NOT_INTERACTABLE
      ]
    }],
    ['extract', {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryableErrors: [
        ErrorCode.SELECTOR_NOT_FOUND,
        ErrorCode.ELEMENT_NOT_FOUND,
        ErrorCode.TIMEOUT
      ]
    }]
  ]);

  const fallbackStrategies = new Map<ErrorCode, string[]>([
    [ErrorCode.SELECTOR_NOT_FOUND, ['try_alternative_selectors', 'wait_for_element', 'scroll_to_element']],
    [ErrorCode.ELEMENT_NOT_VISIBLE, ['scroll_to_element', 'wait_for_visibility', 'try_alternative_selectors']],
    [ErrorCode.ELEMENT_NOT_INTERACTABLE, ['wait_for_interactable', 'scroll_to_element', 'try_alternative_selectors']],
    [ErrorCode.CLOUDFLARE_BLOCK, ['wait_for_cloudflare', 'retry_with_delay', 'try_alternative_approach']],
    [ErrorCode.NAVIGATION_FAILED, ['retry_navigation', 'check_url_validity', 'try_alternative_url']],
    [ErrorCode.TIMEOUT, ['increase_timeout', 'retry_with_delay', 'check_network_connection']]
  ]);

  return {
    defaultRetryStrategy,
    commandRetryStrategies,
    fallbackStrategies,
    logger
  };
}
