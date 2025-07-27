import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { ImagenService } from '../services/imagen.js';
import { VeoService } from '../services/veo.js';
import { ChirpService } from '../services/chirp.js';
import { LyriaService } from '../services/lyria.js';
import { AVToolService } from '../services/avtool.js';
import { GoogleAIConfig } from '../types/index.js';

/**
 * Google AI Creative Tools MCP サーバー
 */
export class GoogleAICreativeServer {
  private server: Server;
  private imagenService: ImagenService;
  private veoService: VeoService;
  private chirpService: ChirpService;
  private lyriaService: LyriaService;
  private avtoolService: AVToolService;

  constructor(config: GoogleAIConfig) {
    this.server = new Server(
      {
        name: 'google-ai-creative-tools',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // サービスの初期化
    this.imagenService = new ImagenService(config);
    this.veoService = new VeoService(config);
    this.chirpService = new ChirpService(config);
    this.lyriaService = new LyriaService(config);
    this.avtoolService = new AVToolService(config);

    this.setupHandlers();
  }

  /**
   * ハンドラーの設定
   */
  private setupHandlers(): void {
    // ツール一覧の取得
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_image',
            description: 'Generate images using Google Imagen',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text prompt for image generation',
                },
                width: {
                  type: 'number',
                  description: 'Image width (64-2048)',
                  minimum: 64,
                  maximum: 2048,
                },
                height: {
                  type: 'number',
                  description: 'Image height (64-2048)',
                  minimum: 64,
                  maximum: 2048,
                },
                numImages: {
                  type: 'number',
                  description: 'Number of images to generate (1-8)',
                  minimum: 1,
                  maximum: 8,
                },
                style: {
                  type: 'string',
                  enum: ['photographic', 'artistic', 'anime', 'sketch', 'oil_painting'],
                  description: 'Image style',
                },
                negativePrompt: {
                  type: 'string',
                  description: 'What to avoid in the image',
                },
                guidanceScale: {
                  type: 'number',
                  description: 'How closely to follow the prompt (1-20)',
                  minimum: 1,
                  maximum: 20,
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'edit_image',
            description: 'Edit images using Google Imagen',
            inputSchema: {
              type: 'object',
              properties: {
                imagePath: {
                  type: 'string',
                  description: 'Path to the input image',
                },
                prompt: {
                  type: 'string',
                  description: 'Edit instruction prompt',
                },
                maskPath: {
                  type: 'string',
                  description: 'Path to mask image (optional)',
                },
                guidanceScale: {
                  type: 'number',
                  description: 'How closely to follow the prompt (1-20)',
                  minimum: 1,
                  maximum: 20,
                },
              },
              required: ['imagePath', 'prompt'],
            },
          },
          {
            name: 'upscale_image',
            description: 'Upscale images using Google Imagen',
            inputSchema: {
              type: 'object',
              properties: {
                imagePath: {
                  type: 'string',
                  description: 'Path to the input image',
                },
                scaleFactor: {
                  type: 'number',
                  description: 'Scale factor (2, 4, or 8)',
                  enum: [2, 4, 8],
                },
              },
              required: ['imagePath'],
            },
          },
          {
            name: 'generate_video',
            description: 'Generate videos using Google Veo',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text prompt for video generation',
                },
                duration: {
                  type: 'number',
                  description: 'Video duration in seconds (2-120)',
                  minimum: 2,
                  maximum: 120,
                },
                resolution: {
                  type: 'string',
                  enum: ['720p', '1080p', '4K'],
                  description: 'Video resolution',
                },
                fps: {
                  type: 'number',
                  enum: [24, 30, 60],
                  description: 'Frames per second',
                },
                style: {
                  type: 'string',
                  enum: ['cinematic', 'documentary', 'animation', 'realistic'],
                  description: 'Video style',
                },
                cameraMovement: {
                  type: 'string',
                  enum: ['static', 'pan', 'zoom', 'dolly', 'orbit'],
                  description: 'Camera movement type',
                },
                aspectRatio: {
                  type: 'string',
                  enum: ['16:9', '9:16', '1:1', '4:3'],
                  description: 'Video aspect ratio',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'style_transfer_video',
            description: 'Apply style transfer to videos using Google Veo',
            inputSchema: {
              type: 'object',
              properties: {
                videoPath: {
                  type: 'string',
                  description: 'Path to the input video',
                },
                stylePrompt: {
                  type: 'string',
                  description: 'Style transfer prompt',
                },
                style: {
                  type: 'string',
                  enum: ['cinematic', 'documentary', 'animation', 'realistic'],
                  description: 'Target style',
                },
              },
              required: ['videoPath', 'stylePrompt'],
            },
          },
          {
            name: 'generate_speech',
            description: 'Generate speech using Google Chirp 3 HD',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text to convert to speech',
                },
                voice: {
                  type: 'string',
                  enum: ['male', 'female', 'child', 'elderly'],
                  description: 'Voice type',
                },
                language: {
                  type: 'string',
                  enum: ['en', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ko', 'zh'],
                  description: 'Language code',
                },
                emotion: {
                  type: 'string',
                  enum: ['neutral', 'happy', 'sad', 'excited', 'calm', 'angry'],
                  description: 'Emotional tone',
                },
                speed: {
                  type: 'string',
                  enum: ['slow', 'normal', 'fast'],
                  description: 'Speech speed',
                },
                pitch: {
                  type: 'string',
                  enum: ['low', 'normal', 'high'],
                  description: 'Speech pitch',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'generate_long_speech',
            description: 'Generate long-form speech with automatic chunking',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'Long text to convert to speech',
                },
                voice: {
                  type: 'string',
                  enum: ['male', 'female', 'child', 'elderly'],
                  description: 'Voice type',
                },
                language: {
                  type: 'string',
                  enum: ['en', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ko', 'zh'],
                  description: 'Language code',
                },
                emotion: {
                  type: 'string',
                  enum: ['neutral', 'happy', 'sad', 'excited', 'calm', 'angry'],
                  description: 'Emotional tone',
                },
              },
              required: ['text'],
            },
          },
          {
            name: 'generate_music',
            description: 'Generate music using Google Lyria',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text prompt for music generation',
                },
                genre: {
                  type: 'string',
                  enum: ['pop', 'rock', 'classical', 'jazz', 'electronic', 'ambient', 'hip-hop', 'country'],
                  description: 'Music genre',
                },
                mood: {
                  type: 'string',
                  enum: ['happy', 'sad', 'energetic', 'calm', 'mysterious', 'dramatic', 'romantic'],
                  description: 'Music mood',
                },
                tempo: {
                  type: ['string', 'number'],
                  description: 'Tempo (slow/medium/fast or BPM 60-200)',
                },
                duration: {
                  type: 'number',
                  description: 'Music duration in seconds (10-300)',
                  minimum: 10,
                  maximum: 300,
                },
                instruments: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of instruments',
                },
                key: {
                  type: 'string',
                  enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
                  description: 'Musical key',
                },
                scale: {
                  type: 'string',
                  enum: ['major', 'minor', 'pentatonic', 'blues'],
                  description: 'Musical scale',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'style_inspired_music',
            description: 'Generate music inspired by a reference track',
            inputSchema: {
              type: 'object',
              properties: {
                referenceAudioPath: {
                  type: 'string',
                  description: 'Path to reference audio file',
                },
                prompt: {
                  type: 'string',
                  description: 'Generation prompt',
                },
                genre: {
                  type: 'string',
                  enum: ['pop', 'rock', 'classical', 'jazz', 'electronic', 'ambient', 'hip-hop', 'country'],
                  description: 'Target genre',
                },
                mood: {
                  type: 'string',
                  enum: ['happy', 'sad', 'energetic', 'calm', 'mysterious', 'dramatic', 'romantic'],
                  description: 'Target mood',
                },
              },
              required: ['referenceAudioPath', 'prompt'],
            },
          },
          {
            name: 'continue_music',
            description: 'Continue music generation from a seed track',
            inputSchema: {
              type: 'object',
              properties: {
                seedAudioPath: {
                  type: 'string',
                  description: 'Path to seed audio file',
                },
                continuationPrompt: {
                  type: 'string',
                  description: 'Prompt for continuation',
                },
                duration: {
                  type: 'number',
                  description: 'Continuation duration in seconds',
                  default: 30,
                },
              },
              required: ['seedAudioPath', 'continuationPrompt'],
            },
          },
          {
            name: 'generate_multipart_music',
            description: 'Generate multi-part music composition',
            inputSchema: {
              type: 'object',
              properties: {
                parts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      prompt: { type: 'string' },
                      duration: { type: 'number' },
                      instruments: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      mood: { type: 'string' }
                    },
                    required: ['prompt', 'duration']
                  },
                  description: 'Array of music parts to generate',
                },
                genre: {
                  type: 'string',
                  enum: ['pop', 'rock', 'classical', 'jazz', 'electronic', 'ambient', 'hip-hop', 'country'],
                  description: 'Overall genre',
                },
                key: {
                  type: 'string',
                  enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
                  description: 'Musical key',
                },
              },
              required: ['parts'],
            },
          },
          {
            name: 'process_media',
            description: 'Process audio/video files with AVTool',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['merge', 'extract_audio', 'add_subtitles', 'trim', 'resize', 'convert'],
                  description: 'Processing operation',
                },
                inputFiles: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of input file paths',
                },
                outputPath: {
                  type: 'string',
                  description: 'Output file path (optional)',
                },
                options: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string', description: 'Start time (HH:MM:SS)' },
                    duration: { type: 'string', description: 'Duration (HH:MM:SS)' },
                    width: { type: 'number', description: 'Target width' },
                    height: { type: 'number', description: 'Target height' },
                    format: {
                      type: 'string',
                      enum: ['mp4', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac'],
                      description: 'Target format'
                    },
                  },
                  description: 'Operation-specific options',
                },
              },
              required: ['operation', 'inputFiles'],
            },
          },
          {
            name: 'batch_process_media',
            description: 'Process multiple media operations in batch',
            inputSchema: {
              type: 'object',
              properties: {
                operations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      operation: {
                        type: 'string',
                        enum: ['merge', 'extract_audio', 'add_subtitles', 'trim', 'resize', 'convert'],
                      },
                      inputFiles: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      outputPath: { type: 'string' },
                      options: { type: 'object' }
                    },
                    required: ['operation', 'inputFiles']
                  },
                  description: 'Array of media processing operations',
                },
              },
              required: ['operations'],
            },
          },
          {
            name: 'get_system_info',
            description: 'Get system information for media processing',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_image':
            return await this.handleGenerateImage(args);
          case 'edit_image':
            return await this.handleEditImage(args);
          case 'upscale_image':
            return await this.handleUpscaleImage(args);
          case 'generate_video':
            return await this.handleGenerateVideo(args);
          case 'style_transfer_video':
            return await this.handleStyleTransferVideo(args);
          case 'generate_speech':
            return await this.handleGenerateSpeech(args);
          case 'generate_long_speech':
            return await this.handleGenerateLongSpeech(args);
          case 'generate_music':
            return await this.handleGenerateMusic(args);
          case 'style_inspired_music':
            return await this.handleStyleInspiredMusic(args);
          case 'continue_music':
            return await this.handleContinueMusic(args);
          case 'generate_multipart_music':
            return await this.handleGenerateMultipartMusic(args);
          case 'process_media':
            return await this.handleProcessMedia(args);
          case 'batch_process_media':
            return await this.handleBatchProcessMedia(args);
          case 'get_system_info':
            return await this.handleGetSystemInfo(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  // ツールハンドラーメソッド
  private async handleGenerateImage(args: any) {
    const result = await this.imagenService.processRequest(args);
    return {
      content: [
        {
          type: 'text',
          text: `Generated ${result.images.length} image(s):\n${result.images.map(img => `- ${img.path} (${img.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleEditImage(args: any) {
    const { imagePath, prompt, maskPath, ...options } = args;
    const result = await this.imagenService.editImage(imagePath, prompt, maskPath, options);
    return {
      content: [
        {
          type: 'text',
          text: `Edited ${result.images.length} image(s):\n${result.images.map(img => `- ${img.path} (${img.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleUpscaleImage(args: any) {
    const { imagePath, scaleFactor = 2 } = args;
    const result = await this.imagenService.upscaleImage(imagePath, scaleFactor);
    return {
      content: [
        {
          type: 'text',
          text: `Upscaled ${result.images.length} image(s):\n${result.images.map(img => `- ${img.path} (${img.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleGenerateVideo(args: any) {
    const result = await this.veoService.processRequest(args);
    return {
      content: [
        {
          type: 'text',
          text: `Generated ${result.videos.length} video(s):\n${result.videos.map(video => `- ${video.path} (${video.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleStyleTransferVideo(args: any) {
    const { videoPath, stylePrompt, ...options } = args;
    const result = await this.veoService.styleTransfer(videoPath, stylePrompt, options);
    return {
      content: [
        {
          type: 'text',
          text: `Style transferred ${result.videos.length} video(s):\n${result.videos.map(video => `- ${video.path} (${video.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleGenerateSpeech(args: any) {
    const result = await this.chirpService.processRequest(args);
    return {
      content: [
        {
          type: 'text',
          text: `Generated ${result.audio.length} audio file(s):\n${result.audio.map(audio => `- ${audio.path} (${audio.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleGenerateLongSpeech(args: any) {
    const { text, ...options } = args;
    const result = await this.chirpService.generateLongFormSpeech(text, options);
    return {
      content: [
        {
          type: 'text',
          text: `Generated ${result.audio.length} audio chunk(s):\n${result.audio.map(audio => `- ${audio.path} (${audio.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleGenerateMusic(args: any) {
    const result = await this.lyriaService.processRequest(args);
    return {
      content: [
        {
          type: 'text',
          text: `Generated ${result.music.length} music file(s):\n${result.music.map(music => `- ${music.path} (${music.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleStyleInspiredMusic(args: any) {
    const { referenceAudioPath, prompt, ...options } = args;
    const result = await this.lyriaService.styleInspiredGeneration(referenceAudioPath, prompt, options);
    return {
      content: [
        {
          type: 'text',
          text: `Generated style-inspired music:\n${result.music.map(music => `- ${music.path} (${music.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleContinueMusic(args: any) {
    const { seedAudioPath, continuationPrompt, duration } = args;
    const result = await this.lyriaService.continueMusic(seedAudioPath, continuationPrompt, duration);
    return {
      content: [
        {
          type: 'text',
          text: `Generated music continuation:\n${result.music.map(music => `- ${music.path} (${music.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleGenerateMultipartMusic(args: any) {
    const { parts, ...options } = args;
    const result = await this.lyriaService.generateMultiPartMusic(parts, options);
    return {
      content: [
        {
          type: 'text',
          text: `Generated ${parts.length}-part music composition:\n${result.music.map(music => `- ${music.path} (${music.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleProcessMedia(args: any) {
    const result = await this.avtoolService.processRequest(args);
    return {
      content: [
        {
          type: 'text',
          text: `Processed media (${args.operation}):\n${result.outputFiles.map(file => `- ${file.path} (${file.size} bytes)`).join('\n')}`,
        },
      ],
    };
  }

  private async handleBatchProcessMedia(args: any) {
    const { operations } = args;
    const results = await this.avtoolService.batchProcess(operations);
    const successCount = results.filter(r => r.success).length;
    return {
      content: [
        {
          type: 'text',
          text: `Batch processing completed: ${successCount}/${results.length} operations successful`,
        },
      ],
    };
  }

  private async handleGetSystemInfo(args: any) {
    const info = await this.avtoolService.getSystemInfo();
    return {
      content: [
        {
          type: 'text',
          text: `System Information:\n- FFmpeg: ${info.ffmpegVersion}\n- Supported formats: ${info.supportedFormats.length}\n- Available codecs: ${info.availableCodecs.length}`,
        },
      ],
    };
  }

  /**
   * サーバーの開始
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google AI Creative Tools MCP Server started');
  }
}
