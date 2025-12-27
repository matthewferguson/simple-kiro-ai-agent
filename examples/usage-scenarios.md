# Usage Scenarios and Examples

This document provides practical examples of how to use the Company Mention Tracker in different scenarios.

## Scenario 1: Market Research Analyst

**Goal**: Track major tech companies to understand media coverage trends for investment research.

### Setup

```bash
# Install and build
npm install && npm run build

# Set up NewsAPI for comprehensive coverage
export NEWSAPI_KEY="your-newsapi-key-here"
```

### Execution

```bash
# Track major tech companies
node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Meta" \
  -o tech-giants-report.html \
  -f html \
  -r 30

# Generate additional formats for different uses
node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Meta" \
  -o tech-giants-data.json \
  -f json

node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Meta" \
  -o tech-giants-summary.txt \
  -f text
```

### Expected Output

- **HTML Report**: Professional report for client presentations
- **JSON Data**: Structured data for further analysis in Excel/Python
- **Text Summary**: Quick overview for email updates

### Use Cases

- Weekly investment committee reports
- Client portfolio updates
- Competitive analysis
- Market sentiment tracking

## Scenario 2: Startup Competitor Analysis

**Goal**: Monitor competitors in the electric vehicle space to track media attention and market positioning.

### Setup

```bash
# Use free RSS sources to minimize costs
# No API keys required
```

### Execution

```bash
# Track EV companies
node dist/cli.js search \
  -c "Tesla" "Rivian" "Lucid" "NIO" "BYD" \
  -o ev-competitors.json \
  -r 5 \
  -d ./ev-analysis

# Generate weekly reports
node dist/cli.js search \
  -c "Tesla" "Rivian" "Lucid" "NIO" "BYD" \
  -o "ev-report-$(date +%Y%m%d).html" \
  -f html
```

### Analysis Workflow

1. **Daily Monitoring**: Run searches daily to track mention trends
2. **Weekly Reports**: Generate HTML reports for team meetings
3. **Trend Analysis**: Compare week-over-week changes
4. **Strategic Planning**: Use insights for marketing and positioning

### Key Metrics to Watch

- Mention volume changes
- Trend classifications (increasing/decreasing)
- Competitive positioning
- Media sentiment shifts

## Scenario 3: PR Agency Campaign Tracking

**Goal**: Track client companies and competitors during a major product launch campaign.

### Setup

```bash
# High-volume configuration for real-time monitoring
export NEWSAPI_KEY="premium-api-key"
export DATA_DIR="./campaign-data"
```

### Execution

```bash
# Track client and competitors during campaign
node dist/cli.js search \
  -c "ClientCorp" "Competitor1" "Competitor2" "Competitor3" "Competitor4" \
  -o campaign-impact.json \
  -r 50 \
  -d ./campaign-data

# Generate client reports
node dist/cli.js search \
  -c "ClientCorp" "Competitor1" "Competitor2" "Competitor3" "Competitor4" \
  -o client-report.html \
  -f html
```

### Campaign Monitoring

```bash
# Before campaign launch (baseline)
node dist/cli.js search \
  -c "ClientCorp" "Competitor1" "Competitor2" "Competitor3" "Competitor4" \
  -o pre-campaign-baseline.json

# During campaign (daily monitoring)
for day in {1..7}; do
  node dist/cli.js search \
    -c "ClientCorp" "Competitor1" "Competitor2" "Competitor3" "Competitor4" \
    -o "campaign-day-${day}.json"
  sleep 86400  # Wait 24 hours
done

# Post-campaign analysis
node dist/cli.js search \
  -c "ClientCorp" "Competitor1" "Competitor2" "Competitor3" "Competitor4" \
  -o post-campaign-analysis.html \
  -f html
```

### Success Metrics

- Increased mention volume for client
- Positive trend classification
- Market share of voice vs competitors
- Campaign reach and impact

## Scenario 4: Academic Research

**Goal**: Study media coverage patterns of social media companies for academic publication.

### Setup

```bash
# Conservative rate limiting for ethical research
# Use free sources to respect terms of service
```

### Execution

```bash
# Study social media companies
node dist/cli.js search \
  -c "Meta" "Twitter" "Snapchat" "TikTok" "LinkedIn" \
  -o social-media-study.json \
  -r 5 \
  -d ./research-data

# Generate research data
node dist/cli.js search \
  -c "Meta" "Twitter" "Snapchat" "TikTok" "LinkedIn" \
  -o research-dataset.json \
  -f json
```

### Research Methodology

