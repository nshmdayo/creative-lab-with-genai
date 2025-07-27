import { BaseGoogleAIService } from './base.js';
import { AVToolRequest, AVToolResponse, GoogleAIConfig } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Google AVTool Service (Audio/Video Processing)
 */
export class AVToolService extends BaseGoogleAIService {

  constructor(config: GoogleAIConfig) {
    super(config);
  }

  /**
   * Request validation
   */
  async validateRequest(request: AVToolRequest): Promise<boolean> {
    if (!request.operation) {
      throw new Error('Operation is required');
    }

    if (!request.inputFiles || request.inputFiles.length === 0) {
      throw new Error('At least one input file is required');
    }

    const validOperations = ['merge', 'extract_audio', 'add_subtitles', 'trim', 'resize', 'convert'];
    if (!validOperations.includes(request.operation)) {
      throw new Error(`Operation must be one of: ${validOperations.join(', ')}`);
    }

    // Check if input file exists
    for (const filePath of request.inputFiles) {
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Input file not found: ${filePath}`);
      }
    }

    return true;
  }

  /**
   * Process AVTool request
   */
  async processRequest(request: AVToolRequest): Promise<AVToolResponse> {
    try {
      await this.validateRequest(request);

      console.log(`🛠️  Processing ${request.operation} operation...`);
      console.log(`📁 Input files: ${request.inputFiles.length} file(s)`);

      let result: AVToolResponse;

      switch (request.operation) {
        case 'merge':
          result = await this.mergeFiles(request);
          break;
        case 'extract_audio':
          result = await this.extractAudio(request);
          break;
        case 'add_subtitles':
          result = await this.addSubtitles(request);
          break;
        case 'trim':
          result = await this.trimMedia(request);
          break;
        case 'resize':
          result = await this.resizeVideo(request);
          break;
        case 'convert':
          result = await this.convertFormat(request);
          break;
        default:
          throw new Error(`Unsupported operation: ${request.operation}`);
      }

      return result;

    } catch (error) {
      this.handleError(error, 'AVTool processing');
    }
  }

  /**
   * File merging
   */
  private async mergeFiles(request: AVToolRequest): Promise<AVToolResponse> {
    const outputFileName = this.generateFileName('merged', 'mp4');
    const outputPath = request.outputPath || path.join(this.outputDir, outputFileName);

    console.log(`🔗 Merging ${request.inputFiles.length} files...`);

    // Create file list
    const listFilePath = path.join(this.outputDir, 'merge_list.txt');
    const fileList = request.inputFiles.map(file => `file '${file}'`).join('\n');
    await fs.writeFile(listFilePath, fileList);

    try {
      // Merge files with FFmpeg
      const command = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
      
      console.log(`🎬 Executing: ${command}`);
      await execAsync(command);

      // Delete temporary files
      await fs.unlink(listFilePath);

      const fileInfo = await this.getFileInfo(outputPath);

      console.log(`✅ Files merged successfully: ${path.basename(outputPath)} (${this.formatFileSize(fileInfo.size)})`);

      return {
        success: true,
        outputFiles: [{
          path: outputPath,
          url: `file://${outputPath}`,
          size: fileInfo.size,
          mimeType: fileInfo.mimeType,
          metadata: {
            operation: 'merge',
            inputFiles: request.inputFiles,
            totalInputFiles: request.inputFiles.length
          }
        }],
        request: request,
        metadata: {
          operation: 'merge',
          timestamp: new Date().toISOString(),
          inputCount: request.inputFiles.length,
          outputCount: 1
        }
      };

    } catch (error) {
      await fs.unlink(listFilePath).catch(() => {}); // Continue even if error occurs
      throw new Error(`Merge failed: ${error}`);
    }
  }

  /**
   * Audio extraction
   */
  private async extractAudio(request: AVToolRequest): Promise<AVToolResponse> {
    const outputFiles = [];

    for (let i = 0; i < request.inputFiles.length; i++) {
      const inputFile = request.inputFiles[i];
      const outputFileName = this.generateFileName(`audio_extract_${i + 1}`, 'mp3');
      const outputPath = path.join(this.outputDir, outputFileName);

      console.log(`🎵 Extracting audio from: ${path.basename(inputFile)}`);

      // Extract audio with FFmpeg
      const command = `ffmpeg -i "${inputFile}" -vn -acodec mp3 -ab 192k "${outputPath}"`;
      
      console.log(`🎬 Executing: ${command}`);
      await execAsync(command);

      const fileInfo = await this.getFileInfo(outputPath);

      outputFiles.push({
        path: outputPath,
        url: `file://${outputPath}`,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          operation: 'extract_audio',
          sourceFile: inputFile,
          format: 'mp3',
          bitrate: '192k'
        }
      });

      console.log(`✅ Audio extracted: ${outputFileName} (${this.formatFileSize(fileInfo.size)})`);
    }

    return {
      success: true,
      outputFiles: outputFiles,
      request: request,
      metadata: {
        operation: 'extract_audio',
        timestamp: new Date().toISOString(),
        inputCount: request.inputFiles.length,
        outputCount: outputFiles.length
      }
    };
  }

  /**
   * Add subtitles
   */
  private async addSubtitles(request: AVToolRequest): Promise<AVToolResponse> {
    if (request.inputFiles.length !== 2) {
      throw new Error('Subtitle operation requires exactly 2 files: video and subtitle file');
    }

    const [videoFile, subtitleFile] = request.inputFiles;
    const outputFileName = this.generateFileName('subtitled', 'mp4');
    const outputPath = request.outputPath || path.join(this.outputDir, outputFileName);

    console.log(`📝 Adding subtitles to video...`);
    console.log(`🎬 Video: ${path.basename(videoFile)}`);
    console.log(`📄 Subtitles: ${path.basename(subtitleFile)}`);

    // Add subtitles with FFmpeg
    const command = `ffmpeg -i "${videoFile}" -vf "subtitles=${subtitleFile}" "${outputPath}"`;
    
    console.log(`🎬 Executing: ${command}`);
    await execAsync(command);

    const fileInfo = await this.getFileInfo(outputPath);

    console.log(`✅ Subtitles added: ${path.basename(outputPath)} (${this.formatFileSize(fileInfo.size)})`);

    return {
      success: true,
      outputFiles: [{
        path: outputPath,
        url: `file://${outputPath}`,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          operation: 'add_subtitles',
          videoFile: videoFile,
          subtitleFile: subtitleFile
        }
      }],
      request: request,
      metadata: {
        operation: 'add_subtitles',
        timestamp: new Date().toISOString(),
        inputCount: 2,
        outputCount: 1
      }
    };
  }

  /**
   * Media trimming
   */
  private async trimMedia(request: AVToolRequest): Promise<AVToolResponse> {
    const startTime = request.options?.startTime || '00:00:00';
    const duration = request.options?.duration || '00:00:30';
    const outputFiles = [];

    for (let i = 0; i < request.inputFiles.length; i++) {
      const inputFile = request.inputFiles[i];
      const fileExt = path.extname(inputFile);
      const outputFileName = this.generateFileName(`trimmed_${i + 1}`, fileExt.substring(1));
      const outputPath = path.join(this.outputDir, outputFileName);

      console.log(`✂️  Trimming: ${path.basename(inputFile)} (${startTime} + ${duration})`);

      // Trim with FFmpeg
      const command = `ffmpeg -i "${inputFile}" -ss ${startTime} -t ${duration} -c copy "${outputPath}"`;
      
      console.log(`🎬 Executing: ${command}`);
      await execAsync(command);

      const fileInfo = await this.getFileInfo(outputPath);

      outputFiles.push({
        path: outputPath,
        url: `file://${outputPath}`,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          operation: 'trim',
          sourceFile: inputFile,
          startTime: startTime,
          duration: duration
        }
      });

      console.log(`✅ Trimmed: ${outputFileName} (${this.formatFileSize(fileInfo.size)})`);
    }

    return {
      success: true,
      outputFiles: outputFiles,
      request: request,
      metadata: {
        operation: 'trim',
        timestamp: new Date().toISOString(),
        inputCount: request.inputFiles.length,
        outputCount: outputFiles.length
      }
    };
  }

  /**
   * Video resizing
   */
  private async resizeVideo(request: AVToolRequest): Promise<AVToolResponse> {
    const width = request.options?.width || 1920;
    const height = request.options?.height || 1080;
    const outputFiles = [];

    for (let i = 0; i < request.inputFiles.length; i++) {
      const inputFile = request.inputFiles[i];
      const outputFileName = this.generateFileName(`resized_${i + 1}`, 'mp4');
      const outputPath = path.join(this.outputDir, outputFileName);

      console.log(`📐 Resizing: ${path.basename(inputFile)} to ${width}x${height}`);

      // Resize with FFmpeg
      const command = `ffmpeg -i "${inputFile}" -vf "scale=${width}:${height}" "${outputPath}"`;
      
      console.log(`🎬 Executing: ${command}`);
      await execAsync(command);

      const fileInfo = await this.getFileInfo(outputPath);

      outputFiles.push({
        path: outputPath,
        url: `file://${outputPath}`,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          operation: 'resize',
          sourceFile: inputFile,
          targetResolution: `${width}x${height}`
        }
      });

      console.log(`✅ Resized: ${outputFileName} (${this.formatFileSize(fileInfo.size)})`);
    }

    return {
      success: true,
      outputFiles: outputFiles,
      request: request,
      metadata: {
        operation: 'resize',
        timestamp: new Date().toISOString(),
        inputCount: request.inputFiles.length,
        outputCount: outputFiles.length
      }
    };
  }

  /**
   * Format conversion
   */
  private async convertFormat(request: AVToolRequest): Promise<AVToolResponse> {
    const targetFormat = request.options?.format || 'mp4';
    const outputFiles = [];

    for (let i = 0; i < request.inputFiles.length; i++) {
      const inputFile = request.inputFiles[i];
      const outputFileName = this.generateFileName(`converted_${i + 1}`, targetFormat);
      const outputPath = path.join(this.outputDir, outputFileName);

      console.log(`🔄 Converting: ${path.basename(inputFile)} to ${targetFormat}`);

      // Format conversion with FFmpeg
      const command = `ffmpeg -i "${inputFile}" "${outputPath}"`;
      
      console.log(`🎬 Executing: ${command}`);
      await execAsync(command);

      const fileInfo = await this.getFileInfo(outputPath);

      outputFiles.push({
        path: outputPath,
        url: `file://${outputPath}`,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        metadata: {
          operation: 'convert',
          sourceFile: inputFile,
          sourceFormat: path.extname(inputFile),
          targetFormat: targetFormat
        }
      });

      console.log(`✅ Converted: ${outputFileName} (${this.formatFileSize(fileInfo.size)})`);
    }

    return {
      success: true,
      outputFiles: outputFiles,
      request: request,
      metadata: {
        operation: 'convert',
        timestamp: new Date().toISOString(),
        inputCount: request.inputFiles.length,
        outputCount: outputFiles.length
      }
    };
  }

  /**
   * Batch processing (execute multiple operations sequentially)
   */
  async batchProcess(operations: AVToolRequest[]): Promise<AVToolResponse[]> {
    console.log(`🔄 Starting batch processing of ${operations.length} operations...`);
    
    const results: AVToolResponse[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      console.log(`\n📋 Processing operation ${i + 1}/${operations.length}: ${operation.operation}`);
      
      try {
        const result = await this.processRequest(operation);
        results.push(result);
        console.log(`✅ Operation ${i + 1} completed successfully`);
      } catch (error) {
        console.error(`❌ Operation ${i + 1} failed:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          outputFiles: [],
          request: operation,
          metadata: {
            operation: operation.operation,
            timestamp: new Date().toISOString(),
            inputCount: operation.inputFiles.length,
            outputCount: 0
          }
        });
      }
      
      // Wait between operations
      if (i < operations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎉 Batch processing completed: ${successCount}/${operations.length} operations successful`);
    
    return results;
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<{
    ffmpegVersion: string;
    supportedFormats: string[];
    availableCodecs: string[];
  }> {
    try {
      // Get FFmpeg version information
      const { stdout: versionOutput } = await execAsync('ffmpeg -version');
      const versionMatch = versionOutput.match(/ffmpeg version ([^\s]+)/);
      const ffmpegVersion = versionMatch ? versionMatch[1] : 'unknown';

      // Get supported formats
      const { stdout: formatsOutput } = await execAsync('ffmpeg -formats');
      const formats = formatsOutput
        .split('\n')
        .filter(line => line.includes('E ') || line.includes('DE'))
        .map(line => line.split(' ').filter(Boolean)[1])
        .filter(Boolean)
        .slice(0, 20); // First 20 only

      // Get available codecs
      const { stdout: codecsOutput } = await execAsync('ffmpeg -codecs');
      const codecs = codecsOutput
        .split('\n')
        .filter(line => line.includes('EV') || line.includes('EA') || line.includes('DEV') || line.includes('DEA'))
        .map(line => line.split(' ').filter(Boolean)[1])
        .filter(Boolean)
        .slice(0, 20); // First 20 only

      return {
        ffmpegVersion,
        supportedFormats: formats,
        availableCodecs: codecs
      };

    } catch (error) {
      console.warn('Could not get system info:', error);
      return {
        ffmpegVersion: 'not installed',
        supportedFormats: [],
        availableCodecs: []
      };
    }
  }
}
