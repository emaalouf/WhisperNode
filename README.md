# WhisperNode

A Node.js application that uses [nodejs-whisper](https://www.npmjs.com/package/nodejs-whisper) to generate subtitles for video files.

## Features

- Automatically processes all video files in a specified directory
- Generates SRT and VTT subtitle files by default
- Configurable output formats (SRT, VTT, JSON, TXT, etc.)
- Word-level timestamps for accurate subtitle synchronization
- Support for multiple languages
- Customizable configuration via environment variables
- **Preserves video IDs** in filenames for reupload compatibility (format: `name-viXXXXXX.mp4`)
- **Smart language detection** from filenames to improve transcription accuracy
- **GPU acceleration** for faster processing
- **Parallel processing** for multiple files simultaneously
- **Progress tracking** showing completed/total videos
- **Word grouping** for more readable subtitle phrases
- **Arabic text optimization** with post-processing to group characters into words

## Prerequisites

- Node.js (v14 or higher)
- Make tools:
  - On macOS: These are included with Xcode Command Line Tools
  - On Linux: `sudo apt install build-essential`
  - On Windows: Install [MSYS2](https://www.msys2.org/) or [MinGW-w64](https://www.mingw-w64.org/)

## Installation

1. Clone this repository or download the source code
2. Install dependencies:
   ```
   npm install
   ```
3. Download the Whisper model:
   ```
   npm run download-model
   ```
4. Create a `.env` file (optional):
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file to customize your settings.

## Usage

1. Place your video files in the `videos` directory
2. Build the application:
   ```
   npm run build
   ```
3. Run the application:
   ```
   npm start
   ```

The application will process all video files in the `videos` directory and generate subtitle files alongside them.

### Video ID Preservation

If your video files contain IDs in the format `filename-viXXXXXX.mp4`, the application will preserve these IDs in the generated subtitle files. This is useful if you need to maintain these IDs for reuploading or matching with an external system.

For example:
- Original video: `lecture-vi4pXldZVULSf4JaSdaWK9sX.mp4`
- Generated subtitles: 
  - `lecture-vi4pXldZVULSf4JaSdaWK9sX.srt`
  - `lecture-vi4pXldZVULSf4JaSdaWK9sX.vtt`

### Language Detection

The application can automatically detect the language of videos based on their filenames. This improves transcription accuracy by providing the Whisper model with language information.

You can configure language detection in several ways:

1. **Default language**: Set a default language for all videos
2. **Pattern matching**: Map patterns in filenames to specific languages
3. **Arabic detection**: Automatically detects Arabic characters in filenames

Configure language detection in your `.env` file:

```
# Set a default language for all videos
DEFAULT_LANGUAGE=ar

# Map filename patterns to specific languages
LANGUAGE_MAP=arabic:ar,Marina:en,الدوالي:ar,النوم:ar,النزيف:ar,الغازات:ar

# Enable/disable language detection (default: enabled)
DETECT_LANGUAGE=true
```

## Configuration

You can customize the application by creating a `.env` file in the project root with the following variables:

```
# Model selection
WHISPER_MODEL=base

# Processing options
USE_CUDA=true  # Default enabled (set to 'false' to disable GPU)
WHISPER_CUDA=1  # Force CUDA usage
WHISPER_CUDA_DEVICE=0  # Use first GPU device
WORD_TIMESTAMPS=false  # Disable individual word timestamps 
SPLIT_ON_WORD=false  # Group words by timestamps
TRANSLATE_TO_ENGLISH=false
REMOVE_WAV_FILE=true

# Custom directories
VIDEOS_DIR=/path/to/videos
OUTPUT_DIR=/path/to/output

# Output formats
OUTPUT_JSON=false
OUTPUT_TEXT=false
OUTPUT_WORDS=false
OUTPUT_LRC=false
OUTPUT_CSV=false

# Language options
DEFAULT_LANGUAGE=ar
DETECT_LANGUAGE=true
LANGUAGE_MAP=arabic:ar,Marina:en,الدوالي:ar,النوم:ar,النزيف:ar,الغازات:ar
```

### Available models

- tiny
- tiny.en
- base (default)
- base.en
- small
- small.en
- medium
- medium.en
- large-v1
- large
- large-v3-turbo

### Supported video & audio formats

- Video: .mp4, .avi, .mov, .mkv, .webm, .flv, .wmv, .m4v
- Audio: .mp3, .wav, .ogg, .aac

## Development

For development with automatic reloading:

```
npm run dev
```

## License

MIT 