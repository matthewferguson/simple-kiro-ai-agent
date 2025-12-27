import { Article, ArticleSource } from '../../models/types.js';

/**
 * Mock article source for testing purposes
 * Provides predictable test data for development and testing
 */
export class MockArticleSource {
  private readonly source: ArticleSource;
  private readonly mockData: Map<string, Article[]> = new Map();

  constructor(source: ArticleSource) {
    this.source = source;
    this.initializeMockData();
  }

  /**
   * Searches for articles mentioning a company on a specific date
   * Returns mock data for testing purposes
   */
  async searchArticles(company: string, date: Date): Promise<Article[]> {
    // Simulate network delay
    await this.sleep(100);

    const companyKey = company.toLowerCase();
    const mockArticles = this.mockData.get(companyKey) || [];

    // Filter articles by date (within same day)
    const targetDate = date.toISOString().split('T')[0];
    const filteredArticles = mockArticles.filter(article => {
      const articleDate = article.publishedDate.toISOString().split('T')[0];
      return articleDate === targetDate;
    });

    return filteredArticles.map(article => ({
      ...article,
      source: this.source.name
    }));
  }

  /**
   * Adds mock articles for a specific company
   * Useful for setting up test scenarios
   */
  addMockArticles(company: string, articles: Article[]): void {
    const companyKey = company.toLowerCase();
    const existingArticles = this.mockData.get(companyKey) || [];
    this.mockData.set(companyKey, [...existingArticles, ...articles]);
  }

  /**
   * Clears all mock data
   */
  clearMockData(): void {
    this.mockData.clear();
    this.initializeMockData();
  }

  /**
   * Gets the article source configuration
   */
  getSource(): ArticleSource {
    return { ...this.source };
  }

