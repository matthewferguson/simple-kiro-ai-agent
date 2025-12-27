# Company Mention Tracker CLI

A command-line interface for the Company Mention Tracker system that monitors online articles for mentions of specified companies and generates trend reports.

## Installation

1. Build the project:
```bash
npm run build
```

2. (Optional) Install globally:
```bash
npm install -g .
```

## Usage

### Search for Company Mentions

Search for mentions of exactly 5 companies and generate a trend report:

```bash
# Basic usage
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"

# With custom output file and format
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o my-report.html -f html

# With custom data directory and rate limit
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -d ./custom-data -r 5
```

#### Search Options

- `-c, --companies <companies...>`: List of exactly 5 company names to track (required)
- `-o, --output <file>`: Output file for the report (default: report.json)
- `-f, --format <format>`: Report format: json, text, html (default: json)
- `-r, --rate-limit <number>`: Rate limit for API requests per minute (default: 10)
- `-d, --data-dir <directory>`: Directory to store data files (default: ./data)
- `--sources <sources...>`: Custom article source configurations (JSON format)

### Validate Company Names

Validate company names without running a search:

```bash
node dist/cli.js validate -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### Clear Stored Data

Clear all stored data files:

```bash
node dist/cli.js clear-data -d ./data
```

## Examples

### Basic Search
```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"
```

### Generate HTML Report
```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.html -f html
```

### Generate Text Report
```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  -o report.txt -f text
```

### Custom Article Sources
```bash
node dist/cli.js search -c "Apple" "Microsoft" "Google" "Amazon" "Tesla" \
  --sources '{"name":"NewsAPI","type":"api","endpoint":"https://newsapi.org/v2/everything","apiKey":"your-key","rateLimit":5}'
```

## Output Formats

### JSON (Default)
Structured JSON format suitable for programmatic processing.

### Text
Human-readable plain text format with summary and detailed company information.

### HTML
Formatted HTML report with styling, suitable for viewing in a web browser.

## Progress Display

During search execution, the CLI displays real-time progress:
- Current day being searched (1-7)
- Companies completed in current day
- Overall progress percentages

## Error Handling

The CLI handles various error conditions gracefully:
- Invalid company names (empty, special characters, duplicates)
- Wrong number of companies (must be exactly 5)
- Network failures during article fetching
- Rate limiting from article sources
- File system errors

Errors are logged with timestamps and context information for debugging.

## Requirements Implemented

- **Requirement 1.1**: Accept exactly 5 company names as input
- **Requirement 5.4**: Report output to console and file

## Data Storage

The CLI stores temporary data in the specified data directory:
- Daily snapshots for each company
- Error logs
- Intermediate processing results

Data can be cleared using the `clear-data` command.