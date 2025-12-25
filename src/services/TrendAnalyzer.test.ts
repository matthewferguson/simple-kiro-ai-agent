import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TrendAnalyzer } from './TrendAnalyzer.js';
import { DailySnapshot, Article, TrendClassification } from '../models/types.js';

describe('TrendAnalyzer', () => {
  const analyzer = new TrendAnalyzer();

  describe('Unit Tests', () => {
    it('should throw error for empty snapshots', () => {
      expect(() => analyzer.analyzeTrend([])).toThrow('Cannot analyze trend with no snapshots');
    });

    it('should throw error for snapshots with different companies', () => {
      const snapshots: DailySnapshot[] = [
        {
          company: 'Apple',
          date: new Date('2023-12-01'),
          mentionCount: 5,
          articles: [],
          status: 'complete'
        },
        {
          company: 'Google', // Different company
          date: new Date('2023-12-02'),
          mentionCount: 3,
          articles: [],
          status: 'complete'
        }
      ];

      expect(() => analyzer.analyzeTrend(snapshots)).toThrow('All snapshots must be for the same company');
    });

    it('should classify stable trend correctly', () => {
      const snapshots: DailySnapshot[] = Array.from({ length: 7 }, (_, i) => ({
        company: 'Apple',
        date: new Date(`2023-12-${String(i + 1).padStart(2, '0')}`),
        mentionCount: 10, // Consistent count
        articles: [],
        status: 'complete' as const
      }));

      const result = analyzer.analyzeTrend(snapshots);
      expect(result.classification).toBe('stable');
      expect(result.company).toBe('Apple');
      expect(result.statistics.totalMentions).toBe(70);
      expect(result.dailyBreakdown).toHaveLength(7);
    });

    it('should classify increasing trend correctly', () => {
      const snapshots: DailySnapshot[] = Array.from({ length: 7 }, (_, i) => ({
        company: 'Apple',
        date: new Date(`2023-12-${String(i + 1).padStart(2, '0')}`),
        mentionCount: i + 1, // 1, 2, 3, 4, 5, 6, 7 (600% increase)
        articles: [],
        status: 'complete' as const
      }));

      const result = analyzer.analyzeTrend(snapshots);
      expect(result.classification).toBe('increasing');
    });

    it('should classify decreasing trend correctly', () => {
      const snapshots: DailySnapshot[] = Array.from({ length: 7 }, (_, i) => ({
        company: 'Apple',
        date: new Date(`2023-12-${String(i + 1).padStart(2, '0')}`),
        mentionCount: 7 - i, // 7, 6, 5, 4, 3, 2, 1 (-85.7% decrease)
        articles: [],
        status: 'complete' as const
      }));

      const result = analyzer.analyzeTrend(snapshots);
      expect(result.classification).toBe('decreasing');
    });

    it('should classify volatile trend correctly', () => {
      const snapshots: DailySnapshot[] = [
        { company: 'Apple', date: new Date('2023-12-01'), mentionCount: 10, articles: [], status: 'complete' as const },
        { company: 'Apple', date: new Date('2023-12-02'), mentionCount: 2, articles: [], status: 'complete' as const },
        { company: 'Apple', date: new Date('2023-12-03'), mentionCount: 15, articles: [], status: 'complete' as const },
        { company: 'Apple', date: new Date('2023-12-04'), mentionCount: 1, articles: [], status: 'complete' as const },
        { company: 'Apple', date: new Date('2023-12-05'), mentionCount: 12, articles: [], status: 'complete' as const },
        { company: 'Apple', date: new Date('2023-12-06'), mentionCount: 3, articles: [], status: 'complete' as const },
        { company: 'Apple', date: new Date('2023-12-07'), mentionCount: 11, articles: [], status: 'complete' as const }
      ];

      const result = analyzer.analyzeTrend(snapshots);
      expect(result.classification).toBe('volatile');
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 10: Trend calculation completeness', () => {
      // Feature: company-mention-tracker, Property 10: Trend calculation completeness
      it('should calculate trend classification for any complete dataset of 7 days for any company', () => {
        // Generator for valid company names
        const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
          .filter(name => name.trim().length > 0)
          .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'))
          .filter(name => name.trim().length > 0);

        // Generator for mention counts (non-negative integers)
        const mentionCount = fc.integer({ min: 0, max: 1000 });

        // Generator for 7 consecutive days of snapshots for a single company
        const sevenDaySnapshots = fc.tuple(
          validCompanyName,
          fc.array(mentionCount, { minLength: 7, maxLength: 7 }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
        ).map(([company, counts, startDate]) => {
          return counts.map((count, index) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + index);
            
            const snapshot: DailySnapshot = {
              company,
              date,
              mentionCount: count,
              articles: [], // Empty for simplicity in property testing
              status: 'complete'
            };
            return snapshot;
          });
        });

        fc.assert(
          fc.property(
            sevenDaySnapshots,
            (snapshots) => {
              // Verify we have exactly 7 days of data for one company
              expect(snapshots).toHaveLength(7);
              const company = snapshots[0].company;
              expect(snapshots.every(s => s.company === company)).toBe(true);
              expect(snapshots.every(s => s.status === 'complete')).toBe(true);

              // Analyze the trend
              const result = analyzer.analyzeTrend(snapshots);

              // Verify completeness: every complete dataset should have a trend classification
              expect(result).toBeDefined();
              expect(result.company).toBe(company);
              
              // Verify trend classification is one of the valid values
              const validClassifications: TrendClassification[] = ['increasing', 'decreasing', 'stable', 'volatile'];
              expect(validClassifications).toContain(result.classification);

              // Verify statistics are calculated
              expect(result.statistics).toBeDefined();
              expect(typeof result.statistics.totalMentions).toBe('number');
              expect(typeof result.statistics.averageDaily).toBe('number');
              expect(typeof result.statistics.percentageChange).toBe('number');
              expect(typeof result.statistics.standardDeviation).toBe('number');

              // Verify daily breakdown is complete (7 days)
              expect(result.dailyBreakdown).toHaveLength(7);
              expect(result.dailyBreakdown.every(day => day.date instanceof Date)).toBe(true);
              expect(result.dailyBreakdown.every(day => typeof day.count === 'number')).toBe(true);

              // Verify daily breakdown matches input snapshots
              const sortedSnapshots = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
              result.dailyBreakdown.forEach((day, index) => {
                expect(day.count).toBe(sortedSnapshots[index].mentionCount);
                expect(day.date.getTime()).toBe(sortedSnapshots[index].date.getTime());
              });

              // Verify statistics calculations are correct
              const totalMentions = snapshots.reduce((sum, s) => sum + s.mentionCount, 0);
              expect(result.statistics.totalMentions).toBe(totalMentions);
              expect(result.statistics.averageDaily).toBe(totalMentions / 7);
            }
          ),
          { numRuns: 100 }
        );
      });

      // Additional property test for multiple companies
      it('should calculate trend classification for any set of 5 companies with complete 7-day datasets', () => {
        // Generator for valid company names
        const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
          .filter(name => name.trim().length > 0)
          .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'))
          .filter(name => name.trim().length > 0);

        // Generator for exactly 5 unique company names
        const fiveCompanies = fc.array(validCompanyName, { minLength: 5, maxLength: 5 })
          .chain(companies => {
            const uniqueCompanies = companies.map((company, index) => `${company.trim()} ${index + 1}`);
            return fc.constant(uniqueCompanies);
          });

        // Generator for mention counts
        const mentionCount = fc.integer({ min: 0, max: 1000 });

        // Generator for complete datasets for 5 companies
        const completeDataset = fc.tuple(
          fiveCompanies,
          fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
        ).chain(([companies, startDate]) => {
          // Generate 7 days of data for each of the 5 companies
          const companyDatasets = companies.map(company => 
            fc.array(mentionCount, { minLength: 7, maxLength: 7 }).map(counts => 
              counts.map((count, dayIndex) => {
                const date = new Date(startDate);
                date.setDate(date.getDate() + dayIndex);
                
                const snapshot: DailySnapshot = {
                  company,
                  date,
                  mentionCount: count,
                  articles: [],
                  status: 'complete'
                };
                return snapshot;
              })
            )
          );
          
          return fc.tuple(...companyDatasets);
        });

        fc.assert(
          fc.property(
            completeDataset,
            (companySnapshots) => {
              // Verify we have data for exactly 5 companies
              expect(companySnapshots).toHaveLength(5);

              // Analyze trend for each company
              const results = companySnapshots.map(snapshots => {
                expect(snapshots).toHaveLength(7); // 7 days per company
                return analyzer.analyzeTrend(snapshots);
              });

              // Verify each company has a complete trend analysis
              expect(results).toHaveLength(5);
              
              results.forEach((result, index) => {
                // Verify trend classification is calculated
                const validClassifications: TrendClassification[] = ['increasing', 'decreasing', 'stable', 'volatile'];
                expect(validClassifications).toContain(result.classification);

                // Verify company name matches
                expect(result.company).toBe(companySnapshots[index][0].company);

                // Verify completeness of analysis
                expect(result.statistics).toBeDefined();
                expect(result.dailyBreakdown).toHaveLength(7);

                // Verify all required statistics are numbers
                expect(typeof result.statistics.totalMentions).toBe('number');
                expect(typeof result.statistics.averageDaily).toBe('number');
                expect(typeof result.statistics.percentageChange).toBe('number');
                expect(typeof result.statistics.standardDeviation).toBe('number');
              });

              // Verify all companies are unique
              const companyNames = results.map(r => r.company);
              const uniqueNames = new Set(companyNames);
              expect(uniqueNames.size).toBe(5);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 11: Trend classification validity', () => {
      // Feature: company-mention-tracker, Property 11: Trend classification validity
      it('should classify trends according to the specified rules: stable when variance < 10%, increasing when growth > 20%, decreasing when decline > 20%, and volatile otherwise', () => {
        // Generator for valid company names
        const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
          .filter(name => name.trim().length > 0)
          .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'))
          .filter(name => name.trim().length > 0);

        // Generator for mention counts (non-negative integers)
        const mentionCount = fc.integer({ min: 0, max: 1000 });

        // Generator for 7 consecutive days of snapshots for a single company
        const sevenDaySnapshots = fc.tuple(
          validCompanyName,
          fc.array(mentionCount, { minLength: 7, maxLength: 7 }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
        ).map(([company, counts, startDate]) => {
          return counts.map((count, index) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + index);
            
            const snapshot: DailySnapshot = {
              company,
              date,
              mentionCount: count,
              articles: [],
              status: 'complete'
            };
            return snapshot;
          });
        });

        fc.assert(
          fc.property(
            sevenDaySnapshots,
            (snapshots) => {
              // Analyze the trend
              const result = analyzer.analyzeTrend(snapshots);

              // Extract mention counts and calculate expected classification
              const counts = snapshots.map(s => s.mentionCount);
              const firstCount = counts[0];
              const lastCount = counts[counts.length - 1];
              
              // Calculate percentage change from start to end
              const percentageChange = firstCount === 0 
                ? (lastCount > 0 ? 100 : 0)
                : ((lastCount - firstCount) / firstCount) * 100;

              // Calculate coefficient of variation (standard deviation / mean)
              const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
              const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
              const standardDeviation = Math.sqrt(variance);
              const coefficientOfVariation = mean === 0 ? 0 : (standardDeviation / mean) * 100;

              // Verify classification follows the rules from requirements 4.3, 4.4, 4.5, 4.6, 4.7
              
              // Requirement 4.4: Stable when variance < 10%
              if (coefficientOfVariation < 10) {
                expect(result.classification).toBe('stable');
              }
              // Requirement 4.5: Increasing when growth > 20%
              else if (percentageChange > 20) {
                expect(result.classification).toBe('increasing');
              }
              // Requirement 4.6: Decreasing when decline > 20%
              else if (percentageChange < -20) {
                expect(result.classification).toBe('decreasing');
              }
              // Requirement 4.7: Volatile when fluctuating without clear direction
              else {
                expect(result.classification).toBe('volatile');
              }

              // Verify the classification is exactly one of the valid values
              const validClassifications: TrendClassification[] = ['increasing', 'decreasing', 'stable', 'volatile'];
              expect(validClassifications).toContain(result.classification);

              // Verify statistics match our calculations
              expect(result.statistics.percentageChange).toBeCloseTo(percentageChange, 5);
              expect(result.statistics.standardDeviation).toBeCloseTo(standardDeviation, 5);

              // Additional validation: ensure classification is deterministic
              // Running the same analysis twice should yield the same result
              const result2 = analyzer.analyzeTrend(snapshots);
              expect(result2.classification).toBe(result.classification);
            }
          ),
          { numRuns: 100 }
        );
      });

      // Additional property test for edge cases in trend classification
      it('should handle edge cases in trend classification correctly', () => {
        // Generator for edge case scenarios
        const edgeCaseSnapshots = fc.oneof(
          // All zeros (stable)
          fc.constant(Array.from({ length: 7 }, (_, i) => ({
            company: 'TestCompany',
            date: new Date(`2023-12-${String(i + 1).padStart(2, '0')}`),
            mentionCount: 0,
            articles: [],
            status: 'complete' as const
          }))),
          
          // Single spike (volatile)
          fc.integer({ min: 1, max: 100 }).map(spike => 
            Array.from({ length: 7 }, (_, i) => ({
              company: 'TestCompany',
              date: new Date(`2023-12-${String(i + 1).padStart(2, '0')}`),
              mentionCount: i === 3 ? spike : 0, // Spike in the middle
              articles: [],
              status: 'complete' as const
            }))
          ),
          
          // Exact boundary cases for percentage change
          fc.constant(Array.from({ length: 7 }, (_, i) => ({
            company: 'TestCompany',
            date: new Date(`2023-12-${String(i + 1).padStart(2, '0')}`),
            mentionCount: i === 0 ? 10 : (i === 6 ? 12 : 10), // Exactly 20% increase
            articles: [],
            status: 'complete' as const
          }))),
          
          // Single data point (should be stable)
          fc.integer({ min: 0, max: 100 }).map(count => [{
            company: 'TestCompany',
            date: new Date('2023-12-01'),
            mentionCount: count,
            articles: [],
            status: 'complete' as const
          }])
        );

        fc.assert(
          fc.property(
            edgeCaseSnapshots,
            (snapshots) => {
              const result = analyzer.analyzeTrend(snapshots);

              // Verify classification is always one of the valid values
              const validClassifications: TrendClassification[] = ['increasing', 'decreasing', 'stable', 'volatile'];
              expect(validClassifications).toContain(result.classification);

              // Verify single data point is always classified as stable
              if (snapshots.length === 1) {
                expect(result.classification).toBe('stable');
              }

              // Verify all zeros scenario
              if (snapshots.every(s => s.mentionCount === 0)) {
                // All zeros should be stable (coefficient of variation is 0)
                expect(result.classification).toBe('stable');
              }

              // Verify statistics are valid numbers
              expect(typeof result.statistics.totalMentions).toBe('number');
              expect(typeof result.statistics.averageDaily).toBe('number');
              expect(typeof result.statistics.percentageChange).toBe('number');
              expect(typeof result.statistics.standardDeviation).toBe('number');
              
              // Verify no NaN values
              expect(Number.isNaN(result.statistics.totalMentions)).toBe(false);
              expect(Number.isNaN(result.statistics.averageDaily)).toBe(false);
              expect(Number.isNaN(result.statistics.percentageChange)).toBe(false);
              expect(Number.isNaN(result.statistics.standardDeviation)).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});