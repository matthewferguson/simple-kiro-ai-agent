import {
  Report,
  CompanyReport,
  ReportSummary,
  TrendAnalysis,
  DailyMentionCount
} from '../models/types.js';

/**
 * ReportGenerator creates comprehensive reports from trend analysis data
 * Implements requirements 5.1, 5.2, 5.3, 5.5, 6.2, 6.3
 */
export class ReportGenerator {
  /**
   * Generates a complete report from trend analyses
   * Requirements 5.1, 5.2: Include all companies with required data
   */
  generateReport(
    analyses: TrendAnalysis[],
    searchPeriod: { startDate: Date; endDate: Date },
    errors: Map<string, string[]> = new Map()
  ): Report {
    // Sort companies by total mentions (descending), then alphabetically (requirement 5.5)
    const sortedAnalyses = this.sortCompaniesByMentions(analyses);
    
    // Create company reports with status information (requirements 6.2, 6.3)
    const companies: CompanyReport[] = sortedAnalyses.map(analysis => ({
      company: analysis.company,
      trendAnalysis: {
        ...analysis,
        dailyBreakdown: this.sortDailyBreakdownChronologically(analysis.dailyBreakdown)
      },
      status: this.determineCompanyStatus(analysis, errors.get(analysis.company) || [])
    }));

    // Generate summary statistics
    const summary = this.generateSummary(analyses);

    return {
      generatedAt: new Date(),
      searchPeriod,
      companies,
      summary
    };
  }

  /**
   * Formats a report in the specified format
   * Supports text, JSON, and HTML output
   */
  formatReport(report: Report, format: 'text' | 'json' | 'html'): string {
    switch (format) {
      case 'json':
        return this.formatAsJson(report);
      case 'html':
        return this.formatAsHtml(report);
      case 'text':
      default:
        return this.formatAsText(report);
    }
  }

  /**
   * Sorts companies by total mentions (descending), then alphabetically
   * Requirement 5.5: Alphabetical tie-breaking for equal mention counts
   */
  private sortCompaniesByMentions(analyses: TrendAnalysis[]): TrendAnalysis[] {
    return [...analyses].sort((a, b) => {
      // First sort by total mentions (descending)
      const mentionDiff = b.statistics.totalMentions - a.statistics.totalMentions;
      if (mentionDiff !== 0) {
        return mentionDiff;
      }
      
      // Then sort alphabetically for ties (requirement 5.5)
      return a.company.localeCompare(b.company);
    });
  }

