import axios, { AxiosInstance } from 'axios';
import { Article, ArticleSource } from '../../models/types.js';

/**
 * NewsAPI.org integration for fetching real news articles
 * Implements the NewsAPI v2 Everything endpoint
 * Documentation: https://newsapi.org/docs/endpoints/everything
 */
export class NewsAPISource {
  private readonly httpClient: AxiosInstance;
  private readonly source: ArticleSource;

  constructor(source: ArticleSource) {
    if (!source.apiKey) {
      throw new Error('NewsAPI requires an API key');
    }

    this.source = source;
    this.httpClient = axios.create({
      baseURL: 'https://newsapi.org/v2',
      timeout: 30000,
      headers: {
        'X-API-Key': source.apiKey,
        'User-Agent': 'Company-Mention-Tracker/1.0.0'
      }
    });
  }

  /**
   * Searches for articles mentioning a company on a specific date
   * Uses NewsAPI's everything endpoint with date filtering
   */
  async searchArticles(company: string, date: Date): Promise<Article[]> {
    try {
      const params = this.buildSearchParams(company, date);
      const response = await this.httpClient.get('/everything', { params });

      return this.parseResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle specific NewsAPI error codes
        if (error.response?.status === 401) {
          throw new Error('Invalid NewsAPI key');
        }
        if (error.response?.status === 429) {
          throw new Error('NewsAPI rate limit exceeded');
        }
        if (error.response?.status === 426) {
          throw new Error('NewsAPI upgrade required');
        }
      }
      throw error;
    }
  }

  /**
   * Builds search parameters for NewsAPI request
   */
  private buildSearchParams(company: string, date: Date): Record<string, any> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return {
      q: `"${company}"`, // Use quotes for exact phrase matching
      from: dateStr,
      to: dateStr,
      sortBy: 'publishedAt',
      pageSize: 100, // Maximum allowed by NewsAPI
      language: 'en',
      // Exclude domains that are often low quality or duplicates
      excludeDomains: 'youtube.com,facebook.com,twitter.com,reddit.com'
    };
  }

  /**
   * Parses NewsAPI response into Article objects
   */
  private parseResponse(data: any): Article[] {
    const articles: Article[] = [];
    
    if (!data.articles || !Array.isArray(data.articles)) {
      return articles;
    }

    for (const item of data.articles) {
      try {
        // Skip articles with missing or invalid data
        if (!item.title || !item.url || !item.publishedAt) {
          continue;
        }

        // Skip articles marked as removed
        if (item.title === '[Removed]' || item.description === '[Removed]') {
          continue;
        }

        const article: Article = {
          title: this.cleanText(item.title),
          url: item.url,
          publishedDate: new Date(item.publishedAt),
          source: this.source.name,
          excerpt: this.cleanText(item.description || item.content?.substring(0, 200) || '')
        };

        // Validate the parsed article
        if (this.isValidArticle(article)) {
          articles.push(article);
        }
      } catch (error) {
        console.warn('Failed to parse NewsAPI article:', error);
      }
    }

    return articles;
  }

  /**
   * Cleans text content by removing unwanted characters and formatting
   */
  private cleanText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\[.*?\]/g, '') // Remove content in brackets like [+1234 chars]
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Validates that an article has all required fields
   */
  private isValidArticle(article: Article): boolean {
    return !!(
      article.title &&
      article.url &&
      article.source &&
      !isNaN(article.publishedDate.getTime()) &&
      this.isValidUrl(article.url)
    );
  }

  /**
   * Validates that a URL is properly formatted
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the article source configuration
   */
  getSource(): ArticleSource {
    return { ...this.source };
  }

  /**
   * Creates a NewsAPI source configuration
   */
  static createSource(apiKey: string, rateLimit: number = 100): ArticleSource {
    return {
      name: 'NewsAPI',
      type: 'api',
      endpoint: 'https://newsapi.org/v2/everything',
      apiKey,
      rateLimit
    };
  }

  /**
   * Validates NewsAPI configuration
   */
  static validateConfig(source: ArticleSource): string[] {
    const errors: string[] = [];

    if (source.type !== 'api') {
      errors.push('NewsAPI source must have type "api"');
    }

    if (!source.apiKey) {
      errors.push('NewsAPI requires an API key');
    }

    if (!source.endpoint || !source.endpoint.includes('newsapi.org')) {
      errors.push('NewsAPI endpoint must be a valid NewsAPI URL');
    }

    if (source.rateLimit > 1000) {
      errors.push('NewsAPI rate limit cannot exceed 1000 requests per hour for free tier');
    }

    return errors;
  }

  /**
   * Gets usage information for NewsAPI
   */
  static getUsageInfo(): string {
    return `
NewsAPI.org Integration:
- Free tier: 1,000 requests per month
- Developer tier: 500 requests per day
- Business tier: 250,000 requests per month
- Supports date filtering and language selection
- Returns up to 100 articles per request
- Requires API key from https://newsapi.org/register

Rate Limiting:
- Free tier: ~33 requests per day
- Developer tier: 500 requests per day
- Recommended rate limit: 100 requests per hour

Example configuration:
{
  "name": "NewsAPI",
  "type": "api",
  "endpoint": "https://newsapi.org/v2/everything",
  "apiKey": "your-api-key-here",
  "rateLimit": 100
}
    `.trim();
  }
}