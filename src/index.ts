import fs from 'fs-extra';
import path from 'path';
import { nodewhisper } from 'nodejs-whisper';
import { config, SUPPORTED_EXTENSIONS } from './config';
import { extractVideoId } from './utils';

// Create output directory if it doesn't exist
async function ensureDirectories() {
  await fs.ensureDir(config.videosDir);
  await fs.ensureDir(config.outputDir);
  console.log('Directories ready');
}

// Check if a file is a video based on its extension
function isVideoFile(file: string): boolean {
  const extension = path.extname(file).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(extension);
}

/**
 * Custom hook to preserve the video ID in the output files
 * This function will be called after the nodewhisper processing completes
 * @param originalFilePath The original video file path
 */
async function handleOutputFiles(originalFilePath: string): Promise<void> {
  const originalFileName = path.basename(originalFilePath);
  const { baseName, videoId, extension } = extractVideoId(originalFileName);
  
  // If there's no video ID, no need to rename files
  if (!videoId) return;
  
  const baseNameWithoutExt = path.basename(originalFilePath, extension);
  const dirPath = path.dirname(originalFilePath);
  
  // Get list of generated subtitle files (they'll have same basename but different extensions)
  const files = await fs.readdir(dirPath);
  
  for (const file of files) {
    // Find files with the same base name but different extension
    const outputExtension = path.extname(file);
    const possibleSubtitleExtensions = ['.srt', '.vtt', '.json', '.txt', '.wts', '.lrc', '.csv'];
    
    if (
      possibleSubtitleExtensions.includes(outputExtension) &&
      file.startsWith(baseNameWithoutExt) &&
      !file.includes(videoId)
    ) {
      // This is a generated subtitle file without the video ID
      const newFileName = `${baseNameWithoutExt}${videoId}${outputExtension}`;
      const oldPath = path.join(dirPath, file);
      const newPath = path.join(dirPath, newFileName);
      
      try {
        await fs.rename(oldPath, newPath);
        console.log(`✅ Renamed: ${file} -> ${newFileName}`);
      } catch (error) {
        console.error(`❌ Error renaming ${file}:`, error);
      }
    }
  }
}

// Process a single video file
async function processVideo(videoPath: string): Promise<void> {
  try {
    console.log(`Processing: ${path.basename(videoPath)}`);
    
    await nodewhisper(videoPath, {
      modelName: config.modelName,
      autoDownloadModelName: config.modelName,
      removeWavFileAfterTranscription: config.removeWavFileAfterTranscription,
      withCuda: config.withCuda,
      logger: console,
      whisperOptions: {
        outputInSrt: config.formats.srt,
        outputInVtt: config.formats.vtt,
        outputInJson: config.formats.json,
        outputInText: config.formats.text,
        outputInWords: config.formats.words,
        outputInLrc: config.formats.lrc,
        outputInCsv: config.formats.csv,
        wordTimestamps: config.wordTimestamps,
        splitOnWord: config.splitOnWord,
        translateToEnglish: config.translateToEnglish,
      },
    });
    
    // After processing, handle the output files to preserve video ID
    await handleOutputFiles(videoPath);
    
    console.log(`✅ Completed: ${path.basename(videoPath)}`);
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(videoPath)}:`, error);
  }
}

// Main function
async function main() {
  try {
    await ensureDirectories();
    
    // Read all files from the videos directory
    const files = await fs.readdir(config.videosDir);
    const videoFiles = files.filter(file => isVideoFile(file));
    
    if (videoFiles.length === 0) {
      console.log('No video files found in the videos directory.');
      return;
    }
    
    console.log(`Found ${videoFiles.length} video files. Starting processing...`);
    
    // Process each video sequentially
    for (const videoFile of videoFiles) {
      const videoPath = path.join(config.videosDir, videoFile);
      await processVideo(videoPath);
    }
    
    console.log('All videos processed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Run the application
main(); 