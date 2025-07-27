# Google AI Creative Tools

An integrated platform for using Google AI's latest creative tools (Imagen, Veo, Chirp 3 HD, Lyria, AVTool) via Model Context Protocol (MCP).

## 📋 Overview

This project provides an MCP server and CLI client that integrates Google AI's five major creative tools:

- **🖼️ Imagen**: High-quality image generation, editing, and upscaling
- **🎬 Veo**: Professional-level video generation and style transfer
- **🎤 Chirp 3 HD**: Natural speech synthesis with multilingual support
- **🎵 Lyria**: Music generation, style conversion, and continuation
- **🛠️ AVTool**: Audio and video processing and editing

## 🚀 Features

### Imagen (Image Generation)
- Text-to-image generation (high resolution support)
- Image editing (with mask support)
- Image upscaling (2x, 4x, 8x)
- Diverse styles (photographic, artistic, anime, sketch, oil painting)

### Veo (Video Generation)
- Text-to-video generation (up to 120 seconds)
- High resolution support (720p to 4K)
- Camera movement specification (pan, zoom, dolly, orbit)
- Style transfer (cinematic, documentary, animation)

### Chirp 3 HD (Speech Synthesis)
- Multilingual support (10 languages including English, Japanese, Chinese)
- Emotional expression (neutral, happy, sad, excited, calm, angry)
- Voice selection (male, female, child, elderly)
- Long-form support (automatic chunking)

### Lyria (Music Generation)
- Genre specification (pop, rock, classical, jazz, etc.)
- Mood settings (happy, sad, energetic, calm, etc.)
- Instrument and key specification
- Multi-part composition and continuation generation

### AVTool (Media Processing)
- File merging and splitting
- Audio extraction and subtitle addition
- Format conversion and resizing
- Batch processing support

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- FFmpeg (for AVTool functionality)

```bash
# FFmpeg installation (macOS)
brew install ffmpeg

# FFmpeg installation (Ubuntu/Debian)
sudo apt update && sudo apt install ffmpeg

# FFmpeg installation (Windows)
# Download from https://ffmpeg.org/download.html
```

### Project Setup

```bash
# Clone the repository
git clone <repository-url>
cd creative-lab-with-genai

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Environment configuration
cp .env.example .env
# Edit the .env file to set API keys
```

## ⚙️ Configuration

### Environment Variables

Configure the following settings in the `.env` file:

```bash
# Google AI API Key (recommended)
GOOGLE_AI_API_KEY=your_api_key_here

# Google Cloud Project ID (when using Service Account)
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here

# Google Cloud Region
GOOGLE_CLOUD_LOCATION=us-central1

# Service Account Key File (optional)
# Service Account Key File (optional)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Audio Tool Configuration
AUDIO_OUTPUT_DIR=./output
AUDIO_FILE_QUALITY=high
```

### Setting Up API Keys

#### Method 1: Using Google AI Studio API Key (Recommended)

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Set the API key in the `.env` file:
   ```bash
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

#### Method 2: Using Google Cloud Service Account

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the required APIs:
   - Vertex AI API
   - Cloud AI Platform API
3. Create a service account and download the key file
4. Set the environment variables:
   ```bash
   GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   ```

## 🚀 Usage

### Starting the MCP Server

```bash
# Start the MCP server
npm start

# Or with development mode (auto-reload)
npm run dev
```

### Integration with Claude

1. Install the Claude desktop application
2. Add the following configuration to Claude's configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-ai-creative-tools": {
      "command": "node",
      "args": ["/path/to/creative-lab-with-genai/build/index.js"],
      "env": {
        "GOOGLE_AI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

3. Restart Claude

### Available Features

#### 🎨 Imagen Image Generation

```bash
# Generate images
"Create a beautiful sunset landscape"

# Generate images with specific style
"Create a sci-fi cityscape in cyberpunk style"
```

#### 🎬 Veo Video Generation

```bash
# Generate short videos
"Create a video of waves crashing on a beach"

# Generate videos with specific requirements
"Create a 5-second video of a cat playing with a ball"
```

#### 🎵 Music and Audio Generation

```bash
# Music generation with Lyria
"Create upbeat jazz music for 30 seconds"