  /**
   * Initializes default mock data for common test scenarios
   */
  private initializeMockData(): void {
    const baseDate = new Date('2024-01-15T10:00:00Z');
    
    // Mock articles for Apple
    this.mockData.set('apple', [
      {
        title: 'Apple Announces New iPhone Features',
        url: 'https://mock-news.com/apple-iphone-1',
        publishedDate: new Date(baseDate.getTime()),
        source: this.source.name,
        excerpt: 'Apple unveiled exciting new features for the upcoming iPhone release, focusing on enhanced camera capabilities and improved battery life.'
      },
      {
        title: 'Apple Stock Reaches New High',
        url: 'https://mock-news.com/apple-stock-1',
        publishedDate: new Date(baseDate.getTime() + 3600000), // +1 hour
        source: this.source.name,
        excerpt: 'Apple Inc. shares hit a new record high today following positive analyst reports about the company\'s quarterly performance.'
      },
      {
        title: 'Apple Store Opens in New Location',
        url: 'https://mock-news.com/apple-store-1',
        publishedDate: new Date(baseDate.getTime() + 86400000), // +1 day
        source: this.source.name,
        excerpt: 'Apple opened its newest retail store in downtown Seattle, featuring the latest products and customer experience innovations.'
      }
    ]);

    // Mock articles for Microsoft
    this.mockData.set('microsoft', [
      {
        title: 'Microsoft Azure Expands Cloud Services',
        url: 'https://mock-news.com/microsoft-azure-1',
        publishedDate: new Date(baseDate.getTime()),
        source: this.source.name,
        excerpt: 'Microsoft announced significant expansions to its Azure cloud platform, adding new AI and machine learning capabilities.'
      },
      {
        title: 'Microsoft Teams Gets New Features',
        url: 'https://mock-news.com/microsoft-teams-1',
        publishedDate: new Date(baseDate.getTime() + 7200000), // +2 hours
        source: this.source.name,
        excerpt: 'Microsoft Teams introduces new collaboration features designed to improve remote work productivity and team communication.'
      }
    ]);

    // Mock articles for Google
    this.mockData.set('google', [
      {
        title: 'Google Search Algorithm Update',
        url: 'https://mock-news.com/google-search-1',
        publishedDate: new Date(baseDate.getTime()),
        source: this.source.name,
        excerpt: 'Google announced a major update to its search algorithm, promising more relevant and accurate search results for users.'
      },
      {
        title: 'Google Invests in Renewable Energy',
        url: 'https://mock-news.com/google-energy-1',
        publishedDate: new Date(baseDate.getTime() + 86400000), // +1 day
        source: this.source.name,
        excerpt: 'Google committed to investing $2 billion in renewable energy projects as part of its sustainability initiative.'
      },
      {
        title: 'Google AI Research Breakthrough',
        url: 'https://mock-news.com/google-ai-1',
        publishedDate: new Date(baseDate.getTime() + 172800000), // +2 days
        source: this.source.name,
        excerpt: 'Google researchers published findings on a breakthrough in artificial intelligence that could revolutionize natural language processing.'
      }
    ]);

    // Mock articles for Amazon
    this.mockData.set('amazon', [
      {
        title: 'Amazon Prime Day Sets Sales Records',
        url: 'https://mock-news.com/amazon-prime-1',
        publishedDate: new Date(baseDate.getTime()),
        source: this.source.name,
        excerpt: 'Amazon reported record-breaking sales during this year\'s Prime Day event, with millions of customers participating worldwide.'
      },
      {
        title: 'Amazon Web Services Launches New Tools',
        url: 'https://mock-news.com/amazon-aws-1',
        publishedDate: new Date(baseDate.getTime() + 43200000), // +12 hours
        source: this.source.name,
        excerpt: 'Amazon Web Services introduced new developer tools and services aimed at simplifying cloud application deployment and management.'
      }
    ]);

    // Mock articles for Tesla
    this.mockData.set('tesla', [
      {
        title: 'Tesla Delivers Record Number of Vehicles',
        url: 'https://mock-news.com/tesla-delivery-1',
        publishedDate: new Date(baseDate.getTime()),
        source: this.source.name,
        excerpt: 'Tesla announced record quarterly vehicle deliveries, exceeding analyst expectations and demonstrating strong market demand.'
      },
      {
        title: 'Tesla Supercharger Network Expansion',
        url: 'https://mock-news.com/tesla-supercharger-1',
        publishedDate: new Date(baseDate.getTime() + 86400000), // +1 day
        source: this.source.name,
        excerpt: 'Tesla unveiled plans to expand its Supercharger network by 50% over the next year, improving charging accessibility for electric vehicle owners.'
      },
      {
        title: 'Tesla Stock Volatility Continues',
        url: 'https://mock-news.com/tesla-stock-1',
        publishedDate: new Date(baseDate.getTime() + 259200000), // +3 days
        source: this.source.name,
        excerpt: 'Tesla shares experienced significant volatility this week following mixed analyst reports about the company\'s production targets.'
      }
    ]);
  }

  /**
   * Sleep utility for simulating network delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a mock article source configuration
   */
  static createMockSource(name: string = 'Mock News Source'): ArticleSource {
    return {
      name,
      type: 'api',
      endpoint: 'https://mock-api.example.com/articles',
      rateLimit: 1000 // High rate limit for testing
    };
  }

  /**
   * Creates multiple mock sources for testing multi-source scenarios
   */
  static createMultipleMockSources(): ArticleSource[] {
    return [
      {
        name: 'Mock News API',
        type: 'api',
        endpoint: 'https://mock-api-1.example.com/articles',
        rateLimit: 100
      },
      {
        name: 'Mock RSS Feed',
        type: 'rss',
        endpoint: 'https://mock-rss.example.com/feed.xml',
        rateLimit: 60
      },
      {
        name: 'Mock Scraper',
        type: 'scraper',
        endpoint: 'https://mock-scraper.example.com',
        rateLimit: 30
      }
    ];
  }
}