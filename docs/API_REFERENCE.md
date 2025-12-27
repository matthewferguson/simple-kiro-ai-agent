# API Reference

This document provides detailed API reference for the Company Mention Tracker system components.

## Core Interfaces

### SystemConfig

Main configuration interface for the search engine.

```typescript
interface SystemConfig {
  companies: string[];           // Exactly 5 company names
  searchPeriodDays: number;     // Always 7 for current implementation
  articleSources: ArticleSource[]; // List of article sources to query
  rateLimit: number;            // Global rate limit (requests per minute)
}
```

### ArticleSource

Configuration for individual article sources.

```typescript
interface ArticleSource {
  name: string;        // Human-readable source name
  type: 'api' | 'rss' | 'scraper'; // Source type
  endpoint: string;    // URL endpoint for the source
  apiKey?: string;     // Optional API key for authenticated sources
  rateLimit: number;   // Source-specific rate limit
}
```

### Article

Represents a single news article.

```typescript
interface Article {
  title: string;       // Article headline
  url: string;         // Full URL to the article
  publishedDate: Date; // Publication date
  source: string;      // Source name (e.g., "Reuters")
  excerpt: string;     // Article excerpt or summary
}
```

### DailySnapshot

Daily mention data for a single company.

```typescript
interface DailySnapshot {
  company: string;     // Company name
  date: Date;          // Date of the snapshot
  mentionCount: number; // Number of mentions found
  articles: Article[]; // Articles containing mentions
  status: 'complete' | 'partial' | 'failed'; // Data collection status
}
```

### TrendAnalysis

Complete trend analysis for a company.

```typescript
interface TrendAnalysis {
  company: string;
  classification: TrendClassification;
  statistics: TrendStatistics;
  dailyBreakdown: DailyMentionCount[];
}

type TrendClassification = 'increasing' | 'decreasing' | 'stable' | 'volatile';

interface TrendStatistics {
  totalMentions: number;      // Sum of all mentions
  averageDaily: number;       // Average mentions per day
  percentageChange: number;   // Change from day 1 to day 7
  standardDeviation: number;  // Measure of daily variation
}

interface DailyMentionCount {
  date: Date;
  count: number;
}
```

### Report

Complete system report containing all analysis results.

```typescript
interface Report {
  generatedAt: Date;
  searchPeriod: {
    startDate: Date;
    endDate: Date;
  };
  companies: CompanyReport[];
  summary: ReportSummary;
}

interface CompanyReport {
  company: string;
  trendAnalysis: TrendAnalysis;
  status: 'complete' | 'partial' | 'no data available';
}

interface ReportSummary {
  totalArticlesFound: number;
  companiesWithIncreasingTrends: number;
  companiesWithDecreasingTrends: number;
}
```

## Core Services

### SearchEngine

Main orchestrator class that coordinates the entire search and analysis pipeline.

```typescript
class SearchEngine {
  constructor(dataDir: string);
  
  // Initialize the search engine with configuration
  async initialize(config: SystemConfig): Promise<void>;
  
  // Execute the complete search and analysis process
  async executeSearch(): Promise<Report>;
  
  // Get current search progress
  getProgress(): SearchProgress;
  
  // Clear all stored data
  async clearData(): Promise<void>;
}

interface SearchProgress {
  currentDay: number;      // Current day being processed (1-7)
  totalDays: number;       // Total days to process (always 7)
  companiesCompleted: number; // Companies completed in current day
  totalCompanies: number;  // Total companies (always 5)
}
```

#### Usage Example

```typescript
import { SearchEngine } from './services/SearchEngine.js';

const searchEngine = new SearchEngine('./data');

const config = {
  companies: ['Apple', 'Microsoft', 'Google', 'Amazon', 'Tesla'],
  searchPeriodDays: 7,
  articleSources: [
    {
      name: 'NewsAPI',
      type: 'api',
      endpoint: 'https://newsapi.org/v2/everything',
      apiKey: 'your-api-key',
      rateLimit: 100
    }
  ],
  rateLimit: 30
};

await searchEngine.initialize(config);
const report = await searchEngine.executeSearch();
```

### ConfigurationManager

Validates and manages system configuration.

```typescript
class ConfigurationManager {
  // Validate company names according to requirements
  validateCompanies(companies: string[]): ValidationResult;
  
  // Get validated company list
  getCompanies(): string[];
  
  // Set search period (always 7 days from start date)
  setSearchPeriod(startDate: Date, days: number): void;
  
  // Get current search period
  getSearchPeriod(): { startDate: Date; endDate: Date };
  
  // Configure article sources
  configureSources(sources: ArticleSource[]): void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

#### Validation Rules

- Exactly 5 companies required
- Company names must be non-empty
- No duplicate company names
- Valid characters only (letters, numbers, spaces, hyphens, periods, apostrophes, ampersands)
- Maximum 100 characters per company name

### ArticleFetcher

Handles HTTP requests to article sources with rate limiting and retry logic.

```typescript
class ArticleFetcher {
  constructor(sources: ArticleSource[]);
  
