# Implementation Plan: Company Mention Tracker

## Overview

This implementation plan tracks the development of a Company Mention Tracker system. The system monitors online articles for mentions of 5 specified companies over a 7-day period and generates trend reports.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create directory structure for models, services, and utilities
  - Initialize TypeScript project with tsconfig.json
  - Install dependencies: fast-check for property testing, axios for HTTP requests, date-fns for date handling
  - Set up testing framework (Vitest)
  - _Requirements: All_

- [x] 2. Implement core data models and types
  - Define TypeScript interfaces for Article, DailySnapshot, TrendAnalysis, Report, and configuration types
  - Create validation functions for company names and configurations
  - Implement data model serialization/deserialization
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.1 Write property test for company list validation
  - **Property 1: Company list validation**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 2.2 Write property test for configuration round-trip
  - **Property 2: Configuration round-trip**
  - **Validates: Requirements 1.4**

- [x] 3. Implement Configuration Manager
  - Create ConfigurationManager class with validation logic
  - Implement company name validation (non-empty, valid characters, no duplicates)
  - Implement search period configuration
  - Add article source configuration management
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2_

- [x] 3.1 Write unit tests for Configuration Manager
  - Test empty company names, special characters, duplicate detection
  - Test exact count validation (must be 5 companies)
  - Test default source configuration
  - _Requirements: 1.1, 1.2, 1.3, 7.2_

- [x] 4. Implement Data Store
  - Create DataStore class for persisting daily snapshots
  - Implement file-based storage using JSON
  - Add methods for saving and retrieving daily snapshots
  - Implement query methods for getting all snapshots for a company
  - _Requirements: 2.4, 3.4_

- [x] 4.1 Write property test for daily snapshot persistence
  - **Property 6: Daily snapshot persistence**
  - **Validates: Requirements 2.4**

- [x] 4.2 Write property test for count-date-company association
  - **Property 9: Count-date-company association**
  - **Validates: Requirements 3.4**

- [x] 5. Implement Article Fetcher with rate limiting
  - Create ArticleFetcher class with HTTP client
  - Implement rate limiting using token bucket algorithm
  - Add retry logic with exponential backoff (up to 3 attempts)
  - Implement support for multiple article source types (API, RSS)
  - Add error handling for network failures and rate limits
  - _Requirements: 2.1, 2.2, 2.5, 8.1, 8.2, 8.3, 8.4_

- [x] 5.1 Write property test for retry behavior
  - **Property 7: Retry behavior**
  - **Validates: Requirements 2.5**

- [x] 5.2 Write property test for rate limit compliance
  - **Property 21: Rate limit compliance**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 5.3 Write property test for block detection
  - **Property 22: Block detection and response**
  - **Validates: Requirements 8.4**

- [x] 5.4 Write unit tests for Article Fetcher
  - Test exponential backoff timing
  - Test rate limit header parsing
  - Test request distribution over time
  - _Requirements: 2.5, 8.1, 8.2_

- [x] 6. Implement Mention Extractor
  - Create MentionExtractor class for processing articles
  - Implement article parsing to extract required fields (title, date, URL, excerpt)
  - Add mention counting logic (one mention per article per company)
  - Implement multi-company mention detection in single articles
  - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 6.1 Write property test for search result relevance
  - **Property 4: Search result relevance**
  - **Validates: Requirements 2.2**

- [x] 6.2 Write property test for article data completeness
  - **Property 5: Article data completeness**
  - **Validates: Requirements 2.3**

- [ ]* 6.3 Write property test for mention counting correctness
  - **Property 8: Mention counting correctness**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ]* 6.4 Write unit tests for Mention Extractor
  - Test article with multiple company mentions
  - Test article with no mentions
  - Test malformed article data handling
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. Implement Trend Analyzer
  - Create TrendAnalyzer class for analyzing mention trends
  - Implement trend classification algorithm (stable, increasing, decreasing, volatile)
  - Add statistical calculations (total mentions, average, percentage change, standard deviation)
  - Implement daily breakdown generation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 7.1 Write property test for trend calculation completeness
  - **Property 10: Trend calculation completeness**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 7.2 Write property test for trend classification validity
  - **Property 11: Trend classification validity**
  - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7**

