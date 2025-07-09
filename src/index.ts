import fs from 'fs-extra';
import path from 'path';
import { nodewhisper } from 'nodejs-whisper';
import { config, SUPPORTED_EXTENSIONS } from './config';

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