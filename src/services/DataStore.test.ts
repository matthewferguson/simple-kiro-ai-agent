import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as fc from 'fast-check';
import { DataStore } from './DataStore.js';
import { DailySnapshot, Article } from '../models/types.js';

describe('DataStore', () => {
  let dataStore: DataStore;
  const testDataDir = './test-data';

  beforeEach(() => {
    dataStore = new DataStore(testDataDir);
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await dataStore.clear();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('saveDailySnapshot', () => {
    it('should save a daily snapshot to the correct file path', async () => {
      const snapshot: DailySnapshot = {
        company: 'Apple Inc.',
        date: new Date('2024-01-15'),
        mentionCount: 5,
        articles: [
          {
            title: 'Apple announces new product',
            url: 'https://example.com/apple-news',
            publishedDate: new Date('2024-01-15T10:00:00Z'),
            source: 'TechNews',
            excerpt: 'Apple Inc. revealed their latest innovation...'
          }
        ],
        status: 'complete'
      };

      await dataStore.saveDailySnapshot(snapshot);

      // Verify file was created
      const expectedPath = join(testDataDir, 'apple_inc.', '2024-01-15.json');
      const fileExists = await fs.access(expectedPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content
      const fileContent = await fs.readFile(expectedPath, 'utf8');
      const savedData = JSON.parse(fileContent);
      expect(savedData.company).toBe('Apple Inc.');
      expect(savedData.mentionCount).toBe(5);
      expect(savedData.status).toBe('complete');
    });

    it('should handle company names with special characters', async () => {
      const snapshot: DailySnapshot = {
        company: 'AT&T Corp.',
        date: new Date('2024-01-15'),
        mentionCount: 3,
        articles: [],
        status: 'complete'
      };

      await dataStore.saveDailySnapshot(snapshot);

      // Verify sanitized directory name
      const expectedPath = join(testDataDir, 'at_t_corp.', '2024-01-15.json');
      const fileExists = await fs.access(expectedPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should throw error on invalid data', async () => {
      const invalidSnapshot = null as any;

      await expect(dataStore.saveDailySnapshot(invalidSnapshot)).rejects.toThrow();
    });
  });

  describe('getDailySnapshot', () => {
    it('should retrieve a saved daily snapshot', async () => {
      const originalSnapshot: DailySnapshot = {
        company: 'Microsoft',
        date: new Date('2024-01-16'),
        mentionCount: 7,
        articles: [
          {
            title: 'Microsoft updates Windows',
            url: 'https://example.com/ms-news',
            publishedDate: new Date('2024-01-16T14:30:00Z'),
            source: 'TechDaily',
            excerpt: 'Microsoft Corporation announced...'
          }
        ],
        status: 'partial'
      };

      await dataStore.saveDailySnapshot(originalSnapshot);
      const retrievedSnapshot = await dataStore.getDailySnapshot('Microsoft', new Date('2024-01-16'));

      expect(retrievedSnapshot).not.toBeNull();
      expect(retrievedSnapshot!.company).toBe('Microsoft');
      expect(retrievedSnapshot!.mentionCount).toBe(7);
      expect(retrievedSnapshot!.status).toBe('partial');
      expect(retrievedSnapshot!.articles).toHaveLength(1);
      expect(retrievedSnapshot!.articles[0].title).toBe('Microsoft updates Windows');
    });

    it('should return null for non-existent snapshot', async () => {
      const result = await dataStore.getDailySnapshot('NonExistent', new Date('2024-01-01'));
      expect(result).toBeNull();
    });

    it('should handle date objects correctly', async () => {
      const snapshot: DailySnapshot = {
        company: 'Google',
        date: new Date('2024-02-29'), // Leap year date
        mentionCount: 2,
        articles: [],
        status: 'complete'
      };

      await dataStore.saveDailySnapshot(snapshot);
      const retrieved = await dataStore.getDailySnapshot('Google', new Date('2024-02-29'));

      expect(retrieved).not.toBeNull();
      expect(retrieved!.date).toEqual(new Date('2024-02-29'));
    });
  });

  describe('getAllSnapshots', () => {
    it('should retrieve all snapshots for a company in chronological order', async () => {
      const snapshots: DailySnapshot[] = [
        {
          company: 'Tesla',
          date: new Date('2024-01-17'),
          mentionCount: 4,
          articles: [],
          status: 'complete'
        },
        {
          company: 'Tesla',
          date: new Date('2024-01-15'),
          mentionCount: 2,
          articles: [],
          status: 'complete'
        },
        {
          company: 'Tesla',
          date: new Date('2024-01-16'),
          mentionCount: 6,
          articles: [],
          status: 'partial'
        }
      ];

      // Save snapshots in random order
      for (const snapshot of snapshots) {
        await dataStore.saveDailySnapshot(snapshot);
      }

      const retrieved = await dataStore.getAllSnapshots('Tesla');

      expect(retrieved).toHaveLength(3);
      // Should be sorted chronologically
      expect(retrieved[0].date).toEqual(new Date('2024-01-15'));
      expect(retrieved[1].date).toEqual(new Date('2024-01-16'));
      expect(retrieved[2].date).toEqual(new Date('2024-01-17'));
      
      expect(retrieved[0].mentionCount).toBe(2);
      expect(retrieved[1].mentionCount).toBe(6);
      expect(retrieved[2].mentionCount).toBe(4);
    });

    it('should return empty array for company with no data', async () => {
      const result = await dataStore.getAllSnapshots('NonExistentCompany');
      expect(result).toEqual([]);
    });

    it('should handle corrupted files gracefully', async () => {
      // Save a valid snapshot first
      const validSnapshot: DailySnapshot = {
        company: 'Amazon',
        date: new Date('2024-01-15'),
        mentionCount: 3,
        articles: [],
        status: 'complete'
      };
      await dataStore.saveDailySnapshot(validSnapshot);

      // Create a corrupted file
      const companyDir = join(testDataDir, 'amazon');
      const corruptedFile = join(companyDir, '2024-01-16.json');
      await fs.writeFile(corruptedFile, 'invalid json content', 'utf8');

      // Should return only the valid snapshot and log warning for corrupted file
      const snapshots = await dataStore.getAllSnapshots('Amazon');
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].date).toEqual(new Date('2024-01-15'));
    });
  });

  describe('clear', () => {
    it('should remove all stored data', async () => {
      // Save some test data
      const snapshot: DailySnapshot = {
        company: 'Netflix',
        date: new Date('2024-01-15'),
        mentionCount: 1,
        articles: [],
        status: 'complete'
      };
      await dataStore.saveDailySnapshot(snapshot);

      // Verify data exists
      const beforeClear = await dataStore.getDailySnapshot('Netflix', new Date('2024-01-15'));
      expect(beforeClear).not.toBeNull();

      // Clear data
      await dataStore.clear();

      // Verify data is gone
      const afterClear = await dataStore.getDailySnapshot('Netflix', new Date('2024-01-15'));
      expect(afterClear).toBeNull();
    });

    it('should not throw error if no data exists', async () => {
      await expect(dataStore.clear()).resolves.not.toThrow();
    });
  });

  describe('getStoredCompanies', () => {
    it('should return list of companies with stored data', async () => {
      const companies = ['Apple Inc.', 'Microsoft', 'Google'];
      
      for (const company of companies) {
        const snapshot: DailySnapshot = {
          company,
          date: new Date('2024-01-15'),
          mentionCount: 1,
          articles: [],
          status: 'complete'
        };
        await dataStore.saveDailySnapshot(snapshot);
      }

      const storedCompanies = await dataStore.getStoredCompanies();
      expect(storedCompanies).toHaveLength(3);
      // Should be sorted alphabetically (note: unsanitized names will have spaces instead of periods)
      expect(storedCompanies).toEqual(['apple inc.', 'google', 'microsoft']);
    });

    it('should return empty array when no data exists', async () => {
      const companies = await dataStore.getStoredCompanies();
      expect(companies).toEqual([]);
    });
  });

  describe('getDateRange', () => {
    it('should return correct date range for company data', async () => {
      const snapshots: DailySnapshot[] = [
        {
          company: 'Meta',
          date: new Date('2024-01-15'),
          mentionCount: 2,
          articles: [],
          status: 'complete'
        },
        {
          company: 'Meta',
          date: new Date('2024-01-20'),
          mentionCount: 5,
          articles: [],
          status: 'complete'
        },
        {
          company: 'Meta',
          date: new Date('2024-01-17'),
          mentionCount: 3,
          articles: [],
          status: 'complete'
        }
      ];

      for (const snapshot of snapshots) {
        await dataStore.saveDailySnapshot(snapshot);
      }

      const dateRange = await dataStore.getDateRange('Meta');
      expect(dateRange).not.toBeNull();
      expect(dateRange!.startDate).toEqual(new Date('2024-01-15'));
      expect(dateRange!.endDate).toEqual(new Date('2024-01-20'));
    });

    it('should return null for company with no data', async () => {
      const dateRange = await dataStore.getDateRange('NonExistent');
      expect(dateRange).toBeNull();
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 6: Daily snapshot persistence', () => {
      // Feature: company-mention-tracker, Property 6: Daily snapshot persistence
      it('should preserve all data including timestamp, mention count, and articles through save/retrieve round-trip', async () => {
        // Generator for valid company names
        const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
          .filter(name => name.trim().length > 0)
          .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'))
          .filter(name => name.trim().length > 0);

        // Generator for valid article data
        const validArticle = fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          url: fc.webUrl(),
          publishedDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          source: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          excerpt: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
        });

        // Generator for valid daily snapshots
        const validDailySnapshot = fc.record({
          company: validCompanyName,
          date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          mentionCount: fc.integer({ min: 0, max: 1000 }),
          articles: fc.array(validArticle, { minLength: 0, maxLength: 10 }),
          status: fc.constantFrom('complete' as const, 'partial' as const, 'failed' as const)
        });

        await fc.assert(
          fc.asyncProperty(
            validDailySnapshot,
            async (originalSnapshot) => {
              // Clean up before test
              await dataStore.clear();

              // Save the snapshot
              await dataStore.saveDailySnapshot(originalSnapshot);

              // Retrieve the snapshot
              const retrievedSnapshot = await dataStore.getDailySnapshot(
                originalSnapshot.company, 
                originalSnapshot.date
              );

              // Verify the snapshot was retrieved successfully
              expect(retrievedSnapshot).not.toBeNull();

              if (retrievedSnapshot) {
                // Verify all data is preserved exactly
                expect(retrievedSnapshot.company).toBe(originalSnapshot.company);
                expect(retrievedSnapshot.date).toEqual(originalSnapshot.date);
                expect(retrievedSnapshot.mentionCount).toBe(originalSnapshot.mentionCount);
                expect(retrievedSnapshot.status).toBe(originalSnapshot.status);
                expect(retrievedSnapshot.articles).toHaveLength(originalSnapshot.articles.length);

                // Verify each article is preserved exactly
                for (let i = 0; i < originalSnapshot.articles.length; i++) {
                  const originalArticle = originalSnapshot.articles[i];
                  const retrievedArticle = retrievedSnapshot.articles[i];

                  expect(retrievedArticle.title).toBe(originalArticle.title);
                  expect(retrievedArticle.url).toBe(originalArticle.url);
                  expect(retrievedArticle.publishedDate).toEqual(originalArticle.publishedDate);
                  expect(retrievedArticle.source).toBe(originalArticle.source);
                  expect(retrievedArticle.excerpt).toBe(originalArticle.excerpt);
                }
              }

              // Clean up after test
              await dataStore.clear();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 9: Count-date-company association', () => {
      // Feature: company-mention-tracker, Property 9: Count-date-company association
      it('should return the correct count associated with the correct date and company', async () => {
        // Generator for valid company names
        const validCompanyName = fc.string({ minLength: 1, maxLength: 50 })
          .filter(name => name.trim().length > 0)
          .map(name => name.replace(/[^a-zA-Z0-9\s\-\.'&]/g, 'A'))
          .filter(name => name.trim().length > 0);

        // Generator for valid dates
        const validDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') });

        // Generator for mention counts
        const validMentionCount = fc.integer({ min: 0, max: 1000 });

        // Generator for unique snapshots (no duplicate company/date combinations)
        // This ensures we test the association without conflicts from overwrites
        const uniqueSnapshots = fc.uniqueArray(
          fc.record({
            company: validCompanyName,
            date: validDate,
            mentionCount: validMentionCount,
            articles: fc.array(fc.record({
              title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              url: fc.webUrl(),
              publishedDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
              source: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              excerpt: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
            }), { minLength: 0, maxLength: 5 }),
            status: fc.constantFrom('complete' as const, 'partial' as const, 'failed' as const)
          }),
          {
            minLength: 1,
            maxLength: 15,
            selector: (snapshot) => `${snapshot.company}|${snapshot.date.toISOString().split('T')[0]}`
          }
        );

        await fc.assert(
          fc.asyncProperty(
            uniqueSnapshots,
            async (snapshots) => {
              // Clean up before test
              await dataStore.clear();

              // Save all snapshots (no duplicates, so no overwrites)
              for (const snapshot of snapshots) {
                await dataStore.saveDailySnapshot(snapshot);
              }

              // For each saved snapshot, verify that retrieving it returns the correct association
              for (const originalSnapshot of snapshots) {
                const retrievedSnapshot = await dataStore.getDailySnapshot(
                  originalSnapshot.company,
                  originalSnapshot.date
                );

                // Verify the snapshot was retrieved successfully
                expect(retrievedSnapshot).not.toBeNull();

                if (retrievedSnapshot) {
                  // Verify the count-date-company association is correct
                  expect(retrievedSnapshot.company).toBe(originalSnapshot.company);
                  expect(retrievedSnapshot.date).toEqual(originalSnapshot.date);
                  expect(retrievedSnapshot.mentionCount).toBe(originalSnapshot.mentionCount);

                  // Verify that the retrieved data matches exactly what was stored
                  // This ensures the association is maintained correctly
                  expect(retrievedSnapshot.status).toBe(originalSnapshot.status);
                  expect(retrievedSnapshot.articles).toHaveLength(originalSnapshot.articles.length);
                }
              }

              // Additional test: verify that querying with non-existent company/date combinations returns null
              // This ensures the association is specific and not mixed up
              if (snapshots.length > 0) {
                // Try to get data for a company that doesn't exist
                const nonExistentQuery = await dataStore.getDailySnapshot(
                  'NonExistentCompany_XYZ_123',
                  snapshots[0].date
                );
                expect(nonExistentQuery).toBeNull();

                // Try to get data for a date that doesn't exist (far future)
                const futureDateQuery = await dataStore.getDailySnapshot(
                  snapshots[0].company,
                  new Date('2099-12-31')
                );
                expect(futureDateQuery).toBeNull();
              }

              // Clean up after test
              await dataStore.clear();
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});