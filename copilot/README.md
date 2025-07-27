# Google AI Creative Tools

Google AI の最新クリエイティブツール（Imagen、Veo、Chirp 3 HD、Lyria、AVTool）を Model Context Protocol (MCP) 経由で利用できる統合ツールです。

## 📋 概要

このプロジェクトは、Google AI の5つの主要なクリエイティブツールを統合したMCPサーバーとCLIクライアントを提供します：

- **🖼️ Imagen**: 高品質な画像生成・編集・アップスケーリング
- **🎬 Veo**: プロフェッショナルレベルの動画生成・スタイル転送
- **🎤 Chirp 3 HD**: 自然な音声合成・多言語対応
- **🎵 Lyria**: 音楽生成・スタイル変換・継続生成
- **🛠️ AVTool**: オーディオ・ビデオ処理・編集

## 🚀 機能

### Imagen (画像生成)
- テキストから画像生成（高解像度対応）
- 画像編集（マスク対応）
- 画像アップスケーリング（2x, 4x, 8x）
- 多様なスタイル（写真、芸術、アニメ、スケッチ、油絵）

### Veo (動画生成)
- テキストから動画生成（最大120秒）
- 高解像度対応（720p〜4K）
- カメラワーク指定（パン、ズーム、ドリー、オービット）
- スタイル転送（映画的、ドキュメンタリー、アニメーション）

### Chirp 3 HD (音声合成)
- 多言語対応（英語、日本語、中国語など10言語）
- 感情表現（中性、幸せ、悲しい、興奮、冷静、怒り）
- 声質選択（男性、女性、子供、高齢者）
- 長文対応（自動分割処理）

### Lyria (音楽生成)
- ジャンル指定（ポップ、ロック、クラシック、ジャズなど）
- ムード設定（幸せ、悲しい、エネルギッシュ、冷静など）
- 楽器指定・キー設定
- マルチパート作曲・継続生成

### AVTool (メディア処理)
- ファイル結合・分割
- 音声抽出・字幕追加
- フォーマット変換・リサイズ
- バッチ処理対応

## 📦 インストール

### 前提条件

- Node.js 18以上
- npm または yarn
- FFmpeg（AVTool機能用）

```bash
# FFmpegのインストール（macOS）
brew install ffmpeg

# FFmpegのインストール（Ubuntu/Debian）
sudo apt update && sudo apt install ffmpeg

# FFmpegのインストール（Windows）
# https://ffmpeg.org/download.html からダウンロード
```

### プロジェクトのセットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd creative-lab-with-genai

# 依存関係のインストール
npm install

# TypeScriptのコンパイル
npm run build

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してAPIキーを設定
```

## ⚙️ 設定

### 環境変数

`.env`ファイルで以下の設定を行います：

```bash
# Google AI API キー（推奨）
GOOGLE_AI_API_KEY=your_api_key_here

# Google Cloud プロジェクトID（Service Account使用時）
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here

# Google Cloud リージョン
GOOGLE_CLOUD_LOCATION=us-central1

# サービスアカウントキーファイル（オプション）
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 認証方法

#### 1. API Key認証（推奨・簡単）

