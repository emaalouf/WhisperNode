import path from 'path';

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