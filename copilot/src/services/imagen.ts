import { BaseGoogleAIService } from './base.js';
import { ImagenRequest, ImagenResponse, GoogleAIConfig } from '../types/index.js';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Google Imagen Service
 */
export class ImagenService extends BaseGoogleAIService {
  private readonly apiEndpoint = 'https://aiplatform.googleapis.com/v1';

  constructor(config: GoogleAIConfig) {
    super(config);
  }

  /**
   * Request validation
   */
  async validateRequest(request: ImagenRequest): Promise<boolean> {
    if (!request.prompt) {
      throw new Error('Prompt is required for image generation');
    }

    if (request.prompt.length > 1000) {
      throw new Error('Prompt must be 1000 characters or less');
    }

    if (request.width && (request.width < 64 || request.width > 2048)) {
      throw new Error('Width must be between 64 and 2048 pixels');
    }

    if (request.height && (request.height < 64 || request.height > 2048)) {
      throw new Error('Height must be between 64 and 2048 pixels');
    }

    if (request.numImages && (request.numImages < 1 || request.numImages > 8)) {
      throw new Error('Number of images must be between 1 and 8');
    }

    return true;
  }

  /**
   * Process image generation request
   */
  async processRequest(request: ImagenRequest): Promise<ImagenResponse> {
    try {
      await this.validateRequest(request);

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/imagen-3.0-generate-001');

      const requestBody = {
        instances: [{
          prompt: request.prompt,
          ...request.negativePrompt && { negative_prompt: request.negativePrompt },
          ...request.width && { width: request.width },
          ...request.height && { height: request.height },
          ...request.guidanceScale && { guidance_scale: request.guidanceScale },
          ...request.seed && { seed: request.seed },
          ...request.steps && { steps: request.steps }
        }],
        parameters: {
          sampleCount: request.numImages || 1,
          language: request.language || 'en',
          safetySettings: {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        }
      };

      console.log(`🎨 Generating ${request.numImages || 1} image(s) with Imagen...`);
      console.log(`📝 Prompt: "${request.prompt.substring(0, 100)}${request.prompt.length > 100 ? '...' : ''}"`);

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

      const generatedImages = [];
      const predictions = response.data.predictions || [];

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        
        if (prediction.bytesBase64Encoded) {
          // Save Base64 encoded image data
          const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
          const fileName = this.generateFileName('imagen', 'png');
          const filePath = path.join(this.outputDir, fileName);
          
          await fs.writeFile(filePath, imageBuffer);
          
          const fileInfo = await this.getFileInfo(filePath);
          
          generatedImages.push({
            path: filePath,
            url: `file://${filePath}`,
            size: fileInfo.size,
            mimeType: fileInfo.mimeType,
            metadata: {
              prompt: request.prompt,
              width: prediction.width || request.width || 1024,
              height: prediction.height || request.height || 1024,
              guidanceScale: request.guidanceScale,
              seed: prediction.seed || request.seed,
              steps: request.steps
            }
          });

          console.log(`✅ Image ${i + 1} saved: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
        }
      }

      const result: ImagenResponse = {
        success: true,
        images: generatedImages,
        request: request,
        metadata: {
          model: 'imagen-3.0-generate-001',
          timestamp: new Date().toISOString(),
          totalImages: generatedImages.length,
          totalSize: generatedImages.reduce((sum, img) => sum + img.size, 0)
        }
      };

      console.log(`🎉 Successfully generated ${generatedImages.length} image(s)`);
      console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Imagen image generation');
    }
  }

  /**
   * Image editing functionality (Image-to-Image)
   */
  async editImage(
    imagePath: string,
    prompt: string,
    maskPath?: string,
    options?: Partial<ImagenRequest>
  ): Promise<ImagenResponse> {
    try {
      // Load input image
      const imageBuffer = await fs.readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      let maskBase64: string | undefined;
      if (maskPath) {
        const maskBuffer = await fs.readFile(maskPath);
        maskBase64 = maskBuffer.toString('base64');
      }

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/imagen-3.0-edit-001');

      const requestBody = {
        instances: [{
          prompt: prompt,
          image: {
            bytesBase64Encoded: imageBase64
          },
          ...maskBase64 && {
            mask: {
              bytesBase64Encoded: maskBase64
            }
          },
          ...options?.guidanceScale && { guidance_scale: options.guidanceScale },
          ...options?.seed && { seed: options.seed }
        }],
        parameters: {
          sampleCount: options?.numImages || 1,
          language: options?.language || 'en'
        }
      };

      console.log(`🖼️ Editing image with Imagen...`);
      console.log(`📝 Edit prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

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

      const editedImages = [];
      const predictions = response.data.predictions || [];

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        
        if (prediction.bytesBase64Encoded) {
          const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
          const fileName = this.generateFileName('imagen_edit', 'png');
          const filePath = path.join(this.outputDir, fileName);
          
          await fs.writeFile(filePath, imageBuffer);
          
          const fileInfo = await this.getFileInfo(filePath);
          
          editedImages.push({
            path: filePath,
            url: `file://${filePath}`,
            size: fileInfo.size,
            mimeType: fileInfo.mimeType,
            metadata: {
              prompt: prompt,
              originalImage: imagePath,
              maskImage: maskPath,
              width: prediction.width,
              height: prediction.height,
              guidanceScale: options?.guidanceScale,
              seed: prediction.seed
            }
          });

          console.log(`✅ Edited image ${i + 1} saved: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
        }
      }

      const result: ImagenResponse = {
        success: true,
        images: editedImages,
        request: {
          prompt,
          ...options
        },
        metadata: {
          model: 'imagen-3.0-edit-001',
          timestamp: new Date().toISOString(),
          totalImages: editedImages.length,
          totalSize: editedImages.reduce((sum, img) => sum + img.size, 0),
          operation: 'edit'
        }
      };

      console.log(`🎉 Successfully edited ${editedImages.length} image(s)`);
      console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Imagen image editing');
    }
  }

  /**
   * Image upscaling
   */
  async upscaleImage(imagePath: string, scaleFactor: number = 2): Promise<ImagenResponse> {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      const authToken = await this.getAuthToken();
      const resourceName = this.buildResourceName('publishers/google/models/imagen-3.0-upscale-001');

      const requestBody = {
        instances: [{
          image: {
            bytesBase64Encoded: imageBase64
          },
          scaleFactor: scaleFactor
        }]
      };

      console.log(`📈 Upscaling image by ${scaleFactor}x with Imagen...`);

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

      const upscaledImages = [];
      const predictions = response.data.predictions || [];

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        
        if (prediction.bytesBase64Encoded) {
          const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
          const fileName = this.generateFileName('imagen_upscale', 'png');
          const filePath = path.join(this.outputDir, fileName);
          
          await fs.writeFile(filePath, imageBuffer);
          
          const fileInfo = await this.getFileInfo(filePath);
          
          upscaledImages.push({
            path: filePath,
            url: `file://${filePath}`,
            size: fileInfo.size,
            mimeType: fileInfo.mimeType,
            metadata: {
              originalImage: imagePath,
              scaleFactor: scaleFactor,
              width: prediction.width,
              height: prediction.height
            }
          });

          console.log(`✅ Upscaled image ${i + 1} saved: ${fileName} (${this.formatFileSize(fileInfo.size)})`);
        }
      }

      const result: ImagenResponse = {
        success: true,
        images: upscaledImages,
        request: {
          prompt: `Upscale ${scaleFactor}x`
        },
        metadata: {
          model: 'imagen-3.0-upscale-001',
          timestamp: new Date().toISOString(),
          totalImages: upscaledImages.length,
          totalSize: upscaledImages.reduce((sum, img) => sum + img.size, 0),
          operation: 'upscale'
        }
      };

      console.log(`🎉 Successfully upscaled ${upscaledImages.length} image(s)`);
      console.log(`📊 Total size: ${this.formatFileSize(result.metadata.totalSize)}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Imagen image upscaling');
    }
  }
}
