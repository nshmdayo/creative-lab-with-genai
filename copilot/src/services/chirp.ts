import { BaseGoogleAIService } from './base.js';
import { ChirpRequest, ChirpResponse, GoogleAIConfig } from '../types/index.js';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Google Chirp 3 HD サービス（音声生成）
 */
export class ChirpService extends BaseGoogleAIService {
  private readonly apiEndpoint = 'https://texttospeech.googleapis.com/v1';

  constructor(config: GoogleAIConfig) {
    super(config);
  }

  /**
   * リクエストの検証
   */
  async validateRequest(request: ChirpRequest): Promise<boolean> {
    if (!request.prompt) {
      throw new Error('Text prompt is required for speech generation');
    }

    if (request.prompt.length > 5000) {
      throw new Error('Text must be 5000 characters or less');
    }

    const validVoices = ['male', 'female', 'child', 'elderly'];
    if (request.voice && !validVoices.includes(request.voice)) {
      throw new Error(`Voice must be one of: ${validVoices.join(', ')}`);
    }

    const validLanguages = ['en', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ko', 'zh'];
    if (request.language && !validLanguages.includes(request.language)) {
      throw new Error(`Language must be one of: ${validLanguages.join(', ')}`);
    }

    const validEmotions = ['neutral', 'happy', 'sad', 'excited', 'calm', 'angry'];
    if (request.emotion && !validEmotions.includes(request.emotion)) {
      throw new Error(`Emotion must be one of: ${validEmotions.join(', ')}`);
    }

    return true;
  }

  /**
   * 音声生成リクエストの処理
   */
  async processRequest(request: ChirpRequest): Promise<ChirpResponse> {
    try {
      await this.validateRequest(request);

      const authToken = await this.getAuthToken();
      
      // 言語と声を選択
      const voiceName = this.selectVoice(request.language || 'en', request.voice || 'female');
      const speakingRate = this.mapSpeed(request.speed || 'normal');
      const pitch = this.mapPitch(request.pitch || 'normal');

      const requestBody = {
        input: {
          text: request.prompt
        },
        voice: {
          languageCode: this.mapLanguageCode(request.language || 'en'),
          name: voiceName,
          ssmlGender: this.mapGender(request.voice || 'female')
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speakingRate,
          pitch: pitch,
          effectsProfileId: ['headphone-class-device'],
          sampleRateHertz: 24000
        }
      };

      // 感情表現のSSMLタグを追加
      if (request.emotion && request.emotion !== 'neutral') {
        requestBody.input = {
          ssml: this.addEmotionToSSML(request.prompt, request.emotion)
        } as any;
        delete (requestBody.input as any).text;
      }

      console.log(`🎤 Generating speech with Chirp 3 HD...`);
      console.log(`📝 Text: "${request.prompt.substring(0, 100)}${request.prompt.length > 100 ? '...' : ''}"`);
      console.log(`🗣️  Voice: ${request.voice || 'female'} (${request.language || 'en'})`);
      console.log(`😊 Emotion: ${request.emotion || 'neutral'}`);

      const response = await axios.post(
        `${this.apiEndpoint}/text:synthesize`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const audioGenerations = [];

      if (response.data.audioContent) {
        // Base64エンコードされた音声データを保存
        const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
        const fileName = this.generateFileName('chirp', 'mp3');
        const filePath = path.join(this.outputDir, fileName);
        
        await fs.writeFile(filePath, audioBuffer);
        
        const fileInfo = await this.getFileInfo(filePath);
        
        audioGenerations.push({
          path: filePath,
          url: `file://${filePath}`,
          size: fileInfo.size,
          mimeType: fileInfo.mimeType,
          metadata: {
            text: request.prompt,
            voice: request.voice || 'female',
            language: request.language || 'en',
            emotion: request.emotion || 'neutral',
            speed: request.speed || 'normal',
            pitch: request.pitch || 'normal',
            sampleRate: 24000,
            audioEncoding: 'MP3'
          }
        });

        console.log(`✅ Audio saved: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
      }

      const result: ChirpResponse = {
        success: true,
        audio: audioGenerations,
        request: request,
        metadata: {
          model: 'chirp-3-hd',
          timestamp: new Date().toISOString(),
          totalAudio: audioGenerations.length,
          totalSize: audioGenerations.reduce((sum, audio) => sum + audio.size, 0)
        }
      };

      console.log(`🎉 Successfully generated ${audioGenerations.length} audio file(s)`);
      console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Chirp speech generation');
    }
  }

  /**
   * 言語コードのマッピング
   */
  private mapLanguageCode(language: string): string {
    const languageMap: Record<string, string> = {
      'en': 'en-US',
      'ja': 'ja-JP',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'ko': 'ko-KR',
      'zh': 'zh-CN'
    };
    return languageMap[language] || 'en-US';
  }

  /**
   * 声の選択
   */
  private selectVoice(language: string, voice: string): string {
    const voiceMap: Record<string, Record<string, string[]>> = {
      'en': {
        'male': ['en-US-Journey-D', 'en-US-Studio-M'],
        'female': ['en-US-Journey-F', 'en-US-Studio-O'],
        'child': ['en-US-Wavenet-A'],
        'elderly': ['en-US-News-N']
      },
      'ja': {
        'male': ['ja-JP-Neural2-C', 'ja-JP-Wavenet-C'],
        'female': ['ja-JP-Neural2-B', 'ja-JP-Wavenet-B'],
        'child': ['ja-JP-Wavenet-A'],
        'elderly': ['ja-JP-Wavenet-D']
      }
    };

    const languageVoices = voiceMap[language] || voiceMap['en'];
    const voices = languageVoices[voice] || languageVoices['female'];
    return voices[0] || 'en-US-Studio-O';
  }

  /**
   * 性別のマッピング
   */
  private mapGender(voice: string): string {
    const genderMap: Record<string, string> = {
      'male': 'MALE',
      'female': 'FEMALE',
      'child': 'FEMALE',
      'elderly': 'MALE'
    };
    return genderMap[voice] || 'FEMALE';
  }

  /**
   * 速度のマッピング
   */
  private mapSpeed(speed: string): number {
    const speedMap: Record<string, number> = {
      'slow': 0.75,
      'normal': 1.0,
      'fast': 1.25
    };
    return speedMap[speed] || 1.0;
  }

  /**
   * ピッチのマッピング
   */
  private mapPitch(pitch: string): number {
    const pitchMap: Record<string, number> = {
      'low': -2.0,
      'normal': 0.0,
      'high': 2.0
    };
    return pitchMap[pitch] || 0.0;
  }

  /**
   * 感情をSSMLに追加
   */
  private addEmotionToSSML(text: string, emotion: string): string {
    const emotionMap: Record<string, string> = {
      'happy': 'excited',
      'sad': 'disappointed',
      'excited': 'excited',
      'calm': 'calm',
      'angry': 'angry'
    };

    const ssmlEmotion = emotionMap[emotion] || 'neutral';
    
    return `<speak>
      <prosody volume="medium" rate="medium">
        <emphasis level="moderate">
          ${text}
        </emphasis>
      </prosody>
    </speak>`;
  }

  /**
   * 長いテキストの分割音声生成
   */
  async generateLongFormSpeech(
    text: string, 
    options?: Partial<ChirpRequest>
  ): Promise<ChirpResponse> {
    try {
      const maxChunkSize = 4000; // 安全なチャンクサイズ
      const chunks = this.splitTextIntoChunks(text, maxChunkSize);
      
      console.log(`📄 Splitting long text into ${chunks.length} chunks...`);
      
      const allAudio = [];
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`🎤 Processing chunk ${i + 1}/${chunks.length}...`);
        
        const chunkRequest: ChirpRequest = {
          prompt: chunks[i],
          ...options
        };
        
        const chunkResult = await this.processRequest(chunkRequest);
        allAudio.push(...chunkResult.audio);
        
        // API制限を避けるため少し待機
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const result: ChirpResponse = {
        success: true,
        audio: allAudio,
        request: {
          prompt: text,
          ...options
        },
        metadata: {
          model: 'chirp-3-hd',
          timestamp: new Date().toISOString(),
          totalAudio: allAudio.length,
          totalSize: allAudio.reduce((sum, audio) => sum + audio.size, 0),
          chunks: chunks.length
        }
      };

      console.log(`🎉 Successfully generated ${allAudio.length} audio chunks`);
      console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Chirp long-form speech generation');
    }
  }

  /**
   * テキストをチャンクに分割
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const sentences = text.split(/[.!?。！？]/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const sentenceWithPunctuation = trimmedSentence + (sentence.match(/[.!?。！？]/) ? '' : '.');
      
      if (currentChunk.length + sentenceWithPunctuation.length <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentenceWithPunctuation;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}