  /**
   * Sorts daily breakdown in chronological order
   * Requirement 5.3: Chronological ordering of daily data
   */
  private sortDailyBreakdownChronologically(dailyBreakdown: DailyMentionCount[]): DailyMentionCount[] {
    return [...dailyBreakdown].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Determines company status based on data completeness and errors
   * Requirements 6.2, 6.3: Status reporting for partial/failed data
   */
  private determineCompanyStatus(analysis: TrendAnalysis, errors: string[]): 'complete' | 'partial' | 'no data available' {
    if (analysis.statistics.totalMentions === 0 && errors.length > 0) {
      return 'no data available';
    }
    
    if (errors.length > 0 || analysis.dailyBreakdown.length < 7) {
      return 'partial';
    }
    
    return 'complete';
  }

  /**
   * Generates summary statistics for the report
   */
  private generateSummary(analyses: TrendAnalysis[]): ReportSummary {
    const totalArticlesFound = analyses.reduce(
      (sum, analysis) => sum + analysis.statistics.totalMentions,
      0
    );

    const companiesWithIncreasingTrends = analyses.filter(
      analysis => analysis.classification === 'increasing'
    ).length;

    const companiesWithDecreasingTrends = analyses.filter(
      analysis => analysis.classification === 'decreasing'
    ).length;

    return {
      totalArticlesFound,
      companiesWithIncreasingTrends,
      companiesWithDecreasingTrends
    };
  }

  /**
   * Formats report as JSON string
   */
  private formatAsJson(report: Report): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Formats report as plain text
   */
  private formatAsText(report: Report): string {
    const lines: string[] = [];
    
    // Header
    lines.push('='.repeat(60));
    lines.push('COMPANY MENTION TRACKER REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Generated: ${report.generatedAt.toLocaleString()}`);
    lines.push(`Search Period: ${report.searchPeriod.startDate.toDateString()} - ${report.searchPeriod.endDate.toDateString()}`);
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(20));
    lines.push(`Total Articles Found: ${report.summary.totalArticlesFound}`);
    lines.push(`Companies with Increasing Trends: ${report.summary.companiesWithIncreasingTrends}`);
    lines.push(`Companies with Decreasing Trends: ${report.summary.companiesWithDecreasingTrends}`);
    lines.push('');

    // Company details
    lines.push('COMPANY ANALYSIS');
    lines.push('-'.repeat(40));
    
    report.companies.forEach((companyReport, index) => {
      const analysis = companyReport.trendAnalysis;
      
      lines.push('');
      lines.push(`${index + 1}. ${companyReport.company.toUpperCase()}`);
      lines.push(`   Status: ${companyReport.status}`);
      lines.push(`   Total Mentions: ${analysis.statistics.totalMentions}`);
      lines.push(`   Average Daily: ${analysis.statistics.averageDaily.toFixed(1)}`);
      lines.push(`   Trend: ${analysis.classification.toUpperCase()}`);
      lines.push(`   Change: ${analysis.statistics.percentageChange >= 0 ? '+' : ''}${analysis.statistics.percentageChange.toFixed(1)}%`);
      
      // Daily breakdown (requirement 5.3: chronological order)
      lines.push('   Daily Breakdown:');
      analysis.dailyBreakdown.forEach(day => {
        lines.push(`     ${day.date.toDateString()}: ${day.count} mentions`);
      });
    });

    lines.push('');
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * Formats report as HTML
   */
  private formatAsHtml(report: Report): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Company Mention Tracker Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .company { border: 1px solid #ddd; margin-bottom: 20px; border-radius: 5px; }
        .company-header { background-color: #f9f9f9; padding: 15px; border-bottom: 1px solid #ddd; }
        .company-details { padding: 15px; }
        .daily-breakdown { margin-top: 10px; }
        .daily-breakdown table { width: 100%; border-collapse: collapse; }
        .daily-breakdown th, .daily-breakdown td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .daily-breakdown th { background-color: #f2f2f2; }
        .trend-increasing { color: #28a745; font-weight: bold; }
        .trend-decreasing { color: #dc3545; font-weight: bold; }
        .trend-stable { color: #6c757d; font-weight: bold; }
        .trend-volatile { color: #fd7e14; font-weight: bold; }
        .status-complete { color: #28a745; }
        .status-partial { color: #ffc107; }
        .status-no-data { color: #dc3545; }
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
        <ul>
            <li><strong>Total Articles Found:</strong> ${report.summary.totalArticlesFound}</li>
            <li><strong>Companies with Increasing Trends:</strong> ${report.summary.companiesWithIncreasingTrends}</li>
            <li><strong>Companies with Decreasing Trends:</strong> ${report.summary.companiesWithDecreasingTrends}</li>
        </ul>
    </div>

    <h2>Company Analysis</h2>
    ${report.companies.map((companyReport, index) => {
      const analysis = companyReport.trendAnalysis;
      return `
        <div class="company">
            <div class="company-header">
                <h3>${index + 1}. ${companyReport.company}</h3>
                <span class="status-${companyReport.status.replace(/\s+/g, '-')}">
                    Status: ${companyReport.status}
                </span>
            </div>
            <div class="company-details">
                <p><strong>Total Mentions:</strong> ${analysis.statistics.totalMentions}</p>
                <p><strong>Average Daily:</strong> ${analysis.statistics.averageDaily.toFixed(1)}</p>
                <p><strong>Trend:</strong> 
                    <span class="trend-${analysis.classification}">
                        ${analysis.classification.toUpperCase()}
                    </span>
                </p>
                <p><strong>Change:</strong> ${analysis.statistics.percentageChange >= 0 ? '+' : ''}${analysis.statistics.percentageChange.toFixed(1)}%</p>
                
                <div class="daily-breakdown">
                    <h4>Daily Breakdown</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Mentions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${analysis.dailyBreakdown.map(day => `
                                <tr>
                                    <td>${day.date.toDateString()}</td>
                                    <td>${day.count}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      `;
    }).join('')}
</body>
</html>`;

    return html;
  }
}