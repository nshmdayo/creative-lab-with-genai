import { BaseGoogleAIService } from './base.js';
import { LyriaRequest, LyriaResponse, GoogleAIConfig } from '../types/index.js';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Google Lyria Service (Music Generation)
 */
export class LyriaService extends BaseGoogleAIService {
  private readonly apiEndpoint = 'https://aiplatform.googleapis.com/v1';

  constructor(config: GoogleAIConfig) {
    super(config);
  }

  /**
   * Request validation
   */
  async validateRequest(request: LyriaRequest): Promise<boolean> {
    if (!request.prompt) {
      throw new Error('Prompt is required for music generation');
    }

    if (request.prompt.length > 1000) {
      throw new Error('Prompt must be 1000 characters or less');
    }

    if (request.duration && (request.duration < 10 || request.duration > 300)) {
      throw new Error('Duration must be between 10 and 300 seconds');
    }

    const validGenres = ['pop', 'rock', 'classical', 'jazz', 'electronic', 'ambient', 'hip-hop', 'country'];
    if (request.genre && !validGenres.includes(request.genre)) {
      throw new Error(`Genre must be one of: ${validGenres.join(', ')}`);
    }

    const validMoods = ['happy', 'sad', 'energetic', 'calm', 'mysterious', 'dramatic', 'romantic'];
    if (request.mood && !validMoods.includes(request.mood)) {
      throw new Error(`Mood must be one of: ${validMoods.join(', ')}`);
    }

    if (typeof request.tempo === 'number' && (request.tempo < 60 || request.tempo > 200)) {
      throw new Error('Tempo (BPM) must be between 60 and 200');
    }

    return true;
  }

  /**
   * Process music generation request
   */
  async processRequest(request: LyriaRequest): Promise<LyriaResponse> {
    try {
      await this.validateRequest(request);

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/lyria-001');

      const requestBody = {
        instances: [{
          prompt: request.prompt,
          ...request.genre && { genre: request.genre },
          ...request.mood && { mood: request.mood },
          ...request.tempo && { 
            tempo: typeof request.tempo === 'number' ? request.tempo : this.mapTempo(request.tempo)
          },
          ...request.duration && { duration: request.duration },
          ...request.instruments && { instruments: request.instruments },
          ...request.key && { key: request.key },
          ...request.scale && { scale: request.scale }
        }],
        parameters: {
          language: 'en',
          safetySettings: {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        }
      };

      console.log(`🎵 Generating music with Lyria...`);
      console.log(`📝 Prompt: "${request.prompt.substring(0, 100)}${request.prompt.length > 100 ? '...' : ''}"`);
      console.log(`🎸 Genre: ${request.genre || 'auto'}`);
      console.log(`😊 Mood: ${request.mood || 'auto'}`);
      console.log(`⏱️  Duration: ${request.duration || 30} seconds`);

      // Music generation takes time, so start generation job first
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

      // Get job ID and monitor progress
      if (response.data.name) {
        const musicResult = await this.pollMusicGeneration(response.data.name, authToken);
        return musicResult;
      } else if (response.data.predictions && response.data.predictions.length > 0) {
        // If result is returned directly
        return await this.processMusicResult(response.data.predictions[0], request);
      } else {
        throw new Error('No music generation result received');
      }

    } catch (error) {
      this.handleError(error, 'Lyria music generation');
    }
  }

  /**
   * Monitor music generation progress
   */
  private async pollMusicGeneration(operationName: string, authToken: string): Promise<LyriaResponse> {
    const maxWaitTime = 8 * 60 * 1000; // 8 minutes
    const pollInterval = 20 * 1000; // 20 seconds
    const startTime = Date.now();

    console.log(`🕐 Monitoring music generation progress...`);

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
            throw new Error(`Music generation failed: ${operation.error.message}`);
          }

          if (operation.response && operation.response.predictions) {
            return await this.processMusicResult(operation.response.predictions[0], {});
          }
        }

