import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import os from 'os';

// Load environment variables from .env file if it exists
dotenv.config();

interface Config {
  // Directories
  videosDir: string;
  outputDir: string;
  
  // Whisper model configuration
  modelName: string;
  withCuda: boolean;
  
  // AMD GPU specific options
  useAmdGpu: boolean;
  maxConcurrentProcesses: number;
  
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
  
  // Language options
  defaultLanguage: string | null; // Language code like 'en', 'ar', 'fr', etc.
  detectLanguage: boolean;        // Whether to attempt language detection
  languageMap: Record<string, string>; // Map video filename patterns to languages
  
  // Language detection method
  languageDetectionMethod: 'manual' | 'enhanced' | 'auto' | 'whisper-only';
  
  // Subtitle post-processing
  deduplicateSubtitles: boolean;
  maxDuplicates: number;
}

// Determine optimal concurrency based on system
const cpuCores = os.cpus().length;
const defaultConcurrency = Math.max(1, Math.floor(cpuCores * 0.75)); // Use 75% of available cores

// Default configuration
const defaultConfig: Config = {
  videosDir: process.env.VIDEOS_DIR || path.join(process.cwd(), 'videos'),
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'videos'), // Save alongside videos by default
  
  modelName: process.env.WHISPER_MODEL || 'base',
  withCuda: process.env.USE_CUDA === 'false' ? false : true, // Default to true unless explicitly set to false
  
  // AMD GPU support
  useAmdGpu: process.env.USE_AMD_GPU === 'true' || false,
  maxConcurrentProcesses: parseInt(process.env.MAX_CONCURRENT_PROCESSES || defaultConcurrency.toString(), 10),
  
  formats: {
    srt: true,
    vtt: true,
    json: process.env.OUTPUT_JSON === 'true' || false,
    text: process.env.OUTPUT_TEXT === 'true' || false,
    words: process.env.OUTPUT_WORDS === 'true' || false,
    lrc: process.env.OUTPUT_LRC === 'true' || false,
    csv: process.env.OUTPUT_CSV === 'true' || false,
  },
  
  wordTimestamps: process.env.WORD_TIMESTAMPS === 'true' ? true : false,
  splitOnWord: process.env.SPLIT_ON_WORD === 'true' ? true : false,
  translateToEnglish: process.env.TRANSLATE_TO_ENGLISH === 'true' || false,
  removeWavFileAfterTranscription: process.env.REMOVE_WAV_FILE === 'false' ? false : true,
  
  // Language configuration
  defaultLanguage: process.env.DEFAULT_LANGUAGE || null,
  detectLanguage: process.env.DETECT_LANGUAGE !== 'false',
  languageMap: parseLanguageMap(process.env.LANGUAGE_MAP),
  
  // Language detection method: 'manual', 'enhanced', 'auto', 'whisper-only'
  languageDetectionMethod: (process.env.LANGUAGE_DETECTION_METHOD || 'manual') as 'manual' | 'enhanced' | 'auto' | 'whisper-only',
  
  // Subtitle post-processing
  deduplicateSubtitles: process.env.DEDUPLICATE_SUBTITLES === 'false' ? false : true,
  maxDuplicates: parseInt(process.env.MAX_DUPLICATES || '1', 10),
};

/**
 * Parse the language map from the environment variable
 * Format: "pattern1:language1,pattern2:language2"
 * Example: "arabic:ar,english:en,Marina:en"
 */
function parseLanguageMap(mapString: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (!mapString) {
    return result;
  }
  
  const pairs = mapString.split(',');
  for (const pair of pairs) {
    const [pattern, language] = pair.split(':');
    if (pattern && language) {
      result[pattern.trim()] = language.trim().toLowerCase();
    }
  }
  
  return result;
}

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
  'large-v2',
  'large-v3',
  'large',
  'large-v3-turbo',
];

