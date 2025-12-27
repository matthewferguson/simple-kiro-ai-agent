import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});