import { ErrorLogger, ErrorSeverity, ErrorCategory, ErrorContext } from './ErrorLogger.js';
import { SearchError } from '../models/types.js';

/**
 * Result wrapper for operations that may fail
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  retryable: boolean;
}

/**
 * Graceful degradation options
 */
export interface GracefulDegradationOptions {
  continueOnError: boolean;
  maxFailuresPerCompany: number;
  maxFailuresPerSource: number;
  requireMinimumData: boolean;
  minimumSuccessRate: number; // 0.0 to 1.0
}

/**
 * Error aggregation for companies and sources
 */
export interface ErrorAggregation {
  companiesWithErrors: Map<string, SearchError[]>;
  sourcesWithErrors: Map<string, SearchError[]>;
  totalErrors: number;
  retryableErrors: number;
  permanentErrors: number;
  blockedSources: Set<string>;
  failedCompanies: Set<string>;
}

/**
 * ErrorHandler provides graceful degradation and error aggregation
 * Implements requirements 6.2, 6.3, 6.4 for error handling and reporting
 */
export class ErrorHandler {
  private logger: ErrorLogger;
  private options: GracefulDegradationOptions;
  private errorAggregation: ErrorAggregation;

  constructor(
    logger: ErrorLogger,
    options: Partial<GracefulDegradationOptions> = {}
  ) {
    this.logger = logger;
    this.options = {
      continueOnError: true,
      maxFailuresPerCompany: 3,
      maxFailuresPerSource: 5,
      requireMinimumData: false,
      minimumSuccessRate: 0.0,
      ...options
    };
    
    this.errorAggregation = {
      companiesWithErrors: new Map(),
      sourcesWithErrors: new Map(),
      totalErrors: 0,
      retryableErrors: 0,
      permanentErrors: 0,
      blockedSources: new Set(),
      failedCompanies: new Set()
    };
  }

