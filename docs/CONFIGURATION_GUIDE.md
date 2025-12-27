# Configuration Guide

This guide covers all configuration options for the Company Mention Tracker system.

## Overview

The system supports multiple configuration methods:
- Command-line arguments
- Environment variables  
- Configuration files
- Runtime configuration

## Command-Line Configuration

### Basic Options

```bash
# Required: Exactly 5 company names
-c, --companies <companies...>

# Optional: Output file and format
-o, --output <file>          # Default: report.json
-f, --format <format>        # json, text, html (default: json)

# Optional: Performance settings
-r, --rate-limit <number>    # Requests per minute (default: 10)
-d, --data-dir <directory>   # Data storage location (default: ./data)

# Optional: Article sources
--sources <sources...>       # JSON configuration strings
```

### Examples

```bash
# Basic search
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"

# Custom output and rate limiting
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o my-report.html -f html -r 5

# Custom data directory
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -d ./custom-data
```

## Environment Variables

### Supported Variables

```bash
# NewsAPI.org API key
export NEWSAPI_KEY="your-api-key-here"

# Default data directory
export DATA_DIR="./data"

# Logging level
export LOG_LEVEL="info"  # debug, info, warn, error

# Node.js options
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Loading Environment Variables

Create a `.env` file in the project root:

```bash
NEWSAPI_KEY=your-api-key-here
DATA_DIR=./data
LOG_LEVEL=info
```

## Article Source Configuration

### Configuration Format

Each article source requires these fields:

```json
{
  "name": "Source Name",
  "type": "api|rss|scraper",
  "endpoint": "https://api.example.com",
  "apiKey": "optional-api-key",
  "rateLimit": 60
}
```

### API Sources

#### NewsAPI.org

```json
{
  "name": "NewsAPI",
  "type": "api", 
  "endpoint": "https://newsapi.org/v2/everything",
  "apiKey": "your-newsapi-key-here",
  "rateLimit": 100
}
```

**Setup Steps:**
1. Register at https://newsapi.org/register
2. Get your API key from the dashboard
3. Set environment variable: `export NEWSAPI_KEY="your-key"`

**Rate Limits:**
- Free: 1,000 requests/month (~33/day)
- Developer: 500 requests/day  
- Business: 250,000 requests/month

### RSS Sources

#### Reuters Business

```json
{
  "name": "Reuters Business",
  "type": "rss",
  "endpoint": "https://www.reuters.com/business/finance/rss", 
  "rateLimit": 60
}
```

#### BBC Business

```json
{
  "name": "BBC Business",
  "type": "rss",
  "endpoint": "https://feeds.bbci.co.uk/news/business/rss.xml",
  "rateLimit": 60
}
```

#### TechCrunch

```json
{
  "name": "TechCrunch",
  "type": "rss", 
  "endpoint": "https://techcrunch.com/feed/",
  "rateLimit": 60
}
```

### Mock Sources

For testing and development:

```json
{
  "name": "Mock News Source",
  "type": "api",
  "endpoint": "https://mock-api.example.com",
  "rateLimit": 1000
}
```

## Pre-configured Environments

### Development

Uses mock sources for fast testing:

```bash
# Automatically uses mock sources
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### Production (Free Tier)

Uses free RSS feeds:

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  --sources '{"name":"Reuters","type":"rss","endpoint":"https://www.reuters.com/business/finance/rss","rateLimit":60}' \
  --sources '{"name":"BBC","type":"rss","endpoint":"https://feeds.bbci.co.uk/news/business/rss.xml","rateLimit":60}'
```

### Production (With NewsAPI)

Combines API and RSS sources:

```bash
export NEWSAPI_KEY="your-key-here"
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  --sources '{"name":"NewsAPI","type":"api","endpoint":"https://newsapi.org/v2/everything","apiKey":"'$NEWSAPI_KEY'","rateLimit":100}' \
  --sources '{"name":"Reuters","type":"rss","endpoint":"https://www.reuters.com/business/finance/rss","rateLimit":60}'
```

## Rate Limiting Configuration

### Understanding Rate Limits

Rate limiting prevents overwhelming article sources and respects their terms of service.

### Setting Rate Limits

```bash
# Conservative (good for free tiers)
-r 5

