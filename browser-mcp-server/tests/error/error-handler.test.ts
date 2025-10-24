/**
 * Error Handler Tests
 */

import { ErrorHandler, createDefaultErrorHandlerConfig } from '../../src/error/error-handler';
import { ErrorCode, ErrorCategory } from '../../src/types';
import { Logger } from '../../src/utils/logger';

describe('ErrorHandler', () => {
  let logger: Logger;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    logger = new Logger({ level: 'debug' });
    const config = createDefaultErrorHandlerConfig(logger);
    errorHandler = new ErrorHandler(config);
  });

  describe('categorizeError', () => {
    it('should categorize network errors correctly', () => {
      expect(errorHandler.categorizeError(ErrorCode.NETWORK_ERROR, {})).toBe(ErrorCategory.NETWORK);
      expect(errorHandler.categorizeError(ErrorCode.CLOUDFLARE_BLOCK, {})).toBe(ErrorCategory.NETWORK);
      expect(errorHandler.categorizeError(ErrorCode.NAVIGATION_FAILED, {})).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize selector errors correctly', () => {
      expect(errorHandler.categorizeError(ErrorCode.SELECTOR_NOT_FOUND, {})).toBe(ErrorCategory.SELECTOR);
      expect(errorHandler.categorizeError(ErrorCode.ELEMENT_NOT_FOUND, {})).toBe(ErrorCategory.SELECTOR);
      expect(errorHandler.categorizeError(ErrorCode.ELEMENT_NOT_VISIBLE, {})).toBe(ErrorCategory.SELECTOR);
      expect(errorHandler.categorizeError(ErrorCode.ELEMENT_NOT_INTERACTABLE, {})).toBe(ErrorCategory.SELECTOR);
    });

    it('should categorize permission errors correctly', () => {
      expect(errorHandler.categorizeError(ErrorCode.PERMISSION_DENIED, {})).toBe(ErrorCategory.PERMISSION);
      expect(errorHandler.categorizeError(ErrorCode.TAB_NOT_FOUND, {})).toBe(ErrorCategory.PERMISSION);
    });

    it('should categorize timeout errors correctly', () => {
      expect(errorHandler.categorizeError(ErrorCode.TIMEOUT, {})).toBe(ErrorCategory.TIMEOUT);
    });

    it('should categorize validation errors correctly', () => {
      expect(errorHandler.categorizeError(ErrorCode.INVALID_PARAMS, {})).toBe(ErrorCategory.VALIDATION);
      expect(errorHandler.categorizeError(ErrorCode.INVALID_URL, {})).toBe(ErrorCategory.VALIDATION);
    });

    it('should categorize system errors correctly', () => {
      expect(errorHandler.categorizeError(ErrorCode.STORAGE_ERROR, {})).toBe(ErrorCategory.SYSTEM);
      expect(errorHandler.categorizeError(ErrorCode.COOKIE_ERROR, {})).toBe(ErrorCategory.SYSTEM);
      expect(errorHandler.categorizeError(ErrorCode.SCRIPT_ERROR, {})).toBe(ErrorCategory.SYSTEM);
      expect(errorHandler.categorizeError(ErrorCode.UNKNOWN, {})).toBe(ErrorCategory.SYSTEM);
    });
  });

  describe('isRecoverable', () => {
    it('should identify recoverable errors', () => {
      expect(errorHandler.isRecoverable(ErrorCode.TIMEOUT, {})).toBe(true);
      expect(errorHandler.isRecoverable(ErrorCode.NETWORK_ERROR, {})).toBe(true);
      expect(errorHandler.isRecoverable(ErrorCode.SELECTOR_NOT_FOUND, {})).toBe(true);
      expect(errorHandler.isRecoverable(ErrorCode.ELEMENT_NOT_FOUND, {})).toBe(true);
      expect(errorHandler.isRecoverable(ErrorCode.ELEMENT_NOT_VISIBLE, {})).toBe(true);
      expect(errorHandler.isRecoverable(ErrorCode.ELEMENT_NOT_INTERACTABLE, {})).toBe(true);
      expect(errorHandler.isRecoverable(ErrorCode.NAVIGATION_FAILED, {})).toBe(true);
      expect(errorHandler.isRecoverable(ErrorCode.CLOUDFLARE_BLOCK, {})).toBe(true);
    });

    it('should identify non-recoverable errors', () => {
      expect(errorHandler.isRecoverable(ErrorCode.INVALID_PARAMS, {})).toBe(false);
      expect(errorHandler.isRecoverable(ErrorCode.PERMISSION_DENIED, {})).toBe(false);
      expect(errorHandler.isRecoverable(ErrorCode.INVALID_URL, {})).toBe(false);
      expect(errorHandler.isRecoverable(ErrorCode.STORAGE_ERROR, {})).toBe(false);
      expect(errorHandler.isRecoverable(ErrorCode.COOKIE_ERROR, {})).toBe(false);
      expect(errorHandler.isRecoverable(ErrorCode.SCRIPT_ERROR, {})).toBe(false);
    });
  });

  describe('getRetryStrategy', () => {
    it('should return default strategy for unknown commands', () => {
      const strategy = errorHandler.getRetryStrategy('unknown_command');
      expect(strategy.maxRetries).toBe(3);
      expect(strategy.baseDelay).toBe(1000);
      expect(strategy.maxDelay).toBe(10000);
      expect(strategy.backoffMultiplier).toBe(2);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const strategy = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: []
      };

      const delay1 = errorHandler.calculateRetryDelay(strategy, 0);
      const delay2 = errorHandler.calculateRetryDelay(strategy, 1);
      const delay3 = errorHandler.calculateRetryDelay(strategy, 2);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(2000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(4000);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(8000);
    });

    it('should respect max delay', () => {
      const strategy = {
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: []
      };

      const delay = errorHandler.calculateRetryDelay(strategy, 10);
      expect(delay).toBeLessThanOrEqual(5500); // Allow some jitter
    });
  });

  describe('shouldRetry', () => {
    it('should retry when within limits and error is retryable', () => {
      const strategy = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [ErrorCode.TIMEOUT, ErrorCode.NETWORK_ERROR]
      };

      expect(errorHandler.shouldRetry(ErrorCode.TIMEOUT, 0, strategy)).toBe(true);
      expect(errorHandler.shouldRetry(ErrorCode.NETWORK_ERROR, 1, strategy)).toBe(true);
      expect(errorHandler.shouldRetry(ErrorCode.TIMEOUT, 3, strategy)).toBe(false);
      expect(errorHandler.shouldRetry(ErrorCode.INVALID_PARAMS, 0, strategy)).toBe(false);
    });
  });

  describe('createErrorContext', () => {
    it('should create error context with correct properties', () => {
      const context = errorHandler.createErrorContext('test_command', { param: 'value' }, ErrorCode.TIMEOUT, 1);
      
      expect(context.command).toBe('test_command');
      expect(context.params).toEqual({ param: 'value' });
      expect(context.category).toBe(ErrorCategory.TIMEOUT);
      expect(context.retryCount).toBe(1);
      expect(context.category).toBe(ErrorCategory.TIMEOUT);
      expect(context.recoverable).toBe(true);
      expect(context.timestamp).toBeGreaterThan(0);
    });
  });

  describe('handleError', () => {
    it('should handle retryable errors', async () => {
      const error = new Error('Timeout occurred');
      const result = await errorHandler.handleError(error, 'test_command', { param: 'value' }, 0);
      
      expect(result.shouldRetry).toBe(true);
      expect(result.delay).toBeGreaterThan(0);
      expect(result.fallbackStrategies).toBeDefined();
    });

    it('should handle non-retryable errors', async () => {
      const error = new Error('Invalid parameters');
      const result = await errorHandler.handleError(error, 'test_command', { param: 'value' }, 0);
      
      expect(result.shouldRetry).toBe(false);
      expect(result.fallbackStrategies).toBeDefined();
    });
  });
});
