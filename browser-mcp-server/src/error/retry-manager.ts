/**
 * Retry Manager
 * Handles retry logic with exponential backoff and circuit breaker pattern
 */

import { ErrorHandler, ErrorHandlerConfig } from './error-handler';
import { ErrorCode } from '../types';
import { Logger } from '../utils/logger';

export interface RetryManagerConfig {
  errorHandler: ErrorHandler;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  logger: Logger;
}

export class RetryManager {
  private config: RetryManagerConfig;
  private circuitBreakerState: Map<string, {
    failures: number;
    lastFailureTime: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }> = new Map();

  constructor(config: RetryManagerConfig) {
    this.config = config;
  }

  /**
   * Execute command with retry logic
   */
  async executeWithRetry<T>(
    command: string,
    params: any,
    executor: () => Promise<T>
  ): Promise<T> {
    const circuitBreakerKey = `${command}_${JSON.stringify(params)}`;
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      throw new Error(`Circuit breaker is open for command: ${command}`);
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    while (true) {
      try {
        const result = await executor();
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(circuitBreakerKey);
        
        this.config.logger.info('Command executed successfully', {
          command,
          retryCount,
          circuitBreakerKey
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const errorResult = await this.config.errorHandler.handleError(
          lastError,
          command,
          params,
          retryCount
        );

        if (!errorResult.shouldRetry) {
          // Record failure for circuit breaker
          this.recordFailure(circuitBreakerKey);
          
          this.config.logger.error('Command failed permanently', {
            command,
            retryCount,
            error: lastError.message,
            fallbackStrategies: errorResult.fallbackStrategies
          });

          throw lastError;
        }

        // Wait before retry
        if (errorResult.delay) {
          this.config.logger.info('Waiting before retry', {
            command,
            retryCount: retryCount + 1,
            delay: errorResult.delay
          });
          
          await this.sleep(errorResult.delay);
        }

        retryCount++;
      }
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakerState.get(key);
    if (!state) return false;

    if (state.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - state.lastFailureTime > this.config.circuitBreakerTimeout) {
        state.state = 'HALF_OPEN';
        this.config.logger.info('Circuit breaker moved to HALF_OPEN', { key });
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(key: string): void {
    const state = this.circuitBreakerState.get(key) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const
    };

    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.failures >= this.config.circuitBreakerThreshold) {
      state.state = 'OPEN';
      this.config.logger.warn('Circuit breaker opened', {
        key,
        failures: state.failures,
        threshold: this.config.circuitBreakerThreshold
      });
    }

    this.circuitBreakerState.set(key, state);
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(key: string): void {
    const state = this.circuitBreakerState.get(key);
    if (state) {
      state.failures = 0;
      state.state = 'CLOSED';
      this.config.logger.info('Circuit breaker reset', { key });
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(key: string): {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    lastFailureTime: number;
  } | null {
    const state = this.circuitBreakerState.get(key);
    if (!state) return null;

    return {
      state: state.state,
      failures: state.failures,
      lastFailureTime: state.lastFailureTime
    };
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitBreakerStatuses(): Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    lastFailureTime: number;
  }> {
    const statuses = new Map();
    for (const [key, state] of this.circuitBreakerState) {
      statuses.set(key, {
        state: state.state,
        failures: state.failures,
        lastFailureTime: state.lastFailureTime
      });
    }
    return statuses;
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakerState.clear();
    this.config.logger.info('All circuit breakers reset');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create default retry manager
 */
export function createRetryManager(logger: Logger): RetryManager {
  const errorHandlerConfig = {
    defaultRetryStrategy: {
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
    },
    commandRetryStrategies: new Map(),
    fallbackStrategies: new Map(),
    logger
  };

  const errorHandler = new ErrorHandler(errorHandlerConfig);
  
  return new RetryManager({
    errorHandler,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000, // 1 minute
    logger
  });
}