  // Search for articles mentioning a company on a specific date
  async searchArticles(company: string, date: Date): Promise<Article[]>;
  
  // Set global rate limit
  setRateLimit(requestsPerMinute: number): void;
  
  // Retry failed operations with exponential backoff
  async retry<T>(operation: () => Promise<T>, maxAttempts: number): Promise<T>;
}
```

#### Rate Limiting

- Token bucket algorithm implementation
- Per-source rate limiting
- Exponential backoff for retries (1s, 2s, 4s)
- Respects Retry-After headers

### MentionExtractor

Processes articles to identify and count company mentions.

```typescript
class MentionExtractor {
  // Extract mentions from a single article
  extractMentions(article: Article, companies: string[]): CompanyMention[];
  
  // Count total mentions for a company in a set of articles
  countMentions(articles: Article[], company: string): number;
}

interface CompanyMention {
  company: string;
  article: Article;
  mentionCount: number; // Always 1 per article per company
}
```

#### Mention Counting Rules

- One mention per article per company maximum
- Case-insensitive matching
- Whole word matching (avoids partial matches)
- Multiple companies can be mentioned in the same article

### DataStore

Persists daily snapshots and provides data retrieval methods.

```typescript
class DataStore {
  constructor(dataDir: string);
  
  // Save a daily snapshot to disk
  async saveDailySnapshot(snapshot: DailySnapshot): Promise<void>;
  
  // Retrieve a specific daily snapshot
  async getDailySnapshot(company: string, date: Date): Promise<DailySnapshot | null>;
  
  // Get all snapshots for a company
  async getAllSnapshots(company: string): Promise<DailySnapshot[]>;
  
  // Clear all stored data
  async clear(): Promise<void>;
}
```

#### Storage Structure

```
data/
├── Apple/
│   ├── 2025-12-21.json
│   ├── 2025-12-22.json
│   └── ...
├── Microsoft/
└── ...
```

### TrendAnalyzer

Analyzes collected data to identify trends and calculate statistics.

```typescript
class TrendAnalyzer {
  // Analyze trend for a single company
  analyzeTrend(snapshots: DailySnapshot[]): TrendAnalysis;
  
  // Classify trend based on statistical analysis
  classifyTrend(snapshots: DailySnapshot[]): TrendClassification;
  
  // Calculate statistical measures
  calculateStatistics(snapshots: DailySnapshot[]): TrendStatistics;
}
```

#### Trend Classification Algorithm

```typescript
// Pseudocode for trend classification
function classifyTrend(snapshots: DailySnapshot[]): TrendClassification {
  const counts = snapshots.map(s => s.mentionCount);
  const stdDev = calculateStandardDeviation(counts);
  const mean = calculateMean(counts);
  const percentageChange = ((counts[6] - counts[0]) / counts[0]) * 100;
  
  if (stdDev / mean < 0.1) {
    return 'stable';
  } else if (percentageChange > 20) {
    return 'increasing';
  } else if (percentageChange < -20) {
    return 'decreasing';
  } else {
    return 'volatile';
  }
}
```

### ReportGenerator

Creates comprehensive reports from trend analysis data.

```typescript
class ReportGenerator {
  // Generate complete report from trend analyses
  generateReport(analyses: TrendAnalysis[]): Report;
  
  // Format report in specified format
  formatReport(report: Report, format: 'text' | 'json' | 'html'): string;
}
```

#### Report Formatting

- **JSON**: Structured data for programmatic processing
- **Text**: Human-readable plain text format
- **HTML**: Styled web page with tables and color coding

## Article Source Implementations

### NewsAPISource

Implementation for NewsAPI.org integration.

```typescript
class NewsAPISource implements ArticleSourceInstance {
  constructor(source: ArticleSource);
  
  async searchArticles(company: string, date: Date): Promise<Article[]>;
  getSource(): ArticleSource;
}
```

#### API Parameters

- `q`: Search query (company name)
- `from`: Start date (YYYY-MM-DD)
- `to`: End date (YYYY-MM-DD)
- `sortBy`: Sort order (publishedAt)
- `pageSize`: Results per page (100 max)

### RSSFeedSource

Implementation for RSS/Atom feed parsing.

```typescript
class RSSFeedSource implements ArticleSourceInstance {
  constructor(source: ArticleSource);
  
  async searchArticles(company: string, date: Date): Promise<Article[]>;
  getSource(): ArticleSource;
}
```

#### Supported Formats

- RSS 2.0
- Atom 1.0
- Custom XML formats with standard elements

### MockArticleSource

Mock implementation for testing and development.

```typescript
class MockArticleSource implements ArticleSourceInstance {
  constructor(source: ArticleSource);
  
