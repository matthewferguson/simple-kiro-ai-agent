/**
 * Article source implementations for Company Mention Tracker
 * 
 * This module provides various article source implementations:
 * - MockArticleSource: For testing and development
 * - NewsAPISource: Integration with NewsAPI.org
 * - RSSFeedSource: RSS/Atom feed parser
 */

export { MockArticleSource } from './MockArticleSource.js';
export { NewsAPISource } from './NewsAPISource.js';
export { RSSFeedSource } from './RSSFeedSource.js';

// Re-export types for convenience
export type { Article, ArticleSource } from '../../models/types.js';

/**
 * Factory function to create article source instances based on configuration
 */
import { ArticleSource } from '../../models/types.js';
import { MockArticleSource } from './MockArticleSource.js';
import { NewsAPISource } from './NewsAPISource.js';
import { RSSFeedSource } from './RSSFeedSource.js';

export interface ArticleSourceInstance {
  searchArticles(company: string, date: Date): Promise<import('../../models/types.js').Article[]>;
  getSource(): ArticleSource;
}

/**
 * Creates an article source instance based on the source configuration
 */
export function createArticleSource(source: ArticleSource): ArticleSourceInstance {
  switch (source.type) {
    case 'api':
      if (source.endpoint.includes('newsapi.org')) {
        return new NewsAPISource(source);
      } else if (source.endpoint.includes('mock-api') || source.endpoint.includes('example.com')) {
        return new MockArticleSource(source);
      } else {
        throw new Error(`Unsupported API source: ${source.endpoint}`);
      }
    
    case 'rss':
      if (source.endpoint.includes('mock-rss') || source.endpoint.includes('example.com')) {
        return new MockArticleSource(source);
      } else {
        return new RSSFeedSource(source);
      }
    
    case 'scraper':
      if (source.endpoint.includes('mock-scraper') || source.endpoint.includes('example.com')) {
        return new MockArticleSource(source);
      } else {
        throw new Error('Web scraping sources not yet implemented');
      }
    
    default:
      throw new Error(`Unsupported source type: ${(source as any).type}`);
  }
}

/**
 * Validates an article source configuration
 */
export function validateArticleSource(source: ArticleSource): string[] {
  const errors: string[] = [];

  // Basic validation
  if (!source.name || source.name.trim().length === 0) {
    errors.push('Source name is required');
  }

  if (!source.endpoint || source.endpoint.trim().length === 0) {
    errors.push('Source endpoint is required');
  }

  if (!['api', 'rss', 'scraper'].includes(source.type)) {
    errors.push(`Invalid source type: ${source.type}`);
  }

  if (source.rateLimit <= 0) {
    errors.push('Rate limit must be positive');
  }

  // Type-specific validation
  switch (source.type) {
    case 'api':
      if (source.endpoint.includes('newsapi.org')) {
        errors.push(...NewsAPISource.validateConfig(source));
      }
      break;
    
    case 'rss':
      errors.push(...RSSFeedSource.validateConfig(source));
      break;
    
    case 'scraper':
      // Scraper-specific validation would go here
      break;
  }

  return errors;
}

/**
 * Gets usage information for all supported source types
 */
export function getSourceUsageInfo(): Record<string, string> {
  return {
    newsapi: NewsAPISource.getUsageInfo(),
    rss: RSSFeedSource.getUsageInfo(),
    mock: `
Mock Article Source:
- For testing and development only
- Provides predictable test data
- High rate limits for fast testing
- Supports all 5 default companies (Apple, Microsoft, Google, Amazon, Tesla)
- No API key required

Example configuration:
{
  "name": "Mock News Source",
  "type": "api",
  "endpoint": "https://mock-api.example.com/articles",
  "rateLimit": 1000
}
    `.trim()
  };
}

/**
 * Creates default article source configurations for different environments
 */
export function getDefaultSourceConfigurations(): Record<string, ArticleSource[]> {
  return {
    development: [
      MockArticleSource.createMockSource('Development Mock Source')
    ],
    
    testing: MockArticleSource.createMultipleMockSources(),
    
    production: [
      ...RSSFeedSource.createCommonSources()
    ]
  };
}

/**
 * Loads article source configurations from JSON file
 */
export async function loadSourceConfigurations(configPath: string): Promise<Record<string, ArticleSource[]>> {
  try {
    const fs = await import('fs/promises');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    return config.configurations || {};
  } catch (error) {
    console.warn(`Failed to load source configurations from ${configPath}:`, error);
    return getDefaultSourceConfigurations();
  }
}