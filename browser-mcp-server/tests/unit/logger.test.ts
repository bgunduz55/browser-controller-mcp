/**
 * Logger Unit Tests
 */

import { Logger, LogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log debug messages when level is debug', () => {
    const logger = new Logger({ level: 'debug' });
    logger.debug('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('should not log debug messages when level is info', () => {
    const logger = new Logger({ level: 'info' });
    logger.debug('Test message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('should log info messages', () => {
    const logger = new Logger({ level: 'info' });
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('should log error messages', () => {
    const logger = new Logger({ level: 'error' });
    logger.error('Test error');
    expect(consoleSpy).toHaveBeenCalled();
  });
});