  /**
   * Executes an operation with error handling and graceful degradation
   * Requirement 6.4: Continue with remaining companies when source fails
   */
  async executeWithGracefulDegradation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    operationName: string
  ): Promise<OperationResult<T>> {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        retryable: false
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Classify and log the error
      const category = this.classifyError(err);
      const severity = this.determineSeverity(category, err);
      
      await this.logger.logError(
        severity,
        category,
        `${operationName} failed: ${err.message}`,
        { ...context, operation: operationName },
        err
      );

      // Update error aggregation
      this.updateErrorAggregation(err, context);

      // Determine if operation should continue based on graceful degradation rules
      const shouldContinue = this.shouldContinueAfterError(err, context);
      
      if (!shouldContinue) {
        throw err; // Re-throw to stop execution
      }

      return {
        success: false,
        error: err,
        retryable: this.isRetryableError(category, err)
      };
    }
  }

  /**
   * Handles source failure with graceful degradation
   * Requirement 6.4: Notify user and continue with remaining companies
   */
  async handleSourceFailure(
    sourceName: string,
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    const category = this.classifyError(error);
    
    // Log the source failure
    await this.logger.logError(
      ErrorSeverity.ERROR,
      category,
      `Source ${sourceName} failed: ${error.message}`,
      { ...context, source: sourceName },
      error
    );

    // Update error aggregation using the centralized method
    this.updateErrorAggregation(error, { ...context, source: sourceName });

    // Check if source should be blocked
    if (this.isBlockingError(error)) {
      this.errorAggregation.blockedSources.add(sourceName);
      await this.logger.logBlockedError(
        `Source ${sourceName} is blocked and will be skipped`,
        { ...context, source: sourceName },
        error
      );
      return false; // Don't continue with this source
    }

    // Check failure threshold for this source (after adding current error)
    const sourceErrors = this.errorAggregation.sourcesWithErrors.get(sourceName) || [];
    if (sourceErrors.length >= this.options.maxFailuresPerSource) {
      await this.logger.logError(
        ErrorSeverity.WARNING,
        ErrorCategory.SYSTEM,
        `Source ${sourceName} has exceeded maximum failures (${this.options.maxFailuresPerSource}), skipping`,
        { ...context, source: sourceName }
      );
      return false;
    }

    // Continue with graceful degradation if configured
    return this.options.continueOnError;
  }

  /**
   * Handles company search failure with graceful degradation
   * Requirement 6.3: Include company in report with "no data available" status
   */
  async handleCompanyFailure(
    companyName: string,
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    const category = this.classifyError(error);
    
    // Log the company failure
    await this.logger.logError(
      ErrorSeverity.ERROR,
      category,
      `Company search failed for ${companyName}: ${error.message}`,
      { ...context, company: companyName },
      error
    );

    // Update error aggregation using the centralized method
    this.updateErrorAggregation(error, { ...context, company: companyName });

    // Check failure threshold for this company (after adding current error)
    const companyErrors = this.errorAggregation.companiesWithErrors.get(companyName) || [];
    if (companyErrors.length >= this.options.maxFailuresPerCompany) {
      this.errorAggregation.failedCompanies.add(companyName);
      await this.logger.logError(
        ErrorSeverity.WARNING,
        ErrorCategory.SYSTEM,
        `Company ${companyName} has exceeded maximum failures (${this.options.maxFailuresPerCompany}), marking as failed`,
        { ...context, company: companyName }
      );
    }

    // Always continue with other companies (graceful degradation)
    return this.options.continueOnError;
  }

  /**
   * Validates if minimum data requirements are met
   * Used to determine if processing should continue
   */
  validateMinimumDataRequirements(
    totalOperations: number,
    successfulOperations: number
  ): boolean {
    if (!this.options.requireMinimumData) {
      return true; // No minimum requirements
    }

    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;
    return successRate >= this.options.minimumSuccessRate;
  }

  /**
   * Gets error aggregation for reporting
   * Requirement 6.2: Report partial data with error information
   */
  getErrorAggregation(): ErrorAggregation {
    return {
      ...this.errorAggregation,
      companiesWithErrors: new Map(this.errorAggregation.companiesWithErrors),
      sourcesWithErrors: new Map(this.errorAggregation.sourcesWithErrors),
      blockedSources: new Set(this.errorAggregation.blockedSources),
      failedCompanies: new Set(this.errorAggregation.failedCompanies)
    };
  }

  /**
   * Gets errors for a specific company (for status determination)
   */
  getCompanyErrors(companyName: string): SearchError[] {
    return this.errorAggregation.companiesWithErrors.get(companyName) || [];
  }

  /**
   * Gets errors for a specific source
   */
  getSourceErrors(sourceName: string): SearchError[] {
    return this.errorAggregation.sourcesWithErrors.get(sourceName) || [];
  }

  /**
   * Checks if a company has failed completely
   */
  isCompanyFailed(companyName: string): boolean {
    return this.errorAggregation.failedCompanies.has(companyName);
  }

  /**
   * Checks if a source is blocked
   */
  isSourceBlocked(sourceName: string): boolean {
    return this.errorAggregation.blockedSources.has(sourceName);
  }

  /**
   * Generates error summary for reports
   */
  generateErrorSummary(): {
    totalErrors: number;
    companiesAffected: number;
    sourcesAffected: number;
    blockedSources: number;
    failedCompanies: number;
    retryableErrors: number;
    permanentErrors: number;
  } {
    return {
      totalErrors: this.errorAggregation.totalErrors,
      companiesAffected: this.errorAggregation.companiesWithErrors.size,
      sourcesAffected: this.errorAggregation.sourcesWithErrors.size,
      blockedSources: this.errorAggregation.blockedSources.size,
      failedCompanies: this.errorAggregation.failedCompanies.size,
      retryableErrors: this.errorAggregation.retryableErrors,
      permanentErrors: this.errorAggregation.permanentErrors
    };
  }

  /**
   * Resets error aggregation (useful for new search sessions)
   */
  resetErrorAggregation(): void {
    this.errorAggregation = {
      companiesWithErrors: new Map(),
      sourcesWithErrors: new Map(),
      totalErrors: 0,
      retryableErrors: 0,
      permanentErrors: 0,
      blockedSources: new Set(),
      failedCompanies: new Set()
    };
  }

  /**
   * Classifies error into appropriate category
   */
  private classifyError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    // Network-related errors
    if (message.includes('network') || 
        message.includes('timeout') || 
        message.includes('connection') ||
        message.includes('econnreset') ||
        message.includes('enotfound')) {
      return ErrorCategory.NETWORK;
    }
    
    // Rate limiting
    if (message.includes('rate limit') || 
        message.includes('too many requests') ||
        message.includes('429')) {
      return ErrorCategory.RATE_LIMIT;
    }
    
    // Blocking
    if (message.includes('blocked') || 
        message.includes('forbidden') ||
        message.includes('access denied') ||
        message.includes('403')) {
      return ErrorCategory.BLOCKED;
    }
    
    // Configuration errors
    if (message.includes('invalid') || 
        message.includes('configuration') ||
        message.includes('unauthorized') ||
        message.includes('api key')) {
      return ErrorCategory.CONFIGURATION;
    }
    
    // Data parsing errors
    if (message.includes('parse') || 
        message.includes('json') ||
        message.includes('xml') ||
        message.includes('format')) {
      return ErrorCategory.DATA;
    }
    
    // Default to system error
    return ErrorCategory.SYSTEM;
  }

  /**
   * Determines error severity based on category and error details
   */
  private determineSeverity(category: ErrorCategory, _error: Error): ErrorSeverity {
    switch (category) {
      case ErrorCategory.BLOCKED:
      case ErrorCategory.SYSTEM:
        return ErrorSeverity.CRITICAL;
      case ErrorCategory.NETWORK:
      case ErrorCategory.CONFIGURATION:
        return ErrorSeverity.ERROR;
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.DATA:
        return ErrorSeverity.WARNING;
      default:
        return ErrorSeverity.ERROR;
    }
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(category: ErrorCategory, _error: Error): boolean {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.RATE_LIMIT:
        return true;
      case ErrorCategory.BLOCKED:
      case ErrorCategory.CONFIGURATION:
      case ErrorCategory.DATA:
      case ErrorCategory.SYSTEM:
        return false;
      default:
        return false;
    }
  }

  /**
   * Determines if an error indicates blocking
   */
  private isBlockingError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('blocked') || 
           message.includes('banned') ||
           message.includes('access denied') ||
           message.includes('bot detected') ||
           message.includes('captcha') ||
           message.includes('cloudflare');
  }

  /**
   * Determines if execution should continue after an error
   */
  private shouldContinueAfterError(error: Error, context: ErrorContext): boolean {
    // Always stop on blocking errors
    if (this.isBlockingError(error)) {
      return false;
    }
    
    // Check if graceful degradation is enabled
    if (!this.options.continueOnError) {
      return false;
    }
    
    // Check company-specific failure limits (before adding current error)
    if (context.company) {
      const companyErrors = this.errorAggregation.companiesWithErrors.get(context.company) || [];
      if (companyErrors.length >= this.options.maxFailuresPerCompany) {
        return false;
      }
    }
    
    // Check source-specific failure limits (before adding current error)
    if (context.source) {
      const sourceErrors = this.errorAggregation.sourcesWithErrors.get(context.source) || [];
      if (sourceErrors.length >= this.options.maxFailuresPerSource) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Updates error aggregation with new error
   */
  private updateErrorAggregation(error: Error, context: ErrorContext): void {
    this.errorAggregation.totalErrors++;
    
    const category = this.classifyError(error);
    const retryable = this.isRetryableError(category, error);
    
    if (retryable) {
      this.errorAggregation.retryableErrors++;
    } else {
      this.errorAggregation.permanentErrors++;
    }
    
    // Create SearchError for aggregation
    const searchError: SearchError = {
      timestamp: new Date(),
      message: error.message,
      source: context.source || 'unknown',
      retryable
    };
    
    // Add to company errors if company context exists
    if (context.company) {
      const companyErrors = this.errorAggregation.companiesWithErrors.get(context.company) || [];
      companyErrors.push(searchError);
      this.errorAggregation.companiesWithErrors.set(context.company, companyErrors);
    }
    
    // Add to source errors if source context exists
    if (context.source) {
      const sourceErrors = this.errorAggregation.sourcesWithErrors.get(context.source) || [];
      sourceErrors.push(searchError);
      this.errorAggregation.sourcesWithErrors.set(context.source, sourceErrors);
    }
  }
}