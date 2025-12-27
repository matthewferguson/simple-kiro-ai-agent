import {
  SystemConfig,
  SearchProgress,
  Report,
  DailySnapshot,
  TrendAnalysis,
  ValidationResult
} from '../models/types.js';
import { ConfigurationManager } from './ConfigurationManager.js';
import { ArticleFetcher } from './ArticleFetcher.js';
import { MentionExtractor } from './MentionExtractor.js';
import { DataStore } from './DataStore.js';
import { TrendAnalyzer } from './TrendAnalyzer.js';
import { ReportGenerator } from './ReportGenerator.js';
import { ErrorLogger } from '../utils/ErrorLogger.js';

/**
 * SearchEngine orchestrates the entire company mention tracking pipeline
 * Coordinates all components to execute searches and generate reports
 * Implements requirements 2.1, 4.1
 */
export class SearchEngine {
  private configManager: ConfigurationManager;
  private articleFetcher: ArticleFetcher;
  private mentionExtractor: MentionExtractor;
  private dataStore: DataStore;
  private trendAnalyzer: TrendAnalyzer;
  private reportGenerator: ReportGenerator;
  private errorLogger: ErrorLogger;
  
  private isInitialized: boolean = false;
  private currentProgress: SearchProgress = {
    currentDay: 0,
    totalDays: 7,
    companiesCompleted: 0,
    totalCompanies: 5
  };
  
  private searchErrors: Map<string, string[]> = new Map();

  constructor(dataDirectory?: string) {
    this.configManager = new ConfigurationManager();
    this.articleFetcher = new ArticleFetcher();
    this.mentionExtractor = new MentionExtractor();
    this.dataStore = new DataStore(dataDirectory);
    this.trendAnalyzer = new TrendAnalyzer();
    this.reportGenerator = new ReportGenerator();
    this.errorLogger = new ErrorLogger();
  }

  /**
   * Initializes the search engine with system configuration
   * Validates configuration and sets up all components
   */
  async initialize(config: SystemConfig): Promise<void> {
    try {
      // Validate the complete system configuration
      const validation = this.validateSystemConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Configure all components
      await this.configureComponents(config);
      
      // Reset progress and error tracking
      this.resetProgress();
      this.searchErrors.clear();
      
      this.isInitialized = true;
      
      console.log('SearchEngine initialized successfully');
      console.log(`Companies: ${config.companies.join(', ')}`);
      console.log(`Article sources: ${config.articleSources.map(s => s.name).join(', ')}`);
      
    } catch (error) {
      const message = `Failed to initialize SearchEngine: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await this.errorLogger.logSystemError(message, { operation: 'SearchEngine.initialize' });
      throw new Error(message);
    }
  }

  /**
   * Executes the complete search and analysis pipeline
   * Requirements 2.1: Search for each company across 7 consecutive days
   * Requirement 4.1: Calculate trends for all companies
   */
  async executeSearch(): Promise<Report> {
    if (!this.isInitialized) {
      throw new Error('SearchEngine not initialized. Call initialize() first.');
    }

    try {
      console.log('Starting company mention search...');
      
      const companies = this.configManager.getCompanies();
      const searchPeriod = this.configManager.getSearchPeriod();
      const articleSources = this.configManager.getArticleSources();
      
      // Reset progress tracking
      this.resetProgress();
      this.currentProgress.totalCompanies = companies.length;
      this.currentProgress.totalDays = 7;

      // Execute search for all companies across all days
      await this.executeCompleteSearch(companies, searchPeriod, articleSources);
      
      // Analyze trends for all companies
      console.log('Analyzing trends...');
      const trendAnalyses = await this.analyzeTrendsForAllCompanies(companies);
      
      // Generate final report
      console.log('Generating report...');
      const report = this.reportGenerator.generateReport(
        trendAnalyses,
        searchPeriod,
        this.searchErrors
      );
      
      console.log('Search completed successfully');
      return report;
      
    } catch (error) {
      const message = `Search execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await this.errorLogger.logSystemError(message, { operation: 'SearchEngine.executeSearch' });
      
      // If we have partial data, try to generate a partial report
      try {
        const companies = this.configManager.getCompanies();
        const searchPeriod = this.configManager.getSearchPeriod();
        const trendAnalyses = await this.analyzeTrendsForAllCompanies(companies);
        
        if (trendAnalyses.length > 0) {
          console.log('Generating partial report due to errors...');
          return this.reportGenerator.generateReport(
            trendAnalyses,
            searchPeriod,
            this.searchErrors
          );
        }
      } catch (reportError) {
        console.error('Failed to generate partial report:', reportError);
      }
      
      throw new Error(message);
    }
  }

