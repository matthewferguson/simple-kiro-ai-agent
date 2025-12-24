# Design Document: Company Mention Tracker

## Overview

The Company Mention Tracker is an AI agent system that monitors online articles for mentions of 5 specified companies over a 7-day period and generates trend reports. The system uses a modular architecture with separate components for configuration, article searching, data collection, trend analysis, and reporting.

The system will leverage web search APIs or RSS feeds to find articles, parse content for company mentions, store daily snapshots, and analyze trends using statistical methods. The design emphasizes reliability, rate limiting, and graceful error handling.

## Architecture

The system follows a pipeline architecture with the following stages:

1. **Configuration Stage**: Validates and stores company names and search parameters
2. **Search Stage**: Queries article sources for each company across the 7-day period
3. **Collection Stage**: Extracts and stores mention data from found articles
4. **Analysis Stage**: Calculates trends and patterns from collected data
5. **Reporting Stage**: Generates comprehensive reports with visualizations

### Component Diagram

```
┌─────────────────┐
│  Configuration  │
│    Manager      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Search Engine  │─────▶│  Article     │
│                 │      │  Fetcher     │
└────────┬────────┘      └──────┬───────┘
         │                      │
         ▼                      ▼
┌─────────────────┐      ┌──────────────┐
│  Data Store     │◀─────│  Mention     │
│                 │      │  Extractor   │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  Trend Analyzer │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Report         │
│  Generator      │
└─────────────────┘
```

## Components and Interfaces

### 1. Configuration Manager

**Responsibility**: Validates and manages system configuration including company names and search parameters.

**Interface**:
```typescript
interface ConfigurationManager {
  validateCompanies(companies: string[]): ValidationResult;
  getCompanies(): string[];
  setSearchPeriod(startDate: Date, days: number): void;
  getSearchPeriod(): { startDate: Date; endDate: Date };
  configureSources(sources: ArticleSource[]): void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### 2. Article Fetcher

**Responsibility**: Queries external article sources and retrieves articles containing company mentions.

**Interface**:
```typescript
interface ArticleFetcher {
  searchArticles(company: string, date: Date): Promise<Article[]>;
  setRateLimit(requestsPerMinute: number): void;
  retry(operation: () => Promise<any>, maxAttempts: number): Promise<any>;
}

interface Article {
  title: string;
  url: string;
  publishedDate: Date;
  source: string;
  excerpt: string;
}
```

### 3. Mention Extractor

**Responsibility**: Processes articles to identify and count company mentions.

**Interface**:
```typescript
interface MentionExtractor {
  extractMentions(article: Article, companies: string[]): CompanyMention[];
  countMentions(articles: Article[], company: string): number;
}

interface CompanyMention {
  company: string;
  article: Article;
  mentionCount: number;
}
```

### 4. Data Store

**Responsibility**: Persists daily snapshots and mention data for analysis.

**Interface**:
```typescript
interface DataStore {
  saveDailySnapshot(snapshot: DailySnapshot): Promise<void>;
  getDailySnapshot(company: string, date: Date): Promise<DailySnapshot | null>;
  getAllSnapshots(company: string): Promise<DailySnapshot[]>;
  clear(): Promise<void>;
}

interface DailySnapshot {
  company: string;
  date: Date;
  mentionCount: number;
  articles: Article[];
  status: 'complete' | 'partial' | 'failed';
}
```

### 5. Trend Analyzer

**Responsibility**: Analyzes collected data to identify trends and patterns.

**Interface**:
```typescript
interface TrendAnalyzer {
  analyzeTrend(snapshots: DailySnapshot[]): TrendAnalysis;
  classifyTrend(snapshots: DailySnapshot[]): TrendClassification;
  calculateStatistics(snapshots: DailySnapshot[]): TrendStatistics;
}

interface TrendAnalysis {
  company: string;
  classification: TrendClassification;
  statistics: TrendStatistics;
  dailyBreakdown: DailyMentionCount[];
}

type TrendClassification = 'increasing' | 'decreasing' | 'stable' | 'volatile';

interface TrendStatistics {
  totalMentions: number;
  averageDaily: number;
  percentageChange: number;
  standardDeviation: number;
}

interface DailyMentionCount {
  date: Date;
  count: number;
}
```

### 6. Report Generator

**Responsibility**: Creates comprehensive reports from trend analysis data.

**Interface**:
```typescript
interface ReportGenerator {
  generateReport(analyses: TrendAnalysis[]): Report;
  formatReport(report: Report, format: 'text' | 'json' | 'html'): string;
}

