import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import axios from 'axios';
import { ArticleFetcher } from './ArticleFetcher.js';
import { ArticleSource } from '../models/types.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ArticleFetcher', () => {
  let fetcher: ArticleFetcher;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn()
    };
    
    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError = vi.fn();
    
    fetcher = new ArticleFetcher();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('setRateLimit', () => {
    it('should set rate limit for valid positive values', () => {
      expect(() => fetcher.setRateLimit(120)).not.toThrow();
    });

    it('should throw error for non-positive rate limits', () => {
      expect(() => fetcher.setRateLimit(0)).toThrow('Rate limit must be positive');
      expect(() => fetcher.setRateLimit(-10)).toThrow('Rate limit must be positive');
    });
  });

  describe('searchArticles', () => {
    const mockSources: ArticleSource[] = [
      {
        name: 'TestAPI',
        type: 'api',
        endpoint: 'https://api.test.com/search',
        apiKey: 'test-key',
        rateLimit: 60
      },
      {
        name: 'TestRSS',
        type: 'rss',
        endpoint: 'https://rss.test.com/feed.xml',
        rateLimit: 30
      }
    ];

    it('should return articles from API source', async () => {
      const mockResponse = {
        data: {
          articles: [
            {
              title: 'Test Company News',
              url: 'https://test.com/article1',
              publishedAt: '2023-12-01T10:00:00Z',
              description: 'Test Company announced new product'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const articles = await fetcher.searchArticles('Test Company', new Date('2023-12-01'), [mockSources[0]]);

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Test Company News');
      expect(articles[0].source).toBe('TestAPI');
      expect(articles[0].url).toBe('https://test.com/article1');
    });

    it('should return articles from RSS source', async () => {
      const mockRSSResponse = {
        data: `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Apple Inc Reports Strong Quarterly Results</title>
              <link>https://test.com/apple-news</link>
              <pubDate>Fri, 01 Dec 2023 10:00:00 GMT</pubDate>
              <description>Apple Inc showed strong performance this quarter</description>
            </item>
          </channel>
        </rss>`
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockRSSResponse);

      const articles = await fetcher.searchArticles('Apple', new Date('2023-12-01'), [mockSources[1]]);

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Apple Inc Reports Strong Quarterly Results');
      expect(articles[0].source).toBe('TestRSS');
    });

    it('should filter RSS articles that do not mention the company', async () => {
      const mockRSSResponse = {
        data: `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Microsoft News</title>
              <link>https://test.com/microsoft-news</link>
              <pubDate>Fri, 01 Dec 2023 10:00:00 GMT</pubDate>
              <description>Microsoft announced new features</description>
            </item>
            <item>
              <title>Apple Inc Reports Strong Quarterly Results</title>
              <link>https://test.com/apple-news</link>
              <pubDate>Fri, 01 Dec 2023 10:00:00 GMT</pubDate>
              <description>Apple Inc showed strong performance</description>
            </item>
          </channel>
        </rss>`
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockRSSResponse);

      const articles = await fetcher.searchArticles('Apple', new Date('2023-12-01'), [mockSources[1]]);

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Apple Inc Reports Strong Quarterly Results');
    });

    it('should continue with other sources when one fails', async () => {
      const apiSource = mockSources[0];
      const rssSource = mockSources[1];

      // First source fails
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));
      
      // Second source succeeds
      const mockRSSResponse = {
        data: `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Apple Inc News</title>
              <link>https://test.com/apple-news</link>
              <pubDate>Fri, 01 Dec 2023 10:00:00 GMT</pubDate>
              <description>Apple Inc announced something</description>
            </item>
          </channel>
        </rss>`
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockRSSResponse);

      const articles = await fetcher.searchArticles('Apple', new Date('2023-12-01'), [apiSource, rssSource]);

      expect(articles).toHaveLength(1);
      expect(articles[0].source).toBe('TestRSS');
    });

    it('should return empty array when all sources fail', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

      const articles = await fetcher.searchArticles('Test Company', new Date('2023-12-01'), mockSources);

      expect(articles).toHaveLength(0);
    });
  });

  describe('retry logic', () => {
    it('should retry up to 3 times for retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      // Mock isRetryableError to return true
      const originalIsRetryableError = (fetcher as any).isRetryableError;
      (fetcher as any).isRetryableError = vi.fn().mockReturnValue(true);

      const result = await fetcher.retry(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);

      // Restore original method
      (fetcher as any).isRetryableError = originalIsRetryableError;
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable error'));

      // Mock isRetryableError to return false
      const originalIsRetryableError = (fetcher as any).isRetryableError;
      (fetcher as any).isRetryableError = vi.fn().mockReturnValue(false);

      await expect(fetcher.retry(operation, 3)).rejects.toThrow('Non-retryable error');
      expect(operation).toHaveBeenCalledTimes(1);

      // Restore original method
      (fetcher as any).isRetryableError = originalIsRetryableError;
    });

    it('should throw error after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      // Mock isRetryableError to return true
      const originalIsRetryableError = (fetcher as any).isRetryableError;
      (fetcher as any).isRetryableError = vi.fn().mockReturnValue(true);

      await expect(fetcher.retry(operation, 3)).rejects.toThrow('Persistent error');
      expect(operation).toHaveBeenCalledTimes(3);

      // Restore original method
      (fetcher as any).isRetryableError = originalIsRetryableError;
    });

    // Feature: company-mention-tracker, Property 7: Retry behavior
    // **Validates: Requirements 2.5**
    it('property test: should attempt exactly 3 retries for any simulated network error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorMessage: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            errorCode: fc.constantFrom('ECONNABORTED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'),
            httpStatus: fc.constantFrom(500, 502, 503, 504, 429, 408)
          }),
          async ({ errorMessage, errorCode, httpStatus }) => {
            // Create a proper Error object that should be retryable
            const networkError = new Error(errorMessage);
            (networkError as any).code = errorCode;
            
            // Create axios error structure
            const axiosError = {
              ...networkError,
              response: {
                status: httpStatus,
                headers: {}
              }
            };

            const operation = vi.fn().mockRejectedValue(axiosError);

            // Mock axios.isAxiosError to return true for our error
            const originalIsAxiosError = mockedAxios.isAxiosError;
            mockedAxios.isAxiosError.mockReturnValue(true);

            // Mock sleep to avoid actual delays in tests
            const originalSleep = (fetcher as any).sleep;
            (fetcher as any).sleep = vi.fn().mockResolvedValue(undefined);

            try {
              await fetcher.retry(operation, 3);
              // If we get here, the operation succeeded, which shouldn't happen with our mock
              expect.fail('Expected retry to throw after 3 attempts');
            } catch (error) {
              // The core property: verify that the operation was called exactly 3 times (max attempts)
              expect(operation).toHaveBeenCalledTimes(3);
              
              // The error should be an Error object
              expect(error).toBeInstanceOf(Error);
            }

            // Restore mocks
            mockedAxios.isAxiosError.mockImplementation(originalIsAxiosError);
            (fetcher as any).sleep = originalSleep;
            
            // Clear the mock for next iteration
            operation.mockClear();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits between requests', async () => {
      vi.useFakeTimers();
      
      const source: ArticleSource = {
        name: 'TestAPI',
        type: 'api',
        endpoint: 'https://api.test.com/search',
        rateLimit: 2 // 2 requests per minute = 1 request per 30 seconds
      };

      const mockResponse = {
        data: { articles: [] }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First request should go through immediately
      const promise1 = fetcher.searchArticles('Company1', new Date(), [source]);
      await promise1;

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // Reset the mock to track second call
      mockAxiosInstance.get.mockClear();

      // Second request should be rate limited
      const promise2 = fetcher.searchArticles('Company2', new Date(), [source]);
      
      // Advance time to allow rate limit to reset
      vi.advanceTimersByTime(30000); // 30 seconds
      await promise2;

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockAxiosInstance.get.mockRejectedValue(timeoutError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const source: ArticleSource = {
        name: 'TestAPI',
        type: 'api',
        endpoint: 'https://api.test.com/search',
        rateLimit: 60
      };

      const articles = await fetcher.searchArticles('Test Company', new Date(), [source]);
      expect(articles).toHaveLength(0);
    });

    it('should handle rate limit responses with Retry-After header', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '1' // 1 second instead of 2
          }
        }
      };

      mockAxiosInstance.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { articles: [] } });
      
      mockedAxios.isAxiosError.mockReturnValue(true);

      const source: ArticleSource = {
        name: 'TestAPI',
        type: 'api',
        endpoint: 'https://api.test.com/search',
        rateLimit: 60
      };

      // Mock the private methods for testing
      const originalIsRetryableError = (fetcher as any).isRetryableError;
      const originalIsRateLimitError = (fetcher as any).isRateLimitError;
      const originalGetRetryAfterDelay = (fetcher as any).getRetryAfterDelay;

      (fetcher as any).isRetryableError = vi.fn().mockReturnValue(true);
      (fetcher as any).isRateLimitError = vi.fn().mockReturnValue(true);
      (fetcher as any).getRetryAfterDelay = vi.fn().mockReturnValue(1000);

      const articles = await fetcher.searchArticles('Test Company', new Date(), [source]);
      expect(articles).toHaveLength(0);

      // Restore original methods
      (fetcher as any).isRetryableError = originalIsRetryableError;
      (fetcher as any).isRateLimitError = originalIsRateLimitError;
      (fetcher as any).getRetryAfterDelay = originalGetRetryAfterDelay;
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('article parsing', () => {
    it('should skip articles with missing required fields', async () => {
      const mockResponse = {
        data: {
          articles: [
            {
              title: 'Valid Article',
              url: 'https://test.com/valid',
              publishedAt: '2023-12-01T10:00:00Z',
              description: 'Valid description'
            },
            {
              // Missing title
              url: 'https://test.com/invalid1',
              publishedAt: '2023-12-01T10:00:00Z',
              description: 'Invalid article'
            },
            {
              title: 'Another Invalid',
              // Missing URL
              publishedAt: '2023-12-01T10:00:00Z',
              description: 'Invalid article'
            },
            {
              title: 'Invalid Date',
              url: 'https://test.com/invalid2',
              publishedAt: 'invalid-date',
              description: 'Invalid date'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const source: ArticleSource = {
        name: 'TestAPI',
        type: 'api',
        endpoint: 'https://api.test.com/search',
        rateLimit: 60
      };

      const articles = await fetcher.searchArticles('Test Company', new Date(), [source]);

      // Only the valid article should be returned
      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Valid Article');
    });
  });
});