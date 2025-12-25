import { 
  DailySnapshot, 
  TrendAnalysis, 
  TrendClassification, 
  TrendStatistics, 
  DailyMentionCount 
} from '../models/types.js';

/**
 * TrendAnalyzer analyzes mention trends from daily snapshots
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
export class TrendAnalyzer {
  /**
   * Analyzes trend for a company from its daily snapshots
   * Requirements: 4.1, 4.2 - Calculate trend direction for each company
   */
  analyzeTrend(snapshots: DailySnapshot[]): TrendAnalysis {
    if (snapshots.length === 0) {
      throw new Error('Cannot analyze trend with no snapshots');
    }

    const company = snapshots[0].company;
    
    // Ensure all snapshots are for the same company
    if (!snapshots.every(s => s.company === company)) {
      throw new Error('All snapshots must be for the same company');
    }

    // Sort snapshots by date to ensure chronological order
    const sortedSnapshots = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const classification = this.classifyTrend(sortedSnapshots);
    const statistics = this.calculateStatistics(sortedSnapshots);
    const dailyBreakdown = this.generateDailyBreakdown(sortedSnapshots);

    return {
      company,
      classification,
      statistics,
      dailyBreakdown
    };
  }

  /**
   * Classifies trend based on mention count patterns
   * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7 - Trend classification rules
   */
  classifyTrend(snapshots: DailySnapshot[]): TrendClassification {
    if (snapshots.length < 2) {
      return 'stable';
    }

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

    // Apply classification rules from requirements 4.4, 4.5, 4.6, 4.7
    
    // Requirement 4.4: Stable when variance < 10%
    if (coefficientOfVariation < 10) {
      return 'stable';
    }
    
    // Requirement 4.5: Increasing when growth > 20%
    if (percentageChange > 20) {
      return 'increasing';
    }
    
    // Requirement 4.6: Decreasing when decline > 20%
    if (percentageChange < -20) {
      return 'decreasing';
    }
    
    // Requirement 4.7: Volatile when fluctuating without clear direction
    return 'volatile';
  }

  /**
   * Calculates statistical measures for the trend
   * Requirements: Statistical calculations (total, average, percentage change, standard deviation)
   */
  calculateStatistics(snapshots: DailySnapshot[]): TrendStatistics {
    const counts = snapshots.map(s => s.mentionCount);
    const totalMentions = counts.reduce((sum, count) => sum + count, 0);
    const averageDaily = counts.length > 0 ? totalMentions / counts.length : 0;
    
    // Calculate percentage change from first to last day
    const firstCount = counts[0] || 0;
    const lastCount = counts[counts.length - 1] || 0;
    const percentageChange = firstCount === 0 
      ? (lastCount > 0 ? 100 : 0)
      : ((lastCount - firstCount) / firstCount) * 100;

    // Calculate standard deviation
    const mean = averageDaily;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      totalMentions,
      averageDaily,
      percentageChange,
      standardDeviation
    };
  }

  /**
   * Generates daily breakdown from snapshots
   * Requirements: Daily breakdown generation
   */
  private generateDailyBreakdown(snapshots: DailySnapshot[]): DailyMentionCount[] {
    return snapshots.map(snapshot => ({
      date: snapshot.date,
      count: snapshot.mentionCount
    }));
  }
}