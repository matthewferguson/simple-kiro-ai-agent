# Company Mention Tracker

An AI agent system that monitors online articles for mentions of specified companies over a 7-day period and analyzes trends in their coverage.

## Features

- **Multi-Company Tracking**: Monitor exactly 5 companies simultaneously
- **7-Day Analysis Period**: Search articles over a complete week
- **Daily Mention Counting**: Track daily mentions for each company
- **Trend Analysis**: Classify trends as increasing, decreasing, stable, or volatile
- **Comprehensive Reports**: Generate reports in JSON, text, or HTML formats
- **Multiple Article Sources**: Support for APIs, RSS feeds, and mock sources
- **Rate Limiting**: Respect API limits and implement exponential backoff
- **Error Handling**: Graceful degradation with partial data reporting
- **Progress Tracking**: Real-time progress display during searches

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd company-mention-tracker

# Install dependencies
npm install

# Build the project
npm run build
```

### Basic Usage

```bash
# Search for mentions of 5 companies
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"

# Generate HTML report
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.html -f html

# Use custom rate limiting
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -r 5 -d ./my-data
```

## Requirements

- **Node.js**: Version 18 or higher
- **TypeScript**: Version 5.3 or higher
- **Internet Connection**: For accessing article sources
- **API Keys**: Optional, for premium article sources (e.g., NewsAPI.org)

## Project Structure

```
company-mention-tracker/
├── src/
│   ├── models/           # Data models and TypeScript interfaces
│   ├── services/         # Core business logic components
│   │   ├── sources/      # Article source implementations
│   │   ├── ArticleFetcher.ts
│   │   ├── ConfigurationManager.ts
│   │   ├── DataStore.ts
│   │   ├── MentionExtractor.ts
│   │   ├── ReportGenerator.ts
│   │   ├── SearchEngine.ts
│   │   └── TrendAnalyzer.ts
│   ├── utils/            # Utility functions and helpers
│   ├── config/           # Configuration files
│   ├── cli.ts            # Command-line interface
│   └── index.ts          # Main entry point
├── docs/                 # Documentation and examples
├── examples/             # Example configurations and reports
└── data/                 # Default data storage directory
```

## Configuration

### Article Sources

The system supports multiple types of article sources:

1. **API Sources**: Direct API integration (NewsAPI.org, etc.)
2. **RSS Feeds**: RSS/Atom feed parsing (Reuters, BBC, etc.)
3. **Mock Sources**: Testing and development sources

See [ARTICLE_SOURCES.md](ARTICLE_SOURCES.md) for detailed configuration instructions.

### Environment Variables

```bash
# NewsAPI.org (optional)
export NEWSAPI_KEY="your-api-key-here"

# Custom data directory (optional)
export DATA_DIR="./custom-data"
```

## CLI Commands

### Search Command

Search for company mentions and generate trend reports:

```bash
node dist/cli.js search [options]
```

**Options:**
- `-c, --companies <companies...>`: List of exactly 5 company names (required)
- `-o, --output <file>`: Output file for the report (default: report.json)
- `-f, --format <format>`: Report format: json, text, html (default: json)
- `-r, --rate-limit <number>`: Rate limit for API requests per minute (default: 10)
- `-d, --data-dir <directory>`: Directory to store data files (default: ./data)
- `--sources <sources...>`: Custom article source configurations (JSON format)

### Validate Command

Validate company names without running a search:

```bash
node dist/cli.js validate -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### Clear Data Command

Clear all stored data files:

```bash
node dist/cli.js clear-data -d ./data
```

## Usage Examples

### Basic Search

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### Generate Different Report Formats

```bash
# JSON report (default)
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.json

# Text report
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.txt -f text

# HTML report
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.html -f html
```

### Custom Configuration

```bash
# Custom rate limit and data directory
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -r 5 -d ./custom-data

# Custom article sources
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  --sources '{"name":"NewsAPI","type":"api","endpoint":"https://newsapi.org/v2/everything","apiKey":"your-key","rateLimit":100}'
```

## Report Formats

### JSON Format

Structured JSON format suitable for programmatic processing:

