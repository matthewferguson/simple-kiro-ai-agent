import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler, GracefulDegradationOptions } from './ErrorHandler.js';
import { ErrorLogger, ErrorSeverity, ErrorCategory } from './ErrorLogger.js';

describe('ErrorHandler', () => {
  let errorLogger: ErrorLogger;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorLogger = new ErrorLogger();
    errorHandler = new ErrorHandler(errorLogger);
    
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('executeWithGracefulDegradation', () => {
    it('should return success result when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await errorHandler.executeWithGracefulDegradation(
        operation,
        { company: 'TestCorp' },
        'test-operation'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.retryable).toBe(false);
    });

    it('should return failure result when operation fails with graceful degradation', async () => {
      const error = new Error('Network timeout');
      const operation = vi.fn().mockRejectedValue(error);
      
      const result = await errorHandler.executeWithGracefulDegradation(
        operation,
        { company: 'TestCorp', source: 'test-api' },
        'test-operation'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.retryable).toBe(true); // Network errors are retryable
    });

    it('should throw error when graceful degradation is disabled', async () => {
      const options: GracefulDegradationOptions = {
        continueOnError: false,
        maxFailuresPerCompany: 3,
        maxFailuresPerSource: 5,
        requireMinimumData: false,
        minimumSuccessRate: 0.0
      };
      
      const handlerNoGraceful = new ErrorHandler(errorLogger, options);
      const error = new Error('Network timeout');
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(handlerNoGraceful.executeWithGracefulDegradation(
        operation,
        { company: 'TestCorp' },
        'test-operation'
      )).rejects.toThrow('Network timeout');
    });

    it('should throw blocking errors immediately', async () => {
      const blockingError = new Error('Access denied - blocked');
      const operation = vi.fn().mockRejectedValue(blockingError);
      
      await expect(errorHandler.executeWithGracefulDegradation(
        operation,
        { source: 'test-api' },
        'test-operation'
      )).rejects.toThrow('Access denied - blocked');
    });
  });

  describe('handleSourceFailure', () => {
    it('should return true for retryable source failures', async () => {
      const networkError = new Error('Connection timeout');
      
      const shouldContinue = await errorHandler.handleSourceFailure(
        'test-source',
        networkError,
        { company: 'TestCorp' }
      );

      expect(shouldContinue).toBe(true);
      
      const sourceErrors = errorHandler.getSourceErrors('test-source');
      expect(sourceErrors).toHaveLength(1);
      expect(sourceErrors[0].retryable).toBe(true);
    });

    it('should return false for blocking errors', async () => {
      const blockingError = new Error('Access denied - blocked');
      
      const shouldContinue = await errorHandler.handleSourceFailure(
        'test-source',
        blockingError,
        { company: 'TestCorp' }
      );

      expect(shouldContinue).toBe(false);
      expect(errorHandler.isSourceBlocked('test-source')).toBe(true);
    });

    it('should return false when source exceeds failure threshold', async () => {
      const options: GracefulDegradationOptions = {
        continueOnError: true,
        maxFailuresPerCompany: 3,
        maxFailuresPerSource: 2, // Low threshold for testing
        requireMinimumData: false,
        minimumSuccessRate: 0.0
      };
      
      const handlerWithLimits = new ErrorHandler(errorLogger, options);
      const error = new Error('Network error');
      
      // First failure - should continue (1 error, under threshold)
      let shouldContinue = await handlerWithLimits.handleSourceFailure(
        'test-source',
        error,
        { company: 'TestCorp' }
      );
      expect(shouldContinue).toBe(true);
      
      // Second failure - should continue (2 errors, at threshold)
      shouldContinue = await handlerWithLimits.handleSourceFailure(
        'test-source',
        error,
        { company: 'TestCorp' }
      );
      expect(shouldContinue).toBe(false); // Now at threshold, should stop
    });
  });

  describe('handleCompanyFailure', () => {
    it('should track company failures and continue with graceful degradation', async () => {
      const error = new Error('Search failed');
      
      const shouldContinue = await errorHandler.handleCompanyFailure(
        'TestCorp',
        error,
        { source: 'test-api' }
      );

      expect(shouldContinue).toBe(true);
      
      const companyErrors = errorHandler.getCompanyErrors('TestCorp');
      expect(companyErrors).toHaveLength(1);
      expect(companyErrors[0].message).toBe('Search failed');
    });

    it('should mark company as failed when exceeding threshold', async () => {
      const options: GracefulDegradationOptions = {
        continueOnError: true,
        maxFailuresPerCompany: 2, // Low threshold for testing
        maxFailuresPerSource: 5,
        requireMinimumData: false,
        minimumSuccessRate: 0.0
      };
      
      const handlerWithLimits = new ErrorHandler(errorLogger, options);
      const error = new Error('Search failed');
      
      // First failure - should continue, not failed yet
      await handlerWithLimits.handleCompanyFailure('TestCorp', error, { source: 'api1' });
      expect(handlerWithLimits.isCompanyFailed('TestCorp')).toBe(false);
      
      // Second failure - should continue, now at threshold, marked as failed
      await handlerWithLimits.handleCompanyFailure('TestCorp', error, { source: 'api2' });
      expect(handlerWithLimits.isCompanyFailed('TestCorp')).toBe(true);
    });
  });

  describe('validateMinimumDataRequirements', () => {
    it('should return true when no minimum requirements are set', () => {
      const isValid = errorHandler.validateMinimumDataRequirements(10, 3);
      expect(isValid).toBe(true);
    });

    it('should validate minimum success rate when required', () => {
      const options: GracefulDegradationOptions = {
        continueOnError: true,
        maxFailuresPerCompany: 3,
        maxFailuresPerSource: 5,
        requireMinimumData: true,
        minimumSuccessRate: 0.5 // 50% success rate required
      };
      
      const handlerWithRequirements = new ErrorHandler(errorLogger, options);
      
      // 60% success rate - should pass
      expect(handlerWithRequirements.validateMinimumDataRequirements(10, 6)).toBe(true);
      
      // 40% success rate - should fail
      expect(handlerWithRequirements.validateMinimumDataRequirements(10, 4)).toBe(false);
      
      // Edge case: no operations
      expect(handlerWithRequirements.validateMinimumDataRequirements(0, 0)).toBe(false);
    });
  });

  describe('error aggregation', () => {
    it('should provide accurate error aggregation', async () => {
      const freshHandler = new ErrorHandler(errorLogger);
      
      // Add some test errors
      await freshHandler.handleCompanyFailure(
        'CompanyA',
        new Error('Network error'),
        { source: 'source1' }
      );
      
      await freshHandler.handleCompanyFailure(
        'CompanyB',
        new Error('Config error'),
        { source: 'source2' }
      );
      
      await freshHandler.handleSourceFailure(
        'source3',
        new Error('Rate limit'),
        { company: 'CompanyC' }
      );
      
      const aggregation = freshHandler.getErrorAggregation();
      
      // CompanyA, CompanyB, and CompanyC (from source failure context)
      expect(aggregation.companiesWithErrors.size).toBe(3);
      // source1, source2, and source3 are all tracked now
      expect(aggregation.sourcesWithErrors.size).toBe(3); 
      expect(aggregation.totalErrors).toBeGreaterThan(0);
    });

    it('should generate error summary', async () => {
      const freshHandler = new ErrorHandler(errorLogger);
      
      // Add some test errors
      await freshHandler.handleCompanyFailure(
        'CompanyA',
        new Error('Network error'),
        { source: 'source1' }
      );
      
      await freshHandler.handleCompanyFailure(
        'CompanyB',
        new Error('Config error'),
        { source: 'source2' }
      );
      
      await freshHandler.handleSourceFailure(
        'source3',
        new Error('Rate limit'),
        { company: 'CompanyC' }
      );
      
      const summary = freshHandler.generateErrorSummary();
      
      expect(summary.companiesAffected).toBe(3);
      expect(summary.sourcesAffected).toBe(3);
      expect(summary.totalErrors).toBeGreaterThan(0);
    });

    it('should reset error aggregation', () => {
      errorHandler.resetErrorAggregation();
      
      const summary = errorHandler.generateErrorSummary();
      expect(summary.totalErrors).toBe(0);
      expect(summary.companiesAffected).toBe(0);
      expect(summary.sourcesAffected).toBe(0);
    });
  });

  describe('error classification', () => {
    it('should classify network errors correctly', async () => {
      const networkErrors = [
        new Error('Connection timeout'),
        new Error('ECONNRESET'),
        new Error('Network error occurred')
      ];

      for (const error of networkErrors) {
        // Reset error handler for each test to avoid threshold issues
        const freshHandler = new ErrorHandler(errorLogger);
        const result = await freshHandler.executeWithGracefulDegradation(
          () => Promise.reject(error),
          { company: 'TestCorp' },
          'test'
        );
        expect(result.success).toBe(false);
        expect(result.retryable).toBe(true);
      }
    });

    it('should classify configuration errors correctly', async () => {
      const configErrors = [
        new Error('Invalid API key'),
        new Error('Unauthorized access'),
        new Error('Configuration missing')
      ];

      for (const error of configErrors) {
        // Reset error handler for each test to avoid threshold issues
        const freshHandler = new ErrorHandler(errorLogger);
        const result = await freshHandler.executeWithGracefulDegradation(
          () => Promise.reject(error),
          { company: 'TestCorp' },
          'test'
        );
        expect(result.success).toBe(false);
        expect(result.retryable).toBe(false);
      }
    });

    it('should classify blocking errors correctly', async () => {
      const blockingErrors = [
        new Error('Access denied - blocked'),
        new Error('Bot detected'),
        new Error('Captcha required')
      ];

      for (const error of blockingErrors) {
        const freshHandler = new ErrorHandler(errorLogger);
        await expect(freshHandler.executeWithGracefulDegradation(
          () => Promise.reject(error),
          { source: 'test-api' },
          'test'
        )).rejects.toThrow();
      }
    });
  });
});