- [ ]* 7.3 Write unit tests for Trend Analyzer
  - Test stable trend with low variance
  - Test increasing trend with > 20% growth
  - Test decreasing trend with > 20% decline
  - Test volatile trend with fluctuations
  - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [ ] 8. Implement Report Generator
  - Create ReportGenerator class for creating reports
  - Implement report data aggregation from trend analyses
  - Add report formatting (text, JSON, HTML)
  - Implement company ordering (by mentions, then alphabetically)
  - Add daily breakdown formatting in chronological order
  - Include error and status information in reports
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 6.2, 6.3_

- [ ]* 8.1 Write property test for report completeness
  - **Property 12: Report completeness**
  - **Validates: Requirements 5.1, 5.2**

- [ ]* 8.2 Write property test for chronological ordering
  - **Property 13: Chronological ordering**
  - **Validates: Requirements 5.3**

- [ ]* 8.3 Write property test for alphabetical tie-breaking
  - **Property 14: Alphabetical tie-breaking**
  - **Validates: Requirements 5.5**

- [ ]* 8.4 Write property test for partial data reporting accuracy
  - **Property 16: Partial data reporting accuracy**
  - **Validates: Requirements 6.2**

- [ ]* 8.5 Write unit tests for Report Generator
  - Test report with complete data
  - Test report with partial failures
  - Test report with all failures for one company
  - Test company ordering with ties
  - _Requirements: 5.5, 6.2, 6.3_

- [ ] 9. Implement error handling and logging
  - Create error logging utility with timestamp and context
  - Implement error classification (retryable vs permanent)
  - Add graceful degradation for source failures
  - Implement error aggregation for reports
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 9.1 Write property test for error logging completeness
  - **Property 15: Error logging completeness**
  - **Validates: Requirements 6.1**

- [ ]* 9.2 Write property test for graceful continuation
  - **Property 17: Graceful continuation on source failure**
  - **Validates: Requirements 6.4**

- [ ] 10. Implement Search Engine orchestrator
  - Create SearchEngine class to coordinate the pipeline
  - Implement initialization with system configuration
  - Add search execution logic that iterates through companies and days
  - Implement progress tracking
  - Wire together all components (fetcher, extractor, store, analyzer, reporter)
  - Add complete search coverage logic (all companies, all days)
  - _Requirements: 2.1, 4.1_

- [ ]* 10.1 Write property test for complete search coverage
  - **Property 3: Complete search coverage**
  - **Validates: Requirements 2.1**

- [ ]* 10.2 Write property test for source configuration acceptance
  - **Property 18: Source configuration acceptance**
  - **Validates: Requirements 7.1**

- [ ]* 10.3 Write property test for source validation
  - **Property 19: Source validation**
  - **Validates: Requirements 7.3**

- [ ]* 10.4 Write property test for multi-source aggregation
  - **Property 20: Multi-source aggregation**
  - **Validates: Requirements 7.4**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Create CLI interface
  - Implement command-line interface for running searches
  - Add argument parsing for company names and configuration
  - Implement progress display during search execution
  - Add report output to console and file
  - _Requirements: 1.1, 5.4_

- [ ]* 12.1 Write integration tests for CLI
  - Test end-to-end search with mock article sources
  - Test error handling and reporting
  - Test progress tracking
  - _Requirements: All_

- [ ] 13. Add example article source implementations
  - Create mock article source for testing
  - Add example API integration (e.g., NewsAPI.org)
  - Implement RSS feed parser
  - Add configuration examples for different sources
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 13.1 Write integration tests for article sources
  - Test mock source with known data
  - Test API source with rate limiting
  - Test RSS feed parsing
  - Test multi-source aggregation
  - _Requirements: 7.4, 8.1_

- [ ] 14. Create documentation and examples
  - Write README with setup instructions
  - Add usage examples for different scenarios
  - Document configuration options
  - Include example output reports
  - _Requirements: All_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
