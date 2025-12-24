import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { DailySnapshot, serializeDailySnapshot, deserializeDailySnapshot } from '../models/types.js';

/**
 * DataStore class for persisting daily snapshots using file-based JSON storage
 * Implements requirements 2.4 and 3.4 for data persistence and retrieval
 */
export class DataStore {
  private readonly dataDirectory: string;

  constructor(dataDirectory: string = './data') {
    this.dataDirectory = dataDirectory;
  }

  /**
   * Saves a daily snapshot to persistent storage
   * Requirement 2.4: Store daily snapshot with timestamp and mention count
   */
  async saveDailySnapshot(snapshot: DailySnapshot): Promise<void> {
    try {
      // Ensure data directory exists
      await this.ensureDirectoryExists(this.dataDirectory);
      
      // Create company-specific directory
      const companyDir = join(this.dataDirectory, this.sanitizeCompanyName(snapshot.company));
      await this.ensureDirectoryExists(companyDir);
      
      // Generate filename based on date (YYYY-MM-DD format)
      const dateString = snapshot.date.toISOString().split('T')[0];
      const filename = `${dateString}.json`;
      const filepath = join(companyDir, filename);
      
      // Serialize and save the snapshot
      const serializedData = serializeDailySnapshot(snapshot);
      await fs.writeFile(filepath, serializedData, 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to save daily snapshot for ${snapshot.company} on ${snapshot.date.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a daily snapshot for a specific company and date
   * Requirement 3.4: Associate count with specific date and company
   */
  async getDailySnapshot(company: string, date: Date): Promise<DailySnapshot | null> {
    try {
      const companyDir = join(this.dataDirectory, this.sanitizeCompanyName(company));
      const dateString = date.toISOString().split('T')[0];
      const filename = `${dateString}.json`;
      const filepath = join(companyDir, filename);
      
      // Check if file exists
      try {
        await fs.access(filepath);
      } catch {
        return null; // File doesn't exist
      }
      
      // Read and deserialize the snapshot
      const fileContent = await fs.readFile(filepath, 'utf8');
      return deserializeDailySnapshot(fileContent);
      
    } catch (error) {
      throw new Error(`Failed to retrieve daily snapshot for ${company} on ${date.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all daily snapshots for a specific company
   * Used for trend analysis across the entire search period
   */
  async getAllSnapshots(company: string): Promise<DailySnapshot[]> {
    try {
      const companyDir = join(this.dataDirectory, this.sanitizeCompanyName(company));
      
      // Check if company directory exists
      try {
        await fs.access(companyDir);
      } catch {
        return []; // No data for this company
      }
      
      // Read all JSON files in the company directory
      const files = await fs.readdir(companyDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const snapshots: DailySnapshot[] = [];
      
      for (const file of jsonFiles) {
        try {
          const filepath = join(companyDir, file);
          const fileContent = await fs.readFile(filepath, 'utf8');
          const snapshot = deserializeDailySnapshot(fileContent);
          snapshots.push(snapshot);
        } catch (error) {
          // Log error but continue processing other files
          console.warn(`Failed to read snapshot file ${file} for company ${company}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Sort snapshots by date (chronological order)
      snapshots.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      return snapshots;
      
    } catch (error) {
      throw new Error(`Failed to retrieve snapshots for ${company}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clears all stored data (useful for testing and cleanup)
   */
  async clear(): Promise<void> {
    try {
      // Check if data directory exists
      try {
        await fs.access(this.dataDirectory);
      } catch {
        return; // Directory doesn't exist, nothing to clear
      }
      
      // Remove the entire data directory and its contents
      await fs.rm(this.dataDirectory, { recursive: true, force: true });
      
    } catch (error) {
      throw new Error(`Failed to clear data store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a list of all companies that have stored data
   */
  async getStoredCompanies(): Promise<string[]> {
    try {
      // Check if data directory exists
      try {
        await fs.access(this.dataDirectory);
      } catch {
        return []; // No data directory, no companies
      }
      
      const entries = await fs.readdir(this.dataDirectory, { withFileTypes: true });
      const companies = entries
        .filter(entry => entry.isDirectory())
        .map(entry => this.unsanitizeCompanyName(entry.name));
      
      return companies.sort();
      
    } catch (error) {
      throw new Error(`Failed to get stored companies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the date range of stored data for a company
   */
  async getDateRange(company: string): Promise<{ startDate: Date; endDate: Date } | null> {
    try {
      const snapshots = await this.getAllSnapshots(company);
      
      if (snapshots.length === 0) {
        return null;
      }
      
      const dates = snapshots.map(s => s.date);
      const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      return { startDate, endDate };
      
    } catch (error) {
      throw new Error(`Failed to get date range for ${company}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensures a directory exists, creating it if necessary
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sanitizes company names for use as directory names
   * Removes or replaces characters that are invalid in file paths
   */
  private sanitizeCompanyName(company: string): string {
    return company
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_.]/g, '_') // Replace invalid chars with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Converts sanitized directory names back to original company names
   * This is a best-effort conversion since sanitization is lossy
   */
  private unsanitizeCompanyName(sanitized: string): string {
    // This is a simple conversion - in practice, we might want to store
    // a mapping file to preserve original company names exactly
    return sanitized.replace(/_/g, ' ');
  }
}