        // Display progress
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`🎵 Still generating music... (${elapsed}s elapsed)`);

        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        if (Date.now() - startTime >= maxWaitTime) {
          throw new Error('Music generation timeout');
        }
        console.log(`⚠️  Polling error, retrying...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('Music generation timeout');
  }

  /**
   * Process music result
   */
  private async processMusicResult(prediction: any, request: any): Promise<LyriaResponse> {
    const musicFiles = [];

    if (prediction.bytesBase64Encoded) {
      // Save Base64 encoded music data
      const audioBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const fileName = this.generateFileName('lyria', 'mp3');
      const filePath = path.join(this.outputDir, fileName);
      
      await fs.writeFile(filePath, audioBuffer);
      
      const fileInfo = await this.getFileInfo(filePath);
      
      musicFiles.push({
        path: filePath,
        url: `file://${filePath}`,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          prompt: request.prompt,
          genre: prediction.genre || request.genre,
          mood: prediction.mood || request.mood,
          duration: prediction.duration || request.duration || 30,
          tempo: prediction.tempo || request.tempo,
          key: prediction.key || request.key,
          scale: prediction.scale || request.scale,
          instruments: prediction.instruments || request.instruments
        }
      });

      console.log(`✅ Music saved: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
    } else if (prediction.audioUri) {
      // If URL is returned (download required)
      const fileName = this.generateFileName('lyria', 'mp3');
      const filePath = path.join(this.outputDir, fileName);
      
      await this.downloadAudio(prediction.audioUri, filePath);
      
      const fileInfo = await this.getFileInfo(filePath);
      
      musicFiles.push({
        path: filePath,
        url: prediction.audioUri,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          prompt: request.prompt,
          genre: prediction.genre || request.genre,
          mood: prediction.mood || request.mood,
          duration: prediction.duration || request.duration || 30,
          downloadedFrom: prediction.audioUri
        }
      });

      console.log(`✅ Music downloaded: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
    }

    const result: LyriaResponse = {
      success: true,
      music: musicFiles,
      request: request,
      metadata: {
        model: 'lyria-001',
        timestamp: new Date().toISOString(),
        totalMusic: musicFiles.length,
        totalSize: musicFiles.reduce((sum, music) => sum + music.size, 0)
      }
    };

    console.log(`🎉 Successfully generated ${musicFiles.length} music file(s)`);
    console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

    return result;
  }

  /**
   * Download music file
   */
  private async downloadAudio(url: string, filePath: string): Promise<void> {
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
   * Tempo mapping
   */
  private mapTempo(tempo: string): number {
    const tempoMap: Record<string, number> = {
      'slow': 80,
      'medium': 120,
      'fast': 140
    };
    return tempoMap[tempo] || 120;
  }

  /**
   * Style transfer (generate music inspired by reference music)
   */
  async styleInspiredGeneration(
    referenceAudioPath: string,
    prompt: string,
    options?: Partial<LyriaRequest>
  ): Promise<LyriaResponse> {
    try {
      // Load reference music
      const audioBuffer = await fs.readFile(referenceAudioPath);
      const audioBase64 = audioBuffer.toString('base64');

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/lyria-style-001');

      const requestBody = {
        instances: [{
          prompt: prompt,
          referenceAudio: {
            bytesBase64Encoded: audioBase64
          },
          ...options?.genre && { targetGenre: options.genre },
          ...options?.mood && { targetMood: options.mood },
          ...options?.duration && { duration: options.duration }
        }],
        parameters: {
          language: 'en'
        }
      };

      console.log(`🎨 Generating style-inspired music...`);
      console.log(`📝 Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
      console.log(`🎼 Reference: ${path.basename(referenceAudioPath)}`);

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
        return await this.pollMusicGeneration(response.data.name, authToken);
      } else {
        return await this.processMusicResult(response.data.predictions[0], {
          prompt: prompt,
          referenceAudio: referenceAudioPath,
          ...options
        });
      }

    } catch (error) {
      this.handleError(error, 'Lyria style-inspired generation');
    }
  }

  /**
   * Continue music generation (generate continuation from existing music)
   */
  async continueMusic(
    seedAudioPath: string,
    continuationPrompt: string,
    duration: number = 30
  ): Promise<LyriaResponse> {
    try {
      // Load seed music for continuation
      const audioBuffer = await fs.readFile(seedAudioPath);
      const audioBase64 = audioBuffer.toString('base64');

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/lyria-continue-001');

      const requestBody = {
        instances: [{
          prompt: continuationPrompt,
          seedAudio: {
            bytesBase64Encoded: audioBase64
          },
          continuationDuration: duration
        }]
      };

      console.log(`🔄 Continuing music generation...`);
      console.log(`📝 Continuation prompt: "${continuationPrompt.substring(0, 100)}${continuationPrompt.length > 100 ? '...' : ''}"`);
      console.log(`🎼 Seed: ${path.basename(seedAudioPath)}`);
      console.log(`⏱️  Continue for: ${duration} seconds`);

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
        return await this.pollMusicGeneration(response.data.name, authToken);
      } else {
        return await this.processMusicResult(response.data.predictions[0], {
          prompt: continuationPrompt,
          seedAudio: seedAudioPath,
          duration: duration
        });
      }

    } catch (error) {
      this.handleError(error, 'Lyria music continuation');
    }
  }

  /**
   * Generate multi-part music
   */
  async generateMultiPartMusic(
    parts: Array<{
      prompt: string;
      duration: number;
      instruments?: string[];
      mood?: string;
    }>,
    options?: Partial<LyriaRequest>
  ): Promise<LyriaResponse> {
    try {
      console.log(`🎼 Generating multi-part music with ${parts.length} parts...`);
      
      const allMusicFiles = [];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        console.log(`🎵 Generating part ${i + 1}/${parts.length}: "${part.prompt.substring(0, 50)}..."`);
        
        const partRequest: LyriaRequest = {
          prompt: part.prompt,
          duration: part.duration,
          instruments: part.instruments,
          mood: part.mood as any,
          ...options
        };
        
        const partResult = await this.processRequest(partRequest);
        allMusicFiles.push(...partResult.music);
        
        // Wait briefly to avoid API rate limits
        if (i < parts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const result: LyriaResponse = {
        success: true,
        music: allMusicFiles,
        request: {
          prompt: `Multi-part composition with ${parts.length} parts`,
          ...options
        },
        metadata: {
          model: 'lyria-001',
          timestamp: new Date().toISOString(),
          totalMusic: allMusicFiles.length,
          totalSize: allMusicFiles.reduce((sum, music) => sum + music.size, 0),
          parts: parts.length
        }
      };

      console.log(`🎉 Successfully generated ${allMusicFiles.length} music parts`);
      console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Lyria multi-part music generation');
    }
  }
}