1. [Google AI Studio](https://ai.google.dev/) でAPIキーを取得
2. `.env`ファイルに`GOOGLE_AI_API_KEY`を設定

#### 2. Service Account認証（本番環境推奨）

1. Google Cloud Consoleでサービスアカウントを作成
2. 必要なAPIを有効化（AI Platform API、Cloud Text-to-Speech API等）
3. サービスアカウントキーをダウンロード
4. `.env`ファイルにプロジェクトIDとキーファイルパスを設定

#### 3. gcloud CLI認証

```bash
# gcloud CLI で認証
gcloud auth application-default login

# プロジェクトIDを設定
export GOOGLE_CLOUD_PROJECT_ID=your_project_id
```

## 🖥️ 使用方法

### CLIクライアント

```bash
# CLIの起動
npm run cli

# または直接実行
node dist/client/index.js
```

CLIを起動すると、インタラクティブなメニューが表示されます：

```
🎨 Google AI Creative Tools CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
? What would you like to do? (Use arrow keys)
❯ 🖼️  Generate Images (Imagen)
  ✏️  Edit Images (Imagen)  
  📈 Upscale Images (Imagen)
  🎬 Generate Videos (Veo)
  🎨 Video Style Transfer (Veo)
  🎤 Generate Speech (Chirp 3 HD)
  🎵 Generate Music (Lyria)
  🛠️  Process Media (AVTool)
  ℹ️  System Info
  🚪 Exit
```

### MCPサーバー

```bash
# MCPサーバーの起動
npm run server

# または直接実行
node dist/server/main.js
```

### MCPクライアントからの利用

Claude Desktop等のMCPクライアントから利用する場合：

```json
{
  "mcpServers": {
    "google-ai-creative": {
      "command": "node",
      "args": ["/path/to/creative-lab-with-genai/dist/server/main.js"],
      "env": {
        "GOOGLE_AI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## 📚 API仕様

### 利用可能なMCPツール

#### 画像生成系
- `generate_image`: 画像生成
- `edit_image`: 画像編集
- `upscale_image`: 画像アップスケール

#### 動画生成系
- `generate_video`: 動画生成
- `style_transfer_video`: 動画スタイル転送

#### 音声生成系
- `generate_speech`: 音声合成
- `generate_long_speech`: 長文音声合成

#### 音楽生成系
- `generate_music`: 音楽生成
- `style_inspired_music`: スタイル参照音楽生成
- `continue_music`: 音楽継続生成
- `generate_multipart_music`: マルチパート音楽生成

#### メディア処理系
- `process_media`: メディア処理
- `batch_process_media`: バッチ処理
- `get_system_info`: システム情報取得

## 🛠️ 開発

### プロジェクト構造

```
src/
├── types/           # TypeScript型定義
├── services/        # Google AIサービス実装
│   ├── base.ts      # ベースサービスクラス
│   ├── imagen.ts    # Imagen画像生成サービス
│   ├── veo.ts       # Veo動画生成サービス
│   ├── chirp.ts     # Chirp音声合成サービス
│   ├── lyria.ts     # Lyria音楽生成サービス
│   └── avtool.ts    # AVTool メディア処理サービス
├── server/          # MCPサーバー
│   ├── index.ts     # メインサーバークラス
│   └── main.ts      # サーバーエントリーポイント
└── client/          # CLIクライアント
    ├── cli.ts       # CLIインターフェース
    └── index.ts     # クライアントエントリーポイント
```

### ビルド・実行

```bash
# 開発モード（ファイル監視）
npm run dev

# 本番ビルド
npm run build

# 型チェック
npm run type-check

# コード整形
npm run format

# リント
npm run lint
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. Forkを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## 📞 サポート

- Issues: GitHub Issues
- Documentation: このREADME
- Examples: `examples/` ディレクトリ

## 🔗 関連リンク

- [Google AI Studio](https://ai.google.dev/)
- [Google Cloud AI](https://cloud.google.com/ai)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

## 🚀 セットアップ

### 前提条件
- Node.js 18以上
- FFmpeg（メディア処理に必要）

### インストール

1. リポジトリをクローン:
```bash
git clone <このリポジトリのURL>
cd creative-lab-with-genai
```

2. 依存関係をインストール:
```bash
npm install
```

3. FFmpegをインストール（まだの場合）:
```bash
# macOS (Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Windows (Chocolatey)
choco install ffmpeg
```

### ビルドと実行

1. TypeScriptをビルド:
```bash
npm run build
```

2. MCPサーバーを起動:
```bash
npm start
```

3. クライアントアプリケーションを実行:
```bash
npm run client
```

4. または、デモを実行:
```bash
npm run demo
```

## 📖 使用方法

### MCPクライアントとしての使用

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// 動画生成の例
const videoArgs = {
  prompt: "美しい桜が舞い散る春の風景",
  duration: 10,
  resolution: "1080p",
  style: "cinematic"
};

const videoResponse = await client.request({
  method: "tools/call",
  params: { name: "generate_video", arguments: videoArgs }
});
```

### 利用可能なツール

#### 1. `generate_video`
動画を生成します。

**パラメータ:**
- `prompt` (必須): 動画の内容を説明するテキスト
- `duration` (オプション): 動画の長さ（秒）、デフォルト5秒
- `resolution` (オプション): 解像度（720p/1080p/4K）、デフォルト1080p
- `style` (オプション): スタイル、デフォルトrealistic

**例:**
```json
{
  "prompt": "夕日が沈む海辺の美しい風景",
  "duration": 15,
  "resolution": "1080p",
  "style": "cinematic"
}
```

#### 2. `generate_music`
音楽を生成します。

**パラメータ:**
- `prompt` (必須): 音楽の内容を説明するテキスト
- `duration` (オプション): 音楽の長さ（秒）、デフォルト30秒
- `genre` (オプション): ジャンル、デフォルトpop
- `tempo` (オプション): テンポ（slow/medium/fast）、デフォルトmedium

**例:**
```json
{
  "prompt": "リラックスできる穏やかなピアノ曲",
  "duration": 60,
  "genre": "classical",
  "tempo": "slow"
}
```

#### 3. `add_music_to_video`
動画に音楽を追加します。

**パラメータ:**
- `video_path` (必須): 動画ファイルのパス
- `music_path` (必須): 音楽ファイルのパス
- `volume` (オプション): 音楽の音量（0-1）、デフォルト0.5

#### 4. `convert_media`
メディアファイルを変換します。

**パラメータ:**
- `input_path` (必須): 入力ファイルのパス
- `output_format` (必須): 出力形式（mp4/avi/mov/mp3/wav/flac）
- `quality` (オプション): 品質（low/medium/high）、デフォルトmedium

## 🏗️ アーキテクチャ

```
src/
├── index.ts              # MCPサーバーのメインファイル
├── client.ts             # クライアントアプリケーション
└── tools/
    ├── video-generator.ts    # 動画生成ツール
    ├── music-generator.ts    # 音楽生成ツール
    └── media-processor.ts    # メディア処理ツール
```

### MCP（Model Context Protocol）について

このプロジェクトは、AnthropicのMCPプロトコルを使用しています。MCPにより：

- **標準化されたインターフェース**: 異なるAIモデルとの一貫した連携
- **ツールの再利用性**: 他のMCPクライアントからも利用可能
- **拡張性**: 新しいツールの追加が容易

## 🔧 カスタマイズ

### 新しいツールの追加

1. `src/tools/`に新しいツールクラスを作成
2. `src/index.ts`でツールを登録
3. 必要に応じてTypeScript型定義を追加

### AI生成サービスの統合

現在はデモ実装ですが、実際のAIサービスと統合する場合：

- **動画生成**: Runway ML、Stable Video Diffusion、Pika Labs
- **音楽生成**: Suno AI、MusicGen、AIVA

## 🔒 環境変数

`.env`ファイルでAPIキーなどを設定できます：

```bash
# 例：各種APIキー
RUNWAY_API_KEY=your_runway_api_key
SUNO_API_KEY=your_suno_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 📁 出力ファイル

生成されたファイルは`output/`ディレクトリに保存されます：

```
output/
├── generated_video_<uuid>.mp4
├── generated_music_<uuid>.mp3
└── video_with_music_<uuid>.mp4
```

## 🛠️ 開発

### 開発モード

```bash
# ファイル変更を監視してサーバーを自動再起動
npm run watch

# 開発用サーバー起動
npm run dev
```

### デバッグ

```bash
# TypeScriptの型チェック
npx tsc --noEmit

# ビルド後のファイルを削除
npm run clean
```

## 🤝 コントリビューション

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/new-feature`)
3. コミット (`git commit -am 'Add new feature'`)
4. プッシュ (`git push origin feature/new-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol) - AnthropicのMCPプロトコル
- [FFmpeg](https://ffmpeg.org/) - メディア処理ライブラリ
- オープンソースのAI生成ツールコミュニティ

## 📧 お問い合わせ

質問や提案がある場合は、Issueを作成してください。