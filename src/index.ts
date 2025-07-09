import fs from 'fs-extra';
import path from 'path';
import { nodewhisper } from 'nodejs-whisper';
import { config, SUPPORTED_EXTENSIONS } from './config';
import { extractVideoId, detectLanguage } from './utils';
import os from 'os';

// Track processing progress
let processedCount = 0;
let totalVideos = 0;

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
    const filename = path.basename(videoPath);
    console.log(`Processing: ${filename}`);
    
    // Detect language from filename
    const language = detectLanguage(filename);
    if (language) {
      console.log(`🌐 Using language: ${language}`);
    } else {
      console.log(`🌐 No specific language detected, letting Whisper auto-detect`);
    }
    
    // Create whisper options with language if detected
    const whisperOptions: any = {
      outputInSrt: config.formats.srt,
      outputInVtt: config.formats.vtt,
      outputInJson: config.formats.json,
      outputInText: config.formats.text,
      outputInWords: config.formats.words,
      outputInLrc: config.formats.lrc,
      outputInCsv: config.formats.csv,
      wordTimestamps: config.wordTimestamps,
      // Turn off split on word to get groups of words per timestamp
      splitOnWord: false,
      translateToEnglish: config.translateToEnglish,
    };
    
    // Add language parameter if detected
    if (language) {
      whisperOptions.language = language;
    }
    
    await nodewhisper(videoPath, {
      modelName: config.modelName,
      autoDownloadModelName: config.modelName,
      removeWavFileAfterTranscription: config.removeWavFileAfterTranscription,
      // Enable GPU acceleration
      withCuda: config.withCuda,
      logger: console,
      whisperOptions,
    });
    
    // After processing, handle the output files to preserve video ID
    await handleOutputFiles(videoPath);
    
    // Increment processed count and show progress
    processedCount++;
    console.log(`✅ Completed: ${filename} (${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete)`);
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(videoPath)}:`, error);
    
    // Still increment count even if there was an error
    processedCount++;
    console.log(`⚠️ Progress: ${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete`);
  }
}

// Process multiple videos in parallel
async function processVideosInParallel(videoPaths: string[], concurrency: number): Promise<void> {
  // Process videos in batches based on concurrency
  const batches = [];
  for (let i = 0; i < videoPaths.length; i += concurrency) {
    batches.push(videoPaths.slice(i, i + concurrency));
  }
  
  for (const batch of batches) {
    await Promise.all(batch.map(videoPath => processVideo(videoPath)));
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
    
    // Set total videos count for progress tracking
    totalVideos = videoFiles.length;
    console.log(`Found ${totalVideos} video files. Starting processing...`);
    
    // Determine optimal concurrency based on available CPU cores
    // When using GPU, we can process multiple videos concurrently
    const cpuCores = os.cpus().length;
    // Using half the cores for parallelism with GPU (adjust this based on performance testing)
    const concurrency = config.withCuda ? Math.max(2, Math.floor(cpuCores / 2)) : 1;
    
    console.log(`Using ${concurrency} concurrent processes with GPU: ${config.withCuda ? 'Enabled' : 'Disabled'}`);
    
    // Create an array of file paths to process
    const videoPaths = videoFiles.map(file => path.join(config.videosDir, file));
    
    // Process videos in parallel
    await processVideosInParallel(videoPaths, concurrency);
    
    console.log('All videos processed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Run the application
main(); 