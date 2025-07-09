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
  
  // Language options
  defaultLanguage: string | null; // Language code like 'en', 'ar', 'fr', etc.
  detectLanguage: boolean;        // Whether to attempt language detection
  languageMap: Record<string, string>; // Map video filename patterns to languages
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
  
  // Language configuration
  defaultLanguage: process.env.DEFAULT_LANGUAGE || null,
  detectLanguage: process.env.DETECT_LANGUAGE !== 'false',
  languageMap: parseLanguageMap(process.env.LANGUAGE_MAP),
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

// Export the configuration
export const config: Config = defaultConfig; 