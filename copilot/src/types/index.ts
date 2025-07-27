/**
 * Google AI Creative Tools 型定義
 */

// ベース型
export interface BaseGenerationRequest {
  prompt: string;
  outputPath?: string;
  metadata?: Record<string, any>;
}

export interface BaseGenerationResponse {
  success: boolean;
  outputPath?: string;
  metadata?: Record<string, any>;
  error?: string;
}

// Imagen (画像生成) 型定義
export interface ImagenRequest extends BaseGenerationRequest {
  width?: number;
  height?: number;
  numImages?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: 'photographic' | 'artistic' | 'anime' | 'sketch' | 'oil_painting';
  quality?: 'draft' | 'standard' | 'high';
  safetyFilter?: boolean;
  negativePrompt?: string;
  guidanceScale?: number;
  seed?: number;
  steps?: number;
  language?: string;
}

export interface GeneratedImage {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface ImagenResponse extends BaseGenerationResponse {
  images: GeneratedImage[];
  request: ImagenRequest | { prompt: string; [key: string]: any };
  metadata: {
    model: string;
    timestamp: string;
    totalImages: number;
    totalSize: number;
    operation?: string;
  };
}

// Veo (動画生成) 型定義
export interface VeoRequest extends BaseGenerationRequest {
  duration?: number; // 秒
  resolution?: '720p' | '1080p' | '4K';
  fps?: 24 | 30 | 60;
  style?: 'cinematic' | 'documentary' | 'animation' | 'realistic';
  cameraMovement?: 'static' | 'pan' | 'zoom' | 'dolly' | 'orbit';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  language?: string;
}

export interface GeneratedVideo {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface VeoResponse extends BaseGenerationResponse {
  videos: GeneratedVideo[];
  request: VeoRequest | { prompt: string; [key: string]: any };
  metadata: {
    model: string;
    timestamp: string;
    totalVideos: number;
    totalSize: number;
    operation?: string;
  };
}

// Chirp 3 HD (音声生成) 型定義
export interface ChirpRequest extends BaseGenerationRequest {
  voice?: 'male' | 'female' | 'child' | 'elderly';
  language?: 'en' | 'ja' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ko' | 'zh';
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'angry';
  speed?: 'slow' | 'normal' | 'fast';
  pitch?: 'low' | 'normal' | 'high';
  quality?: 'standard' | 'high' | 'ultra';
}

export interface GeneratedAudio {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface ChirpResponse extends BaseGenerationResponse {
  audio: GeneratedAudio[];
  request: ChirpRequest | { prompt: string; [key: string]: any };
  metadata: {
    model: string;
    timestamp: string;
    totalAudio: number;
    totalSize: number;
    chunks?: number;
  };
}

// Lyria (音楽生成) 型定義
export interface LyriaRequest extends BaseGenerationRequest {
  genre?: 'pop' | 'rock' | 'classical' | 'jazz' | 'electronic' | 'ambient' | 'hip-hop' | 'country';
  mood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'mysterious' | 'dramatic' | 'romantic';
  tempo?: 'slow' | 'medium' | 'fast' | number; // BPM if number
  duration?: number; // 秒
  instruments?: string[]; // ['piano', 'guitar', 'drums', 'violin', etc.]
  key?: 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
  scale?: 'major' | 'minor' | 'pentatonic' | 'blues';
}

export interface LyriaResponse extends BaseGenerationResponse {
  music: GeneratedAudio[];
  request: LyriaRequest | { prompt: string; [key: string]: any };
  metadata: {
    model: string;
    timestamp: string;
    totalMusic: number;
    totalSize: number;
    parts?: number;
  };
}

// AVTool (Audio-Video Tool) 型定義
export interface AVToolRequest {
  operation: 'merge' | 'extract_audio' | 'add_subtitles' | 'trim' | 'resize' | 'convert';
  inputFiles: string[];
  outputPath?: string;
  options?: {
    // Merge options
    fadeIn?: number;
    fadeOut?: number;
    volume?: number;
    
    // Trim options
    startTime?: string;
    endTime?: string;
    duration?: string;
    
    // Resize options
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
    
    // Convert options
    format?: 'mp4' | 'avi' | 'mov' | 'webm' | 'mp3' | 'wav' | 'flac';
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    
    // Subtitle options
    language?: string;
    fontSize?: number;
    fontColor?: string;
    position?: 'top' | 'center' | 'bottom';
  };
}

export interface GeneratedFile {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface AVToolResponse extends BaseGenerationResponse {
  outputFiles: GeneratedFile[];
  request: AVToolRequest;
  metadata: {
    operation: string;
    timestamp: string;
    inputCount: number;
    outputCount: number;
  };
}

// Google AI 認証設定
export interface GoogleAIConfig {
  apiKey?: string;
  projectId?: string;
  location?: string;
  credentialsPath?: string;
}

// MCP ツール設定
export interface MCPToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

// CLI 設定
export interface CLIConfig {
  outputDir: string;
  defaultQuality: string;
  maxConcurrentJobs: number;
  autoCleanup: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// 生成ジョブ管理
export interface GenerationJob {
  id: string;
  type: 'imagen' | 'veo' | 'chirp' | 'lyria' | 'avtool';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  request: BaseGenerationRequest;
  response?: BaseGenerationResponse;
  error?: string;
}

// API レスポンス統一型
export type GenerationRequest = ImagenRequest | VeoRequest | ChirpRequest | LyriaRequest | AVToolRequest;
export type GenerationResponse = ImagenResponse | VeoResponse | ChirpResponse | LyriaResponse | AVToolResponse;

// ユーティリティ型
export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}
