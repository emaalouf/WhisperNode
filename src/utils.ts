import path from 'path';
import { config } from './config';

/**
 * Extracts the video ID from a filename with the pattern: name-videoId.extension
 * @param filename The original filename
 * @returns Object containing the base name, video ID, and extension
 */
export function extractVideoId(filename: string): { baseName: string; videoId: string | null; extension: string } {
  const extension = path.extname(filename);
  const nameWithoutExt = path.basename(filename, extension);
  
  // Match the pattern: name-videoId
  const idMatch = nameWithoutExt.match(/-vi[a-zA-Z0-9]+$/);
  
  if (idMatch) {
    const videoId = idMatch[0]; // The matched ID with the hyphen
    const baseName = nameWithoutExt.slice(0, nameWithoutExt.length - videoId.length);
    return { baseName, videoId, extension };
  }
  
  return { baseName: nameWithoutExt, videoId: null, extension };
}

/**
 * Creates a filename with the original video ID preserved
 * @param originalFilename The original filename with possible ID
 * @param newBaseName The new base name for the file
 * @param newExtension The new extension
 * @returns A new filename with the ID preserved
 */
export function createFilenameWithId(
  originalFilename: string, 
  newBaseName: string,
  newExtension: string
): string {
  const { videoId } = extractVideoId(originalFilename);
  
  if (videoId) {
    // Append the ID before the new extension
    return `${newBaseName}${videoId}${newExtension}`;
  }
  
  return `${newBaseName}${newExtension}`;
}

/**
 * Detects the language of a video based on its filename and the language map
 * @param filename The video filename
 * @returns The detected language code or null if no match found
 */
export function detectLanguage(filename: string): string | null {
  // First, check for default language if set
  if (!config.detectLanguage) {
    return config.defaultLanguage;
  }
  
  // Look through the language map for matches in the filename
  const lowercaseFilename = filename.toLowerCase();
  
  for (const [pattern, language] of Object.entries(config.languageMap)) {
    if (lowercaseFilename.includes(pattern.toLowerCase())) {
      console.log(`🔍 Language detected for ${filename}: ${language} (matched pattern: ${pattern})`);
      return language;
    }
  }

  // If we have Arabic characters, assume it's Arabic
  if (/[\u0600-\u06FF]/.test(filename)) {
    console.log(`🔍 Arabic language detected for ${filename} (based on Arabic characters)`);
    return 'ar';
  }
  
  // If no match found, return default language
  return config.defaultLanguage;
} 