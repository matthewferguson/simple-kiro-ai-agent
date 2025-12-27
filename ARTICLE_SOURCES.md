# Article Sources Guide

This guide explains how to configure and use different article sources with the Company Mention Tracker.

## Overview

The Company Mention Tracker supports three types of article sources:

1. **API Sources**: Direct API integration (e.g., NewsAPI.org)
2. **RSS Feeds**: RSS/Atom feed parsing (e.g., Reuters, BBC)
3. **Mock Sources**: Testing and development sources

## Available Implementations

### 1. NewsAPI.org Integration

**Features:**
- Access to thousands of news sources
- Date filtering and search capabilities
- Up to 100 articles per request
- Requires API key

**Setup:**
```bash
# Get API key from https://newsapi.org/register
export NEWSAPI_KEY="your-api-key-here"
```

**Configuration:**
```json
{
  "name": "NewsAPI",
  "type": "api",
  "endpoint": "https://newsapi.org/v2/everything",
  "apiKey": "your-api-key-here",
  "rateLimit": 100
}
```

**Rate Limits:**
- Free tier: 1,000 requests/month (~33 per day)
- Developer tier: 500 requests/day
- Business tier: 250,000 requests/month

### 2. RSS Feed Sources

**Features:**
- No API key required
- Supports RSS 2.0 and Atom formats
- Automatic content filtering by company mention
- Wide variety of news sources available

**Common RSS Sources:**
```json
[
  {
    "name": "Reuters Business",
    "type": "rss",
    "endpoint": "https://www.reuters.com/business/finance/rss",
    "rateLimit": 60
  },
  {
    "name": "BBC Business",
    "type": "rss",
    "endpoint": "https://feeds.bbci.co.uk/news/business/rss.xml",
    "rateLimit": 60
  },
  {
    "name": "TechCrunch",
    "type": "rss",
    "endpoint": "https://techcrunch.com/feed/",
    "rateLimit": 60
  }
]
```

**Rate Limiting:**
- Recommended: 60-120 requests per hour
- Respect server resources and terms of service
- Most feeds update every 15-30 minutes

### 3. Mock Sources

**Features:**
- Predictable test data
- High rate limits for fast testing
- Supports all default companies
- No external dependencies

**Usage:**
```typescript
import { MockArticleSource } from './services/sources';

const mockSource = new MockArticleSource({
  name: 'Test Source',
  type: 'api',
  endpoint: 'https://mock-api.example.com',
  rateLimit: 1000
});
```

## Configuration Examples

### Development Environment
```json
{
  "articleSources": [
    {
      "name": "Mock News Source",
      "type": "api",
      "endpoint": "https://mock-api.example.com/articles",
      "rateLimit": 1000
    }
  ]
}
```

### Production (Free Tier)
```json
{
  "articleSources": [
    {
      "name": "Reuters Business",
      "type": "rss",
      "endpoint": "https://www.reuters.com/business/finance/rss",
      "rateLimit": 60
    },
    {
      "name": "BBC Business",
      "type": "rss",
      "endpoint": "https://feeds.bbci.co.uk/news/business/rss.xml",
      "rateLimit": 60
    },
    {
      "name": "TechCrunch",
      "type": "rss",
      "endpoint": "https://techcrunch.com/feed/",
      "rateLimit": 60
    }
  ]
}
```

### Production (With NewsAPI)
```json
{
  "articleSources": [
    {
      "name": "NewsAPI",
      "type": "api",
      "endpoint": "https://newsapi.org/v2/everything",
      "apiKey": "your-api-key-here",
      "rateLimit": 100
    },
    {
      "name": "Reuters Business",
      "type": "rss",
      "endpoint": "https://www.reuters.com/business/finance/rss",
      "rateLimit": 60
    },
    {
      "name": "BBC Business",
      "type": "rss",
      "endpoint": "https://feeds.bbci.co.uk/news/business/rss.xml",
      "rateLimit": 60
    }
  ]
}
```

