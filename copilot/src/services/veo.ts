import { BaseGoogleAIService } from './base.js';
import { VeoRequest, VeoResponse, GoogleAIConfig } from '../types/index.js';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Google Veo Service (Video Generation)
 */
export class VeoService extends BaseGoogleAIService {
  private readonly apiEndpoint = 'https://aiplatform.googleapis.com/v1';

  constructor(config: GoogleAIConfig) {
    super(config);
  }

  /**
   * リクエストの検証
   */
  async validateRequest(request: VeoRequest): Promise<boolean> {
    if (!request.prompt) {
      throw new Error('Prompt is required for video generation');
    }

    if (request.prompt.length > 2000) {
      throw new Error('Prompt must be 2000 characters or less');
    }

    if (request.duration && (request.duration < 2 || request.duration > 120)) {
      throw new Error('Duration must be between 2 and 120 seconds');
    }

    const validResolutions = ['720p', '1080p', '4K'];
    if (request.resolution && !validResolutions.includes(request.resolution)) {
      throw new Error(`Resolution must be one of: ${validResolutions.join(', ')}`);
    }

    const validFps = [24, 30, 60];
    if (request.fps && !validFps.includes(request.fps)) {
      throw new Error(`FPS must be one of: ${validFps.join(', ')}`);
    }

    return true;
  }

  /**
   * Process video generation request
   */
  async processRequest(request: VeoRequest): Promise<VeoResponse> {
    try {
      await this.validateRequest(request);

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/veo-001');

      const requestBody = {
        instances: [{
          prompt: request.prompt,
          ...request.duration && { duration: request.duration },
          ...request.resolution && { resolution: this.mapResolution(request.resolution) },
          ...request.fps && { frameRate: request.fps },
          ...request.style && { style: request.style },
          ...request.cameraMovement && { cameraMovement: request.cameraMovement },
          ...request.aspectRatio && { aspectRatio: request.aspectRatio }
        }],
        parameters: {
          language: request.language || 'en',
          safetySettings: {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        }
      };

      console.log(`🎬 Generating video with Veo...`);
      console.log(`📝 Prompt: "${request.prompt.substring(0, 100)}${request.prompt.length > 100 ? '...' : ''}"`);
      console.log(`⏱️  Duration: ${request.duration || 5} seconds`);
      console.log(`📺 Resolution: ${request.resolution || '1080p'}`);

      // 動画生成は時間がかかるため、まず生成ジョブを開始
      const response = await axios.post(
        `${this.apiEndpoint}/${resourceName}:predict`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // ジョブIDを取得して進行状況を監視
      if (response.data.name) {
        const videoResult = await this.pollVideoGeneration(response.data.name, authToken);
        return videoResult;
      } else if (response.data.predictions && response.data.predictions.length > 0) {
        // 直接結果が返された場合
        return await this.processVideoResult(response.data.predictions[0], request);
      } else {
        throw new Error('No video generation result received');
      }

    } catch (error) {
      this.handleError(error, 'Veo video generation');
    }
  }

  /**
   * Monitor video generation progress
   */
  private async pollVideoGeneration(operationName: string, authToken: string): Promise<VeoResponse> {
    const maxWaitTime = 10 * 60 * 1000; // 10分
    const pollInterval = 30 * 1000; // 30秒
    const startTime = Date.now();

    console.log(`🕐 Monitoring video generation progress...`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const statusResponse = await axios.get(
          `${this.apiEndpoint}/${operationName}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const operation = statusResponse.data;

        if (operation.done) {
          if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
          }

          if (operation.response && operation.response.predictions) {
            return await this.processVideoResult(operation.response.predictions[0], {});
          }
        }

        // 進行状況を表示
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏳ Still generating... (${elapsed}s elapsed)`);

        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        if (Date.now() - startTime >= maxWaitTime) {
          throw new Error('Video generation timeout');
        }
        console.log(`⚠️  Polling error, retrying...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('Video generation timeout');
  }

  /**
   * 動画結果の処理
   */
  private async processVideoResult(prediction: any, request: any): Promise<VeoResponse> {
    const videos = [];

    if (prediction.bytesBase64Encoded) {
      // Base64エンコードされた動画データを保存
      const videoBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const fileName = this.generateFileName('veo', 'mp4');
      const filePath = path.join(this.outputDir, fileName);
      
      await fs.writeFile(filePath, videoBuffer);
      
      const fileInfo = await this.getFileInfo(filePath);
      
      videos.push({
        path: filePath,
        url: `file://${filePath}`,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          prompt: request.prompt,
          duration: prediction.duration || request.duration || 5,
          resolution: request.resolution || '1080p',
          fps: request.fps || 30,
          style: request.style,
          cameraMovement: request.cameraMovement,
          aspectRatio: request.aspectRatio
        }
      });

      console.log(`✅ Video saved: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
    } else if (prediction.videoUri) {
      // URLが返された場合（ダウンロードが必要）
      const fileName = this.generateFileName('veo', 'mp4');
      const filePath = path.join(this.outputDir, fileName);
      
      await this.downloadVideo(prediction.videoUri, filePath);
      
      const fileInfo = await this.getFileInfo(filePath);
      
      videos.push({
        path: filePath,
        url: prediction.videoUri,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          prompt: request.prompt,
          duration: prediction.duration || request.duration || 5,
          resolution: request.resolution || '1080p',
          fps: request.fps || 30,
          downloadedFrom: prediction.videoUri
        }
      });

      console.log(`✅ Video downloaded: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
    }

    const result: VeoResponse = {
      success: true,
      videos: videos,
      request: request,
      metadata: {
        model: 'veo-001',
        timestamp: new Date().toISOString(),
        totalVideos: videos.length,
        totalSize: videos.reduce((sum, video) => sum + video.size, 0)
      }
    };

    console.log(`🎉 Successfully generated ${videos.length} video(s)`);
    console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

    return result;
  }

  /**
   * 動画のダウンロード
   */
  private async downloadVideo(url: string, filePath: string): Promise<void> {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = require('fs').createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  /**
   * 解像度のマッピング
   */
  private mapResolution(resolution: string): { width: number; height: number } {
    const resolutionMap: Record<string, { width: number; height: number }> = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4K': { width: 3840, height: 2160 }
    };
    return resolutionMap[resolution] || resolutionMap['1080p'];
  }

  /**
   * 動画-to-動画変換（スタイル転送）
   */
  async styleTransfer(
    videoPath: string,
    stylePrompt: string,
    options?: Partial<VeoRequest>
  ): Promise<VeoResponse> {
    try {
      // 入力動画を読み込み
      const videoBuffer = await fs.readFile(videoPath);
      const videoBase64 = videoBuffer.toString('base64');

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/veo-style-001');

      const requestBody = {
        instances: [{
          prompt: stylePrompt,
          video: {
            bytesBase64Encoded: videoBase64
          },
          ...options?.style && { targetStyle: options.style },
          ...options?.duration && { maxDuration: options.duration }
        }],
        parameters: {
          language: options?.language || 'en'
        }
      };

      console.log(`🎨 Applying style transfer to video...`);
      console.log(`📝 Style prompt: "${stylePrompt.substring(0, 100)}${stylePrompt.length > 100 ? '...' : ''}"`);

      const response = await axios.post(
        `${this.apiEndpoint}/${resourceName}:predict`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.name) {
        return await this.pollVideoGeneration(response.data.name, authToken);
      } else {
        return await this.processVideoResult(response.data.predictions[0], {
          prompt: stylePrompt,
          ...options
        });
      }

    } catch (error) {
      this.handleError(error, 'Veo video style transfer');
    }
  }
}