# Moderate (good for paid APIs)  
-r 30

# Aggressive (premium APIs only)
-r 100
```

### Per-Source Rate Limits

Each source can have its own rate limit:

```json
{
  "name": "Premium API",
  "type": "api",
  "endpoint": "https://premium-api.com",
  "rateLimit": 200
}
```

### Rate Limit Strategies

- **Conservative**: 5-10 requests/minute for free services
- **Moderate**: 30-60 requests/minute for paid services
- **Aggressive**: 100+ requests/minute for premium services

## Data Storage Configuration

### Default Storage

By default, data is stored in `./data/`:

```
data/
├── Apple/
│   ├── 2025-12-21.json
│   ├── 2025-12-22.json
│   └── ...
├── Microsoft/
└── ...
```

### Custom Storage Location

```bash
# Use custom directory
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -d /path/to/custom/data

# Use environment variable
export DATA_DIR="/path/to/custom/data"
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### Storage Cleanup

```bash
# Clear all data
node dist/cli.js clear-data

# Clear specific directory
node dist/cli.js clear-data -d /path/to/data
```

## Report Configuration

### Output Formats

#### JSON (Default)
Structured data for programmatic processing:

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.json -f json
```

#### Text
Human-readable plain text:

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.txt -f text
```

#### HTML
Formatted web page with styling:

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.html -f html
```

### Custom Output Locations

```bash
# Save to specific directory
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o ./reports/weekly-report.json

# Save with timestamp
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o "report-$(date +%Y%m%d).json"
```

## Advanced Configuration

### Multiple Article Sources

Combine different source types:

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  --sources '{"name":"NewsAPI","type":"api","endpoint":"https://newsapi.org/v2/everything","apiKey":"key1","rateLimit":100}' \
  --sources '{"name":"Reuters","type":"rss","endpoint":"https://www.reuters.com/business/finance/rss","rateLimit":60}' \
  --sources '{"name":"BBC","type":"rss","endpoint":"https://feeds.bbci.co.uk/news/business/rss.xml","rateLimit":60}'
```

### Performance Tuning

#### Memory Optimization

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Parallel Processing

The system automatically processes companies in parallel while respecting rate limits.

#### Request Distribution

Requests are distributed over time to avoid bursts and respect rate limits.

## Validation and Testing

### Validate Configuration

```bash
# Test company names
node dist/cli.js validate -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"

# Test with custom companies
node dist/cli.js validate -c "Netflix" "Spotify" "Uber" "Airbnb" "Zoom"
```

### Test Article Sources

The system automatically validates article source connectivity before starting searches.

### Debug Configuration

```bash
# Enable debug logging
export LOG_LEVEL=debug
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

## Configuration Best Practices

### Security

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Rotate API keys** regularly
4. **Monitor API usage** for unusual activity

### Performance

1. **Start with conservative rate limits** and increase gradually
2. **Use multiple sources** to distribute load
3. **Monitor response times** and adjust accordingly
4. **Clean up old data** regularly

### Reliability

1. **Test configurations** before production use
2. **Have backup sources** in case primary sources fail
3. **Implement proper error handling**
4. **Monitor source availability**

## Troubleshooting Configuration

### Common Issues

**"Must provide exactly 5 companies"**
- Check company name count and formatting
- Ensure no empty strings or duplicates

**"Invalid article source configuration"**
- Verify JSON syntax in source configurations
- Check required fields (name, type, endpoint)

**Rate limit exceeded**
- Reduce rate limit with `-r` option
- Check API quotas and limits
- Consider upgrading API plans

**Source connectivity issues**
- Verify internet connection
- Check source URLs and endpoints
- Test with curl or browser

### Debug Steps

1. **Enable debug logging**: `export LOG_LEVEL=debug`
2. **Test individual components**: Use validate command
3. **Check network connectivity**: Test source URLs
4. **Verify API keys**: Check environment variables
5. **Review error messages**: Look for specific error details

## Configuration Examples

See the `examples/` directory for complete configuration examples:

- `examples/development.json` - Development configuration
- `examples/production-free.json` - Free tier production
- `examples/production-premium.json` - Premium production
- `examples/custom-sources.json` - Custom source examples