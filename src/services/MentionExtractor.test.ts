import { describe, it, expect, beforeEach } from 'vitest';
import { MentionExtractor } from './MentionExtractor.js';
import { Article, CompanyMention } from '../models/types.js';

describe('MentionExtractor', () => {
  let extractor: MentionExtractor;
  let sampleArticle: Article;
  let sampleCompanies: string[];

  beforeEach(() => {
    extractor = new MentionExtractor();
    
    sampleArticle = {
      title: 'Apple announces new iPhone features',
      url: 'https://example.com/apple-news',
      publishedDate: new Date('2024-01-15T10:00:00Z'),
      source: 'TechNews',
      excerpt: 'Apple Inc. revealed exciting new features for the upcoming iPhone release.'
    };

    sampleCompanies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
  });

  describe('extractMentions', () => {
    it('should extract mentions when company is found in article', () => {
      const mentions = extractor.extractMentions(sampleArticle, ['Apple']);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toEqual({
        company: 'Apple',
        article: sampleArticle,
        mentionCount: 1
      });
    });

    it('should extract multiple company mentions from single article', () => {
      const article: Article = {
        title: 'Apple and Google compete in mobile market',
        url: 'https://example.com/tech-competition',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'TechNews',
        excerpt: 'Both Apple and Google are releasing new mobile features this year.'
      };

      const mentions = extractor.extractMentions(article, ['Apple', 'Google', 'Microsoft']);
      
      expect(mentions).toHaveLength(2);
      expect(mentions.find(m => m.company === 'Apple')).toBeDefined();
      expect(mentions.find(m => m.company === 'Google')).toBeDefined();
      expect(mentions.find(m => m.company === 'Microsoft')).toBeUndefined();
    });

    it('should return empty array when no companies are mentioned', () => {
      const article: Article = {
        title: 'Weather forecast for tomorrow',
        url: 'https://example.com/weather',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'WeatherNews',
        excerpt: 'Sunny skies expected with temperatures reaching 75 degrees.'
      };

      const mentions = extractor.extractMentions(article, sampleCompanies);
      
      expect(mentions).toHaveLength(0);
    });

    it('should handle case-insensitive matching', () => {
      const article: Article = {
        title: 'apple stock rises',
        url: 'https://example.com/stock-news',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'FinanceNews',
        excerpt: 'APPLE shares increased by 5% today.'
      };

      const mentions = extractor.extractMentions(article, ['Apple']);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0].company).toBe('Apple');
    });

    it('should use word boundaries to avoid partial matches', () => {
      const article: Article = {
        title: 'Pineapple farming techniques',
        url: 'https://example.com/farming',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'FarmNews',
        excerpt: 'Growing pineapples requires specific climate conditions.'
      };

      const mentions = extractor.extractMentions(article, ['Apple']);
      
      expect(mentions).toHaveLength(0);
    });

    it('should handle multi-word company names', () => {
      const article: Article = {
        title: 'Microsoft Corporation announces new features',
        url: 'https://example.com/microsoft-news',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'TechNews',
        excerpt: 'Microsoft Corporation revealed new cloud services.'
      };

      const mentions = extractor.extractMentions(article, ['Microsoft Corporation']);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0].company).toBe('Microsoft Corporation');
    });

    it('should validate article has all required fields', () => {
      const invalidArticle = {
        title: 'Test article',
        url: 'https://example.com/test',
        publishedDate: new Date(),
        source: 'TestSource'
        // Missing excerpt
      } as Article;

      expect(() => {
        extractor.extractMentions(invalidArticle, ['Apple']);
      }).toThrow('Article missing required fields: excerpt');
    });

    it('should validate article URL format', () => {
      const invalidArticle: Article = {
        title: 'Test article',
        url: 'not-a-valid-url',
        publishedDate: new Date(),
        source: 'TestSource',
        excerpt: 'Test excerpt'
      };

      expect(() => {
        extractor.extractMentions(invalidArticle, ['Apple']);
      }).toThrow('Article URL must be a valid URL');
    });

    it('should validate publishedDate is a valid Date', () => {
      const invalidArticle = {
        title: 'Test article',
        url: 'https://example.com/test',
        publishedDate: 'invalid-date',
        source: 'TestSource',
        excerpt: 'Test excerpt'
      } as any;

      expect(() => {
        extractor.extractMentions(invalidArticle, ['Apple']);
      }).toThrow('Article missing required fields: publishedDate');
    });
  });

  describe('countMentions', () => {
    it('should count mentions for a specific company', () => {
      const articles: Article[] = [
        {
          title: 'Apple releases new iPhone',
          url: 'https://example.com/apple1',
          publishedDate: new Date('2024-01-15T10:00:00Z'),
          source: 'TechNews',
          excerpt: 'Apple announced the new iPhone features.'
        },
        {
          title: 'Google updates search algorithm',
          url: 'https://example.com/google1',
          publishedDate: new Date('2024-01-15T11:00:00Z'),
          source: 'TechNews',
          excerpt: 'Google improved their search capabilities.'
        },
        {
          title: 'Apple stock performance',
          url: 'https://example.com/apple2',
          publishedDate: new Date('2024-01-15T12:00:00Z'),
          source: 'FinanceNews',
          excerpt: 'Apple shares rose 3% in trading.'
        }
      ];

      const count = extractor.countMentions(articles, 'Apple');
      expect(count).toBe(2);
    });

    it('should return 0 for company not mentioned in any articles', () => {
      const articles: Article[] = [
        {
          title: 'Weather forecast',
          url: 'https://example.com/weather1',
          publishedDate: new Date('2024-01-15T10:00:00Z'),
          source: 'WeatherNews',
          excerpt: 'Sunny skies expected tomorrow.'
        }
      ];

      const count = extractor.countMentions(articles, 'Apple');
      expect(count).toBe(0);
    });

    it('should return 0 for empty articles array', () => {
      const count = extractor.countMentions([], 'Apple');
      expect(count).toBe(0);
    });

    it('should throw error for empty company name', () => {
      expect(() => {
        extractor.countMentions([sampleArticle], '');
      }).toThrow('Company name cannot be empty');
    });

    it('should skip invalid articles and continue counting', () => {
      const articles: Article[] = [
        sampleArticle, // Valid article with Apple mention
        {
          title: 'Apple news',
          url: 'invalid-url',
          publishedDate: new Date(),
          source: 'TestSource',
          excerpt: 'Apple announcement'
        } as Article, // Invalid URL
        {
          title: 'Another Apple story',
          url: 'https://example.com/apple3',
          publishedDate: new Date(),
          source: 'TestSource',
          excerpt: 'Apple launches new product'
        }
      ];

      const count = extractor.countMentions(articles, 'Apple');
      expect(count).toBe(2); // Should count valid articles only
    });
  });

  describe('extractArticleData', () => {
    it('should extract article data from raw object with standard fields', () => {
      const rawArticle = {
        title: 'Test Article',
        url: 'https://example.com/test',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'TestSource',
        excerpt: 'Test excerpt content'
      };

      const article = extractor.extractArticleData(rawArticle);
      
      expect(article).toEqual({
        title: 'Test Article',
        url: 'https://example.com/test',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'TestSource',
        excerpt: 'Test excerpt content'
      });
    });

    it('should extract article data using alternative field names', () => {
      const rawArticle = {
        headline: 'Test Headline',
        link: 'https://example.com/test',
        published: '2024-01-15T10:00:00Z',
        publisher: 'TestPublisher',
        description: 'Test description content'
      };

      const article = extractor.extractArticleData(rawArticle);
      
      expect(article.title).toBe('Test Headline');
      expect(article.url).toBe('https://example.com/test');
      expect(article.publishedDate).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(article.source).toBe('TestPublisher');
      expect(article.excerpt).toBe('Test description content');
    });

    it('should handle date as string', () => {
      const rawArticle = {
        title: 'Test Article',
        url: 'https://example.com/test',
        date: '2024-01-15T10:00:00Z',
        source: 'TestSource',
        excerpt: 'Test excerpt'
      };

      const article = extractor.extractArticleData(rawArticle);
      expect(article.publishedDate).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should handle date as timestamp (milliseconds)', () => {
      const timestamp = 1705312800000; // 2024-01-15T10:00:00Z
      const rawArticle = {
        title: 'Test Article',
        url: 'https://example.com/test',
        publishedAt: timestamp,
        source: 'TestSource',
        excerpt: 'Test excerpt'
      };

      const article = extractor.extractArticleData(rawArticle);
      expect(article.publishedDate).toEqual(new Date(timestamp));
    });

    it('should handle date as timestamp (seconds)', () => {
      const timestamp = 1705312800; // 2024-01-15T10:00:00Z in seconds
      const rawArticle = {
        title: 'Test Article',
        url: 'https://example.com/test',
        pubDate: timestamp,
        source: 'TestSource',
        excerpt: 'Test excerpt'
      };

      const article = extractor.extractArticleData(rawArticle);
      expect(article.publishedDate).toEqual(new Date(timestamp * 1000));
    });

    it('should throw error for missing required fields', () => {
      const rawArticle = {
        title: 'Test Article',
        // Missing url, date, source, excerpt
      };

      expect(() => {
        extractor.extractArticleData(rawArticle);
      }).toThrow('Required field not found');
    });

    it('should throw error for invalid date', () => {
      const rawArticle = {
        title: 'Test Article',
        url: 'https://example.com/test',
        date: 'invalid-date',
        source: 'TestSource',
        excerpt: 'Test excerpt'
      };

      expect(() => {
        extractor.extractArticleData(rawArticle);
      }).toThrow('Valid date field not found');
    });

    it('should throw error for null or non-object input', () => {
      expect(() => {
        extractor.extractArticleData(null);
      }).toThrow('Raw article data must be an object');

      expect(() => {
        extractor.extractArticleData('not an object');
      }).toThrow('Raw article data must be an object');
    });

    it('should trim whitespace from string fields', () => {
      const rawArticle = {
        title: '  Test Article  ',
        url: '  https://example.com/test  ',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: '  TestSource  ',
        excerpt: '  Test excerpt  '
      };

      const article = extractor.extractArticleData(rawArticle);
      
      expect(article.title).toBe('Test Article');
      expect(article.url).toBe('https://example.com/test');
      expect(article.source).toBe('TestSource');
      expect(article.excerpt).toBe('Test excerpt');
    });
  });

  describe('edge cases', () => {
    it('should handle company names with special characters', () => {
      const article: Article = {
        title: 'AT&T announces new services',
        url: 'https://example.com/att-news',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'TechNews',
        excerpt: 'AT&T revealed new telecommunications services.'
      };

      const mentions = extractor.extractMentions(article, ['AT&T']);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0].company).toBe('AT&T');
    });

    it('should handle empty company list', () => {
      const mentions = extractor.extractMentions(sampleArticle, []);
      expect(mentions).toHaveLength(0);
    });

    it('should handle articles with very long content', () => {
      const longExcerpt = 'Apple '.repeat(1000) + 'is a technology company.';
      const article: Article = {
        title: 'Long article about Apple',
        url: 'https://example.com/long-article',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'TechNews',
        excerpt: longExcerpt
      };

      const mentions = extractor.extractMentions(article, ['Apple']);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0].mentionCount).toBe(1); // Still only counts as 1 mention per article
    });

    it('should handle company names that are substrings of other words', () => {
      const article: Article = {
        title: 'Amazon rainforest and Amazon company',
        url: 'https://example.com/amazon-news',
        publishedDate: new Date('2024-01-15T10:00:00Z'),
        source: 'News',
        excerpt: 'The Amazon rainforest is important, and Amazon the company is growing.'
      };

      const mentions = extractor.extractMentions(article, ['Amazon']);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0].company).toBe('Amazon');
    });
  });
});