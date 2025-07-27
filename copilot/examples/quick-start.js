#!/usr/bin/env node

/**
 * 簡単なサンプルスクリプト
 * MCPサーバーのツールを使用して動画と音楽を生成します
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function runExample() {
  console.log('🎬🎵 Creative Lab MCP サンプル実行中...\n');

  // MCPサーバーを起動
  console.log('1. MCPサーバーを起動中...');
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: process.cwd()
  });

  // クライアントを作成
  const client = new Client({
    name: 'creative-lab-example',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  const transport = new StdioClientTransport({
    readable: serverProcess.stdout,
    writable: serverProcess.stdin
  });

  try {
    await client.connect(transport);
    console.log('✅ MCPサーバーに接続しました\n');

    // 例1: 動画生成
    console.log('2. 動画を生成中...');
    const videoResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'generate_video',
        arguments: {
          prompt: '美しい夕日が海に沈む幻想的な風景',
          duration: 8,
          resolution: '1080p',
          style: 'cinematic'
        }
      }
    });

    console.log('✅ 動画生成完了:');
    console.log(videoResult.content[0].text.split('\n').slice(0, 5).join('\n'));
    console.log('...\n');

    // 例2: 音楽生成
    console.log('3. 音楽を生成中...');
    const musicResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'generate_music',
        arguments: {
          prompt: '穏やかで心地よいアンビエント音楽',
          duration: 45,
          genre: 'ambient',
          tempo: 'slow'
        }
      }
    });

    console.log('✅ 音楽生成完了:');
    console.log(musicResult.content[0].text.split('\n').slice(0, 5).join('\n'));
    console.log('...\n');

    console.log('🎉 すべての処理が完了しました！');
    console.log('生成されたファイルは output/ ディレクトリで確認できます。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

// 実行
runExample().catch(console.error);
