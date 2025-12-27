import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SearchEngine } from './SearchEngine.js';
import { SystemConfig, ArticleSource } from '../models/types.js';
import { promises as fs } from 'fs';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let testDataDir: string;
  
  beforeEach(() => {
    testDataDir = './test-data-' + Date.now();
    searchEngine = new SearchEngine(testDataDir);
  });
  
  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should initialize with valid configuration', async () => {
      const config: SystemConfig = {
        companies: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'],
        searchPeriodDays: 7,
        articleSources: [
          {
            name: 'Test Source',
            type: 'api',
            endpoint: 'https://api.example.com',
            rateLimit: 60
          }
        ],
        rateLimit: 60
      };

      await expect(searchEngine.initialize(config)).resolves.not.toThrow();
    });

    it('should reject invalid company configuration', async () => {
      const config: SystemConfig = {
        companies: ['Apple', 'Google'], // Only 2 companies, need 5
        searchPeriodDays: 7,
        articleSources: [
          {
            name: 'Test Source',
            type: 'api',
            endpoint: 'https://api.example.com',
            rateLimit: 60
          }
        ],
        rateLimit: 60
      };

      await expect(searchEngine.initialize(config)).rejects.toThrow('Invalid configuration');
    });

    it('should reject configuration with wrong search period', async () => {
      const config: SystemConfig = {
        companies: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'],
        searchPeriodDays: 5, // Should be 7
        articleSources: [
          {
            name: 'Test Source',
            type: 'api',
            endpoint: 'https://api.example.com',
            rateLimit: 60
          }
        ],
        rateLimit: 60
      };

      await expect(searchEngine.initialize(config)).rejects.toThrow('Search period must be exactly 7 days');
    });

    it('should reject configuration with no article sources', async () => {
      const config: SystemConfig = {
        companies: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'],
        searchPeriodDays: 7,
        articleSources: [], // No sources
        rateLimit: 60
      };

      await expect(searchEngine.initialize(config)).rejects.toThrow('At least one article source must be configured');
    });
  });

  describe('progress tracking', () => {
    it('should initialize progress correctly', async () => {
      const config: SystemConfig = {
        companies: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'],
        searchPeriodDays: 7,
        articleSources: [
          {
            name: 'Test Source',
            type: 'api',
            endpoint: 'https://api.example.com',
            rateLimit: 60
          }
        ],
        rateLimit: 60
      };

      await searchEngine.initialize(config);
      
      const progress = searchEngine.getProgress();
      expect(progress.currentDay).toBe(0);
      expect(progress.totalDays).toBe(7);
      expect(progress.companiesCompleted).toBe(0);
      expect(progress.totalCompanies).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should throw error when executing search without initialization', async () => {
      await expect(searchEngine.executeSearch()).rejects.toThrow('SearchEngine not initialized');
    });
  });

  describe('data management', () => {
    it('should clear data successfully', async () => {
      await expect(searchEngine.clearData()).resolves.not.toThrow();
    });

    it('should get stored companies', async () => {
      const companies = await searchEngine.getStoredCompanies();
      expect(Array.isArray(companies)).toBe(true);
    });

    it('should get search errors', () => {
      const errors = searchEngine.getSearchErrors();
      expect(errors instanceof Map).toBe(true);
    });
  });

  describe('property tests', () => {
    // Feature: company-mention-tracker, Property 3: Complete search coverage
    it('should make search queries for each company on each of the 7 days', async () => {
      // Use predefined valid company names
      const companies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
      
      // Create a fresh SearchEngine instance for this test
      const testDataDir = './test-data-property-' + Date.now() + '-' + Math.random();
      const testSearchEngine = new SearchEngine(testDataDir);
      
      try {
        // Create system configuration
        const config: SystemConfig = {
          companies,
          searchPeriodDays: 7,
          articleSources: [
            {
              name: 'Test Source',
              type: 'api' as const,
              endpoint: 'https://api.example.com',
              rateLimit: 60
            }
          ],
          rateLimit: 60
        };
        
        // Initialize the search engine
        await testSearchEngine.initialize(config);
        
        // Spy on the articleFetcher.searchArticles method to track calls
        const searchArticlesSpy = vi.spyOn(
          (testSearchEngine as any).articleFetcher,
          'searchArticles'
        );
        
        // Mock the searchArticles method to return empty results
        searchArticlesSpy.mockImplementation(async (company: string, date: Date, sources: any[]) => {
          return []; // Return empty array of articles
        });
        
        // Also spy on other methods that might be called to ensure they don't fail
        const extractMentionsSpy = vi.spyOn(
          (testSearchEngine as any).mentionExtractor,
          'extractMentions'
        );
        extractMentionsSpy.mockReturnValue([]);
        
        const saveDailySnapshotSpy = vi.spyOn(
          (testSearchEngine as any).dataStore,
          'saveDailySnapshot'
        );
        saveDailySnapshotSpy.mockResolvedValue(undefined);
        
        const getAllSnapshotsSpy = vi.spyOn(
          (testSearchEngine as any).dataStore,
          'getAllSnapshots'
        );
        getAllSnapshotsSpy.mockResolvedValue([]);
        
        const generateReportSpy = vi.spyOn(
          (testSearchEngine as any).reportGenerator,
          'generateReport'
        );
        generateReportSpy.mockReturnValue({
          generatedAt: new Date(),
          searchPeriod: { startDate: new Date(), endDate: new Date() },
          companies: [],
          summary: {
            totalArticlesFound: 0,
            companiesWithIncreasingTrends: 0,
            companiesWithDecreasingTrends: 0
          }
        });
        
        // Execute the search
        await testSearchEngine.executeSearch();
        
        // Verify that searchArticles was called exactly 35 times (5 companies × 7 days)
        expect(searchArticlesSpy).toHaveBeenCalledTimes(35);
        
        // Verify that each company appears in exactly 7 calls (once per day)
        const companyCalls = new Map<string, number>();
        for (const call of searchArticlesSpy.mock.calls) {
          const company = call[0] as string;
          companyCalls.set(company, (companyCalls.get(company) || 0) + 1);
        }
        
        // Each company should have been searched exactly 7 times (once per day)
        for (const company of companies) {
          expect(companyCalls.get(company)).toBe(7);
        }
        
      } finally {
        // Clean up test data
        try {
          await fs.rm(testDataDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});