// Supported language codes for Whisper
export const LANGUAGE_CODES = [
  'auto', // Auto detect
  'en',   // English
  'zh',   // Chinese
  'de',   // German
  'es',   // Spanish
  'ru',   // Russian
  'ko',   // Korean
  'fr',   // French
  'ja',   // Japanese
  'pt',   // Portuguese
  'tr',   // Turkish
  'pl',   // Polish
  'ca',   // Catalan
  'nl',   // Dutch
  'ar',   // Arabic
  'sv',   // Swedish
  'it',   // Italian
  'id',   // Indonesian
  'hi',   // Hindi
  'fi',   // Finnish
  'vi',   // Vietnamese
  'he',   // Hebrew
  'uk',   // Ukrainian
  'el',   // Greek
  'ms',   // Malay
  'cs',   // Czech
  'ro',   // Romanian
  'da',   // Danish
  'hu',   // Hungarian
  'ta',   // Tamil
  'no',   // Norwegian
  'th',   // Thai
  'ur',   // Urdu
  'hr',   // Croatian
  'bg',   // Bulgarian
  'lt',   // Lithuanian
  'la',   // Latin
  'mi',   // Maori
  'ml',   // Malayalam
  'cy',   // Welsh
  'sk',   // Slovak
  'te',   // Telugu
  'fa',   // Persian
  'lv',   // Latvian
  'bn',   // Bengali
  'sr',   // Serbian
  'az',   // Azerbaijani
  'sl',   // Slovenian
  'kn',   // Kannada
  'et',   // Estonian
  'mk',   // Macedonian
  'br',   // Breton
  'eu',   // Basque
  'is',   // Icelandic
  'hy',   // Armenian
  'ne',   // Nepali
  'mn',   // Mongolian
  'bs',   // Bosnian
  'kk',   // Kazakh
  'sq',   // Albanian
  'sw',   // Swahili
  'gl',   // Galician
  'mr',   // Marathi
  'pa',   // Punjabi
  'si',   // Sinhala
  'km',   // Khmer
  'sn',   // Shona
  'yo',   // Yoruba
  'so',   // Somali
  'af',   // Afrikaans
  'oc',   // Occitan
  'ka',   // Georgian
  'be',   // Belarusian
  'tg',   // Tajik
  'sd',   // Sindhi
  'gu',   // Gujarati
  'am',   // Amharic
  'yi',   // Yiddish
  'lo',   // Lao
  'uz',   // Uzbek
  'fo',   // Faroese
  'ht',   // Haitian Creole
  'ps',   // Pashto
  'tk',   // Turkmen
  'nn',   // Nynorsk
  'mt',   // Maltese
  'sa',   // Sanskrit
  'lb',   // Luxembourgish
  'my',   // Myanmar
  'bo',   // Tibetan
  'tl',   // Tagalog
  'mg',   // Malagasy
  'as',   // Assamese
  'tt',   // Tatar
  'haw',  // Hawaiian
  'ln',   // Lingala
  'ha',   // Hausa
  'ba',   // Bashkir
  'jw',   // Javanese
  'su',   // Sundanese
  'yue',  // Cantonese
];

// Set OpenMP environment variables for optimal CPU performance
if (!defaultConfig.useAmdGpu) {
  // If not using AMD GPU, maximize CPU utilization
  process.env.OMP_NUM_THREADS = cpuCores.toString();
  process.env.OMP_DYNAMIC = 'true';
  process.env.WHISPER_THREADS = cpuCores.toString();
} else {
  // Using AMD GPU - balance CPU resources
  process.env.OMP_NUM_THREADS = Math.max(2, Math.floor(cpuCores / 4)).toString();
}

// Set environment variables for CUDA before importing nodewhisper
if (defaultConfig.withCuda) {
  process.env.WHISPER_CUDA = '1';
  process.env.WHISPER_CUDA_DEVICE = '0';
  console.log('🚀 CUDA enabled for Whisper processing');
}

// Suppress nodejs-whisper internal warnings and errors
process.env.NODE_NO_WARNINGS = '1';
process.env.WHISPER_SUPPRESS_WARNINGS = '1';

// Export the configuration
export const config: Config = defaultConfig; 