## Using the Configuration Helper

The `SourceConfigHelper` utility provides convenient methods for managing configurations:

```typescript
import { SourceConfigHelper } from './utils';

// Load environment-specific configuration
const sources = await SourceConfigHelper.getEnvironmentConfig('production');

// Create NewsAPI source with environment variable
const newsApiSource = SourceConfigHelper.createNewsAPISource();

// Get recommended configuration based on requirements
const recommendedSources = SourceConfigHelper.getRecommendedConfig({
  budget: 'free',
  volume: 'medium',
  hasNewsAPIKey: false
});

// Validate source connectivity
const { accessible, inaccessible } = await SourceConfigHelper.validateSourceConnectivity(sources);
```

## Environment Variables

Set these environment variables for API-based sources:

```bash
# NewsAPI.org
export NEWSAPI_KEY="your-newsapi-key-here"
```

## Rate Limiting Best Practices

1. **Respect API Limits**: Never exceed the documented rate limits
2. **Implement Backoff**: Use exponential backoff for retries
3. **Monitor Usage**: Track your API usage to avoid unexpected limits
4. **Distribute Requests**: Spread requests over time to avoid bursts
5. **Handle Errors**: Gracefully handle rate limit and blocking errors

## Troubleshooting

### Common Issues

**NewsAPI 401 Unauthorized**
- Check that your API key is correct and active
- Verify the key is set in the environment variable

**NewsAPI 429 Too Many Requests**
- You've exceeded your rate limit
- Wait for the limit to reset or upgrade your plan

**RSS Feed 404 Not Found**
- The RSS feed URL may have changed
- Check the website for updated feed URLs

**RSS Feed Parsing Errors**
- The feed format may be non-standard
- Check XML structure and character encoding

**No Articles Found**
- Verify company name spelling
- Check date range (articles may not exist for that date)
- Ensure sources are accessible

### Debugging Tips

1. **Enable Verbose Logging**: Set log level to debug for detailed output
2. **Test Individual Sources**: Test each source separately to isolate issues
3. **Check Network Connectivity**: Verify you can access source URLs
4. **Validate Configuration**: Use the validation methods to check config
5. **Monitor Rate Limits**: Track request counts and timing

## Adding New Sources

To add a new article source implementation:

1. **Create Source Class**: Implement the `ArticleSourceInstance` interface
2. **Add to Factory**: Update the `createArticleSource` function
3. **Add Validation**: Implement source-specific validation
4. **Update Configuration**: Add examples to the config file
5. **Write Tests**: Create unit and integration tests

Example:
```typescript
export class CustomAPISource implements ArticleSourceInstance {
  async searchArticles(company: string, date: Date): Promise<Article[]> {
    // Implementation here
  }
  
  getSource(): ArticleSource {
    return this.source;
  }
}
```

## Performance Considerations

1. **Parallel Requests**: Sources are queried in parallel for better performance
2. **Caching**: Consider implementing response caching for frequently accessed data
3. **Connection Pooling**: HTTP clients use connection pooling for efficiency
4. **Timeout Handling**: All requests have reasonable timeouts
5. **Memory Management**: Large responses are processed in streams when possible

## Security Considerations

1. **API Key Protection**: Store API keys in environment variables, never in code
2. **HTTPS Only**: All external requests use HTTPS
3. **Input Validation**: All company names and dates are validated
4. **Rate Limiting**: Prevents abuse and respects service terms
5. **Error Handling**: Sensitive information is not exposed in error messages

## Support and Resources

- **NewsAPI Documentation**: https://newsapi.org/docs
- **RSS Specification**: https://www.rssboard.org/rss-specification
- **Atom Specification**: https://tools.ietf.org/html/rfc4287
- **Configuration Examples**: See `src/config/article-sources.json`
- **Source Code**: See `src/services/sources/` directory