#!/usr/bin/env node

import { GoogleAICreativeServer } from './index.js';
import { GoogleAIConfig } from '../types/index.js';
import * as path from 'path';
import * as process from 'process';

/**
 * Google AI Creative Tools MCP サーバーのエントリーポイント
 */
async function main() {
  try {
    // 環境変数から設定を読み込み
    const config: GoogleAIConfig = {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                      path.join(process.env.HOME || '', '.config', 'gcloud', 'application_default_credentials.json')
    };

    // 必要な設定の確認
    if (!config.apiKey && !config.projectId) {
      console.error('Error: Either GOOGLE_AI_API_KEY or GOOGLE_CLOUD_PROJECT_ID must be set');
      console.error('');
      console.error('Setup instructions:');
      console.error('1. For API Key authentication:');
      console.error('   export GOOGLE_AI_API_KEY="your-api-key"');
      console.error('');
      console.error('2. For Service Account authentication:');
      console.error('   export GOOGLE_CLOUD_PROJECT_ID="your-project-id"');
      console.error('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"');
      console.error('');
      console.error('3. For gcloud CLI authentication:');
      console.error('   gcloud auth application-default login');
      console.error('   export GOOGLE_CLOUD_PROJECT_ID="your-project-id"');
      process.exit(1);
    }

    // デバッグ情報の出力（stderr に出力してMCPプロトコルに影響しないようにする）
    console.error('Google AI Creative Tools MCP Server');
    console.error('=====================================');
    console.error(`Project ID: ${config.projectId || 'Not set'}`);
    console.error(`Location: ${config.location}`);
    console.error(`API Key: ${config.apiKey ? 'Set' : 'Not set'}`);
    console.error(`Credentials: ${config.credentialsPath}`);
    console.error('');

    // サーバーを作成して開始
    const server = new GoogleAICreativeServer(config);
    await server.start();

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.error('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\nShutting down server...');
  process.exit(0);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// メイン関数を実行
main();
