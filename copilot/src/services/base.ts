import { GoogleAuth } from 'google-auth-library';
import { GoogleAIConfig } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Base class for Google AI services
 */
export abstract class BaseGoogleAIService {
  protected auth: GoogleAuth;
  protected config: GoogleAIConfig;
  protected outputDir: string;

  constructor(config: GoogleAIConfig) {
    this.config = config;
    this.outputDir = path.join(process.cwd(), 'output');
    
    // Google authentication setup
    this.auth = new GoogleAuth({
      keyFile: config.credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/generative-language'
      ],
      projectId: config.projectId
    });

    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  protected async ensureOutputDir(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Get authenticated client
   */
  protected async getAuthClient() {
    return await this.auth.getClient();
  }

  /**
   * Get API key or authentication token
   */
  protected async getAuthToken(): Promise<string> {
    if (this.config.apiKey) {
      return this.config.apiKey;
    }

    const client = await this.getAuthClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token || '';
  }

  /**
   * Generate unique filename
   */
  protected generateFileName(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Convert file size to human-readable format
   */
  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * エラーハンドリング
   */
  protected handleError(error: any, operation: string): never {
    console.error(`Error in ${operation}:`, error);
    
    if (error.response) {
      // API レスポンスエラー
      const message = error.response.data?.error?.message || error.response.statusText;
      throw new Error(`${operation} failed: ${message} (Status: ${error.response.status})`);
    } else if (error.request) {
      // ネットワークエラー
      throw new Error(`${operation} failed: Network error - ${error.message}`);
    } else {
      // Other errors
      throw new Error(`${operation} failed: ${error.message}`);
    }
  }

  /**
   * Build resource name including project ID and location
   */
  protected buildResourceName(resourceType: string, resourceId?: string): string {
    const basePath = `projects/${this.config.projectId}/locations/${this.config.location || 'us-central1'}`;
    if (resourceId) {
      return `${basePath}/${resourceType}/${resourceId}`;
    }
    return `${basePath}/${resourceType}`;
  }

  /**
   * ファイルのMIMEタイプを推定
   */
  protected getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * ファイル情報を取得
   */
  protected async getFileInfo(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        size: stats.size,
        mimeType: this.getMimeType(filePath),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to get file info for ${filePath}: ${error}`);
    }
  }

  /**
   * 抽象メソッド: 各サービスで実装
   */
  abstract validateRequest(request: any): Promise<boolean>;
  abstract processRequest(request: any): Promise<any>;
}
