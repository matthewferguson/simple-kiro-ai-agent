# Company Mention Tracker

An AI agent system that monitors online articles for mentions of specified companies over a 7-day period and analyzes trends in their coverage.

## Features

- Track 5 companies simultaneously
- Search articles over a 7-day period
- Count daily mentions for each company
- Analyze trends (increasing, decreasing, stable, volatile)
- Generate comprehensive reports
- Graceful error handling and rate limiting

## Installation

```bash
npm install
```

## Usage

```bash
npm run build
npm start
```

## Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Project Structure

```
src/
├── models/       # Data models and types
├── services/     # Business logic components
└── utils/        # Utility functions
```

## Requirements

- Node.js 18+
- TypeScript 5.3+

## License

MIT