  /**
   * Gets current search progress
   */
  getProgress(): SearchProgress {
    return { ...this.currentProgress };
  }

  /**
   * Executes complete search coverage for all companies and all days
   * Requirement 2.1: Complete search coverage (all companies, all days)
   */
  private async executeCompleteSearch(
    companies: string[],
    searchPeriod: { startDate: Date; endDate: Date },
    articleSources: any[]
  ): Promise<void> {
    const searchDays = this.generateSearchDays(searchPeriod);
    
    for (let dayIndex = 0; dayIndex < searchDays.length; dayIndex++) {
      const currentDate = searchDays[dayIndex];
      this.currentProgress.currentDay = dayIndex + 1;
      this.currentProgress.companiesCompleted = 0;
      
      console.log(`Searching day ${dayIndex + 1}/7: ${currentDate.toDateString()}`);
      
      for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
        const company = companies[companyIndex];
        
        try {
          await this.searchCompanyForDay(company, currentDate, articleSources);
          this.currentProgress.companiesCompleted = companyIndex + 1;
          
        } catch (error) {
          // Log error but continue with other companies
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.logSearchError(company, currentDate, errorMessage);
          
          // Create failed snapshot to maintain data consistency
          await this.createFailedSnapshot(company, currentDate);
        }
      }
    }
  }

  /**
   * Searches for mentions of a specific company on a specific day
   */
  private async searchCompanyForDay(
    company: string,
    date: Date,
    articleSources: any[]
  ): Promise<void> {
    try {
      console.log(`  Searching ${company}...`);
      
      // Fetch articles from all sources
      const articles = await this.articleFetcher.searchArticles(company, date, articleSources);
      
      // Extract mentions from articles
      let totalMentions = 0;
      for (const article of articles) {
        const mentions = this.mentionExtractor.extractMentions(article, [company]);
        totalMentions += mentions.length;
      }
      const mentionCount = totalMentions;
      
      // Create and save daily snapshot
      const snapshot: DailySnapshot = {
        company,
        date,
        mentionCount,
        articles,
        status: 'complete'
      };
      
      await this.dataStore.saveDailySnapshot(snapshot);
      
      console.log(`    Found ${mentionCount} mentions in ${articles.length} articles`);
      
    } catch (error) {
      // Check if this is a blocking error that should stop all searches
      if (error instanceof Error && error.message.includes('BLOCKED')) {
        console.error('Blocking detected, stopping all searches');
        throw error;
      }
      
      // For other errors, re-throw to be handled by the caller
      throw error;
    }
  }

  /**
   * Analyzes trends for all companies
   */
  private async analyzeTrendsForAllCompanies(companies: string[]): Promise<TrendAnalysis[]> {
    const analyses: TrendAnalysis[] = [];
    
    for (const company of companies) {
      try {
        const snapshots = await this.dataStore.getAllSnapshots(company);
        
        if (snapshots.length > 0) {
          const analysis = this.trendAnalyzer.analyzeTrend(snapshots);
          analyses.push(analysis);
        } else {
          // Create empty analysis for companies with no data
          const emptyAnalysis: TrendAnalysis = {
            company,
            classification: 'stable',
            statistics: {
              totalMentions: 0,
              averageDaily: 0,
              percentageChange: 0,
              standardDeviation: 0
            },
            dailyBreakdown: []
          };
          analyses.push(emptyAnalysis);
        }
        
      } catch (error) {
        const errorMessage = `Failed to analyze trends for ${company}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        await this.errorLogger.logSystemError(errorMessage, { 
          operation: 'SearchEngine.analyzeTrendsForAllCompanies',
          company 
        });
        
        // Add error to search errors for reporting
        this.addSearchError(company, errorMessage);
      }
    }
    
    return analyses;
  }

  /**
   * Generates array of dates for the search period
   */
  private generateSearchDays(searchPeriod: { startDate: Date; endDate: Date }): Date[] {
    const days: Date[] = [];
    const currentDate = new Date(searchPeriod.startDate);
    
    while (currentDate <= searchPeriod.endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Creates a failed snapshot when search fails for a company/day
   */
  private async createFailedSnapshot(company: string, date: Date): Promise<void> {
    try {
      const failedSnapshot: DailySnapshot = {
        company,
        date,
        mentionCount: 0,
        articles: [],
        status: 'failed'
      };
      
      await this.dataStore.saveDailySnapshot(failedSnapshot);
    } catch (error) {
      console.error(`Failed to create failed snapshot for ${company} on ${date.toDateString()}:`, error);
    }
  }

  /**
   * Logs search errors for a specific company and date
   */
  private async logSearchError(company: string, date: Date, errorMessage: string): Promise<void> {
    const contextMessage = `Search failed for ${company} on ${date.toDateString()}: ${errorMessage}`;
    await this.errorLogger.logNetworkError(contextMessage, { 
      operation: 'SearchEngine.searchCompanyForDay',
      company,
      date 
    });
    
    this.addSearchError(company, contextMessage);
  }

  /**
   * Adds an error to the search errors map for reporting
   */
  private addSearchError(company: string, errorMessage: string): void {
    if (!this.searchErrors.has(company)) {
      this.searchErrors.set(company, []);
    }
    this.searchErrors.get(company)!.push(errorMessage);
  }

  /**
   * Validates system configuration
   */
  private validateSystemConfig(config: SystemConfig): ValidationResult {
    // Use the configuration manager's validation
    const tempConfigManager = new ConfigurationManager();
    const companyValidation = tempConfigManager.validateCompanies(config.companies);
    
    if (!companyValidation.isValid) {
      return companyValidation;
    }
    
    // Additional validation for search engine requirements
    const errors: string[] = [];
    
    if (config.searchPeriodDays !== 7) {
      errors.push('Search period must be exactly 7 days');
    }
    
    if (!config.articleSources || config.articleSources.length === 0) {
      errors.push('At least one article source must be configured');
    }
    
    if (config.rateLimit <= 0) {
      errors.push('Rate limit must be positive');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Configures all components with the provided system configuration
   */
  private async configureComponents(config: SystemConfig): Promise<void> {
    // Configure companies
    const companyValidation = this.configManager.validateCompanies(config.companies);
    if (!companyValidation.isValid) {
      throw new Error(`Invalid companies: ${companyValidation.errors.join(', ')}`);
    }
    
    // Set search period (start date will be set when search is executed)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // Start 6 days ago for 7-day period ending today
    this.configManager.setSearchPeriod(startDate, config.searchPeriodDays);
    
    // Configure article sources
    this.configManager.configureSources(config.articleSources);
    
    // Configure rate limiting
    this.configManager.setRateLimit(config.rateLimit);
    this.articleFetcher.setRateLimit(config.rateLimit);
    
    // Validate final configuration
    const finalValidation = this.configManager.validateConfiguration();
    if (!finalValidation.isValid) {
      throw new Error(`Configuration validation failed: ${finalValidation.errors.join(', ')}`);
    }
  }

  /**
   * Resets progress tracking
   */
  private resetProgress(): void {
    this.currentProgress = {
      currentDay: 0,
      totalDays: 7,
      companiesCompleted: 0,
      totalCompanies: 5
    };
  }

  /**
   * Clears all stored data (useful for testing)
   */
  async clearData(): Promise<void> {
    await this.dataStore.clear();
    this.searchErrors.clear();
    this.resetProgress();
  }

  /**
   * Gets stored companies (useful for debugging)
   */
  async getStoredCompanies(): Promise<string[]> {
    return await this.dataStore.getStoredCompanies();
  }

  /**
   * Gets search errors for reporting
   */
  getSearchErrors(): Map<string, string[]> {
    return new Map(this.searchErrors);
  }
}