1. **Data Collection**: 7-day periods across multiple months
2. **Trend Analysis**: Statistical analysis of mention patterns
3. **Comparative Study**: Cross-company trend comparisons
4. **Publication**: Academic paper with data visualizations

### Ethical Considerations

- Respect rate limits and terms of service
- Use conservative request rates
- Cite data sources appropriately
- Follow academic research guidelines

## Scenario 5: Financial News Monitoring

**Goal**: Track financial services companies for regulatory compliance and risk management.

### Setup

```bash
# Focus on financial news sources
export NEWSAPI_KEY="financial-api-key"
```

### Execution

```bash
# Track major banks
node dist/cli.js search \
  -c "JPMorgan" "Bank of America" "Wells Fargo" "Citigroup" "Goldman Sachs" \
  -o financial-monitoring.json \
  -r 20 \
  --sources '{"name":"Financial Times","type":"rss","endpoint":"https://www.ft.com/rss/feed","rateLimit":60}' \
  --sources '{"name":"Reuters Finance","type":"rss","endpoint":"https://www.reuters.com/business/finance/rss","rateLimit":60}'

# Generate compliance report
node dist/cli.js search \
  -c "JPMorgan" "Bank of America" "Wells Fargo" "Citigroup" "Goldman Sachs" \
  -o compliance-report.html \
  -f html
```

### Risk Monitoring

- **Regulatory News**: Track mentions related to compliance issues
- **Market Sentiment**: Monitor negative trend classifications
- **Competitive Intelligence**: Compare mention volumes
- **Crisis Management**: Rapid response to negative coverage

## Scenario 6: Small Business Local Monitoring

**Goal**: Track local competitors and industry leaders for a small business.

### Setup

```bash
# Minimal cost setup using free sources
# No API keys required
```

### Execution

```bash
# Track industry leaders and local competitors
node dist/cli.js search \
  -c "IndustryLeader1" "IndustryLeader2" "LocalCompetitor1" "LocalCompetitor2" "MyBusiness" \
  -o local-market-analysis.txt \
  -f text \
  -r 3

# Weekly business intelligence
node dist/cli.js search \
  -c "IndustryLeader1" "IndustryLeader2" "LocalCompetitor1" "LocalCompetitor2" "MyBusiness" \
  -o "weekly-intel-$(date +%Y%m%d).json"
```

### Business Intelligence

- **Market Positioning**: Compare mention volumes with competitors
- **Industry Trends**: Track leader mention patterns
- **Opportunity Identification**: Find gaps in competitor coverage
- **Brand Awareness**: Monitor own company mentions

## Scenario 7: Crisis Management

**Goal**: Monitor company mentions during a crisis situation for rapid response.

### Setup

```bash
# High-frequency monitoring setup
export NEWSAPI_KEY="crisis-monitoring-key"
export LOG_LEVEL="debug"
```

### Execution

```bash
# Crisis monitoring with high rate limits
node dist/cli.js search \
  -c "CrisisCompany" "Competitor1" "Competitor2" "Competitor3" "IndustryLeader" \
  -o crisis-monitoring.json \
  -r 100 \
  -d ./crisis-data

# Real-time HTML reports for stakeholders
node dist/cli.js search \
  -c "CrisisCompany" "Competitor1" "Competitor2" "Competitor3" "IndustryLeader" \
  -o crisis-report.html \
  -f html
```

### Crisis Response Workflow

1. **Immediate Assessment**: Run initial search to establish baseline
2. **Continuous Monitoring**: Hourly searches during crisis peak
3. **Stakeholder Reports**: Regular HTML reports for management
4. **Trend Analysis**: Monitor for improvement or deterioration
5. **Recovery Tracking**: Long-term monitoring post-crisis

### Key Crisis Metrics

- Mention volume spikes
- Negative trend classifications
- Competitive comparison during crisis
- Recovery trend identification

## Scenario 8: Development and Testing

**Goal**: Test the system functionality and develop custom integrations.

### Setup

```bash
# Development environment with mock sources
export LOG_LEVEL="debug"
export DATA_DIR="./test-data"
```

### Execution

```bash
# Test with mock data
node dist/cli.js search \
  -c "TestCompany1" "TestCompany2" "TestCompany3" "TestCompany4" "TestCompany5" \
  -o test-report.json \
  -r 1000 \
  -d ./test-data

# Validate company names
node dist/cli.js validate \
  -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"

# Test different output formats
node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o test.json -f json

node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o test.txt -f text

node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o test.html -f html

# Clear test data
node dist/cli.js clear-data -d ./test-data
```

### Development Workflow

