import {
  Article,
  CompanyMention
} from '../models/types.js';

/**
 * MentionExtractor processes articles to identify and count company mentions
 * Implements requirements 2.2, 2.3, 3.1, 3.2, 3.3
 */
export class MentionExtractor {
  /**
   * Extracts mentions of specified companies from an article
   * Requirements 3.1, 3.2, 3.3: Count mentions, one per article per company, multi-company detection
   */
  extractMentions(article: Article, companies: string[]): CompanyMention[] {
    this.validateArticle(article);
    
    const mentions: CompanyMention[] = [];
    const searchableText = this.prepareSearchableText(article);
    
    for (const company of companies) {
      if (this.containsCompanyMention(searchableText, company)) {
        mentions.push({
          company: company.trim(),
          article,
          mentionCount: 1 // Requirement 3.2: Each article contributes exactly 1 mention per company
        });
      }
    }
    
    return mentions;
  }

  /**
   * Counts total mentions for a specific company across multiple articles
   * Requirements 3.1, 3.2: Count mentions, one mention per article per company
   */
  countMentions(articles: Article[], company: string): number {
    if (!articles || articles.length === 0) {
      return 0;
    }
    
    if (!company || company.trim().length === 0) {
      throw new Error('Company name cannot be empty');
    }
    
    let count = 0;
    const normalizedCompany = company.trim();
    
    for (const article of articles) {
      try {
        this.validateArticle(article);
        const searchableText = this.prepareSearchableText(article);
        
        if (this.containsCompanyMention(searchableText, normalizedCompany)) {
          count += 1; // Requirement 3.2: Each article contributes exactly 1 mention
        }
      } catch (error) {
        // Skip invalid articles but continue processing others
        console.warn(`Skipping invalid article: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return count;
  }

  /**
   * Validates that an article contains all required fields
   * Requirement 2.3: Article must contain title, publication date, source URL, and excerpt
   */
  private validateArticle(article: Article): void {
    if (!article) {
      throw new Error('Article cannot be null or undefined');
    }

    const requiredFields = ['title', 'url', 'source', 'excerpt'] as const;
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!article[field] || typeof article[field] !== 'string' || article[field].trim().length === 0) {
        missingFields.push(field);
      }
    }

    // Validate publishedDate separately as it's a Date object
    if (!article.publishedDate || !(article.publishedDate instanceof Date) || isNaN(article.publishedDate.getTime())) {
      missingFields.push('publishedDate');
    }

    if (missingFields.length > 0) {
      throw new Error(`Article missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate URL format
    try {
      new URL(article.url);
    } catch {
      throw new Error('Article URL must be a valid URL');
    }
  }

  /**
   * Prepares searchable text from article content
   * Combines title and excerpt for comprehensive mention detection
   */
  private prepareSearchableText(article: Article): string {
    // Combine title and excerpt for comprehensive search
    // Normalize whitespace and convert to lowercase for case-insensitive matching
    const combinedText = `${article.title} ${article.excerpt}`;
    return combinedText.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Checks if the searchable text contains a mention of the specified company
   * Uses word boundary matching to avoid false positives
   */
  private containsCompanyMention(searchableText: string, company: string): boolean {
    if (!company || company.trim().length === 0) {
      return false;
    }

    // Normalize the company name the same way as the searchable text
    const normalizedCompany = company.trim().toLowerCase().replace(/\s+/g, ' ');
    
    // Handle multi-word company names by checking for the complete phrase
    // Use word boundaries to avoid partial matches (e.g., "Apple" shouldn't match "Pineapple")
    const companyWords = normalizedCompany.split(/\s+/);
    
    if (companyWords.length === 1) {
      // Single word company - use word boundary regex
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(normalizedCompany)}\\b`, 'i');
      return wordBoundaryRegex.test(searchableText);
    } else {
      // Multi-word company - check for the complete phrase with word boundaries
      const phraseRegex = new RegExp(`\\b${this.escapeRegex(normalizedCompany)}\\b`, 'i');
      return phraseRegex.test(searchableText);
    }
  }

  /**
   * Escapes special regex characters in company names
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extracts and validates article data from raw article objects
   * Requirement 2.3: Extract title, date, URL, excerpt
   * This method can be used to process raw article data from various sources
   */
  extractArticleData(rawArticle: any): Article {
    if (!rawArticle || typeof rawArticle !== 'object') {
      throw new Error('Raw article data must be an object');
    }

    // Extract and validate required fields
    const title = this.extractStringField(rawArticle, ['title', 'headline', 'name']);
    const url = this.extractStringField(rawArticle, ['url', 'link', 'href']);
    const source = this.extractStringField(rawArticle, ['source', 'publisher', 'site']);
    const excerpt = this.extractStringField(rawArticle, ['excerpt', 'description', 'summary', 'snippet']);
    
    // Extract and validate date
    const publishedDate = this.extractDateField(rawArticle, ['publishedDate', 'published', 'date', 'pubDate', 'publishedAt']);

    const article: Article = {
      title,
      url,
      publishedDate,
      source,
      excerpt
    };

    // Validate the constructed article
    this.validateArticle(article);
    
    return article;
  }

  /**
   * Extracts a string field from raw article data, trying multiple possible field names
   */
  private extractStringField(rawArticle: any, fieldNames: string[]): string {
    for (const fieldName of fieldNames) {
      const value = rawArticle[fieldName];
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    
    throw new Error(`Required field not found. Tried: ${fieldNames.join(', ')}`);
  }

  /**
   * Extracts a date field from raw article data, trying multiple possible field names
   */
  private extractDateField(rawArticle: any, fieldNames: string[]): Date {
    for (const fieldName of fieldNames) {
      const value = rawArticle[fieldName];
      
      if (value) {
        let date: Date;
        
        if (value instanceof Date) {
          date = value;
        } else if (typeof value === 'string') {
          date = new Date(value);
        } else if (typeof value === 'number') {
          // Assume timestamp (milliseconds or seconds)
          date = new Date(value > 1e10 ? value : value * 1000);
        } else {
          continue;
        }
        
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    throw new Error(`Valid date field not found. Tried: ${fieldNames.join(', ')}`);
  }
}