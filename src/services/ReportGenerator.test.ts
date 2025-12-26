import { describe, it, expect } from 'vitest';
import { ReportGenerator } from './ReportGenerator.js';
import { TrendAnalysis, TrendClassification } from '../models/types.js';

describe('ReportGenerator', () => {
  const reportGenerator = new ReportGenerator();

  // Helper function to create test trend analysis
  const createTrendAnalysis = (
    company: string,
    totalMentions: number,
    classification: TrendClassification,
    dailyBreakdown: Array<{ date: Date; count: number }>
  ): TrendAnalysis => ({
    company,
    classification,
    statistics: {
      totalMentions,
      averageDaily: totalMentions / 7,
      percentageChange: 0,
      standardDeviation: 0
    },
    dailyBreakdown
  });

  describe('generateReport', () => {
    it('should generate a complete report with all required fields', () => {
      const analyses: TrendAnalysis[] = [
        createTrendAnalysis('Apple', 10, 'increasing', [
          { date: new Date('2024-01-01'), count: 1 },
          { date: new Date('2024-01-02'), count: 2 }
        ]),
        createTrendAnalysis('Google', 5, 'stable', [
          { date: new Date('2024-01-01'), count: 2 },
          { date: new Date('2024-01-02'), count: 3 }
        ])
      ];

      const searchPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      };

      const report = reportGenerator.generateReport(analyses, searchPeriod);

      // Requirement 5.1: Report contains all companies
      expect(report.companies).toHaveLength(2);
      expect(report.companies.map(c => c.company)).toEqual(['Apple', 'Google']);

      // Requirement 5.2: Each company has required data
      report.companies.forEach(companyReport => {
        expect(companyReport.company).toBeDefined();
        expect(companyReport.trendAnalysis).toBeDefined();
        expect(companyReport.status).toBeDefined();
        expect(companyReport.trendAnalysis.statistics.totalMentions).toBeDefined();
        expect(companyReport.trendAnalysis.dailyBreakdown).toBeDefined();
        expect(companyReport.trendAnalysis.classification).toBeDefined();
      });

      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.searchPeriod).toEqual(searchPeriod);
      expect(report.summary).toBeDefined();
    });

    it('should sort companies by total mentions descending, then alphabetically', () => {
      // Requirement 5.5: Alphabetical tie-breaking
      const analyses: TrendAnalysis[] = [
        createTrendAnalysis('Zebra', 10, 'stable', []),
        createTrendAnalysis('Apple', 15, 'increasing', []),
        createTrendAnalysis('Beta', 10, 'decreasing', []), // Same mentions as Zebra
        createTrendAnalysis('Google', 5, 'volatile', [])
      ];

      const searchPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      };

      const report = reportGenerator.generateReport(analyses, searchPeriod);

      // Should be ordered: Apple (15), Beta (10), Zebra (10), Google (5)
      // Beta comes before Zebra due to alphabetical ordering for ties
      const companyNames = report.companies.map(c => c.company);
      expect(companyNames).toEqual(['Apple', 'Beta', 'Zebra', 'Google']);
    });

    it('should sort daily breakdown chronologically', () => {
      // Requirement 5.3: Chronological ordering
      const analyses: TrendAnalysis[] = [
        createTrendAnalysis('Apple', 10, 'increasing', [
          { date: new Date('2024-01-03'), count: 3 },
          { date: new Date('2024-01-01'), count: 1 },
          { date: new Date('2024-01-02'), count: 2 }
        ])
      ];

      const searchPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      };

      const report = reportGenerator.generateReport(analyses, searchPeriod);

      const dailyBreakdown = report.companies[0].trendAnalysis.dailyBreakdown;
      const dates = dailyBreakdown.map(d => d.date.getTime());
      
      // Should be in chronological order
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
    });

    it('should determine company status correctly', () => {
      // Requirements 6.2, 6.3: Status reporting
      const analyses: TrendAnalysis[] = [
        createTrendAnalysis('Complete', 10, 'stable', Array.from({ length: 7 }, (_, i) => ({
          date: new Date(`2024-01-0${i + 1}`),
          count: 1
        }))),
        createTrendAnalysis('Partial', 5, 'stable', Array.from({ length: 5 }, (_, i) => ({
          date: new Date(`2024-01-0${i + 1}`),
          count: 1
        }))),
        createTrendAnalysis('NoData', 0, 'stable', [])
      ];

      const errors = new Map([
        ['Partial', ['Some search failed']],
        ['NoData', ['All searches failed']]
      ]);

      const searchPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      };

      const report = reportGenerator.generateReport(analyses, searchPeriod, errors);

      expect(report.companies[0].status).toBe('complete');
      expect(report.companies[1].status).toBe('partial');
      expect(report.companies[2].status).toBe('no data available');
    });

    it('should generate correct summary statistics', () => {
      const analyses: TrendAnalysis[] = [
        createTrendAnalysis('Apple', 10, 'increasing', []),
        createTrendAnalysis('Google', 5, 'decreasing', []),
        createTrendAnalysis('Microsoft', 8, 'stable', [])
      ];

      const searchPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      };

      const report = reportGenerator.generateReport(analyses, searchPeriod);

      expect(report.summary.totalArticlesFound).toBe(23);
      expect(report.summary.companiesWithIncreasingTrends).toBe(1);
      expect(report.summary.companiesWithDecreasingTrends).toBe(1);
    });
  });

  describe('formatReport', () => {
    const sampleReport = {
      generatedAt: new Date('2024-01-01T12:00:00Z'),
      searchPeriod: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      },
      companies: [
        {
          company: 'Apple',
          trendAnalysis: {
            company: 'Apple',
            classification: 'increasing' as TrendClassification,
            statistics: {
              totalMentions: 10,
              averageDaily: 1.4,
              percentageChange: 25.5,
              standardDeviation: 1.2
            },
            dailyBreakdown: [
              { date: new Date('2024-01-01'), count: 1 },
              { date: new Date('2024-01-02'), count: 2 }
            ]
          },
          status: 'complete' as const
        }
      ],
      summary: {
        totalArticlesFound: 10,
        companiesWithIncreasingTrends: 1,
        companiesWithDecreasingTrends: 0
      }
    };

    it('should format report as JSON', () => {
      const result = reportGenerator.formatReport(sampleReport, 'json');
      expect(() => JSON.parse(result)).not.toThrow();
      
      const parsed = JSON.parse(result);
      expect(parsed.companies).toHaveLength(1);
      expect(parsed.summary.totalArticlesFound).toBe(10);
    });

    it('should format report as text', () => {
      const result = reportGenerator.formatReport(sampleReport, 'text');
      
      expect(result).toContain('COMPANY MENTION TRACKER REPORT');
      expect(result).toContain('APPLE');
      expect(result).toContain('Total Mentions: 10');
      expect(result).toContain('Trend: INCREASING');
      expect(result).toContain('Daily Breakdown:');
      expect(result).toContain('1 mentions');
      expect(result).toContain('2 mentions');
    });

    it('should format report as HTML', () => {
      const result = reportGenerator.formatReport(sampleReport, 'html');
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Company Mention Tracker Report</title>');
      expect(result).toContain('Apple');
      expect(result).toContain('Total Mentions:</strong> 10');
      expect(result).toContain('trend-increasing');
      expect(result).toContain('<table>');
    });

    it('should default to text format for unknown format', () => {
      const result = reportGenerator.formatReport(sampleReport, 'unknown' as any);
      expect(result).toContain('COMPANY MENTION TRACKER REPORT');
    });
  });
});