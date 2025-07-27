import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Google AI Creative Tools CLI クライアント
 */
export class GoogleAICreativeCLI {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  constructor() {
    this.client = new Client(
      {
        name: 'google-ai-creative-cli',
        version: '1.0.0',
      },
      {
        capabilities: {}
      }
    );
  }

  /**
   * MCPサーバーに接続
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    const spinner = ora('Connecting to Google AI Creative Tools MCP Server...').start();

    try {
      // MCPサーバーを起動
      const serverProcess = spawn('node', [
        path.join(process.cwd(), 'dist', 'server', 'main.js')
      ], {
        stdio: ['pipe', 'pipe', 'inherit'], // stderr は継承してログを表示
        env: process.env
      });

      this.transport = new StdioClientTransport({
        readable: serverProcess.stdout!,
        writable: serverProcess.stdin!
      } as any);

      await this.client.connect(this.transport);
      this.connected = true;
      spinner.succeed('Connected to MCP Server');

    } catch (error) {
      spinner.fail('Failed to connect to MCP Server');
      throw error;
    }
  }

  /**
   * 接続の切断
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.connected = false;
  }

  /**
   * 結果の表示ヘルパー
   */
  private displayResult(result: any, successMessage: string = 'Operation completed'): void {
    if (result && result.content && result.content[0] && result.content[0].text) {
      console.log('\n' + chalk.green(result.content[0].text));
    } else {
      console.log('\n' + chalk.green(successMessage));
    }
  }

  /**
   * システム情報の結果表示ヘルパー
   */
  private displaySystemInfo(result: any): void {
    if (result && result.content && result.content[0] && result.content[0].text) {
      console.log('\n' + chalk.cyan(result.content[0].text));
    } else {
      console.log('\n' + chalk.cyan('System information retrieved'));
    }
  }