interface Report {
  generatedAt: Date;
  searchPeriod: { startDate: Date; endDate: Date };
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

### 7. Search Engine (Orchestrator)

**Responsibility**: Coordinates the entire search and analysis pipeline.

**Interface**:
```typescript
interface SearchEngine {
  initialize(config: SystemConfig): Promise<void>;
  executeSearch(): Promise<Report>;
  getProgress(): SearchProgress;
}

interface SystemConfig {
  companies: string[];
  searchPeriodDays: number;
  articleSources: ArticleSource[];
  rateLimit: number;
}

interface SearchProgress {
  currentDay: number;
  totalDays: number;
  companiesCompleted: number;
  totalCompanies: number;
}
```

## Data Models

### Core Data Structures

```typescript
// Company configuration
interface CompanyConfig {
  name: string;
  aliases: string[]; // Alternative names to search for
}

// Article source configuration
interface ArticleSource {
  name: string;
  type: 'api' | 'rss' | 'scraper';
  endpoint: string;
  apiKey?: string;
  rateLimit: number;
}

// Search result
interface SearchResult {
  company: string;
  date: Date;
  articles: Article[];
  searchDuration: number;
  errors: SearchError[];
}

interface SearchError {
  timestamp: Date;
  message: string;
  source: string;
  retryable: boolean;
}

// Persistence model
interface StoredData {
  version: string;
  companies: string[];
  searchPeriod: { start: Date; end: Date };
  snapshots: Map<string, DailySnapshot[]>; // Key: company name
  metadata: {
    createdAt: Date;
    lastUpdated: Date;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Company list validation
*For any* list of company names, the system should accept it if and only if it contains exactly 5 unique, non-empty, valid company names.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Configuration round-trip
*For any* valid company configuration, storing and then retrieving the configuration should return the exact same company list.
**Validates: Requirements 1.4**

### Property 3: Complete search coverage
*For any* set of 5 companies and 7-day search period, the system should make search queries for each company on each of the 7 days.
**Validates: Requirements 2.1**

### Property 4: Search result relevance
*For any* company name and search results, all returned articles should contain the company name.
**Validates: Requirements 2.2**

### Property 5: Article data completeness
*For any* extracted article, it should contain all required fields: title, publication date, source URL, and excerpt.
**Validates: Requirements 2.3**

### Property 6: Daily snapshot persistence
*For any* completed search day, storing and retrieving the daily snapshot should preserve all data including timestamp, mention count, and articles.
**Validates: Requirements 2.4**

### Property 7: Retry behavior
*For any* simulated network error during search, the system should attempt exactly 3 retries before marking the search as failed.
**Validates: Requirements 2.5**

### Property 8: Mention counting correctness
*For any* set of articles and companies, the mention count for each company should equal the number of articles containing that company, with each article contributing exactly 1 mention per company it contains.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 9: Count-date-company association
*For any* daily mention count, retrieving it should return the correct count associated with the correct date and company.
**Validates: Requirements 3.4**

### Property 10: Trend calculation completeness
*For any* complete dataset of 7 days for 5 companies, each company should have a trend classification calculated.
**Validates: Requirements 4.1, 4.2**

### Property 11: Trend classification validity
*For any* trend calculation, the result should be exactly one of: "increasing", "decreasing", "stable", or "volatile", and should follow the classification rules: stable when variance < 10%, increasing when growth > 20%, decreasing when decline > 20%, and volatile otherwise.
**Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7**

### Property 12: Report completeness
*For any* completed search period, the generated report should contain exactly 5 company entries, each with company name, total mentions, daily breakdown, and trend classification.
**Validates: Requirements 5.1, 5.2**

### Property 13: Chronological ordering
*For any* daily breakdown in a report, the days should be in chronological order (sorted by date ascending).
**Validates: Requirements 5.3**

### Property 14: Alphabetical tie-breaking
*For any* set of companies with equal total mention counts, they should be ordered alphabetically in the report.
**Validates: Requirements 5.5**

### Property 15: Error logging completeness
*For any* search failure, the error log should contain both the timestamp and the company name.
**Validates: Requirements 6.1**

### Property 16: Partial data reporting accuracy
*For any* dataset with partial failures, the report should correctly indicate the status (complete/partial/failed) for each day and company.
**Validates: Requirements 6.2**

### Property 17: Graceful continuation on source failure
*For any* article source failure, the system should continue processing remaining companies and include all companies in the final report.
**Validates: Requirements 6.4**

### Property 18: Source configuration acceptance
*For any* valid article source configuration, the system should accept and store it for use during searches.
**Validates: Requirements 7.1**

### Property 19: Source validation
*For any* configured article source, the system should validate URL accessibility before beginning searches.
**Validates: Requirements 7.3**

### Property 20: Multi-source aggregation
*For any* set of configured article sources, search results should include articles from all accessible sources.
**Validates: Requirements 7.4**

### Property 21: Rate limit compliance
*For any* sequence of requests to article sources, the request rate should not exceed the configured rate limit, and when limits are encountered, the system should wait before retrying and distribute requests over time.
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 22: Block detection and response
*For any* detected blocking by an article source, the system should pause searches and notify the user.
**Validates: Requirements 8.4**

## Error Handling

### Error Categories

1. **Configuration Errors**
   - Invalid company names (empty, special characters)
   - Wrong number of companies (not exactly 5)
   - Duplicate company names
   - Invalid article source configuration

2. **Network Errors**
   - Connection timeouts
   - DNS resolution failures
   - HTTP errors (4xx, 5xx)
   - Rate limiting (429 Too Many Requests)

3. **Data Errors**
   - Malformed article data
   - Missing required fields
   - Invalid date formats
   - Parsing failures

4. **System Errors**
   - Storage failures
   - Memory exhaustion
   - Unexpected exceptions

### Error Handling Strategies

**Retry Logic**:
- Network errors: Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Rate limit errors: Wait for the duration specified in Retry-After header
- Transient errors: Retry with backoff
- Permanent errors: Fail immediately and log

**Graceful Degradation**:
- If one article source fails, continue with other sources
- If one company's search fails, continue with other companies
- If one day's search fails, continue with other days
- Generate partial reports when complete data is unavailable

**Error Reporting**:
- Log all errors with timestamp, context, and stack trace
- Include error summary in final report
- Distinguish between retryable and permanent errors
- Provide actionable error messages to users

**Data Integrity**:
- Validate all data before storage
- Use transactions where applicable
- Mark incomplete data with appropriate status flags
- Never silently discard errors

## Testing Strategy

### Unit Testing

The system will use unit tests to verify specific behaviors and edge cases:

1. **Configuration validation**: Test empty strings, special characters, duplicate detection
2. **Date handling**: Test boundary dates, timezone handling, date arithmetic
3. **Trend classification**: Test specific examples of each trend type
4. **Error handling**: Test specific error scenarios and recovery
5. **Report formatting**: Test report structure with known data

### Property-Based Testing

The system will use **fast-check** (for TypeScript/JavaScript) as the property-based testing library. Each property-based test will:

- Run a minimum of 100 iterations to ensure thorough coverage
- Be tagged with a comment explicitly referencing the correctness property from this design document
- Use the format: `// Feature: company-mention-tracker, Property {number}: {property_text}`
- Generate random but valid inputs to test universal properties

Property-based tests will verify:

1. **Configuration properties**: Valid/invalid company lists, round-trip persistence
2. **Search properties**: Coverage completeness, result relevance
3. **Counting properties**: Mention counting across various article distributions
4. **Trend properties**: Classification correctness across all data patterns
5. **Report properties**: Completeness, ordering, tie-breaking
6. **Error properties**: Retry behavior, graceful degradation
7. **Rate limiting properties**: Request distribution, limit compliance

### Integration Testing

Integration tests will verify:

1. End-to-end search pipeline with mock article sources
2. Data flow from search through analysis to reporting
3. Error propagation and recovery across components
4. Rate limiting behavior with simulated API responses

### Test Data Strategy

- Use mock article sources for predictable testing
- Generate synthetic article data with known mention patterns
- Create test scenarios for each trend classification type
- Simulate various error conditions (network failures, rate limits, etc.)

## Implementation Notes

### Article Source Options

The system should support multiple article source types:

1. **News APIs**: Google News API, NewsAPI.org, Bing News Search API
2. **RSS Feeds**: Aggregate from major news outlets
3. **Web Scraping**: As fallback, with proper rate limiting and robots.txt compliance

### Rate Limiting Implementation

- Use token bucket algorithm for rate limiting
- Implement per-source rate limits
- Add jitter to avoid thundering herd
- Respect Retry-After headers from APIs

### Data Storage

- Use JSON files for simple persistence (suitable for 7 days of data)
- Structure: One file per company with daily snapshots
- Alternative: SQLite for more complex queries

### Trend Analysis Algorithm

```
1. Calculate daily counts for all 7 days
2. Compute percentage change from day 1 to day 7
3. Calculate standard deviation of daily counts
4. Apply classification rules:
   - If std_dev / mean < 0.1: "stable"
   - Else if percentage_change > 0.2: "increasing"
   - Else if percentage_change < -0.2: "decreasing"
   - Else: "volatile"
```

### Performance Considerations

- Parallel searches for different companies (with rate limiting)
- Cache article source responses when possible
- Limit article content size to prevent memory issues
- Stream large result sets rather than loading all in memory

### Security Considerations

- Validate and sanitize all company names to prevent injection
- Use HTTPS for all external requests
- Store API keys securely (environment variables)
- Implement request signing where required by APIs
- Respect robots.txt and terms of service