  async searchArticles(company: string, date: Date): Promise<Article[]>;
  getSource(): ArticleSource;
}
```

#### Mock Data Generation

- Predictable article generation based on company and date
- Configurable mention patterns
- No external dependencies

## Utility Functions

### Error Handling

```typescript
class ErrorHandler {
  static isRetryableError(error: Error): boolean;
  static getRetryDelay(attempt: number): number;
  static formatError(error: Error): string;
}

class ErrorLogger {
  static logError(error: Error, context: string): void;
  static getErrorLogs(): ErrorLog[];
}

interface ErrorLog {
  timestamp: Date;
  message: string;
  context: string;
  stack?: string;
}
```

### Source Configuration Helper

```typescript
class SourceConfigHelper {
  // Get environment-specific configuration
  static async getEnvironmentConfig(env: string): Promise<ArticleSource[]>;
  
  // Create NewsAPI source with environment variable
  static createNewsAPISource(): ArticleSource;
  
  // Get recommended configuration based on requirements
  static getRecommendedConfig(requirements: ConfigRequirements): ArticleSource[];
  
  // Validate source connectivity
  static async validateSourceConnectivity(sources: ArticleSource[]): Promise<ValidationResult>;
}

interface ConfigRequirements {
  budget: 'free' | 'paid' | 'premium';
  volume: 'low' | 'medium' | 'high';
  hasNewsAPIKey: boolean;
}
```

## CLI Interface

### Command Structure

```typescript
// Main CLI program
program
  .name('company-mention-tracker')
  .description('AI agent system for company mention tracking')
  .version('1.0.0');

// Search command
program
  .command('search')
  .description('Search for company mentions and generate trend report')
  .requiredOption('-c, --companies <companies...>', 'List of exactly 5 company names')
  .option('-o, --output <file>', 'Output file for the report')
  .option('-f, --format <format>', 'Report format: json, text, html')
  .option('-r, --rate-limit <number>', 'Rate limit for API requests per minute')
  .option('-d, --data-dir <directory>', 'Directory to store data files')
  .option('--sources <sources...>', 'Custom article source configurations')
  .action(async (options) => { /* implementation */ });

// Validate command
program
  .command('validate')
  .description('Validate company names without running search')
  .requiredOption('-c, --companies <companies...>', 'List of company names to validate')
  .action((options) => { /* implementation */ });

// Clear data command
program
  .command('clear-data')
  .description('Clear all stored data')
  .option('-d, --data-dir <directory>', 'Directory containing data files')
  .action(async (options) => { /* implementation */ });
```

### CLI Functions

```typescript
// Parse and validate company names
function parseCompanies(companiesInput: string[]): string[];

// Parse article sources from JSON strings
function parseArticleSources(sourcesInput?: string[]): ArticleSource[];

// Display real-time progress
function displayProgress(progress: SearchProgress): void;

// Save report in specified format
async function saveReport(report: Report, outputFile: string, format: string): Promise<void>;

// Format report as plain text
function formatReportAsText(report: Report): string;

// Format report as HTML
function formatReportAsHtml(report: Report): string;

// Display report summary to console
function displayReportSummary(report: Report): void;
```

## Error Types

### Configuration Errors

```typescript
class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
```

### Network Errors

```typescript
class NetworkError extends Error {
  constructor(message: string, public statusCode?: number, public retryable: boolean = true) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### Rate Limit Errors

```typescript
class RateLimitError extends NetworkError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429, true);
    this.name = 'RateLimitError';
  }
}
```

### Data Errors

```typescript
class DataError extends Error {
  constructor(message: string, public data?: any) {
    super(message);
    this.name = 'DataError';
  }
}
```

## Constants

### Default Values

```typescript
export const DEFAULT_RATE_LIMIT = 10; // requests per minute
export const DEFAULT_DATA_DIR = './data';
export const DEFAULT_OUTPUT_FILE = 'report.json';
export const DEFAULT_OUTPUT_FORMAT = 'json';
export const SEARCH_PERIOD_DAYS = 7;
export const REQUIRED_COMPANY_COUNT = 5;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY = 1000; // milliseconds
```

### Validation Patterns

```typescript
export const VALID_COMPANY_NAME_PATTERN = /^[a-zA-Z0-9\s\-\.'&]+$/;
export const MAX_COMPANY_NAME_LENGTH = 100;
export const SUPPORTED_OUTPUT_FORMATS = ['json', 'text', 'html'];
export const SUPPORTED_SOURCE_TYPES = ['api', 'rss', 'scraper'];
```

## Type Guards

```typescript
// Type guard functions for runtime type checking
export function isArticleSource(obj: any): obj is ArticleSource;
export function isDailySnapshot(obj: any): obj is DailySnapshot;
export function isTrendAnalysis(obj: any): obj is TrendAnalysis;
export function isReport(obj: any): obj is Report;
export function isValidCompanyName(name: string): boolean;
export function isValidOutputFormat(format: string): format is 'json' | 'text' | 'html';
```

This API reference provides comprehensive documentation for all public interfaces, classes, and functions in the Company Mention Tracker system. Use this reference when integrating with the system programmatically or extending its functionality.