1. **Unit Testing**: Run automated test suite
2. **Integration Testing**: Test with mock sources
3. **Performance Testing**: High rate limit testing
4. **Format Testing**: Verify all output formats
5. **Error Testing**: Test error handling scenarios

## Scenario 9: Automated Reporting Pipeline

**Goal**: Set up automated daily/weekly reporting for ongoing monitoring.

### Setup

```bash
# Create automation scripts
mkdir -p scripts
```

### Daily Automation Script

```bash
#!/bin/bash
# scripts/daily-report.sh

DATE=$(date +%Y%m%d)
COMPANIES="Apple Microsoft Google Amazon Tesla"

# Generate daily report
node dist/cli.js search \
  -c $COMPANIES \
  -o "reports/daily-${DATE}.json" \
  -r 20

# Generate HTML for stakeholders
node dist/cli.js search \
  -c $COMPANIES \
  -o "reports/daily-${DATE}.html" \
  -f html

# Email report (requires mail setup)
echo "Daily mention tracking report attached" | \
  mail -s "Daily Report ${DATE}" -A "reports/daily-${DATE}.html" \
  stakeholders@company.com
```

### Weekly Automation Script

```bash
#!/bin/bash
# scripts/weekly-report.sh

WEEK=$(date +%Y-W%U)
COMPANIES="Apple Microsoft Google Amazon Tesla"

# Generate comprehensive weekly report
node dist/cli.js search \
  -c $COMPANIES \
  -o "reports/weekly-${WEEK}.json" \
  -r 30

# Generate executive summary
node dist/cli.js search \
  -c $COMPANIES \
  -o "reports/weekly-${WEEK}.html" \
  -f html

# Archive old data (keep last 4 weeks)
find ./data -name "*.json" -mtime +28 -delete
```

### Cron Job Setup

```bash
# Add to crontab (crontab -e)

# Daily report at 9 AM
0 9 * * * /path/to/scripts/daily-report.sh

# Weekly report on Mondays at 8 AM
0 8 * * 1 /path/to/scripts/weekly-report.sh

# Monthly cleanup on first day of month
0 2 1 * * /path/to/scripts/monthly-cleanup.sh
```

## Scenario 10: Multi-Environment Deployment

**Goal**: Deploy the system across development, staging, and production environments.

### Development Environment

```bash
# Development configuration
export NODE_ENV="development"
export DATA_DIR="./data-dev"
export LOG_LEVEL="debug"

# Use mock sources for fast testing
node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o dev-report.json \
  -r 1000
```

### Staging Environment

```bash
# Staging configuration
export NODE_ENV="staging"
export DATA_DIR="./data-staging"
export LOG_LEVEL="info"
export NEWSAPI_KEY="staging-api-key"

# Use limited real sources
node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o staging-report.json \
  -r 10 \
  --sources '{"name":"Reuters","type":"rss","endpoint":"https://www.reuters.com/business/finance/rss","rateLimit":60}'
```

### Production Environment

```bash
# Production configuration
export NODE_ENV="production"
export DATA_DIR="/var/data/mention-tracker"
export LOG_LEVEL="warn"
export NEWSAPI_KEY="production-api-key"

# Full production configuration
node dist/cli.js search \
  -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o /var/reports/production-report.json \
  -r 50 \
  --sources '{"name":"NewsAPI","type":"api","endpoint":"https://newsapi.org/v2/everything","apiKey":"'$NEWSAPI_KEY'","rateLimit":200}' \
  --sources '{"name":"Reuters","type":"rss","endpoint":"https://www.reuters.com/business/finance/rss","rateLimit":120}'
```

## Best Practices Summary

### Rate Limiting

- **Development**: 1000+ requests/minute (mock sources)
- **Testing**: 10-50 requests/minute (limited real sources)
- **Production**: 20-100 requests/minute (based on API limits)

### Data Management

- **Development**: Clear data frequently
- **Staging**: Keep 1 week of data
- **Production**: Archive data monthly, keep 3 months active

### Error Handling

- **Development**: Debug logging enabled
- **Staging**: Info logging, error alerts
- **Production**: Warn/error logging, monitoring integration

### Security

- **API Keys**: Environment variables only, never in code
- **Data Storage**: Secure directories with proper permissions
- **Network**: HTTPS only, validate all external requests

### Monitoring

- **Health Checks**: Regular validation commands
- **Performance**: Monitor request rates and response times
- **Alerts**: Set up notifications for failures or anomalies

These scenarios demonstrate the flexibility and power of the Company Mention Tracker system across various use cases and environments.