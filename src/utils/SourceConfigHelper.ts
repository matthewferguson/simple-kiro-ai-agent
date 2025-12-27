import { ArticleSource } from '../models/types.js';
import { validateArticleSource, getDefaultSourceConfigurations } from '../services/sources/index.js';

/**
 * Helper utility for managing article source configurations
 * Provides methods to load, validate, and manage source configurations
 */
export class SourceConfigHelper {
  private static readonly CONFIG_FILE_PATH = './src/config/article-sources.json';

  /**
   * Loads article source configurations from the default config file
   */
  static async loadConfigurations(): Promise<Record<string, ArticleSource[]>> {
    try {
      const fs = await import('fs/promises');
      const configContent = await fs.readFile(this.CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(configContent);
      return config.configurations || {};
    } catch (error) {
      console.warn('Failed to load source configurations, using defaults:', error);
      return getDefaultSourceConfigurations();
    }
  }

  /**
   * Gets configuration for a specific environment
   */
  static async getEnvironmentConfig(environment: string): Promise<ArticleSource[]> {
    const configurations = await this.loadConfigurations();
    return configurations[environment] || configurations['development'] || [];
  }

  /**
   * Validates a list of article sources
   */
  static validateSources(sources: ArticleSource[]): { isValid: boolean; errors: string[] } {
    const allErrors: string[] = [];

    if (!sources || sources.length === 0) {
      allErrors.push('At least one article source must be configured');
      return { isValid: false, errors: allErrors };
    }

    sources.forEach((source, index) => {
      const sourceErrors = validateArticleSource(source);
      sourceErrors.forEach(error => {
        allErrors.push(`Source ${index + 1} (${source.name}): ${error}`);
      });
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Creates a NewsAPI source configuration with API key from environment
   */
  static createNewsAPISource(apiKey?: string, rateLimit: number = 100): ArticleSource {
    const key = apiKey || process.env.NEWSAPI_KEY;
    
    if (!key) {
      throw new Error('NewsAPI key is required. Set NEWSAPI_KEY environment variable or provide apiKey parameter.');
    }

    return {
      name: 'NewsAPI',
      type: 'api',
      endpoint: 'https://newsapi.org/v2/everything',
      apiKey: key,
      rateLimit
    };
  }

  /**
   * Creates common RSS feed sources
   */
  static createRSSFeedSources(): ArticleSource[] {
    return [
      {
        name: 'Reuters Business',
        type: 'rss',
        endpoint: 'https://www.reuters.com/business/finance/rss',
        rateLimit: 60
      },
      {
        name: 'BBC Business',
        type: 'rss',
        endpoint: 'https://feeds.bbci.co.uk/news/business/rss.xml',
        rateLimit: 60
      },
      {
        name: 'TechCrunch',
        type: 'rss',
        endpoint: 'https://techcrunch.com/feed/',
        rateLimit: 60
      }
    ];
  }

  /**
   * Creates mock sources for testing
   */
  static createMockSources(): ArticleSource[] {
    return [
      {
        name: 'Mock News API',
        type: 'api',
        endpoint: 'https://mock-api.example.com/articles',
        rateLimit: 1000
      },
      {
        name: 'Mock RSS Feed',
        type: 'rss',
        endpoint: 'https://mock-rss.example.com/feed.xml',
        rateLimit: 1000
      }
    ];
  }

  /**
   * Gets recommended configuration based on usage requirements
   */
  static getRecommendedConfig(requirements: {
    budget: 'free' | 'paid';
    volume: 'low' | 'medium' | 'high';
    hasNewsAPIKey: boolean;
  }): ArticleSource[] {
    const sources: ArticleSource[] = [];

    // Add NewsAPI if available and budget allows
    if (requirements.hasNewsAPIKey && requirements.budget === 'paid') {
      try {
        sources.push(this.createNewsAPISource());
      } catch (error) {
        console.warn('NewsAPI not available:', error);
      }
    }

    // Add RSS feeds based on volume requirements
    const rssSources = this.createRSSFeedSources();
    
    switch (requirements.volume) {
      case 'low':
        sources.push(rssSources[0]); // Just Reuters
        break;
      case 'medium':
        sources.push(...rssSources.slice(0, 2)); // Reuters + BBC
        break;
      case 'high':
        sources.push(...rssSources); // All RSS sources
        break;
    }

    return sources;
  }

  /**
   * Checks if required environment variables are set
   */
  static checkEnvironmentVariables(): { isValid: boolean; missing: string[] } {
    const required = ['NEWSAPI_KEY'];
    const missing: string[] = [];

    required.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });

    return {
      isValid: missing.length === 0,
      missing
    };
  }

  /**
   * Gets setup instructions for article sources
   */
  static getSetupInstructions(): string {
    return `
Article Source Setup Instructions:

1. NewsAPI.org (Optional - for API access):
   - Visit https://newsapi.org/register
   - Create a free account and verify email
   - Copy your API key from the dashboard
   - Set environment variable: export NEWSAPI_KEY="your-key-here"
   - Free tier: 1,000 requests/month
   - Developer tier: 500 requests/day

2. RSS Feeds (Free):
   - No setup required
   - Automatically configured with reputable news sources
   - Includes Reuters, BBC, TechCrunch, and others
   - Rate limited to respect server resources

3. Environment Configuration:
   - Development: Uses mock sources for testing
   - Production: Uses RSS feeds by default
   - With NewsAPI: Combines API and RSS sources

4. Configuration Files:
   - Default configurations in src/config/article-sources.json
   - Environment-specific settings available
   - Custom configurations can be added

Example usage:
  npm run start -- --companies "Apple,Microsoft,Google,Amazon,Tesla"
    `.trim();
  }

  /**
   * Validates that sources are accessible (basic connectivity check)
   */
  static async validateSourceConnectivity(sources: ArticleSource[]): Promise<{
    accessible: ArticleSource[];
    inaccessible: { source: ArticleSource; error: string }[];
  }> {
    const accessible: ArticleSource[] = [];
    const inaccessible: { source: ArticleSource; error: string }[] = [];

    for (const source of sources) {
      try {
        // Skip mock sources
        if (source.endpoint.includes('example.com') || source.endpoint.includes('mock')) {
          accessible.push(source);
          continue;
        }

        // Basic connectivity check with timeout
        const axios = (await import('axios')).default;
        await axios.head(source.endpoint, { 
          timeout: 5000,
          headers: source.apiKey ? { 'X-API-Key': source.apiKey } : {}
        });
        
        accessible.push(source);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        inaccessible.push({ source, error: errorMessage });
      }
    }

    return { accessible, inaccessible };
  }
}