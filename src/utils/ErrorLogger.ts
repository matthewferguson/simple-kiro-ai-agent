import { promises as fs } from 'fs';

/**
 * Error severity levels for classification
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  DATA = 'data',
  SYSTEM = 'system',
  RATE_LIMIT = 'rate_limit',
  BLOCKED = 'blocked'
}

/**
 * Structured error log entry
 */
export interface ErrorLogEntry {
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  context: ErrorContext;
  retryable: boolean;
  error?: Error;
}

/**
 * Context information for error logging
 */
export interface ErrorContext {
  company?: string;
  date?: Date;
  source?: string;
  operation?: string;
  attempt?: number;
  maxAttempts?: number;
  [key: string]: any;
}

/**
 * Error aggregation for reporting
 */
export interface ErrorSummary {
  totalErrors: number;
  errorsByCategory: Map<ErrorCategory, number>;
  errorsBySeverity: Map<ErrorSeverity, number>;
  retryableErrors: number;
  permanentErrors: number;
  companiesAffected: Set<string>;
  sourcesAffected: Set<string>;
}

/**
 * ErrorLogger provides centralized error logging with timestamp and context
 * Implements requirement 6.1: Log errors with timestamp and company name
 */
export class ErrorLogger {
  private logEntries: ErrorLogEntry[] = [];
  private logFilePath?: string;

  constructor(logFilePath?: string) {
    this.logFilePath = logFilePath;
  }

  /**
   * Logs an error with full context information
   * Requirement 6.1: Error logging with timestamp and context
   */
  async logError(
    severity: ErrorSeverity,
    category: ErrorCategory,
    message: string,
    context: ErrorContext,
    error?: Error
  ): Promise<void> {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date(),
      severity,
      category,
      message,
      context: { ...context },
      retryable: this.isRetryableError(category, error),
      error
    };

    // Add to in-memory log
    this.logEntries.push(logEntry);

    // Log to console with appropriate level
    this.logToConsole(logEntry);