```json
{
  "generatedAt": "2025-12-27T10:30:00.000Z",
  "searchPeriod": {
    "startDate": "2025-12-21T00:00:00.000Z",
    "endDate": "2025-12-27T23:59:59.999Z"
  },
  "companies": [
    {
      "company": "Apple",
      "status": "complete",
      "trendAnalysis": {
        "classification": "increasing",
        "statistics": {
          "totalMentions": 45,
          "averageDaily": 6.4,
          "percentageChange": 25.3,
          "standardDeviation": 2.1
        },
        "dailyBreakdown": [
          { "date": "2025-12-21T00:00:00.000Z", "count": 5 },
          { "date": "2025-12-22T00:00:00.000Z", "count": 7 }
        ]
      }
    }
  ],
  "summary": {
    "totalArticlesFound": 156,
    "companiesWithIncreasingTrends": 2,
    "companiesWithDecreasingTrends": 1
  }
}
```

### Text Format

Human-readable plain text format:

```
COMPANY MENTION TRACKER REPORT
================================

Generated: 12/27/2025, 10:30:00 AM
Search Period: Sat Dec 21 2025 - Fri Dec 27 2025

SUMMARY
-------
Total Articles Found: 156
Companies with Increasing Trends: 2
Companies with Decreasing Trends: 1

COMPANY DETAILS
---------------
1. Apple
   Status: complete
   Trend: increasing
   Total Mentions: 45
   Average Daily: 6.4
   Percentage Change: 25.3%
   Daily Breakdown:
     Sat Dec 21 2025: 5 mentions
     Sun Dec 22 2025: 7 mentions
     ...
```

### HTML Format

Formatted HTML report with styling, suitable for viewing in a web browser. Includes:
- Professional styling and layout
- Color-coded trend indicators
- Tabular daily breakdowns
- Responsive design

## Testing

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Types

- **Unit Tests**: Test individual components and functions
- **Property-Based Tests**: Test universal properties with randomized inputs
- **Integration Tests**: Test component interactions and data flow

## Development

### Adding New Article Sources

1. Create a new source class implementing `ArticleSourceInstance`
2. Add the source to the factory function in `src/services/sources/index.ts`
3. Update configuration examples in `src/config/article-sources.json`
4. Write tests for the new source

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

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Troubleshooting

### Common Issues

**"Must provide exactly 5 companies"**
- Ensure you provide exactly 5 company names
- Check for empty strings or duplicates

**"getaddrinfo ENOTFOUND" errors**
- Check your internet connection
- Verify article source URLs are accessible
- Consider using different article sources

**Rate limit exceeded**
- Reduce the rate limit with `-r` option
- Wait for rate limits to reset
- Consider upgrading API plans

**No articles found**
- Check company name spelling
- Verify the search date range
- Ensure article sources are accessible

### Debug Mode

Enable verbose logging by setting the log level:

```bash
export LOG_LEVEL=debug
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

## Performance Considerations

- **Parallel Processing**: Companies are searched in parallel for better performance
- **Rate Limiting**: Automatic rate limiting prevents API abuse
- **Memory Management**: Large responses are processed efficiently
- **Caching**: Consider implementing response caching for frequently accessed data

## Security

- **API Key Protection**: Store API keys in environment variables
- **HTTPS Only**: All external requests use HTTPS
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Sensitive information is not exposed in error messages

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Documentation

### Quick Start Guides
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Installation, configuration, and first run
- **[CLI Usage Guide](CLI_USAGE.md)** - Complete command-line interface reference
- **[Article Sources Guide](ARTICLE_SOURCES.md)** - Configure news sources and APIs

### Comprehensive Documentation
- **[Configuration Guide](docs/CONFIGURATION_GUIDE.md)** - Detailed configuration options and examples
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation for developers
- **[Documentation Index](docs/README.md)** - Complete documentation overview

### Examples and Scenarios
- **[Usage Scenarios](examples/usage-scenarios.md)** - Real-world usage examples and workflows
- **[Sample Reports](examples/sample-reports.md)** - Example outputs in all formats (JSON, Text, HTML)
- **[Configuration Examples](examples/configuration-examples.json)** - JSON configuration examples

## Support

- **Documentation**: See [docs/](docs/) directory for comprehensive guides
- **Examples**: See [examples/](examples/) directory for practical examples
- **Issues**: Report bugs and feature requests via GitHub issues
- **Contributing**: See contribution guidelines for development setup

## Changelog

### Version 1.0.0
- Initial release
- Support for 5-company tracking over 7-day periods
- Multiple article source types (API, RSS, Mock)
- Trend analysis with 4 classification types
- Multiple report formats (JSON, Text, HTML)
- Comprehensive error handling and rate limiting
- Property-based testing for correctness validation