import axios, { AxiosInstance } from 'axios';
import { Article, ArticleSource } from '../../models/types.js';

/**
 * RSS Feed parser for fetching articles from RSS/Atom feeds
 * Supports common RSS 2.0 and Atom feed formats
 */
export class RSSFeedSource {
  private readonly httpClient: AxiosInstance;
  private readonly source: ArticleSource;

  constructor(source: ArticleSource) {
    this.source = source;
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Company-Mention-Tracker/1.0.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
      }
    });
  }

  /**
   * Searches for articles mentioning a company from RSS feed
   * Filters articles by company mention and date
   */
  async searchArticles(company: string, date: Date): Promise<Article[]> {
    try {
      const response = await this.httpClient.get(this.source.endpoint);
      const xmlContent = response.data;

      // Determine feed type and parse accordingly
      const feedType = this.detectFeedType(xmlContent);
      let allArticles: Article[];

      switch (feedType) {
        case 'rss':
          allArticles = this.parseRSSFeed(xmlContent);
          break;
        case 'atom':
          allArticles = this.parseAtomFeed(xmlContent);
          break;
        default:
          throw new Error(`Unsupported feed type: ${feedType}`);
      }

      // Filter articles by company mention and date
      return this.filterArticles(allArticles, company, date);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`RSS feed not found: ${this.source.endpoint}`);
        }
        if (error.response?.status === 403) {
          throw new Error(`Access denied to RSS feed: ${this.source.endpoint}`);
        }
      }
      throw error;
    }
  }

  /**
   * Detects the type of XML feed (RSS or Atom)
   */
  private detectFeedType(xmlContent: string): 'rss' | 'atom' | 'unknown' {
    const content = xmlContent.toLowerCase();
    
    if (content.includes('<rss') || content.includes('<channel>')) {
      return 'rss';
    }
    
    if (content.includes('<feed') && content.includes('xmlns="http://www.w3.org/2005/atom"')) {
      return 'atom';
    }
    
    return 'unknown';
  }

  /**
   * Parses RSS 2.0 feed format
   */
  private parseRSSFeed(xmlContent: string): Article[] {
    const articles: Article[] = [];
    
    // Extract all <item> elements
    const itemMatches = xmlContent.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    for (const itemXml of itemMatches) {
      try {
        const article = this.parseRSSItem(itemXml);
        if (article && this.isValidArticle(article)) {
          articles.push(article);
        }
      } catch (error) {
        console.warn('Failed to parse RSS item:', error);
      }
    }
    
    return articles;
  }

  /**
   * Parses a single RSS item
   */
  private parseRSSItem(itemXml: string): Article | null {
    const title = this.extractXMLValue(itemXml, 'title');
    const link = this.extractXMLValue(itemXml, 'link');
    const pubDate = this.extractXMLValue(itemXml, 'pubDate');
    const description = this.extractXMLValue(itemXml, 'description');
    const content = this.extractXMLValue(itemXml, 'content:encoded') || description;

    if (!title || !link) {
      return null;
    }

    return {
      title: this.cleanText(title),
      url: link.trim(),
      publishedDate: this.parseDate(pubDate),
      source: this.source.name,
      excerpt: this.cleanText(this.extractExcerpt(content || description))
    };
  }

  /**
   * Parses Atom feed format
   */
  private parseAtomFeed(xmlContent: string): Article[] {
    const articles: Article[] = [];
    
    // Extract all <entry> elements
    const entryMatches = xmlContent.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
    
    for (const entryXml of entryMatches) {
      try {
        const article = this.parseAtomEntry(entryXml);
        if (article && this.isValidArticle(article)) {
          articles.push(article);
        }
      } catch (error) {
        console.warn('Failed to parse Atom entry:', error);
      }
    }
    
    return articles;
  }

  /**
   * Parses a single Atom entry
   */
  private parseAtomEntry(entryXml: string): Article | null {
    const title = this.extractXMLValue(entryXml, 'title');
    const link = this.extractAtomLink(entryXml);
    const published = this.extractXMLValue(entryXml, 'published') || this.extractXMLValue(entryXml, 'updated');
    const summary = this.extractXMLValue(entryXml, 'summary');
    const content = this.extractXMLValue(entryXml, 'content') || summary;

    if (!title || !link) {
      return null;
    }

    return {
      title: this.cleanText(title),
      url: link.trim(),
      publishedDate: this.parseDate(published),
      source: this.source.name,
      excerpt: this.cleanText(this.extractExcerpt(content || summary))
    };
  }

  /**
   * Extracts link from Atom entry (handles both href attribute and text content)
   */
  private extractAtomLink(entryXml: string): string {
    // Try to extract href attribute from <link> tag
    const hrefMatch = entryXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
    if (hrefMatch) {
      return hrefMatch[1];
    }
    
    // Fallback to link text content
    return this.extractXMLValue(entryXml, 'link');
  }

  /**
   * Extracts value from XML tag, handling CDATA sections
   */
  private extractXMLValue(xml: string, tag: string): string {
    // Handle CDATA sections
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) {
      return cdataMatch[1].trim();
    }
    
    // Handle regular XML content
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? this.decodeXMLEntities(match[1].trim()) : '';
  }

  /**
   * Decodes common XML entities
   */
  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  /**
   * Parses various date formats commonly found in RSS feeds
   */
  private parseDate(dateString: string): Date {
    if (!dateString) {
      return new Date();
    }

    // Try parsing as-is first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try common RSS date formats
    const formats = [
      // RFC 822 format: "Wed, 15 Jan 2024 10:00:00 GMT"
      /^[A-Za-z]{3},\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+GMT$/,
      // ISO 8601 format: "2024-01-15T10:00:00Z"
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z?$/
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Fallback to current date if parsing fails
    console.warn(`Failed to parse date: ${dateString}`);
    return new Date();
  }

  /**
   * Extracts excerpt from content, removing HTML tags and limiting length
   */
  private extractExcerpt(content: string, maxLength: number = 200): string {
    if (!content) return '';
    
    // Remove HTML tags
    const textContent = content.replace(/<[^>]*>/g, ' ');
    
    // Normalize whitespace and trim
    const cleaned = textContent.replace(/\s+/g, ' ').trim();
    
    // Limit length
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    // Find last complete word within limit
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  /**
   * Cleans text content by removing unwanted characters
   */
  private cleanText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Filters articles by company mention and date
   */
  private filterArticles(articles: Article[], company: string, targetDate: Date): Article[] {
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const companyLower = company.toLowerCase();
    
    return articles.filter(article => {
      // Check if article mentions the company
      const fullText = `${article.title} ${article.excerpt}`.toLowerCase();
      const mentionsCompany = fullText.includes(companyLower);
      
      // Check if article is from target date
      const articleDateStr = article.publishedDate.toISOString().split('T')[0];
      const isTargetDate = articleDateStr === targetDateStr;
      
      return mentionsCompany && isTargetDate;
    });
  }

  /**
   * Validates that an article has all required fields
   */
  private isValidArticle(article: Article): boolean {
    return !!(
      article.title &&
      article.url &&
      article.source &&
      !isNaN(article.publishedDate.getTime()) &&
      this.isValidUrl(article.url)
    );
  }

  /**
   * Validates that a URL is properly formatted
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the article source configuration
   */
  getSource(): ArticleSource {
    return { ...this.source };
  }

  /**
   * Creates common RSS feed source configurations
   */
  static createCommonSources(): ArticleSource[] {
    return [
      {
        name: 'Reuters Business',
        type: 'rss',
        endpoint: 'https://www.reuters.com/business/finance/rss',
        rateLimit: 60
      },
      {
        name: 'BBC Business',
        type: 'rss',
        endpoint: 'https://feeds.bbci.co.uk/news/business/rss.xml',
        rateLimit: 60
      },
      {
        name: 'CNN Business',
        type: 'rss',
        endpoint: 'http://rss.cnn.com/rss/money_latest.rss',
        rateLimit: 60
      },
      {
        name: 'TechCrunch',
        type: 'rss',
        endpoint: 'https://techcrunch.com/feed/',
        rateLimit: 60
      },
      {
        name: 'Ars Technica',
        type: 'rss',
        endpoint: 'https://feeds.arstechnica.com/arstechnica/index',
        rateLimit: 60
      }
    ];
  }

  /**
   * Validates RSS feed configuration
   */
  static validateConfig(source: ArticleSource): string[] {
    const errors: string[] = [];

    if (source.type !== 'rss') {
      errors.push('RSS source must have type "rss"');
    }

    if (!source.endpoint) {
      errors.push('RSS source requires an endpoint URL');
    }

    if (source.endpoint && !source.endpoint.match(/^https?:\/\//)) {
      errors.push('RSS endpoint must be a valid HTTP/HTTPS URL');
    }

    return errors;
  }

  /**
   * Gets usage information for RSS feeds
   */
  static getUsageInfo(): string {
    return `
RSS Feed Integration:
- Supports RSS 2.0 and Atom feed formats
- No API key required for most feeds
- Rate limiting recommended to respect server resources
- Filters articles by company mention and publication date
- Handles CDATA sections and HTML content

Common RSS Feed URLs:
- Reuters: https://www.reuters.com/business/finance/rss
- BBC: https://feeds.bbci.co.uk/news/business/rss.xml
- CNN: http://rss.cnn.com/rss/money_latest.rss
- TechCrunch: https://techcrunch.com/feed/
- Ars Technica: https://feeds.arstechnica.com/arstechnica/index

Rate Limiting:
- Recommended: 60 requests per hour
- Most RSS feeds update every 15-30 minutes
- Respect robots.txt and terms of service

Example configuration:
{
  "name": "Reuters Business",
  "type": "rss",
  "endpoint": "https://www.reuters.com/business/finance/rss",
  "rateLimit": 60
}
    `.trim();
  }
}