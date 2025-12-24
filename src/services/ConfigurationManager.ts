import {
  ValidationResult,
  SystemConfig,
  ArticleSource,
  validateCompanyList,
  validateSystemConfig
} from '../models/types.js';

/**
 * ConfigurationManager handles system configuration validation and management
 * Implements requirements 1.1, 1.2, 1.3, 1.4, 7.1, 7.2
 */
export class ConfigurationManager {
  private companies: string[] = [];
  private searchPeriodDays: number = 7;
  private startDate: Date | null = null;
  private articleSources: ArticleSource[] = [];
  private rateLimit: number = 60; // Default: 60 requests per minute

  /**
   * Validates and sets the list of companies to track
   * Requirements 1.1, 1.2, 1.3: Must be exactly 5 companies, non-empty, valid characters, no duplicates
   */
  validateCompanies(companies: string[]): ValidationResult {
    const validation = validateCompanyList(companies);
    
    if (validation.isValid) {
      // Store normalized company names (trimmed)
      this.companies = companies.map(name => name.trim());
    }
    
    return validation;
  }

  /**
   * Gets the current list of validated companies
   */
  getCompanies(): string[] {
    return [...this.companies]; // Return copy to prevent external modification
  }

  /**
   * Sets the search period configuration
   * Requirement 1.4: Configure search period (fixed at 7 days per requirements)
   */
  setSearchPeriod(startDate: Date, days: number = 7): void {
    if (days !== 7) {
      throw new Error('Search period must be exactly 7 days');
    }
    
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new Error('Start date must be a valid Date object');
    }
    
    this.startDate = new Date(startDate);
    this.searchPeriodDays = days;
  }

  /**
   * Gets the current search period configuration
   */
  getSearchPeriod(): { startDate: Date; endDate: Date } {
    if (!this.startDate) {
      throw new Error('Search period not configured. Call setSearchPeriod() first.');
    }
    
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + this.searchPeriodDays - 1);
    
    return {
      startDate: new Date(this.startDate),
      endDate
    };
  }

  /**
   * Configures article sources for searching
   * Requirements 7.1, 7.2: Accept source configuration, use defaults if none provided
   */
  configureSources(sources: ArticleSource[]): void {
    if (!sources || sources.length === 0) {
      // Requirement 7.2: Use default sources if none configured
      this.articleSources = this.getDefaultSources();
      return;
    }

    // Validate each source
    const errors: string[] = [];
    sources.forEach((source, index) => {
      const sourceErrors = this.validateArticleSource(source);
      if (sourceErrors.length > 0) {
        sourceErrors.forEach(error => {
          errors.push(`Source ${index + 1}: ${error}`);
        });
      }
    });

    if (errors.length > 0) {
      throw new Error(`Invalid article source configuration:\n${errors.join('\n')}`);
    }

    this.articleSources = [...sources]; // Store copy
  }

  /**
   * Gets the current article source configuration
   */
  getArticleSources(): ArticleSource[] {
    return [...this.articleSources]; // Return copy to prevent external modification
  }

  /**
   * Sets the global rate limit for requests
   */
  setRateLimit(requestsPerMinute: number): void {
    if (requestsPerMinute <= 0) {
      throw new Error('Rate limit must be positive');
    }
    this.rateLimit = requestsPerMinute;
  }

  /**
   * Gets the current rate limit setting
   */
  getRateLimit(): number {
    return this.rateLimit;
  }

  /**
   * Validates the complete system configuration
   * Requirement 1.4: Validate complete configuration
   */
  validateConfiguration(): ValidationResult {
    const config: SystemConfig = {
      companies: this.companies,
      searchPeriodDays: this.searchPeriodDays,
      articleSources: this.articleSources,
      rateLimit: this.rateLimit
    };

    const validation = validateSystemConfig(config);
    
    // Additional validation for search period setup
    if (!this.startDate) {
      validation.errors.push('Search period start date not configured');
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Gets the complete system configuration
   */
  getSystemConfig(): SystemConfig {
    return {
      companies: [...this.companies],
      searchPeriodDays: this.searchPeriodDays,
      articleSources: [...this.articleSources],
      rateLimit: this.rateLimit
    };
  }

  /**
   * Resets all configuration to initial state
   */
  reset(): void {
    this.companies = [];
    this.searchPeriodDays = 7;
    this.startDate = null;
    this.articleSources = [];
    this.rateLimit = 60;
  }

  /**
   * Validates a single article source
   */
  private validateArticleSource(source: ArticleSource): string[] {
    const errors: string[] = [];

    if (!source.name || source.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!['api', 'rss', 'scraper'].includes(source.type)) {
      errors.push(`Invalid type '${source.type}'. Must be 'api', 'rss', or 'scraper'`);
    }

    if (!source.endpoint || source.endpoint.trim().length === 0) {
      errors.push('Endpoint is required');
    } else {
      // Basic URL validation
      try {
        new URL(source.endpoint);
      } catch {
        errors.push('Endpoint must be a valid URL');
      }
    }

    if (source.rateLimit <= 0) {
      errors.push('Rate limit must be positive');
    }

    return errors;
  }

  /**
   * Gets default article sources when none are configured
   * Requirement 7.2: Use default reputable news sources
   */
  private getDefaultSources(): ArticleSource[] {
    return [
      {
        name: 'NewsAPI',
        type: 'api',
        endpoint: 'https://newsapi.org/v2/everything',
        rateLimit: 100
      },
      {
        name: 'Google News RSS',
        type: 'rss',
        endpoint: 'https://news.google.com/rss',
        rateLimit: 60
      },
      {
        name: 'Reuters RSS',
        type: 'rss',
        endpoint: 'https://www.reuters.com/tools/rss',
        rateLimit: 30
      }
    ];
  }
}