  /**
   * メインメニューの表示
   */
  async showMainMenu(): Promise<void> {
    console.clear();
    console.log(chalk.cyan.bold('🎨 Google AI Creative Tools CLI'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log();

    const choices = [
      { name: '🖼️  Generate Images (Imagen)', value: 'generate_image' },
      { name: '✏️  Edit Images (Imagen)', value: 'edit_image' },
      { name: '📈 Upscale Images (Imagen)', value: 'upscale_image' },
      { name: '🎬 Generate Videos (Veo)', value: 'generate_video' },
      { name: '🎨 Video Style Transfer (Veo)', value: 'style_transfer_video' },
      { name: '🎤 Generate Speech (Chirp 3 HD)', value: 'generate_speech' },
      { name: '📖 Long-form Speech (Chirp 3 HD)', value: 'generate_long_speech' },
      { name: '🎵 Generate Music (Lyria)', value: 'generate_music' },
      { name: '🎼 Style-inspired Music (Lyria)', value: 'style_inspired_music' },
      { name: '🔄 Continue Music (Lyria)', value: 'continue_music' },
      { name: '🎹 Multi-part Music (Lyria)', value: 'generate_multipart_music' },
      { name: '🛠️  Process Media (AVTool)', value: 'process_media' },
      { name: '📦 Batch Process (AVTool)', value: 'batch_process_media' },
      { name: 'ℹ️  System Info', value: 'get_system_info' },
      new inquirer.Separator(),
      { name: '🚪 Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices,
        pageSize: 20
      }
    ]);

    if (action === 'exit') {
      console.log(chalk.yellow('👋 Goodbye!'));
      return;
    }

    await this.handleAction(action);
    
    // アクション完了後、メニューに戻る
    console.log();
    const { continueChoice } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueChoice',
        message: 'Would you like to perform another action?',
        default: true
      }
    ]);

    if (continueChoice) {
      await this.showMainMenu();
    }
  }

  /**
   * アクションの処理
   */
  private async handleAction(action: string): Promise<void> {
    try {
      switch (action) {
        case 'generate_image':
          await this.handleGenerateImage();
          break;
        case 'edit_image':
          await this.handleEditImage();
          break;
        case 'upscale_image':
          await this.handleUpscaleImage();
          break;
        case 'generate_video':
          await this.handleGenerateVideo();
          break;
        case 'style_transfer_video':
          await this.handleStyleTransferVideo();
          break;
        case 'generate_speech':
          await this.handleGenerateSpeech();
          break;
        case 'generate_long_speech':
          await this.handleGenerateLongSpeech();
          break;
        case 'generate_music':
          await this.handleGenerateMusic();
          break;
        case 'style_inspired_music':
          await this.handleStyleInspiredMusic();
          break;
        case 'continue_music':
          await this.handleContinueMusic();
          break;
        case 'generate_multipart_music':
          await this.handleGenerateMultipartMusic();
          break;
        case 'process_media':
          await this.handleProcessMedia();
          break;
        case 'batch_process_media':
          await this.handleBatchProcessMedia();
          break;
        case 'get_system_info':
          await this.handleGetSystemInfo();
          break;
        default:
          console.log(chalk.red('Unknown action'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 画像生成の処理
   */
  private async handleGenerateImage(): Promise<void> {
    console.log(chalk.blue.bold('\n🖼️  Image Generation with Imagen'));
    console.log(chalk.gray('━'.repeat(40)));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'prompt',
        message: 'Enter your image description:',
        validate: (input: string) => input.trim().length > 0 || 'Please enter a description'
      },
      {
        type: 'number',
        name: 'numImages',
        message: 'Number of images to generate (1-8):',
        default: 1,
        validate: (input: number) => input >= 1 && input <= 8 || 'Please enter a number between 1 and 8'
      },
      {
        type: 'list',
        name: 'style',
        message: 'Select image style:',
        choices: [
          { name: 'Photographic', value: 'photographic' },
          { name: 'Artistic', value: 'artistic' },
          { name: 'Anime', value: 'anime' },
          { name: 'Sketch', value: 'sketch' },
          { name: 'Oil Painting', value: 'oil_painting' },
          { name: 'Auto (no specific style)', value: undefined }
        ],
        default: undefined
      },
      {
        type: 'input',
        name: 'negativePrompt',
        message: 'What to avoid in the image (optional):'
      },
      {
        type: 'number',
        name: 'width',
        message: 'Image width (64-2048, optional):',
        validate: (input: number) => !input || (input >= 64 && input <= 2048) || 'Width must be between 64 and 2048'
      },
      {
        type: 'number',
        name: 'height',
        message: 'Image height (64-2048, optional):',
        validate: (input: number) => !input || (input >= 64 && input <= 2048) || 'Height must be between 64 and 2048'
      }
    ]);

    // 空の値を除去
    const args = Object.fromEntries(
      Object.entries(answers).filter(([_, value]) => value !== '' && value !== undefined)
    );

    const spinner = ora('Generating images...').start();

    try {
      const result = await this.client.callTool({
        name: 'generate_image',
        arguments: args
      });

      spinner.succeed('Images generated successfully!');
      this.displayResult(result, 'Images generated successfully!');

    } catch (error) {
      spinner.fail('Failed to generate images');
      throw error;
    }
  }

  /**
   * 画像編集の処理
   */
  private async handleEditImage(): Promise<void> {
    console.log(chalk.blue.bold('\n✏️  Image Editing with Imagen'));
    console.log(chalk.gray('━'.repeat(40)));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'imagePath',
        message: 'Path to input image:',
        validate: async (input: string) => {
          try {
            await fs.access(input);
            return true;
          } catch {
            return 'File not found';
          }
        }
      },
      {
        type: 'input',
        name: 'prompt',
        message: 'Enter edit instruction:',
        validate: (input: string) => input.trim().length > 0 || 'Please enter an instruction'
      },
      {
        type: 'input',
        name: 'maskPath',
        message: 'Path to mask image (optional):'
      }
    ]);

    const args = Object.fromEntries(
      Object.entries(answers).filter(([_, value]) => value !== '')
    );

    const spinner = ora('Editing image...').start();

    try {
      const result = await this.client.callTool({
        name: 'edit_image',
        arguments: args
      });

      spinner.succeed('Image edited successfully!');
      this.displayResult(result, 'Image edited successfully!');

    } catch (error) {
      spinner.fail('Failed to edit image');
      throw error;
    }
  }

  /**
   * 画像アップスケールの処理
   */
  private async handleUpscaleImage(): Promise<void> {
    console.log(chalk.blue.bold('\n📈 Image Upscaling with Imagen'));
    console.log(chalk.gray('━'.repeat(40)));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'imagePath',
        message: 'Path to input image:',
        validate: async (input: string) => {
          try {
            await fs.access(input);
            return true;
          } catch {
            return 'File not found';
          }
        }
      },
      {
        type: 'list',
        name: 'scaleFactor',
        message: 'Scale factor:',
        choices: [
          { name: '2x', value: 2 },
          { name: '4x', value: 4 },
          { name: '8x', value: 8 }
        ],
        default: 2
      }
    ]);

    const spinner = ora('Upscaling image...').start();

    try {
      const result = await this.client.callTool({
        name: 'upscale_image',
        arguments: answers
      });

      spinner.succeed('Image upscaled successfully!');
      this.displayResult(result, 'Image upscaled successfully!');

    } catch (error) {
      spinner.fail('Failed to upscale image');
      throw error;
    }
  }

  /**
   * 動画生成の処理
   */
  private async handleGenerateVideo(): Promise<void> {
    console.log(chalk.blue.bold('\n🎬 Video Generation with Veo'));
    console.log(chalk.gray('━'.repeat(40)));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'prompt',
        message: 'Enter your video description:',
        validate: (input: string) => input.trim().length > 0 || 'Please enter a description'
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Video duration in seconds (2-120):',
        default: 5,
        validate: (input: number) => input >= 2 && input <= 120 || 'Duration must be between 2 and 120 seconds'
      },
      {
        type: 'list',
        name: 'resolution',
        message: 'Video resolution:',
        choices: [
          { name: '720p', value: '720p' },
          { name: '1080p', value: '1080p' },
          { name: '4K', value: '4K' }
        ],
        default: '1080p'
      },
      {
        type: 'list',
        name: 'style',
        message: 'Video style:',
        choices: [
          { name: 'Cinematic', value: 'cinematic' },
          { name: 'Documentary', value: 'documentary' },
          { name: 'Animation', value: 'animation' },
          { name: 'Realistic', value: 'realistic' },
          { name: 'Auto', value: undefined }
        ],
        default: undefined
      },
      {
        type: 'list',
        name: 'cameraMovement',
        message: 'Camera movement:',
        choices: [
          { name: 'Static', value: 'static' },
          { name: 'Pan', value: 'pan' },
          { name: 'Zoom', value: 'zoom' },
          { name: 'Dolly', value: 'dolly' },
          { name: 'Orbit', value: 'orbit' },
          { name: 'Auto', value: undefined }
        ],
        default: undefined
      }
    ]);

    const args = Object.fromEntries(
      Object.entries(answers).filter(([_, value]) => value !== undefined)
    );

    const spinner = ora('Generating video (this may take several minutes)...').start();

    try {
      const result = await this.client.callTool({
        name: 'generate_video',
        arguments: args
      });

      spinner.succeed('Video generated successfully!');
      this.displayResult(result, 'Video generated successfully!');

    } catch (error) {
      spinner.fail('Failed to generate video');
      throw error;
    }
  }

  /**
   * 音声生成の処理
   */
  private async handleGenerateSpeech(): Promise<void> {
    console.log(chalk.blue.bold('\n🎤 Speech Generation with Chirp 3 HD'));
    console.log(chalk.gray('━'.repeat(40)));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'prompt',
        message: 'Enter text to convert to speech:',
        validate: (input: string) => input.trim().length > 0 || 'Please enter some text'
      },
      {
        type: 'list',
        name: 'voice',
        message: 'Voice type:',
        choices: [
          { name: 'Female', value: 'female' },
          { name: 'Male', value: 'male' },
          { name: 'Child', value: 'child' },
          { name: 'Elderly', value: 'elderly' }
        ],
        default: 'female'
      },
      {
        type: 'list',
        name: 'language',
        message: 'Language:',
        choices: [
          { name: 'English', value: 'en' },
          { name: 'Japanese', value: 'ja' },
          { name: 'Spanish', value: 'es' },
          { name: 'French', value: 'fr' },
          { name: 'German', value: 'de' },
          { name: 'Italian', value: 'it' },
          { name: 'Portuguese', value: 'pt' },
          { name: 'Russian', value: 'ru' },
          { name: 'Korean', value: 'ko' },
          { name: 'Chinese', value: 'zh' }
        ],
        default: 'en'
      },
      {
        type: 'list',
        name: 'emotion',
        message: 'Emotional tone:',
        choices: [
          { name: 'Neutral', value: 'neutral' },
          { name: 'Happy', value: 'happy' },
          { name: 'Sad', value: 'sad' },
          { name: 'Excited', value: 'excited' },
          { name: 'Calm', value: 'calm' },
          { name: 'Angry', value: 'angry' }
        ],
        default: 'neutral'
      }
    ]);

    const spinner = ora('Generating speech...').start();

    try {
      const result = await this.client.callTool({
        name: 'generate_speech',
        arguments: answers
      });

      spinner.succeed('Speech generated successfully!');
      this.displayResult(result, 'Speech generated successfully!');

    } catch (error) {
      spinner.fail('Failed to generate speech');
      throw error;
    }
  }

  /**
   * 音楽生成の処理
   */
  private async handleGenerateMusic(): Promise<void> {
    console.log(chalk.blue.bold('\n🎵 Music Generation with Lyria'));
    console.log(chalk.gray('━'.repeat(40)));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'prompt',
        message: 'Describe the music you want to generate:',
        validate: (input: string) => input.trim().length > 0 || 'Please enter a description'
      },
      {
        type: 'list',
        name: 'genre',
        message: 'Music genre:',
        choices: [
          { name: 'Pop', value: 'pop' },
          { name: 'Rock', value: 'rock' },
          { name: 'Classical', value: 'classical' },
          { name: 'Jazz', value: 'jazz' },
          { name: 'Electronic', value: 'electronic' },
          { name: 'Ambient', value: 'ambient' },
          { name: 'Hip-hop', value: 'hip-hop' },
          { name: 'Country', value: 'country' },
          { name: 'Auto', value: undefined }
        ],
        default: undefined
      },
      {
        type: 'list',
        name: 'mood',
        message: 'Music mood:',
        choices: [
          { name: 'Happy', value: 'happy' },
          { name: 'Sad', value: 'sad' },
          { name: 'Energetic', value: 'energetic' },
          { name: 'Calm', value: 'calm' },
          { name: 'Mysterious', value: 'mysterious' },
          { name: 'Dramatic', value: 'dramatic' },
          { name: 'Romantic', value: 'romantic' },
          { name: 'Auto', value: undefined }
        ],
        default: undefined
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Duration in seconds (10-300):',
        default: 30,
        validate: (input: number) => input >= 10 && input <= 300 || 'Duration must be between 10 and 300 seconds'
      }
    ]);

    const args = Object.fromEntries(
      Object.entries(answers).filter(([_, value]) => value !== undefined)
    );

    const spinner = ora('Generating music (this may take several minutes)...').start();

    try {
      const result = await this.client.callTool({
        name: 'generate_music',
        arguments: args
      });

      spinner.succeed('Music generated successfully!');
      this.displayResult(result, 'Music generated successfully!');

    } catch (error) {
      spinner.fail('Failed to generate music');
      throw error;
    }
  }

  /**
   * システム情報の取得
   */
  private async handleGetSystemInfo(): Promise<void> {
    console.log(chalk.blue.bold('\nℹ️  System Information'));
    console.log(chalk.gray('━'.repeat(40)));

    const spinner = ora('Getting system information...').start();

    try {
      const result = await this.client.callTool({
        name: 'get_system_info',
        arguments: {}
      });

      spinner.succeed('System information retrieved');
      this.displaySystemInfo(result);

    } catch (error) {
      spinner.fail('Failed to get system information');
      throw error;
    }
  }

  // その他のハンドラーメソッドは簡略化（同様のパターン）
  private async handleStyleTransferVideo(): Promise<void> {
    console.log(chalk.blue.bold('\n🎨 Video Style Transfer'));
    console.log(chalk.yellow('This feature requires implementation...'));
  }

  private async handleGenerateLongSpeech(): Promise<void> {
    console.log(chalk.blue.bold('\n📖 Long-form Speech Generation'));
    console.log(chalk.yellow('This feature requires implementation...'));
  }

  private async handleStyleInspiredMusic(): Promise<void> {
    console.log(chalk.blue.bold('\n🎼 Style-inspired Music Generation'));
    console.log(chalk.yellow('This feature requires implementation...'));
  }

  private async handleContinueMusic(): Promise<void> {
    console.log(chalk.blue.bold('\n🔄 Music Continuation'));
    console.log(chalk.yellow('This feature requires implementation...'));
  }

  private async handleGenerateMultipartMusic(): Promise<void> {
    console.log(chalk.blue.bold('\n🎹 Multi-part Music Generation'));
    console.log(chalk.yellow('This feature requires implementation...'));
  }

  private async handleProcessMedia(): Promise<void> {
    console.log(chalk.blue.bold('\n🛠️  Media Processing'));
    console.log(chalk.yellow('This feature requires implementation...'));
  }

  private async handleBatchProcessMedia(): Promise<void> {
    console.log(chalk.blue.bold('\n📦 Batch Media Processing'));
    console.log(chalk.yellow('This feature requires implementation...'));
  }

  /**
   * CLIアプリケーションの開始
   */
  async start(): Promise<void> {
    try {
      console.log(chalk.cyan.bold('🚀 Starting Google AI Creative Tools CLI...'));
      await this.connect();
      await this.showMainMenu();
    } catch (error) {
      console.error(chalk.red('Failed to start CLI:'), error);
    } finally {
      await this.disconnect();
    }
  }
}
