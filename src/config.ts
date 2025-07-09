import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

interface Config {
  // Directories
  videosDir: string;
  outputDir: string;
  
  // Whisper model configuration
  modelName: string;
  withCuda: boolean;
  
  // Output formats
  formats: {
    srt: boolean;
    vtt: boolean;
    json: boolean;
    text: boolean;
    words: boolean;
    lrc: boolean;
    csv: boolean;
  };
  
  // Processing options
  wordTimestamps: boolean;
  splitOnWord: boolean;
  translateToEnglish: boolean;
  removeWavFileAfterTranscription: boolean;
}

// Default configuration
const defaultConfig: Config = {
  videosDir: process.env.VIDEOS_DIR || path.join(process.cwd(), 'videos'),
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'videos'), // Save alongside videos by default
  
  modelName: process.env.WHISPER_MODEL || 'base',
  withCuda: process.env.USE_CUDA === 'true' || false,
  
  formats: {
    srt: true,
    vtt: true,
    json: process.env.OUTPUT_JSON === 'true' || false,
    text: process.env.OUTPUT_TEXT === 'true' || false,
    words: process.env.OUTPUT_WORDS === 'true' || false,
    lrc: process.env.OUTPUT_LRC === 'true' || false,
    csv: process.env.OUTPUT_CSV === 'true' || false,
  },
  
  wordTimestamps: process.env.WORD_TIMESTAMPS === 'false' ? false : true,
  splitOnWord: process.env.SPLIT_ON_WORD === 'false' ? false : true,
  translateToEnglish: process.env.TRANSLATE_TO_ENGLISH === 'true' || false,
  removeWavFileAfterTranscription: process.env.REMOVE_WAV_FILE === 'false' ? false : true,
};

// List of supported video file extensions
export const SUPPORTED_EXTENSIONS = [
  '.mp4', '.avi', '.mov', '.mkv',
  '.webm', '.flv', '.wmv', '.m4v',
  '.mp3', '.wav', '.ogg', '.aac', // Audio formats are also supported
];

// Available whisper models
export const AVAILABLE_MODELS = [
  'tiny',
  'tiny.en',
  'base',
  'base.en',
  'small',
  'small.en',
  'medium',
  'medium.en',
  'large-v1',
  'large',
  'large-v3-turbo',
];

// Export the configuration
export const config: Config = defaultConfig; 