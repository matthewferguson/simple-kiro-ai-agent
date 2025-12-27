#!/usr/bin/env node

import { Command } from 'commander';
import { SearchEngine } from './services/SearchEngine.js';
import { SystemConfig, ArticleSource, Report } from './models/types.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * CLI interface for the Company Mention Tracker
 * Implements requirements 1.1, 5.4
 */

const program = new Command();

// Default article sources for testing/demo purposes
const DEFAULT_ARTICLE_SOURCES: ArticleSource[] = [
  {
    name: 'Mock News Source',
    type: 'api',
    endpoint: 'https://mock-news-api.example.com',
    rateLimit: 10
  }
];

program
  .name('company-mention-tracker')
  .description('AI agent system that monitors online articles for company mentions and analyzes trends')
  .version('1.0.0');

program
  .command('search')
  .description('Search for company mentions and generate trend report')
  .requiredOption('-c, --companies <companies...>', 'List of exactly 5 company names to track')
  .option('-o, --output <file>', 'Output file for the report (default: report.json)')
  .option('-f, --format <format>', 'Report format: json, text, html (default: json)', 'json')
  .option('-r, --rate-limit <number>', 'Rate limit for API requests per minute (default: 10)', '10')
  .option('-d, --data-dir <directory>', 'Directory to store data files (default: ./data)')
  .option('--sources <sources...>', 'Custom article source configurations (JSON format)')
  .action(async (options) => {
    try {
      console.log('🔍 Company Mention Tracker Starting...\n');
      
      // Validate and parse companies (Requirement 1.1)
      const companies = parseCompanies(options.companies);
      
      // Parse other options
      const rateLimit = parseInt(options.rateLimit);
      const outputFile = options.output || 'report.json';
      const format = options.format;
      const dataDir = options.dataDir || './data';
      
      // Ensure data directory exists
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
      
      // Parse article sources
      const articleSources = parseArticleSources(options.sources);
      
      // Create system configuration
      const config: SystemConfig = {
        companies,
        searchPeriodDays: 7,
        articleSources,
        rateLimit
      };
      
      // Initialize and run search engine
      const searchEngine = new SearchEngine(dataDir);
      
      console.log('📋 Configuration:');
      console.log(`   Companies: ${companies.join(', ')}`);
      console.log(`   Rate limit: ${rateLimit} requests/minute`);
      console.log(`   Data directory: ${dataDir}`);
      console.log(`   Output: ${outputFile} (${format})`);
      console.log('');
      
      // Initialize search engine
      console.log('🔧 Initializing search engine...');
      await searchEngine.initialize(config);
      
      // Set up progress monitoring
      const progressInterval = setInterval(() => {
        const progress = searchEngine.getProgress();
        displayProgress(progress);
      }, 2000);
      
      // Execute search
      console.log('🚀 Starting search execution...\n');
      const report = await searchEngine.executeSearch();
      
      // Clear progress monitoring
      clearInterval(progressInterval);
      
      // Display final progress
      const finalProgress = searchEngine.getProgress();
      displayProgress(finalProgress);
      console.log('\n✅ Search completed!\n');
      
      // Generate and save report (Requirement 5.4)
      await saveReport(report, outputFile, format);
      
      // Display summary to console
      displayReportSummary(report);
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate company names without running search')
  .requiredOption('-c, --companies <companies...>', 'List of company names to validate')
  .action((options) => {
    try {
      const companies = parseCompanies(options.companies);
      console.log('✅ Company names are valid:');
      companies.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company}`);
      });
    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('clear-data')
  .description('Clear all stored data')
  .option('-d, --data-dir <directory>', 'Directory containing data files (default: ./data)', './data')
  .action(async (options) => {
    try {
      const searchEngine = new SearchEngine(options.dataDir);
      await searchEngine.clearData();
      console.log('✅ Data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing data:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Parses and validates company names from CLI arguments
 * Implements requirement 1.1: Accept exactly 5 company names
 */
function parseCompanies(companiesInput: string[]): string[] {
  if (!companiesInput || companiesInput.length === 0) {
    throw new Error('No companies provided. Use -c or --companies to specify company names.');
  }
  
  // Handle case where companies might be passed as a single comma-separated string
  let companies: string[];
  if (companiesInput.length === 1 && companiesInput[0].includes(',')) {
    companies = companiesInput[0].split(',').map(c => c.trim());
  } else {
    companies = companiesInput.map(c => c.trim());
  }
  
  // Validate exactly 5 companies
  if (companies.length !== 5) {
    throw new Error(`Must provide exactly 5 companies, got ${companies.length}. Example: -c "Apple" "Microsoft" "Google" "Amazon" "Tesla"`);
  }
  
  // Validate each company name
  companies.forEach((company, index) => {
    if (!company || company.length === 0) {
      throw new Error(`Company ${index + 1} is empty`);
    }
    
    // Check for valid characters
    const validCharPattern = /^[a-zA-Z0-9\s\-\.'&]+$/;
    if (!validCharPattern.test(company)) {
      throw new Error(`Company "${company}" contains invalid characters`);
    }
    
    if (company.length > 100) {
      throw new Error(`Company "${company}" is too long (maximum 100 characters)`);
    }
  });
  
  // Check for duplicates
  const normalizedNames = companies.map(name => name.toLowerCase());
  const uniqueNames = new Set(normalizedNames);
  if (uniqueNames.size !== companies.length) {
    throw new Error('Duplicate company names are not allowed');
  }
  
  return companies;
}

/**
 * Parses article sources from CLI arguments or uses defaults
 */
function parseArticleSources(sourcesInput?: string[]): ArticleSource[] {
  if (!sourcesInput || sourcesInput.length === 0) {
    return DEFAULT_ARTICLE_SOURCES;
  }
  
  try {
    return sourcesInput.map(sourceJson => {
      const source = JSON.parse(sourceJson);
      
      // Validate required fields
      if (!source.name || !source.type || !source.endpoint) {
        throw new Error('Article source must have name, type, and endpoint');
      }
      
      if (!['api', 'rss', 'scraper'].includes(source.type)) {
        throw new Error(`Invalid source type: ${source.type}`);
      }
      
      return {
        name: source.name,
        type: source.type,
        endpoint: source.endpoint,
        apiKey: source.apiKey,
        rateLimit: source.rateLimit || 10
      };
    });
  } catch (error) {
    throw new Error(`Invalid article source configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Displays search progress during execution
 */
function displayProgress(progress: { currentDay: number; totalDays: number; companiesCompleted: number; totalCompanies: number }): void {
  const dayProgress = progress.totalDays > 0 ? Math.round((progress.currentDay / progress.totalDays) * 100) : 0;
  const companyProgress = progress.totalCompanies > 0 ? Math.round((progress.companiesCompleted / progress.totalCompanies) * 100) : 0;
  
  process.stdout.write(`\r📊 Progress: Day ${progress.currentDay}/${progress.totalDays} (${dayProgress}%) | Companies ${progress.companiesCompleted}/${progress.totalCompanies} (${companyProgress}%)`);
}

/**
 * Saves the report to file in the specified format
 * Implements requirement 5.4: Report output to console and file
 */
async function saveReport(report: Report, outputFile: string, format: string): Promise<void> {
  try {
    let content: string;
    
    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
        
      case 'text':
        content = formatReportAsText(report);
        break;
        
      case 'html':
        content = formatReportAsHtml(report);
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}. Use json, text, or html.`);
    }
    
    // Ensure output directory exists
    const outputDir = join(outputFile, '..');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    writeFileSync(outputFile, content, 'utf8');
    console.log(`📄 Report saved to: ${outputFile}`);
    
  } catch (error) {
    throw new Error(`Failed to save report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Formats report as plain text
 */
function formatReportAsText(report: Report): string {
  const lines: string[] = [];
  
  lines.push('COMPANY MENTION TRACKER REPORT');
  lines.push('================================');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt.toLocaleString()}`);
  lines.push(`Search Period: ${report.searchPeriod.startDate.toDateString()} - ${report.searchPeriod.endDate.toDateString()}`);
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(`Total Articles Found: ${report.summary.totalArticlesFound}`);
  lines.push(`Companies with Increasing Trends: ${report.summary.companiesWithIncreasingTrends}`);
  lines.push(`Companies with Decreasing Trends: ${report.summary.companiesWithDecreasingTrends}`);
  lines.push('');
  
  // Company details
  lines.push('COMPANY DETAILS');
  lines.push('---------------');
  
  report.companies.forEach((companyReport, index) => {
    lines.push(`${index + 1}. ${companyReport.company}`);
    lines.push(`   Status: ${companyReport.status}`);
    lines.push(`   Trend: ${companyReport.trendAnalysis.classification}`);
    lines.push(`   Total Mentions: ${companyReport.trendAnalysis.statistics.totalMentions}`);
    lines.push(`   Average Daily: ${companyReport.trendAnalysis.statistics.averageDaily.toFixed(1)}`);
    lines.push(`   Percentage Change: ${companyReport.trendAnalysis.statistics.percentageChange.toFixed(1)}%`);
    
    if (companyReport.trendAnalysis.dailyBreakdown.length > 0) {
      lines.push('   Daily Breakdown:');
      companyReport.trendAnalysis.dailyBreakdown.forEach(day => {
        lines.push(`     ${day.date.toDateString()}: ${day.count} mentions`);
      });
    }
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * Formats report as HTML
 */
function formatReportAsHtml(report: Report): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Company Mention Tracker Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
        .company { border: 1px solid #ddd; margin-bottom: 20px; padding: 20px; border-radius: 5px; }
        .company h3 { margin-top: 0; color: #333; }
        .trend { font-weight: bold; padding: 5px 10px; border-radius: 3px; }
        .trend.increasing { background-color: #d4edda; color: #155724; }
        .trend.decreasing { background-color: #f8d7da; color: #721c24; }
        .trend.stable { background-color: #d1ecf1; color: #0c5460; }
        .trend.volatile { background-color: #fff3cd; color: #856404; }
        .daily-breakdown { margin-top: 15px; }
        .daily-breakdown table { width: 100%; border-collapse: collapse; }
        .daily-breakdown th, .daily-breakdown td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .daily-breakdown th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Company Mention Tracker Report</h1>
        <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
        <p><strong>Search Period:</strong> ${report.searchPeriod.startDate.toDateString()} - ${report.searchPeriod.endDate.toDateString()}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Articles Found:</strong> ${report.summary.totalArticlesFound}</p>
        <p><strong>Companies with Increasing Trends:</strong> ${report.summary.companiesWithIncreasingTrends}</p>
        <p><strong>Companies with Decreasing Trends:</strong> ${report.summary.companiesWithDecreasingTrends}</p>
    </div>
    
    <h2>Company Details</h2>
    ${report.companies.map(companyReport => `
        <div class="company">
            <h3>${companyReport.company}</h3>
            <p><strong>Status:</strong> ${companyReport.status}</p>
            <p><strong>Trend:</strong> <span class="trend ${companyReport.trendAnalysis.classification}">${companyReport.trendAnalysis.classification}</span></p>
            <p><strong>Total Mentions:</strong> ${companyReport.trendAnalysis.statistics.totalMentions}</p>
            <p><strong>Average Daily:</strong> ${companyReport.trendAnalysis.statistics.averageDaily.toFixed(1)}</p>
            <p><strong>Percentage Change:</strong> ${companyReport.trendAnalysis.statistics.percentageChange.toFixed(1)}%</p>
            
            ${companyReport.trendAnalysis.dailyBreakdown.length > 0 ? `
                <div class="daily-breakdown">
                    <h4>Daily Breakdown</h4>
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Mentions</th></tr>
                        </thead>
                        <tbody>
                            ${companyReport.trendAnalysis.dailyBreakdown.map(day => 
                                `<tr><td>${day.date.toDateString()}</td><td>${day.count}</td></tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;
  
  return html;
}

/**
 * Displays a summary of the report to the console
 * Implements requirement 5.4: Report output to console
 */
function displayReportSummary(report: Report): void {
  console.log('📊 REPORT SUMMARY');
  console.log('==================');
  console.log(`Search Period: ${report.searchPeriod.startDate.toDateString()} - ${report.searchPeriod.endDate.toDateString()}`);
  console.log(`Total Articles Found: ${report.summary.totalArticlesFound}`);
  console.log(`Companies with Increasing Trends: ${report.summary.companiesWithIncreasingTrends}`);
  console.log(`Companies with Decreasing Trends: ${report.summary.companiesWithDecreasingTrends}`);
  console.log('');
  
  console.log('📈 COMPANY TRENDS');
  console.log('==================');
  
  // Sort companies by total mentions (descending), then alphabetically
  const sortedCompanies = [...report.companies].sort((a, b) => {
    const mentionDiff = b.trendAnalysis.statistics.totalMentions - a.trendAnalysis.statistics.totalMentions;
    if (mentionDiff !== 0) return mentionDiff;
    return a.company.localeCompare(b.company);
  });
  
  sortedCompanies.forEach((companyReport, index) => {
    const trend = companyReport.trendAnalysis.classification;
    const trendIcon = getTrendIcon(trend);
    
    console.log(`${index + 1}. ${companyReport.company} ${trendIcon}`);
    console.log(`   Status: ${companyReport.status}`);
    console.log(`   Trend: ${trend} (${companyReport.trendAnalysis.statistics.percentageChange.toFixed(1)}%)`);
    console.log(`   Total Mentions: ${companyReport.trendAnalysis.statistics.totalMentions}`);
    console.log(`   Average Daily: ${companyReport.trendAnalysis.statistics.averageDaily.toFixed(1)}`);
    console.log('');
  });
}

/**
 * Gets an icon for the trend classification
 */
function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'increasing': return '📈';
    case 'decreasing': return '📉';
    case 'stable': return '➡️';
    case 'volatile': return '📊';
    default: return '❓';
  }
}

// Parse command line arguments
program.parse();