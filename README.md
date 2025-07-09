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

## Configuration

You can customize the application by creating a `.env` file in the project root with the following variables:

```
# Model selection
WHISPER_MODEL=base

# Processing options
USE_CUDA=false
WORD_TIMESTAMPS=true
SPLIT_ON_WORD=true
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