    // Write to file if configured
    if (this.logFilePath) {
      await this.writeToFile(logEntry);
    }
  }

  /**
   * Logs a network error (typically retryable)
   */
  async logNetworkError(message: string, context: ErrorContext, error?: Error): Promise<void> {
    await this.logError(ErrorSeverity.ERROR, ErrorCategory.NETWORK, message, context, error);
  }

  /**
   * Logs a configuration error (typically permanent)
   */
  async logConfigurationError(message: string, context: ErrorContext, error?: Error): Promise<void> {
    await this.logError(ErrorSeverity.ERROR, ErrorCategory.CONFIGURATION, message, context, error);
  }

  /**
   * Logs a data parsing error (typically permanent)
   */
  async logDataError(message: string, context: ErrorContext, error?: Error): Promise<void> {
    await this.logError(ErrorSeverity.WARNING, ErrorCategory.DATA, message, context, error);
  }

  /**
   * Logs a system error (typically permanent)
   */
  async logSystemError(message: string, context: ErrorContext, error?: Error): Promise<void> {
    await this.logError(ErrorSeverity.CRITICAL, ErrorCategory.SYSTEM, message, context, error);
  }

  /**
   * Logs a rate limit error (retryable with delay)
   */
  async logRateLimitError(message: string, context: ErrorContext, error?: Error): Promise<void> {
    await this.logError(ErrorSeverity.WARNING, ErrorCategory.RATE_LIMIT, message, context, error);
  }

  /**
   * Logs a blocking error (permanent for current session)
   */
  async logBlockedError(message: string, context: ErrorContext, error?: Error): Promise<void> {
    await this.logError(ErrorSeverity.CRITICAL, ErrorCategory.BLOCKED, message, context, error);
  }

  /**
   * Logs an informational message
   */
  async logInfo(message: string, context: ErrorContext = {}): Promise<void> {
    await this.logError(ErrorSeverity.INFO, ErrorCategory.SYSTEM, message, context);
  }

  /**
   * Gets all logged errors
   */
  getLogEntries(): ErrorLogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Gets errors for a specific company
   * Used for generating company-specific error reports
   */
  getErrorsForCompany(company: string): ErrorLogEntry[] {
    return this.logEntries.filter(entry => entry.context.company === company);
  }

  /**
   * Gets errors for a specific source
   */
  getErrorsForSource(source: string): ErrorLogEntry[] {
    return this.logEntries.filter(entry => entry.context.source === source);
  }

  /**
   * Gets errors by category
   */
  getErrorsByCategory(category: ErrorCategory): ErrorLogEntry[] {
    return this.logEntries.filter(entry => entry.category === category);
  }

  /**
   * Gets errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): ErrorLogEntry[] {
    return this.logEntries.filter(entry => entry.severity === severity);
  }

  /**
   * Gets only retryable errors
   */
  getRetryableErrors(): ErrorLogEntry[] {
    return this.logEntries.filter(entry => entry.retryable);
  }

  /**
   * Gets only permanent errors
   */
  getPermanentErrors(): ErrorLogEntry[] {
    return this.logEntries.filter(entry => !entry.retryable);
  }

  /**
   * Generates error summary for reporting
   * Used for requirement 6.2: Report partial data with error information
   */
  generateErrorSummary(): ErrorSummary {
    const errorsByCategory = new Map<ErrorCategory, number>();
    const errorsBySeverity = new Map<ErrorSeverity, number>();
    const companiesAffected = new Set<string>();
    const sourcesAffected = new Set<string>();
    let retryableErrors = 0;
    let permanentErrors = 0;

    for (const entry of this.logEntries) {
      // Count by category
      errorsByCategory.set(entry.category, (errorsByCategory.get(entry.category) || 0) + 1);
      
      // Count by severity
      errorsBySeverity.set(entry.severity, (errorsBySeverity.get(entry.severity) || 0) + 1);
      
      // Track affected entities
      if (entry.context.company) {
        companiesAffected.add(entry.context.company);
      }
      if (entry.context.source) {
        sourcesAffected.add(entry.context.source);
      }
      
      // Count retryable vs permanent
      if (entry.retryable) {
        retryableErrors++;
      } else {
        permanentErrors++;
      }
    }

    return {
      totalErrors: this.logEntries.length,
      errorsByCategory,
      errorsBySeverity,
      retryableErrors,
      permanentErrors,
      companiesAffected,
      sourcesAffected
    };
  }

  /**
   * Clears all logged errors
   */
  clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * Exports logs as JSON string
   */
  exportLogsAsJson(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  /**
   * Exports logs as formatted text
   */
  exportLogsAsText(): string {
    const lines: string[] = [];
    
    lines.push('ERROR LOG REPORT');
    lines.push('='.repeat(50));
    lines.push('');
    
    const summary = this.generateErrorSummary();
    lines.push(`Total Errors: ${summary.totalErrors}`);
    lines.push(`Retryable: ${summary.retryableErrors}`);
    lines.push(`Permanent: ${summary.permanentErrors}`);
    lines.push(`Companies Affected: ${summary.companiesAffected.size}`);
    lines.push(`Sources Affected: ${summary.sourcesAffected.size}`);
    lines.push('');
    
    lines.push('DETAILED LOG ENTRIES');
    lines.push('-'.repeat(30));
    
    for (const entry of this.logEntries) {
      lines.push('');
      lines.push(`[${entry.timestamp.toISOString()}] ${entry.severity.toUpperCase()} - ${entry.category.toUpperCase()}`);
      lines.push(`Message: ${entry.message}`);
      lines.push(`Retryable: ${entry.retryable ? 'Yes' : 'No'}`);
      
      if (entry.context.company) {
        lines.push(`Company: ${entry.context.company}`);
      }
      if (entry.context.source) {
        lines.push(`Source: ${entry.context.source}`);
      }
      if (entry.context.operation) {
        lines.push(`Operation: ${entry.context.operation}`);
      }
      if (entry.context.attempt && entry.context.maxAttempts) {
        lines.push(`Attempt: ${entry.context.attempt}/${entry.context.maxAttempts}`);
      }
      
      if (entry.error) {
        lines.push(`Error Details: ${entry.error.message}`);
        if (entry.error.stack) {
          lines.push(`Stack Trace: ${entry.error.stack}`);
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Determines if an error is retryable based on category and error details
   */
  private isRetryableError(category: ErrorCategory, error?: Error): boolean {
    switch (category) {
      case ErrorCategory.NETWORK:
        return this.isNetworkErrorRetryable(error);
      case ErrorCategory.RATE_LIMIT:
        return true; // Rate limit errors are always retryable with delay
      case ErrorCategory.BLOCKED:
        return false; // Blocking is permanent for current session
      case ErrorCategory.CONFIGURATION:
        return false; // Configuration errors are permanent
      case ErrorCategory.DATA:
        return false; // Data parsing errors are permanent
      case ErrorCategory.SYSTEM:
        return false; // System errors are typically permanent
      default:
        return false;
    }
  }

  /**
   * Determines if a network error is retryable
   */
  private isNetworkErrorRetryable(error?: Error): boolean {
    if (!error) return true;

    const message = error.message.toLowerCase();
    
    // Retryable network conditions
    const retryablePatterns = [
      'timeout', 'econnreset', 'enotfound', 'econnaborted',
      'socket hang up', 'network error', 'connection refused'
    ];
    
    // Non-retryable conditions
    const nonRetryablePatterns = [
      'unauthorized', 'forbidden', 'not found', 'bad request',
      'invalid', 'malformed', 'syntax error'
    ];
    
    // Check for non-retryable patterns first
    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }
    
    // Check for retryable patterns
    if (retryablePatterns.some(pattern => message.includes(pattern))) {
      return true;
    }
    
    // Default to retryable for network category
    return true;
  }

  /**
   * Logs entry to console with appropriate formatting
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] ${entry.severity.toUpperCase()} - ${entry.category.toUpperCase()}`;
    const contextStr = this.formatContextForConsole(entry.context);
    const message = `${prefix}: ${entry.message}${contextStr}`;

    switch (entry.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        console.error(message);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
      case ErrorSeverity.WARNING:
        console.warn(message);
        break;
      case ErrorSeverity.INFO:
        console.log(message);
        break;
    }
  }

  /**
   * Formats context information for console output
   */
  private formatContextForConsole(context: ErrorContext): string {
    const parts: string[] = [];
    
    if (context.company) parts.push(`company=${context.company}`);
    if (context.source) parts.push(`source=${context.source}`);
    if (context.operation) parts.push(`operation=${context.operation}`);
    if (context.attempt && context.maxAttempts) {
      parts.push(`attempt=${context.attempt}/${context.maxAttempts}`);
    }
    
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  }

  /**
   * Writes log entry to file
   */
  private async writeToFile(entry: ErrorLogEntry): Promise<void> {
    if (!this.logFilePath) return;

    try {
      const logLine = JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        severity: entry.severity,
        category: entry.category,
        message: entry.message,
        context: entry.context,
        retryable: entry.retryable,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined
      }) + '\n';

      await fs.appendFile(this.logFilePath, logLine, 'utf8');
    } catch (error) {
      // Don't throw errors from logging - just log to console
      console.error('Failed to write to log file:', error);
    }
  }
}