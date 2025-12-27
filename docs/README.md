# Company Mention Tracker Documentation

Welcome to the comprehensive documentation for the Company Mention Tracker system. This directory contains detailed guides, references, and examples to help you get the most out of the system.

## Quick Start

If you're new to the system, start here:

1. **[Setup Guide](SETUP_GUIDE.md)** - Installation and initial configuration
2. **[Main README](../README.md)** - Overview and basic usage
3. **[CLI Usage Guide](../CLI_USAGE.md)** - Command-line interface reference

## Documentation Structure

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [Setup Guide](SETUP_GUIDE.md) | Installation, configuration, and first run | All users |
| [Configuration Guide](CONFIGURATION_GUIDE.md) | Detailed configuration options and examples | All users |
| [API Reference](API_REFERENCE.md) | Complete API documentation for developers | Developers |

### Guides and References

| Document | Description | Audience |
|----------|-------------|----------|
| [CLI Usage Guide](../CLI_USAGE.md) | Command-line interface reference | End users |
| [Article Sources Guide](../ARTICLE_SOURCES.md) | Article source configuration and setup | System administrators |

### Examples and Scenarios

| Document | Description | Audience |
|----------|-------------|----------|
| [Usage Scenarios](../examples/usage-scenarios.md) | Real-world usage examples and workflows | All users |
| [Sample Reports](../examples/sample-reports.md) | Example outputs in all formats | All users |
| [Configuration Examples](../examples/configuration-examples.json) | JSON configuration examples | Developers |

## Getting Started Workflow

### 1. Installation and Setup
```bash
# Follow the setup guide
npm install
npm run build
```

### 2. Basic Configuration
```bash
# Set up environment (optional)
export NEWSAPI_KEY="your-api-key"
```

### 3. First Search
```bash
# Run your first search
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### 4. Explore Output Formats
```bash
# Generate different report formats
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" -o report.html -f html
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" -o report.txt -f text
```

## Key Concepts

### System Architecture

The Company Mention Tracker follows a modular pipeline architecture:

```
Configuration → Search → Collection → Analysis → Reporting
```

1. **Configuration**: Validate companies and sources
2. **Search**: Query article sources for mentions
3. **Collection**: Extract and store mention data
4. **Analysis**: Calculate trends and statistics
5. **Reporting**: Generate formatted reports

### Core Components

- **SearchEngine**: Main orchestrator
- **ConfigurationManager**: Input validation
- **ArticleFetcher**: HTTP client with rate limiting
- **MentionExtractor**: Article processing
- **DataStore**: Data persistence
- **TrendAnalyzer**: Statistical analysis
- **ReportGenerator**: Output formatting

### Data Flow

```
Companies → Article Sources → Articles → Mentions → Daily Snapshots → Trend Analysis → Reports
```

## Configuration Overview

### Basic Configuration

```bash
# Required: Exactly 5 companies
-c "Company1" "Company2" "Company3" "Company4" "Company5"

# Optional: Output and format
-o report.json -f json

# Optional: Performance tuning
-r 10 -d ./data
```

### Article Sources

The system supports three types of article sources:

1. **API Sources**: NewsAPI.org, custom APIs
2. **RSS Feeds**: Reuters, BBC, TechCrunch, etc.
3. **Mock Sources**: Testing and development

### Environment Variables

```bash
NEWSAPI_KEY=your-api-key-here
DATA_DIR=./data
LOG_LEVEL=info
```

## Common Use Cases

### Market Research
- Track competitor mentions
- Analyze industry trends
- Generate client reports

### PR and Marketing
- Monitor campaign impact
- Track brand mentions
- Competitive analysis

### Academic Research
- Study media coverage patterns
- Analyze mention trends
- Generate research datasets

### Financial Analysis
- Monitor financial services companies
- Risk assessment
- Regulatory compliance

## Troubleshooting

### Common Issues

| Issue | Solution | Reference |
|-------|----------|-----------|
| "Must provide exactly 5 companies" | Check company count and formatting | [Setup Guide](SETUP_GUIDE.md) |
| Rate limit exceeded | Reduce rate limit or upgrade API plan | [Configuration Guide](CONFIGURATION_GUIDE.md) |
| Network connectivity issues | Check internet connection and source URLs | [Article Sources Guide](../ARTICLE_SOURCES.md) |
| No articles found | Verify company names and date ranges | [Usage Scenarios](../examples/usage-scenarios.md) |

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
export LOG_LEVEL=debug
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

## Advanced Topics

### Custom Article Sources

Implement custom article sources by extending the `ArticleSourceInstance` interface:

```typescript
class CustomSource implements ArticleSourceInstance {
  async searchArticles(company: string, date: Date): Promise<Article[]> {
    // Implementation
  }
}
```

### Programmatic Usage

Use the system programmatically in your applications:

```typescript
import { SearchEngine } from './services/SearchEngine.js';

const engine = new SearchEngine('./data');
await engine.initialize(config);
const report = await engine.executeSearch();
```

### Performance Optimization

- Use appropriate rate limits for your API tier
- Implement caching for frequently accessed data
- Monitor memory usage for large datasets
- Use parallel processing where possible

### Security Considerations

- Store API keys in environment variables
- Use HTTPS for all external requests
- Validate and sanitize all inputs
- Implement proper error handling

## API Reference Quick Links

### Core Interfaces
- [SystemConfig](API_REFERENCE.md#systemconfig)
- [ArticleSource](API_REFERENCE.md#articlesource)
- [Report](API_REFERENCE.md#report)
- [TrendAnalysis](API_REFERENCE.md#trendanalysis)

### Main Classes
- [SearchEngine](API_REFERENCE.md#searchengine)
- [ConfigurationManager](API_REFERENCE.md#configurationmanager)
- [ArticleFetcher](API_REFERENCE.md#articlefetcher)
- [TrendAnalyzer](API_REFERENCE.md#trendanalyzer)

## Contributing

### Development Setup

```bash
# Clone and setup
git clone <repository>
cd company-mention-tracker
npm install

# Run tests
npm test
npm run test:coverage

# Build
npm run build
```

### Code Style

- Follow TypeScript best practices
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Write comprehensive tests

### Testing

- Unit tests for individual components
- Property-based tests for correctness
- Integration tests for data flow
- Mock sources for reliable testing

## Support and Resources

### Documentation
- **Setup**: [Setup Guide](SETUP_GUIDE.md)
- **Configuration**: [Configuration Guide](CONFIGURATION_GUIDE.md)
- **API**: [API Reference](API_REFERENCE.md)
- **Examples**: [Usage Scenarios](../examples/usage-scenarios.md)

### Community
- **Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas
- **Contributing**: See contribution guidelines

### External Resources
- **NewsAPI**: https://newsapi.org/docs
- **RSS Specification**: https://www.rssboard.org/rss-specification
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Node.js**: https://nodejs.org/docs/

## Version History

### Version 1.0.0
- Initial release
- Support for 5-company tracking over 7-day periods
- Multiple article source types (API, RSS, Mock)
- Trend analysis with 4 classification types
- Multiple report formats (JSON, Text, HTML)
- Comprehensive error handling and rate limiting
- Property-based testing for correctness validation
- Complete CLI interface
- Extensive documentation and examples

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

**Need help?** Start with the [Setup Guide](SETUP_GUIDE.md) or check the [Usage Scenarios](../examples/usage-scenarios.md) for practical examples.