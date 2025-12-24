// Core data model types for Company Mention Tracker

// ============================================================================
// Core Data Interfaces
// ============================================================================

export interface Article {
  title: string;
  url: string;
  publishedDate: Date;
  source: string;
  excerpt: string;
}

export interface DailySnapshot {
  company: string;
  date: Date;
  mentionCount: number;
  articles: Article[];
  status: 'complete' | 'partial' | 'failed';
}

export interface TrendAnalysis {
  company: string;
  classification: TrendClassification;
  statistics: TrendStatistics;
  dailyBreakdown: DailyMentionCount[];
}

export type TrendClassification = 'increasing' | 'decreasing' | 'stable' | 'volatile';

export interface TrendStatistics {
  totalMentions: number;
  averageDaily: number;
  percentageChange: number;
  standardDeviation: number;
}

export interface DailyMentionCount {
  date: Date;
  count: number;
}

export interface Report {
  generatedAt: Date;
  searchPeriod: { startDate: Date; endDate: Date };
  companies: CompanyReport[];
  summary: ReportSummary;
}

export interface CompanyReport {
  company: string;
  trendAnalysis: TrendAnalysis;
  status: 'complete' | 'partial' | 'no data available';
}

export interface ReportSummary {
  totalArticlesFound: number;
  companiesWithIncreasingTrends: number;
  companiesWithDecreasingTrends: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CompanyConfig {
  name: string;
  aliases: string[];
}

export interface ArticleSource {
  name: string;
  type: 'api' | 'rss' | 'scraper';
  endpoint: string;
  apiKey?: string;
  rateLimit: number;
}

export interface SystemConfig {
  companies: string[];
  searchPeriodDays: number;
  articleSources: ArticleSource[];
  rateLimit: number;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface CompanyMention {
  company: string;
  article: Article;
  mentionCount: number;
}

export interface SearchResult {
  company: string;
  date: Date;
  articles: Article[];
  searchDuration: number;
  errors: SearchError[];
}

export interface SearchError {
  timestamp: Date;
  message: string;
  source: string;
  retryable: boolean;
}

export interface SearchProgress {
  currentDay: number;
  totalDays: number;
  companiesCompleted: number;
  totalCompanies: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StoredData {
  version: string;
  companies: string[];
  searchPeriod: { start: Date; end: Date };
  snapshots: Map<string, DailySnapshot[]>;
  metadata: {
    createdAt: Date;
    lastUpdated: Date;
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a company name according to requirements 1.1, 1.2
 * Company names must be non-empty and contain valid characters
 */
export function validateCompanyName(name: string): ValidationResult {
  const errors: string[] = [];

  // Check if name is empty or only whitespace
  if (!name || name.trim().length === 0) {
    errors.push('Company name cannot be empty');
  }

  // Check for valid characters (letters, numbers, spaces, hyphens, periods, apostrophes)
  const validCharPattern = /^[a-zA-Z0-9\s\-\.'&]+$/;
  if (name && !validCharPattern.test(name)) {
    errors.push('Company name contains invalid characters');
  }

  // Check reasonable length limits
  if (name && name.length > 100) {
    errors.push('Company name is too long (maximum 100 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a list of company names according to requirements 1.1, 1.2, 1.3
 * Must be exactly 5 companies, all valid, and no duplicates
 */
export function validateCompanyList(companies: string[]): ValidationResult {
  const errors: string[] = [];

  // Check if exactly 5 companies (requirement 1.1)
  if (companies.length !== 5) {
    errors.push(`Must provide exactly 5 companies, got ${companies.length}`);
  }

  // Validate each company name
  companies.forEach((company, index) => {
    const validation = validateCompanyName(company);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        errors.push(`Company ${index + 1}: ${error}`);
      });
    }
  });

  // Check for duplicates (requirement 1.3)
  const normalizedNames = companies.map(name => name.trim().toLowerCase());
  const uniqueNames = new Set(normalizedNames);
  if (uniqueNames.size !== companies.length) {
    errors.push('Duplicate company names are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates system configuration according to requirement 1.4
 */
export function validateSystemConfig(config: SystemConfig): ValidationResult {
  const errors: string[] = [];

  // Validate company list
  const companyValidation = validateCompanyList(config.companies);
  if (!companyValidation.isValid) {
    errors.push(...companyValidation.errors);
  }

  // Validate search period
  if (config.searchPeriodDays !== 7) {
    errors.push('Search period must be exactly 7 days');
  }

  // Validate rate limit
  if (config.rateLimit <= 0) {
    errors.push('Rate limit must be positive');
  }

  // Validate article sources
  if (!config.articleSources || config.articleSources.length === 0) {
    errors.push('At least one article source must be configured');
  }

  config.articleSources?.forEach((source, index) => {
    if (!source.name || source.name.trim().length === 0) {
      errors.push(`Article source ${index + 1}: Name is required`);
    }
    if (!['api', 'rss', 'scraper'].includes(source.type)) {
      errors.push(`Article source ${index + 1}: Invalid type '${source.type}'`);
    }
    if (!source.endpoint || source.endpoint.trim().length === 0) {
      errors.push(`Article source ${index + 1}: Endpoint is required`);
    }
    if (source.rateLimit <= 0) {
      errors.push(`Article source ${index + 1}: Rate limit must be positive`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Serialization/Deserialization Functions
// ============================================================================

/**
 * Serializes data models to JSON-compatible format
 * Handles Date objects by converting to ISO strings
 */
export function serializeData<T>(data: T): string {
  return JSON.stringify(data, (_key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    return value;
  });
}

/**
 * Deserializes JSON data back to typed objects
 * Handles Date strings by converting back to Date objects
 */
export function deserializeData<T>(jsonString: string, dateFields: string[] = []): T {
  return JSON.parse(jsonString, (key, value) => {
    // Convert ISO date strings back to Date objects
    if (dateFields.includes(key) || 
        (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
      return new Date(value);
    }
    return value;
  });
}

/**
 * Serializes a DailySnapshot for storage
 */
export function serializeDailySnapshot(snapshot: DailySnapshot): string {
  return serializeData(snapshot);
}

/**
 * Deserializes a DailySnapshot from storage
 */
export function deserializeDailySnapshot(jsonString: string): DailySnapshot {
  return deserializeData<DailySnapshot>(jsonString, ['date', 'publishedDate']);
}

/**
 * Serializes a Report for storage or transmission
 */
export function serializeReport(report: Report): string {
  return serializeData(report);
}

/**
 * Deserializes a Report from storage or transmission
 */
export function deserializeReport(jsonString: string): Report {
  return deserializeData<Report>(jsonString, ['generatedAt', 'startDate', 'endDate', 'date']);
}

/**
 * Serializes StoredData for persistence
 */
export function serializeStoredData(data: StoredData): string {
  return serializeData(data);
}

/**
 * Deserializes StoredData from persistence
 */
export function deserializeStoredData(jsonString: string): StoredData {
  const parsed = deserializeData<any>(jsonString, ['start', 'end', 'createdAt', 'lastUpdated', 'date']);
  
  // Convert snapshots object back to Map
  if (parsed.snapshots && typeof parsed.snapshots === 'object') {
    parsed.snapshots = new Map(Object.entries(parsed.snapshots));
  }
  
  return parsed as StoredData;
}
