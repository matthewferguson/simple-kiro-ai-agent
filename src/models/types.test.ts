import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateCompanyName,
  validateCompanyList,
  validateSystemConfig,
  serializeData,
  deserializeData,
  serializeDailySnapshot,
  deserializeDailySnapshot,
  type DailySnapshot,
  type Article,
  type SystemConfig,
  type ArticleSource
} from './types.js';

describe('Company Name Validation', () => {
  it('should accept valid company names', () => {
    const result = validateCompanyName('Apple Inc.');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty company names', () => {
    const result = validateCompanyName('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Company name cannot be empty');
  });

  it('should reject company names with invalid characters', () => {
    const result = validateCompanyName('Apple@#$%');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Company name contains invalid characters');
  });
});

describe('Company List Validation', () => {
  it('should accept exactly 5 valid companies', () => {
    const companies = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'];
    const result = validateCompanyList(companies);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject lists with wrong number of companies', () => {
    const companies = ['Apple', 'Google', 'Microsoft'];
    const result = validateCompanyList(companies);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must provide exactly 5 companies, got 3');
  });

  it('should reject duplicate company names', () => {
    const companies = ['Apple', 'Google', 'Apple', 'Microsoft', 'Amazon'];
    const result = validateCompanyList(companies);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Duplicate company names are not allowed');
  });
});

describe('Serialization/Deserialization', () => {
  it('should serialize and deserialize dates correctly', () => {
    const testDate = new Date('2023-12-01T10:00:00Z');
    const data = { timestamp: testDate, value: 42 };
    
    const serialized = serializeData(data);
    const deserialized = deserializeData<typeof data>(serialized, ['timestamp']);
    
    expect(deserialized.timestamp).toBeInstanceOf(Date);
    expect(deserialized.timestamp.getTime()).toBe(testDate.getTime());
    expect(deserialized.value).toBe(42);
  });

  it('should serialize and deserialize DailySnapshot correctly', () => {
    const article: Article = {
      title: 'Test Article',
      url: 'https://example.com',
      publishedDate: new Date('2023-12-01T10:00:00Z'),
      source: 'Test Source',
      excerpt: 'Test excerpt'
    };

    const snapshot: DailySnapshot = {
      company: 'Apple',
      date: new Date('2023-12-01T00:00:00Z'),
      mentionCount: 5,
      articles: [article],
      status: 'complete'
    };

    const serialized = serializeDailySnapshot(snapshot);
    const deserialized = deserializeDailySnapshot(serialized);

    expect(deserialized.company).toBe('Apple');
    expect(deserialized.date).toBeInstanceOf(Date);
    expect(deserialized.mentionCount).toBe(5);
    expect(deserialized.articles[0].publishedDate).toBeInstanceOf(Date);
    expect(deserialized.status).toBe('complete');
  });
});

