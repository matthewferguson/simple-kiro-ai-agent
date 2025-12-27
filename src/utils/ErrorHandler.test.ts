import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
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

  // Property-based tests
  describe('Property-based tests', () => {
    it('Property 17: Graceful continuation on source failure - For any article source failure, the system should continue processing remaining companies and include all companies in the final report', async () => {
      // Feature: company-mention-tracker, Property 17: Graceful continuation on source failure
      // **Validates: Requirements 6.4**
      
      // Generate scenarios with companies and source failures
      const gracefulContinuationScenario = fc.record({
        companies: fc.array(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ).map(companies => [...new Set(companies)]), // Ensure unique companies
        failingSource: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        errorMessage: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0)
      }).filter(scenario => scenario.companies.length >= 2);

      await fc.assert(
        fc.asyncProperty(gracefulContinuationScenario, async (scenario) => {
          const testHandler = new ErrorHandler(errorLogger, {
            continueOnError: true,
            maxFailuresPerCompany: 10,
            maxFailuresPerSource: 10,
            requireMinimumData: false,
            minimumSuccessRate: 0.0
          });

          // Simulate a source failure that affects multiple companies
          const sourceError = new Error(`network: ${scenario.errorMessage}`);
          const companiesProcessedAfterFailure = new Set<string>();
          
          // Test the core property: when a source fails, processing should continue for remaining companies
          for (let i = 0; i < scenario.companies.length; i++) {
            const company = scenario.companies[i];
            
            // Simulate source failure for this company
            const shouldContinue = await testHandler.handleSourceFailure(
              scenario.failingSource,
              sourceError,
              { company, source: scenario.failingSource }
            );
            
            // Property: Non-blocking source failures should allow continuation
            const isBlockingError = sourceError.message.toLowerCase().includes('blocked') || 
                                  sourceError.message.toLowerCase().includes('access denied') ||
                                  sourceError.message.toLowerCase().includes('bot detected') ||
                                  sourceError.message.toLowerCase().includes('captcha');
            
            if (!isBlockingError) {
              // For non-blocking errors, the system should continue processing
              if (!shouldContinue) {
                return false; // This violates the graceful continuation property
              }
              
              // Mark this company as processed (even with errors)
              companiesProcessedAfterFailure.add(company);
            }
          }
          
          // Property: All companies should be processable despite source failures
          // This is the core of "graceful continuation" - no company is left out
          if (companiesProcessedAfterFailure.size !== scenario.companies.length) {
            return false;
          }
          
          // Property: Error aggregation should track all affected companies and sources
          const errorAggregation = testHandler.getErrorAggregation();
          
          // All companies should be in the error aggregation (they all had the source fail)
          const companiesInAggregation = new Set(errorAggregation.companiesWithErrors.keys());
          for (const company of scenario.companies) {
            if (!companiesInAggregation.has(company)) {
              return false;
            }
          }
          
          // The failing source should be tracked
          const sourcesInAggregation = new Set(errorAggregation.sourcesWithErrors.keys());
          if (!sourcesInAggregation.has(scenario.failingSource)) {
            return false;
          }
          
          // Property: Each company should have error records for the failing source
          for (const company of scenario.companies) {
            const companyErrors = testHandler.getCompanyErrors(company);
            if (companyErrors.length === 0) {
              return false;
            }
            
            // At least one error should be from our failing source
            const hasSourceError = companyErrors.some(error => error.source === scenario.failingSource);
            if (!hasSourceError) {
              return false;
            }
          }
          
          // Property: The failing source should have error records for all companies
          const sourceErrors = testHandler.getSourceErrors(scenario.failingSource);
          if (sourceErrors.length !== scenario.companies.length) {
            return false;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});