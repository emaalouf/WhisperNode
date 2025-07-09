import path from 'path';
import fs from 'fs-extra';
import { config } from './config';

/**
 * Post-processes subtitle files to combine individual characters into word groups
 * @param filePath Path to the subtitle file
 * @param minWordsPerLine Minimum number of words per line (default 5)
 */
export async function postProcessSubtitles(filePath: string, minWordsPerLine: number = 5): Promise<void> {
  // Only process certain subtitle formats
  const ext = path.extname(filePath).toLowerCase();
  if (!['.srt', '.vtt'].includes(ext)) {
    return;
  }
  
  try {
    // Read the subtitle file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Process based on file type
    let processedContent: string;
    if (ext === '.srt') {
      processedContent = processSrtFile(content, minWordsPerLine);
      
      // Apply deduplication if enabled
      if (config.deduplicateSubtitles) {
        processedContent = deduplicateSubtitles(processedContent, config.maxDuplicates);
      }
    } else if (ext === '.vtt') {
      processedContent = processVttFile(content, minWordsPerLine);
      
      // Apply deduplication if enabled
      if (config.deduplicateSubtitles) {
        processedContent = deduplicateSubtitles(processedContent, config.maxDuplicates);
      }
    } else {
      return;
    }
    
    // Write processed content back to file
    await fs.writeFile(filePath, processedContent, 'utf8');
    console.log(`📝 Post-processed subtitle file: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error post-processing subtitle file: ${filePath}`, error);
  }
}

/**
 * Process SRT subtitle file to combine characters into proper word groups
 */
function processSrtFile(content: string, minWordsPerLine: number): string {
  // Split by subtitle entries (double newline)
  let entries = content.split('\r\n\r\n').filter(Boolean);
  if (entries.length <= 1) {
    entries = content.split('\n\n').filter(Boolean);
  }
  
  let currentGroup: string[] = [];
  let currentTimestamp = '';
  let currentIndex = 1;
  let result: string[] = [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const lines = entry.split('\n').filter(Boolean);
    
    if (lines.length < 2) continue;
    
    const indexLine = lines[0];
    const timestampLine = lines[1];
    const textLine = lines.slice(2).join(' ').trim();
    
    // If this is a single character or very short text, add to current group
    if (textLine.length <= 3 || countWords(textLine) < minWordsPerLine) {
      if (currentGroup.length === 0) {
        currentTimestamp = timestampLine;
      }
      currentGroup.push(textLine);
    } else {
      // This entry already has enough words, keep it as is
      if (currentGroup.length > 0) {
        // Add the previous group first
        result.push(`${currentIndex}\n${currentTimestamp}\n${currentGroup.join(' ')}`);
        currentIndex++;
        currentGroup = [];
      }
      
      // Then add this complete entry
      result.push(`${currentIndex}\n${timestampLine}\n${textLine}`);
      currentIndex++;
    }
  }
  
  // Add any remaining group
  if (currentGroup.length > 0) {
    result.push(`${currentIndex}\n${currentTimestamp}\n${currentGroup.join(' ')}`);
  }
  
  return result.join('\n\n') + '\n\n';
}

/**
 * Process VTT subtitle file to combine characters into proper word groups
 */
function processVttFile(content: string, minWordsPerLine: number): string {
  // For VTT, first line is "WEBVTT" - preserve it
  const vttHeader = content.split('\n')[0];
  
  // Rest is similar to SRT
  const parts = content.split('\n\n').slice(1).filter(Boolean);
  
  let currentGroup: string[] = [];
  let currentTimestamp = '';
  let result: string[] = [vttHeader];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const lines = part.split('\n').filter(Boolean);
    
    if (lines.length < 2) continue;
    
    const timestampLine = lines[0];
    const textLine = lines.slice(1).join(' ').trim();
    
    // If this is a single character or very short text, add to current group
    if (textLine.length <= 3 || countWords(textLine) < minWordsPerLine) {
      if (currentGroup.length === 0) {
        currentTimestamp = timestampLine;
      }
      currentGroup.push(textLine);
    } else {
      // This entry already has enough words, keep it as is
      if (currentGroup.length > 0) {
        // Add the previous group first
        result.push(`${currentTimestamp}\n${currentGroup.join(' ')}`);
        currentGroup = [];
      }
      
      // Then add this complete entry
      result.push(`${timestampLine}\n${textLine}`);
    }
  }
  
  // Add any remaining group
  if (currentGroup.length > 0) {
    result.push(`${currentTimestamp}\n${currentGroup.join(' ')}`);
  }
  
  return result.join('\n\n') + '\n\n';
}

/**
 * Count the number of words in a string
 */
function countWords(text: string): number {
  // For Arabic text, count words by splitting on spaces and filtering empty strings
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Deduplicate repeated subtitle lines
 * @param content The subtitle content to deduplicate
 * @param maxDuplicates Maximum number of allowed consecutive duplicates
 */
export function deduplicateSubtitles(content: string, maxDuplicates: number = 1): string {
  // Determine if it's SRT or VTT format
  const isSrt = content.includes('\r\n\r\n') || content.includes('\n\n');
  const separator = content.includes('\r\n\r\n') ? '\r\n\r\n' : '\n\n';
  
  // Split into subtitle entries
  const entries = content.split(separator).filter(Boolean);
  const result: string[] = [];
  
  const seenTexts = new Map<string, number>();
  let lastTextKey = '';
  
  for (const entry of entries) {
    const lines = entry.split('\n').filter(Boolean);
    
    if (lines.length < 2) continue;
    
    // Extract index/timestamp and text parts
    let indexOrTimestamp, text;
    
    if (isSrt) {
      // For SRT: first line is index, second is timestamp, rest is text
      indexOrTimestamp = lines.slice(0, 2).join('\n');
      text = lines.slice(2).join(' ').trim();
    } else {
      // For VTT: first line is timestamp, rest is text
      indexOrTimestamp = lines[0];
      text = lines.slice(1).join(' ').trim();
    }
    
    // Create a key for comparing texts (normalize case, trim whitespace)
    const textKey = text.toLowerCase().trim();
    
    // Skip exact duplicates beyond the allowed maximum
    if (textKey === lastTextKey) {
      const count = seenTexts.get(textKey) || 0;
      if (count >= maxDuplicates) {
        continue; // Skip this duplicate
      }
      seenTexts.set(textKey, count + 1);
    } else {
      // New text
      seenTexts.set(textKey, 1);
      lastTextKey = textKey;
    }
    
    // Add to result
    if (isSrt) {
      result.push(`${indexOrTimestamp}\n${text}`);
    } else {
      result.push(`${indexOrTimestamp}\n${text}`);
    }
  }
  
  return result.join(separator) + separator;
}

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