describe('System Configuration Validation', () => {
  it('should accept valid system configuration', () => {
    const articleSource: ArticleSource = {
      name: 'Test API',
      type: 'api',
      endpoint: 'https://api.example.com',
      rateLimit: 60
    };

    const config: SystemConfig = {
      companies: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'],
      searchPeriodDays: 7,
      articleSources: [articleSource],
      rateLimit: 100
    };

    const result = validateSystemConfig(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject configuration with wrong search period', () => {
    const articleSource: ArticleSource = {
      name: 'Test API',
      type: 'api',
      endpoint: 'https://api.example.com',
      rateLimit: 60
    };

    const config: SystemConfig = {
      companies: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla'],
      searchPeriodDays: 10, // Wrong period
      articleSources: [articleSource],
      rateLimit: 100
    };

    const result = validateSystemConfig(config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Search period must be exactly 7 days');
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property-Based Tests', () => {
  describe('Property 1: Company list validation', () => {
    // Feature: company-mention-tracker, Property 1: Company list validation
    it('should accept a list if and only if it contains exactly 5 unique, non-empty, valid company names', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
          (companies) => {
            const result = validateCompanyList(companies);
            
            // Check if the list has exactly 5 companies
            const hasExactlyFive = companies.length === 5;
            
            // Check if all companies are valid (non-empty and valid characters)
            const allValid = companies.every(company => {
              const validation = validateCompanyName(company);
              return validation.isValid;
            });
            
            // Check if all companies are unique (case-insensitive)
            const normalizedNames = companies.map(name => name.trim().toLowerCase());
            const allUnique = new Set(normalizedNames).size === companies.length;
            
            // The validation should succeed if and only if all conditions are met
            const shouldBeValid = hasExactlyFive && allValid && allUnique;
            
            expect(result.isValid).toBe(shouldBeValid);
            
            // If invalid, should have appropriate error messages
            if (!shouldBeValid) {
              expect(result.errors.length).toBeGreaterThan(0);
            } else {
              expect(result.errors.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Additional property test for valid company names generator
    it('should always accept exactly 5 unique valid company names', () => {
      // Generator for valid company names (letters, numbers, spaces, hyphens, periods, apostrophes, ampersands)
      const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
        .filter(name => name.trim().length > 0)
        .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A')) // Replace invalid chars with 'A'
        .filter(name => name.trim().length > 0);

      fc.assert(
        fc.property(
          fc.array(validCompanyName, { minLength: 5, maxLength: 5 })
            .chain(companies => {
              // Ensure uniqueness by making each company name unique
              const uniqueCompanies = companies.map((company, index) => `${company.trim()} ${index + 1}`);
              return fc.constant(uniqueCompanies);
            }),
          (companies) => {
            const result = validateCompanyList(companies);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test for invalid cases
    it('should reject lists that do not have exactly 5 companies', () => {
      const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
        .filter(name => name.trim().length > 0)
        .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'));

      fc.assert(
        fc.property(
          fc.oneof(
            fc.array(validCompanyName, { minLength: 0, maxLength: 4 }), // Too few
            fc.array(validCompanyName, { minLength: 6, maxLength: 10 }) // Too many
          ),
          (companies) => {
            const result = validateCompanyList(companies);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Must provide exactly 5 companies'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Configuration round-trip', () => {
    // Feature: company-mention-tracker, Property 2: Configuration round-trip
    it('should preserve exact company configuration through serialization round-trip', () => {
      // Generator for valid company names
      const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
        .filter(name => name.trim().length > 0)
        .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'))
        .filter(name => name.trim().length > 0);

      // Generator for exactly 5 unique valid company names
      const validCompanyList = fc.array(validCompanyName, { minLength: 5, maxLength: 5 })
        .chain(companies => {
          // Ensure uniqueness by making each company name unique
          const uniqueCompanies = companies.map((company, index) => `${company.trim()} ${index + 1}`);
          return fc.constant(uniqueCompanies);
        });

      // Generator for valid article sources
      const validArticleSource = fc.record({
        name: fc.string({ minLength: 1, maxLength: 30 }).filter(name => name.trim().length > 0),
        type: fc.constantFrom('api' as const, 'rss' as const, 'scraper' as const),
        endpoint: fc.webUrl(),
        apiKey: fc.option(fc.string({ minLength: 10, maxLength: 50 })),
        rateLimit: fc.integer({ min: 1, max: 1000 })
      });

      // Generator for valid system configuration
      const validSystemConfig = fc.record({
        companies: validCompanyList,
        searchPeriodDays: fc.constant(7),
        articleSources: fc.array(validArticleSource, { minLength: 1, maxLength: 3 }),
        rateLimit: fc.integer({ min: 1, max: 1000 })
      });

      fc.assert(
        fc.property(
          validSystemConfig,
          (originalConfig) => {
            // Verify the config is valid before testing round-trip
            const validation = validateSystemConfig(originalConfig);
            expect(validation.isValid).toBe(true);

            // Serialize the configuration
            const serialized = serializeData(originalConfig);
            
            // Deserialize the configuration
            const deserializedConfig = deserializeData<SystemConfig>(serialized);

            // Verify exact equality of company list (the core requirement)
            expect(deserializedConfig.companies).toEqual(originalConfig.companies);
            
            // Verify all other fields are preserved as well
            expect(deserializedConfig.searchPeriodDays).toBe(originalConfig.searchPeriodDays);
            expect(deserializedConfig.rateLimit).toBe(originalConfig.rateLimit);
            expect(deserializedConfig.articleSources).toEqual(originalConfig.articleSources);

            // Verify the deserialized config is still valid
            const deserializedValidation = validateSystemConfig(deserializedConfig);
            expect(deserializedValidation.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Additional test specifically for company list round-trip
    it('should preserve company list order and content through round-trip', () => {
      const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
        .filter(name => name.trim().length > 0)
        .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'))
        .filter(name => name.trim().length > 0);

      const validCompanyList = fc.array(validCompanyName, { minLength: 5, maxLength: 5 })
        .chain(companies => {
          const uniqueCompanies = companies.map((company, index) => `${company.trim()} ${index + 1}`);
          return fc.constant(uniqueCompanies);
        });

      fc.assert(
        fc.property(
          validCompanyList,
          (originalCompanies) => {
            // Verify the company list is valid
            const validation = validateCompanyList(originalCompanies);
            expect(validation.isValid).toBe(true);

            // Serialize just the company list
            const serialized = serializeData({ companies: originalCompanies });
            
            // Deserialize the company list
            const deserialized = deserializeData<{ companies: string[] }>(serialized);

            // Verify exact equality - same order, same content
            expect(deserialized.companies).toEqual(originalCompanies);
            expect(deserialized.companies.length).toBe(5);
            
            // Verify each company is preserved exactly
            originalCompanies.forEach((company, index) => {
              expect(deserialized.companies[index]).toBe(company);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});