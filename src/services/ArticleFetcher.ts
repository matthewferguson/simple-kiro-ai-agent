import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { Article, ArticleSource, SearchError } from '../models/types.js';

/**
 * Token bucket implementation for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Attempts to consume a token from the bucket
   * Returns true if token was available, false otherwise
   */
  consume(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Returns the time in milliseconds until a token will be available
   */
  timeUntilToken(): number {
    this.refill();
    
    if (this.tokens >= 1) {
      return 0;
    }
    
    // Calculate time needed for next token
    return Math.ceil((1 - this.tokens) / this.refillRate * 1000);
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * ArticleFetcher handles searching for articles from various sources
 * with rate limiting, retry logic, and error handling
 */
export class ArticleFetcher {
  private httpClient: AxiosInstance;
  private rateLimiters: Map<string, TokenBucket> = new Map();
  private defaultRateLimit: number = 60; // requests per minute

  constructor() {
    this.httpClient = axios.create({
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Company-Mention-Tracker/1.0.0'
      }
    });
  }

  /**
   * Sets the default rate limit for requests
   * @param requestsPerMinute Number of requests allowed per minute
   */
  setRateLimit(requestsPerMinute: number): void {
    if (requestsPerMinute <= 0) {
      throw new Error('Rate limit must be positive');
    }
    this.defaultRateLimit = requestsPerMinute;
  }

  /**
   * Searches for articles mentioning a company on a specific date
   * @param company Company name to search for
   * @param date Date to search for articles
   * @param sources Article sources to search
   * @returns Promise resolving to array of articles
   */
  async searchArticles(company: string, date: Date, sources: ArticleSource[]): Promise<Article[]> {
    const allArticles: Article[] = [];
    const errors: SearchError[] = [];

    for (const source of sources) {
      try {
        const articles = await this.searchSingleSource(company, date, source);
        allArticles.push(...articles);
      } catch (error) {
        const searchError: SearchError = {
          timestamp: new Date(),
          message: error instanceof Error ? error.message : 'Unknown error',
          source: source.name,
          retryable: this.isRetryableError(error)
        };
        errors.push(searchError);
        
        // Log error but continue with other sources
        console.error(`Error searching ${source.name} for ${company}:`, searchError.message);
      }
    }

    return allArticles;
  }

  /**
   * Searches a single article source for company mentions
   */
  private async searchSingleSource(company: string, date: Date, source: ArticleSource): Promise<Article[]> {
    // Apply rate limiting
    await this.waitForRateLimit(source);

    // Perform search with retry logic
    return await this.retry(
      () => this.performSearch(company, date, source),
      3 // max attempts
    );
  }

  /**
   * Performs the actual search request to an article source
   */
  private async performSearch(company: string, date: Date, source: ArticleSource): Promise<Article[]> {
    switch (source.type) {
      case 'api':
        return await this.searchAPI(company, date, source);
      case 'rss':
        return await this.searchRSS(company, date, source);
      case 'scraper':
        return await this.searchScraper(company, date, source);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Searches an API-based article source
   */
  private async searchAPI(company: string, date: Date, source: ArticleSource): Promise<Article[]> {
    const params = this.buildAPIParams(company, date, source);
    const headers = this.buildAPIHeaders(source);

    const response = await this.httpClient.get(source.endpoint, {
      params,
      headers
    });

    return this.parseAPIResponse(response, source);
  }

  /**
   * Searches an RSS feed for articles
   */
  private async searchRSS(company: string, date: Date, source: ArticleSource): Promise<Article[]> {
    const response = await this.httpClient.get(source.endpoint);
    return this.parseRSSResponse(response, company, date, source);
  }

  /**
   * Searches using web scraping
   */
  private async searchScraper(company: string, date: Date, source: ArticleSource): Promise<Article[]> {
    // For now, return empty array - scraping implementation would be source-specific
    console.warn(`Scraper source type not yet implemented for ${source.name}`);
    return [];
  }

  /**
   * Builds API parameters for search request
   */
  private buildAPIParams(company: string, date: Date, source: ArticleSource): Record<string, any> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Generic parameters - would need customization per API
    return {
      q: company,
      from: dateStr,
      to: dateStr,
      sortBy: 'publishedAt',
      pageSize: 100
    };
  }

  /**
   * Builds API headers including authentication
   */
  private buildAPIHeaders(source: ArticleSource): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (source.apiKey) {
      // Common API key header patterns
      headers['X-API-Key'] = source.apiKey;
      headers['Authorization'] = `Bearer ${source.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Parses API response into Article objects
   */
  private parseAPIResponse(response: AxiosResponse, source: ArticleSource): Article[] {
    const articles: Article[] = [];
    
    // Generic parsing - would need customization per API
    const data = response.data;
    const articlesData = data.articles || data.results || data.items || [];
    
    for (const item of articlesData) {
      try {
        const article: Article = {
          title: item.title || '',
          url: item.url || item.link || '',
          publishedDate: new Date(item.publishedAt || item.pubDate || item.published),
          source: source.name,
          excerpt: item.description || item.summary || item.content?.substring(0, 200) || ''
        };
        
        // Validate required fields
        if (article.title && article.url && !isNaN(article.publishedDate.getTime())) {
          articles.push(article);
        }
      } catch (error) {
        console.warn(`Failed to parse article from ${source.name}:`, error);
      }
    }
    
    return articles;
  }

  /**
   * Parses RSS response into Article objects
   */
  private parseRSSResponse(response: AxiosResponse, company: string, date: Date, source: ArticleSource): Article[] {
    const articles: Article[] = [];
    const xmlContent = response.data;
    
    // Basic RSS parsing - would need proper XML parser for production
    // This is a simplified implementation for demonstration
    const itemMatches = xmlContent.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    for (const itemXml of itemMatches) {
      try {
        const title = this.extractXMLValue(itemXml, 'title');
        const link = this.extractXMLValue(itemXml, 'link');
        const pubDate = this.extractXMLValue(itemXml, 'pubDate');
        const description = this.extractXMLValue(itemXml, 'description');
        
        // Check if article mentions the company
        const fullText = `${title} ${description}`.toLowerCase();
        if (!fullText.includes(company.toLowerCase())) {
          continue;
        }
        
        const article: Article = {
          title: title || '',
          url: link || '',
          publishedDate: new Date(pubDate || date),
          source: source.name,
          excerpt: description || ''
        };
        
        // Validate required fields
        if (article.title && article.url && !isNaN(article.publishedDate.getTime())) {
          articles.push(article);
        }
      } catch (error) {
        console.warn(`Failed to parse RSS item from ${source.name}:`, error);
      }
    }
    
    return articles;
  }

  /**
   * Extracts value from XML tag
   */
  private extractXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Waits for rate limit before making request
   */
  private async waitForRateLimit(source: ArticleSource): Promise<void> {
    const sourceKey = source.name;
    let rateLimiter = this.rateLimiters.get(sourceKey);
    
    if (!rateLimiter) {
      const rateLimit = source.rateLimit || this.defaultRateLimit;
      const tokensPerSecond = rateLimit / 60; // convert per minute to per second
      rateLimiter = new TokenBucket(rateLimit, tokensPerSecond);
      this.rateLimiters.set(sourceKey, rateLimiter);
    }
    
    if (!rateLimiter.consume()) {
      const waitTime = rateLimiter.timeUntilToken();
      if (waitTime > 0) {
        console.log(`Rate limit reached for ${source.name}, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        
        // Try to consume token again after waiting
        if (!rateLimiter.consume()) {
          throw new Error(`Rate limit still exceeded for ${source.name}`);
        }
      }
    }
  }

  /**
   * Retry logic with exponential backoff
   * @param operation Function to retry
   * @param maxAttempts Maximum number of attempts (requirement 2.5)
   * @returns Promise resolving to operation result
   */
  async retry<T>(operation: () => Promise<T>, maxAttempts: number): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }
        
        // Don't retry non-retryable errors
        if (!this.isRetryableError(error)) {
          break;
        }
        
        // Handle rate limit errors specially
        if (this.isRateLimitError(error)) {
          const retryAfter = this.getRetryAfterDelay(error);
          if (retryAfter > 0) {
            console.log(`Rate limited, waiting ${retryAfter}ms before retry ${attempt + 1}`);
            await this.sleep(retryAfter);
            continue;
          }
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Attempt ${attempt} failed, retrying in ${backoffDelay}ms:`, lastError.message);
        await this.sleep(backoffDelay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Network errors are retryable
      if (axiosError.code === 'ECONNABORTED' || 
          axiosError.code === 'ENOTFOUND' || 
          axiosError.code === 'ECONNRESET') {
        return true;
      }
      
      // HTTP status codes that are retryable
      if (axiosError.response?.status) {
        const status = axiosError.response.status;
        return status >= 500 || status === 429 || status === 408;
      }
    }
    
    return false;
  }

  /**
   * Determines if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      return error.response?.status === 429;
    }
    return false;
  }

  /**
   * Extracts retry-after delay from rate limit error
   */
  private getRetryAfterDelay(error: any): number {
    if (axios.isAxiosError(error) && error.response?.headers) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        const delay = parseInt(retryAfter, 10);
        return isNaN(delay) ? 0 : delay * 1000; // convert seconds to milliseconds
      }
    }
    return 0;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}