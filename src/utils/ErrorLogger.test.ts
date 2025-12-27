import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorLogger, ErrorSeverity, ErrorCategory } from './ErrorLogger.js';
import { promises as fs } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    appendFile: vi.fn()
  }
}));

describe('ErrorLogger', () => {
  let logger: ErrorLogger;
  let mockAppendFile: any;

  beforeEach(() => {
    logger = new ErrorLogger();
    mockAppendFile = vi.mocked(fs.appendFile);
    mockAppendFile.mockClear();
    
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('logError', () => {
    it('should log error with timestamp and context', async () => {
      const context = { company: 'TestCorp', source: 'test-api' };
      
      await logger.logError(
        ErrorSeverity.ERROR,
        ErrorCategory.NETWORK,
        'Network timeout',
        context
      );

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.severity).toBe(ErrorSeverity.ERROR);
      expect(entry.category).toBe(ErrorCategory.NETWORK);
      expect(entry.message).toBe('Network timeout');
      expect(entry.context.company).toBe('TestCorp');
      expect(entry.context.source).toBe('test-api');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should classify network errors as retryable', async () => {
      await logger.logNetworkError('Connection failed', { company: 'TestCorp' });
      
      const entries = logger.getLogEntries();
      expect(entries[0].retryable).toBe(true);
    });

    it('should classify configuration errors as non-retryable', async () => {
      await logger.logConfigurationError('Invalid API key', { source: 'test-api' });
      
      const entries = logger.getLogEntries();
      expect(entries[0].retryable).toBe(false);
    });

    it('should classify blocked errors as non-retryable', async () => {
      await logger.logBlockedError('Access denied', { source: 'test-api' });
      
      const entries = logger.getLogEntries();
      expect(entries[0].retryable).toBe(false);
    });
  });

  describe('filtering methods', () => {
    beforeEach(async () => {
      await logger.logNetworkError('Network error', { company: 'CompanyA', source: 'source1' });
      await logger.logConfigurationError('Config error', { company: 'CompanyB', source: 'source2' });
      await logger.logBlockedError('Blocked', { company: 'CompanyA', source: 'source1' });
    });

    it('should filter errors by company', () => {
      const companyAErrors = logger.getErrorsForCompany('CompanyA');
      expect(companyAErrors).toHaveLength(2);
      expect(companyAErrors.every(e => e.context.company === 'CompanyA')).toBe(true);
    });

    it('should filter errors by source', () => {
      const source1Errors = logger.getErrorsForSource('source1');
      expect(source1Errors).toHaveLength(2);
      expect(source1Errors.every(e => e.context.source === 'source1')).toBe(true);
    });

    it('should filter errors by category', () => {
      const networkErrors = logger.getErrorsByCategory(ErrorCategory.NETWORK);
      expect(networkErrors).toHaveLength(1);
      expect(networkErrors[0].category).toBe(ErrorCategory.NETWORK);
    });

    it('should filter retryable errors', () => {
      const retryableErrors = logger.getRetryableErrors();
      expect(retryableErrors).toHaveLength(1);
      expect(retryableErrors[0].retryable).toBe(true);
    });

    it('should filter permanent errors', () => {
      const permanentErrors = logger.getPermanentErrors();
      expect(permanentErrors).toHaveLength(2);
      expect(permanentErrors.every(e => !e.retryable)).toBe(true);
    });
  });

  describe('generateErrorSummary', () => {
    beforeEach(async () => {
      await logger.logNetworkError('Network error 1', { company: 'CompanyA', source: 'source1' });
      await logger.logNetworkError('Network error 2', { company: 'CompanyB', source: 'source1' });
      await logger.logConfigurationError('Config error', { company: 'CompanyA', source: 'source2' });
      await logger.logBlockedError('Blocked', { company: 'CompanyC', source: 'source3' });
    });

    it('should generate accurate error summary', () => {
      const summary = logger.generateErrorSummary();
      
      expect(summary.totalErrors).toBe(4);
      expect(summary.retryableErrors).toBe(2);
      expect(summary.permanentErrors).toBe(2);
      expect(summary.companiesAffected.size).toBe(3);
      expect(summary.sourcesAffected.size).toBe(3);
      
      expect(summary.errorsByCategory.get(ErrorCategory.NETWORK)).toBe(2);
      expect(summary.errorsByCategory.get(ErrorCategory.CONFIGURATION)).toBe(1);
      expect(summary.errorsByCategory.get(ErrorCategory.BLOCKED)).toBe(1);
    });
  });

  describe('export methods', () => {
    beforeEach(async () => {
      await logger.logError(
        ErrorSeverity.ERROR,
        ErrorCategory.NETWORK,
        'Test error',
        { company: 'TestCorp' }
      );
    });

    it('should export logs as JSON', () => {
      const json = logger.exportLogsAsJson();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Test error');
    });

    it('should export logs as formatted text', () => {
      const text = logger.exportLogsAsText();
      
      expect(text).toContain('ERROR LOG REPORT');
      expect(text).toContain('Total Errors: 1');
      expect(text).toContain('Test error');
      expect(text).toContain('Company: TestCorp');
    });
  });

  describe('file logging', () => {
    it('should write to file when log file path is provided', async () => {
      const loggerWithFile = new ErrorLogger('/tmp/test.log');
      
      await loggerWithFile.logError(
        ErrorSeverity.ERROR,
        ErrorCategory.NETWORK,
        'Test error',
        { company: 'TestCorp' }
      );

      expect(mockAppendFile).toHaveBeenCalledWith(
        '/tmp/test.log',
        expect.stringContaining('Test error'),
        'utf8'
      );
    });

    it('should not throw when file writing fails', async () => {
      mockAppendFile.mockRejectedValue(new Error('File write failed'));
      const loggerWithFile = new ErrorLogger('/tmp/test.log');
      
      // Should not throw
      await expect(loggerWithFile.logError(
        ErrorSeverity.ERROR,
        ErrorCategory.NETWORK,
        'Test error',
        {}
      )).resolves.not.toThrow();
    });
  });

  describe('clearLogs', () => {
    it('should clear all logged errors', async () => {
      await logger.logError(ErrorSeverity.ERROR, ErrorCategory.NETWORK, 'Test', {});
      expect(logger.getLogEntries()).toHaveLength(1);
      
      logger.clearLogs();
      expect(logger.getLogEntries()).toHaveLength(0);
    });
  });
});