# Sound effect generation with Chirp 3 HD
"Generate the sound of rain falling on leaves"
```

#### 🔧 Audio Processing with AVTool

```bash
# Audio format conversion
"Convert audio.mp3 to WAV format"

# Audio enhancement
"Enhance the quality of this audio file"
```

## 🛠️ Development

### Project Structure

```
creative-lab-with-genai/
├── src/
│   ├── index.ts              # Main entry point
│   ├── tools/                # MCP tool implementations
│   │   ├── imagen.ts         # Imagen image generation
│   │   ├── veo.ts           # Veo video generation
│   │   ├── chirp.ts         # Chirp 3 HD audio generation
│   │   ├── lyria.ts         # Lyria music generation
│   │   └── avtool.ts        # AVTool audio processing
│   ├── utils/                # Utility functions
│   │   ├── auth.ts          # Authentication
│   │   ├── logger.ts        # Logging
│   │   └── config.ts        # Configuration management
│   └── types/                # Type definitions
├── docs/                     # Documentation
├── examples/                 # Usage examples
├── tests/                    # Test files
├── build/                    # Compiled JavaScript files
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Available Scripts

```bash
# Development (with auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Adding New Features

1. Create a new tool file in `src/tools/`
2. Implement the MCP tool interface
3. Register the tool in `src/index.ts`
4. Add tests in `tests/`
5. Update documentation

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Types

- **Unit Tests**: Test individual functions and modules
- **Integration Tests**: Test interactions between components
- **End-to-End Tests**: Test complete workflows

## 📚 API Reference

### Imagen Tool

| Function | Description | Parameters |
|----------|-------------|------------|
| `generateImage` | Generate images from text descriptions | `prompt`, `aspectRatio`, `numberOfImages` |
| `editImage` | Edit existing images | `image`, `mask`, `prompt` |

### Veo Tool

| Function | Description | Parameters |
|----------|-------------|------------|
| `generateVideo` | Generate videos from text descriptions | `prompt`, `duration`, `aspectRatio` |

### Chirp 3 HD Tool

| Function | Description | Parameters |
|----------|-------------|------------|
| `generateAudio` | Generate audio from text | `prompt`, `duration`, `style` |

### Lyria Tool

| Function | Description | Parameters |
|----------|-------------|------------|
| `generateMusic` | Generate music from descriptions | `prompt`, `duration`, `genre`, `mood` |

### AVTool

| Function | Description | Parameters |
|----------|-------------|------------|
| `convertAudio` | Convert audio format | `inputFile`, `outputFormat` |
| `enhanceAudio` | Enhance audio quality | `inputFile`, `enhancementType` |

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Maintain code documentation
- Follow the existing code style
- Update README for new features

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Troubleshooting

#### Common Issues

**API Key Errors**
- Verify your API key is correctly set in the `.env` file
- Ensure the API key has the necessary permissions
- Check that the required APIs are enabled in Google Cloud Console

**FFmpeg Not Found**
- Ensure FFmpeg is installed and accessible in your PATH
- Restart your terminal after installation
- On Windows, you may need to add FFmpeg to your system PATH manually

**Build Errors**
- Ensure you're using Node.js 18 or higher
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript compilation errors: `npm run build`

#### Getting Help

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: Join community discussions on [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: Check the [docs](./docs) folder for detailed guides

### FAQ

**Q: Which Google AI models are supported?**
A: This project supports Imagen (image generation), Veo (video generation), Chirp 3 HD (audio generation), Lyria (music generation), and various AVTool functionalities.

**Q: Can I use this with other AI models?**
A: Currently, this project is specifically designed for Google AI services. However, the architecture allows for future extensions to support other providers.

**Q: Is there a rate limit for API calls?**
A: Rate limits depend on your Google AI Studio or Google Cloud quotas. Please check your quota settings in the respective consoles.

**Q: Can I run this on a server?**
A: Yes, this MCP server can be deployed on any Node.js-compatible server environment.

---

Created with ❤️ using Google AI technologies