import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurationManager } from './ConfigurationManager.js';
import type { ArticleSource } from '../models/types.js';

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    configManager = new ConfigurationManager();
  });

  describe('Company Validation', () => {
    it('should accept exactly 5 valid companies', () => {
      const companies = ['Apple Inc.', 'Google LLC', 'Microsoft Corp.', 'Amazon.com', 'Tesla Motors'];
      const result = configManager.validateCompanies(companies);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(configManager.getCompanies()).toEqual(companies);
    });

    it('should reject wrong number of companies', () => {
      const companies = ['Apple', 'Google', 'Microsoft'];
      const result = configManager.validateCompanies(companies);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Must provide exactly 5 companies, got 3');
      expect(configManager.getCompanies()).toHaveLength(0); // Should not store invalid data
    });

    it('should reject duplicate companies', () => {
      const companies = ['Apple', 'Google', 'Apple', 'Microsoft', 'Amazon'];
      const result = configManager.validateCompanies(companies);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate company names are not allowed');
    });

    it('should trim company names when storing', () => {
      const companies = ['  Apple  ', ' Google ', 'Microsoft', 'Amazon', 'Tesla'];
      const result = configManager.validateCompanies(companies);
      
      expect(result.isValid).toBe(true);
      expect(configManager.getCompanies()).toEqual(['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla']);
    });

    it('should return copy of companies to prevent external modification', () => {
      const companies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
      configManager.validateCompanies(companies);
      
      const retrievedCompanies = configManager.getCompanies();
      retrievedCompanies.push('Facebook'); // Try to modify
      
      expect(configManager.getCompanies()).toHaveLength(5); // Should remain unchanged
    });
  });

  describe('Search Period Configuration', () => {
    it('should set and get search period correctly', () => {
      const startDate = new Date(2023, 11, 1); // December 1, 2023
      configManager.setSearchPeriod(startDate, 7);
      
      const period = configManager.getSearchPeriod();
      expect(period.startDate).toEqual(startDate);
      expect(period.endDate).toEqual(new Date(2023, 11, 7)); // December 7, 2023
    });

    it('should reject non-7-day periods', () => {
      const startDate = new Date(2023, 11, 1); // December 1, 2023
      
      expect(() => {
        configManager.setSearchPeriod(startDate, 10);
      }).toThrow('Search period must be exactly 7 days');
    });

    it('should reject invalid start dates', () => {
      expect(() => {
        configManager.setSearchPeriod(new Date('invalid'), 7);
      }).toThrow('Start date must be a valid Date object');
    });

    it('should throw error when getting period before setting', () => {
      expect(() => {
        configManager.getSearchPeriod();
      }).toThrow('Search period not configured. Call setSearchPeriod() first.');
    });

    it('should return copies of dates to prevent external modification', () => {
      const startDate = new Date(2023, 11, 1); // December 1, 2023 (month is 0-indexed)
      configManager.setSearchPeriod(startDate, 7);
      
      // Test that we get the expected dates first
      const period = configManager.getSearchPeriod();
      
      // Verify the dates are correct
      expect(period.startDate.getFullYear()).toBe(2023);
      expect(period.startDate.getMonth()).toBe(11); // December is month 11
      expect(period.startDate.getDate()).toBe(1);
      
      expect(period.endDate.getFullYear()).toBe(2023);
      expect(period.endDate.getMonth()).toBe(11); // December is month 11
      expect(period.endDate.getDate()).toBe(7); // 1 + 7 - 1 = 7
      
      // Now test immutability
      period.startDate.setFullYear(2024);
      
      const newPeriod = configManager.getSearchPeriod();
      expect(newPeriod.startDate.getFullYear()).toBe(2023);
      expect(newPeriod.startDate.getDate()).toBe(1);
    });
  });

  describe('Article Source Configuration', () => {
    it('should accept valid article sources', () => {
      const sources: ArticleSource[] = [
        {
          name: 'Test API',
          type: 'api',
          endpoint: 'https://api.example.com',
          rateLimit: 60
        },
        {
          name: 'Test RSS',
          type: 'rss',
          endpoint: 'https://example.com/rss',
          apiKey: 'test-key',
          rateLimit: 30
        }
      ];

      expect(() => {
        configManager.configureSources(sources);
      }).not.toThrow();

      expect(configManager.getArticleSources()).toEqual(sources);
    });

    it('should use default sources when none provided', () => {
      configManager.configureSources([]);
      
      const sources = configManager.getArticleSources();
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every(source => source.name && source.endpoint)).toBe(true);
    });

    it('should validate article source fields', () => {
      const invalidSources: ArticleSource[] = [
        {
          name: '', // Invalid: empty name
          type: 'api',
          endpoint: 'https://api.example.com',
          rateLimit: 60
        }
      ];

      expect(() => {
        configManager.configureSources(invalidSources);
      }).toThrow('Invalid article source configuration');
    });

    it('should validate article source types', () => {
      const invalidSources = [
        {
          name: 'Test',
          type: 'invalid' as any, // Invalid type
          endpoint: 'https://api.example.com',
          rateLimit: 60
        }
      ];

      expect(() => {
        configManager.configureSources(invalidSources);
      }).toThrow('Invalid type \'invalid\'');
    });

    it('should validate endpoint URLs', () => {
      const invalidSources: ArticleSource[] = [
        {
          name: 'Test',
          type: 'api',
          endpoint: 'not-a-url', // Invalid URL
          rateLimit: 60
        }
      ];

      expect(() => {
        configManager.configureSources(invalidSources);
      }).toThrow('Endpoint must be a valid URL');
    });

    it('should validate rate limits', () => {
      const invalidSources: ArticleSource[] = [
        {
          name: 'Test',
          type: 'api',
          endpoint: 'https://api.example.com',
          rateLimit: 0 // Invalid: non-positive rate limit
        }
      ];

      expect(() => {
        configManager.configureSources(invalidSources);
      }).toThrow('Rate limit must be positive');
    });

    it('should return copy of sources to prevent external modification', () => {
      const sources: ArticleSource[] = [
        {
          name: 'Test API',
          type: 'api',
          endpoint: 'https://api.example.com',
          rateLimit: 60
        }
      ];

      configManager.configureSources(sources);
      const retrievedSources = configManager.getArticleSources();
      retrievedSources.push({
        name: 'New Source',
        type: 'rss',
        endpoint: 'https://new.com',
        rateLimit: 30
      });

      expect(configManager.getArticleSources()).toHaveLength(1); // Should remain unchanged
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should set and get rate limit', () => {
      configManager.setRateLimit(120);
      expect(configManager.getRateLimit()).toBe(120);
    });

    it('should reject non-positive rate limits', () => {
      expect(() => {
        configManager.setRateLimit(0);
      }).toThrow('Rate limit must be positive');

      expect(() => {
        configManager.setRateLimit(-10);
      }).toThrow('Rate limit must be positive');
    });

    it('should have default rate limit', () => {
      expect(configManager.getRateLimit()).toBe(60);
    });
  });

  describe('Complete Configuration Validation', () => {
    it('should validate complete valid configuration', () => {
      // Set up complete valid configuration
      const companies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
      const startDate = new Date(2023, 11, 1); // December 1, 2023
      const sources: ArticleSource[] = [
        {
          name: 'Test API',
          type: 'api',
          endpoint: 'https://api.example.com',
          rateLimit: 60
        }
      ];

      configManager.validateCompanies(companies);
      configManager.setSearchPeriod(startDate, 7);
      configManager.configureSources(sources);
      configManager.setRateLimit(100);

      const validation = configManager.validateConfiguration();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing search period in validation', () => {
      const companies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
      configManager.validateCompanies(companies);
      // Don't set search period

      const validation = configManager.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Search period start date not configured');
    });

    it('should get complete system configuration', () => {
      const companies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
      const startDate = new Date(2023, 11, 1); // December 1, 2023
      const sources: ArticleSource[] = [
        {
          name: 'Test API',
          type: 'api',
          endpoint: 'https://api.example.com',
          rateLimit: 60
        }
      ];

      configManager.validateCompanies(companies);
      configManager.setSearchPeriod(startDate, 7);
      configManager.configureSources(sources);
      configManager.setRateLimit(100);

      const config = configManager.getSystemConfig();
      expect(config.companies).toEqual(companies);
      expect(config.searchPeriodDays).toBe(7);
      expect(config.articleSources).toEqual(sources);
      expect(config.rateLimit).toBe(100);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all configuration to initial state', () => {
      // Set up configuration
      const companies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
      const startDate = new Date(2023, 11, 1); // December 1, 2023
      const sources: ArticleSource[] = [
        {
          name: 'Test API',
          type: 'api',
          endpoint: 'https://api.example.com',
          rateLimit: 60
        }
      ];

      configManager.validateCompanies(companies);
      configManager.setSearchPeriod(startDate, 7);
      configManager.configureSources(sources);
      configManager.setRateLimit(100);

      // Reset
      configManager.reset();

      // Verify reset state
      expect(configManager.getCompanies()).toHaveLength(0);
      expect(configManager.getRateLimit()).toBe(60); // Default value
      expect(configManager.getArticleSources()).toHaveLength(0);
      
      expect(() => {
        configManager.getSearchPeriod();
      }).toThrow('Search period not configured');
    });
  });
});