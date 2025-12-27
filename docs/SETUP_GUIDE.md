# Company Mention Tracker Setup Guide

This guide walks you through setting up and configuring the Company Mention Tracker system.

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Operating System**: Windows, macOS, or Linux
- **Memory**: At least 512MB available RAM
- **Storage**: 100MB free disk space
- **Internet Connection**: Required for accessing article sources

### Check Your Environment

```bash
# Check Node.js version
node --version
# Should output v18.0.0 or higher

# Check npm version
npm --version
# Should output 8.0.0 or higher
```

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd company-mention-tracker
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- `axios` - HTTP client for API requests
- `commander` - CLI argument parsing
- `date-fns` - Date manipulation utilities
- `fast-check` - Property-based testing library
- `typescript` - TypeScript compiler
- `vitest` - Testing framework

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript source code to JavaScript in the `dist/` directory.

### 4. Verify Installation

```bash
# Test the CLI
node dist/cli.js --help

# Run validation test
node dist/cli.js validate -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

## Configuration

### Article Sources

The system comes with default configurations for different environments:

#### Development (Default)
Uses mock article sources for testing:

```json
{
  "name": "Mock News Source",
  "type": "api",
  "endpoint": "https://mock-api.example.com",
  "rateLimit": 1000
}
```

#### Production (Free Tier)
Uses free RSS feeds:

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

#### Production (With NewsAPI)
Includes premium API access:

```json
[
  {
    "name": "NewsAPI",
    "type": "api",
    "endpoint": "https://newsapi.org/v2/everything",
    "apiKey": "your-api-key-here",
    "rateLimit": 100
  }
]
```

### Environment Variables

Create a `.env` file in the project root (optional):

```bash
# NewsAPI.org API key (optional)
NEWSAPI_KEY=your-newsapi-key-here

# Custom data directory (optional)
DATA_DIR=./data

# Log level (optional)
LOG_LEVEL=info
```

### NewsAPI Setup (Optional)

For access to premium news sources:

1. **Register for NewsAPI**:
   - Visit https://newsapi.org/register
   - Create a free account
   - Verify your email address

2. **Get Your API Key**:
   - Log in to your NewsAPI dashboard
   - Copy your API key

3. **Configure the System**:
   ```bash
   export NEWSAPI_KEY="your-api-key-here"
   ```

4. **Update Article Sources**:
   ```bash
   node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
     --sources '{"name":"NewsAPI","type":"api","endpoint":"https://newsapi.org/v2/everything","apiKey":"your-api-key-here","rateLimit":100}'
   ```

## Directory Structure

After installation, your project structure should look like:

```
company-mention-tracker/
├── dist/                 # Compiled JavaScript (after build)
├── src/                  # TypeScript source code
├── docs/                 # Documentation
├── examples/             # Example configurations and reports
├── data/                 # Default data storage (created on first run)
├── node_modules/         # Dependencies
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Test configuration
└── README.md             # Main documentation
```

## First Run

### 1. Test with Mock Data

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

This will:
- Use mock article sources (no real API calls)
- Create a `data/` directory for storage
- Generate a `report.json` file
- Display progress and results

### 2. Validate Company Names

```bash
node dist/cli.js validate -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### 3. Generate Different Report Formats

```bash
# HTML report
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.html -f html

# Text report
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.txt -f text
```

## Configuration Options

### Rate Limiting

Control API request frequency:

```bash
# 5 requests per minute
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" -r 5

# 30 requests per minute
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" -r 30
```

### Data Directory

Specify where to store data files:

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -d ./my-custom-data
```

### Custom Article Sources

Use your own article source configuration:

```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  --sources '{"name":"Custom API","type":"api","endpoint":"https://api.example.com","rateLimit":10}'
```

## Testing the Setup

### Run Unit Tests

```bash
npm test
```

### Run Property-Based Tests

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Troubleshooting Setup Issues

### Node.js Version Issues

**Problem**: "node: command not found" or version too old

**Solution**:
1. Install Node.js from https://nodejs.org/
2. Choose the LTS (Long Term Support) version
3. Restart your terminal after installation

### Permission Issues

**Problem**: "EACCES: permission denied" during npm install

**Solution**:
```bash
# On macOS/Linux
sudo npm install

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Build Failures

**Problem**: TypeScript compilation errors

**Solution**:
1. Ensure TypeScript is installed: `npm install -g typescript`
2. Clean and rebuild: `rm -rf dist/ && npm run build`
3. Check for syntax errors in source files

### Network Issues

**Problem**: Cannot access article sources

**Solution**:
1. Check internet connection
2. Verify firewall settings
3. Try using different article sources
4. Use mock sources for testing: default configuration

### Memory Issues

**Problem**: "JavaScript heap out of memory"

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

## Performance Optimization

### For Large-Scale Usage

1. **Increase Rate Limits**: If you have premium API access
   ```bash
   node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" -r 100
   ```

2. **Use Multiple Sources**: Distribute load across sources
   ```bash
   node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
     --sources '{"name":"Source1","type":"api","endpoint":"...","rateLimit":50}' \
     --sources '{"name":"Source2","type":"rss","endpoint":"...","rateLimit":60}'
   ```

3. **Optimize Data Storage**: Use SSD storage for better I/O performance

### For Development

1. **Use Mock Sources**: Faster testing without API calls
2. **Enable Watch Mode**: For continuous testing
   ```bash
   npm run test:watch
   ```

## Next Steps

After successful setup:

1. **Read the CLI Usage Guide**: [CLI_USAGE.md](../CLI_USAGE.md)
2. **Configure Article Sources**: [ARTICLE_SOURCES.md](../ARTICLE_SOURCES.md)
3. **Review Examples**: Check the `examples/` directory
4. **Run Your First Real Search**: With RSS feeds or NewsAPI

## Getting Help

If you encounter issues during setup:

1. **Check the Troubleshooting Section**: Above
2. **Review System Requirements**: Ensure compatibility
3. **Check GitHub Issues**: For known problems and solutions
4. **Enable Debug Logging**: For detailed error information
   ```bash
   export LOG_LEVEL=debug
   node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
   ```

## Security Considerations

### API Key Security

- Never commit API keys to version control
- Use environment variables for sensitive data
- Rotate API keys regularly
- Monitor API usage for unusual activity

### Network Security

- All external requests use HTTPS
- Validate all input data
- Implement proper error handling
- Use rate limiting to prevent abuse

### Data Privacy

- Data is stored locally by default
- No sensitive information is logged
- Clear data regularly if not needed
- Consider encryption for sensitive deployments