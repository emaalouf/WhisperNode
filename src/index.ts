import fs from 'fs-extra';
import path from 'path';
import { nodewhisper } from 'nodejs-whisper';
import { config, SUPPORTED_EXTENSIONS } from './config';
import { extractVideoId, detectLanguage, postProcessSubtitles } from './utils';
import os from 'os';
import { Worker } from 'worker_threads';
// @ts-ignore - Add ts-ignore for worker-threads-pool which may not have type definitions
const workerThreadsPool = require('worker-threads-pool');
const createPool = workerThreadsPool.createPool;

// Types for worker threads
interface WorkerMessage {
  success: boolean;
  videoPath: string;
  error?: string;
}

interface WorkerData {
  videoPath: string;
  options: any;
}

// For AMD GPU processing
if (config.useAmdGpu) {
  process.env.HSA_OVERRIDE_GFX_VERSION = '10.3.0';
  process.env.ROCR_VISIBLE_DEVICES = '0';
  process.env.HIP_VISIBLE_DEVICES = '0';
  console.log('🚀 AMD GPU processing enabled');
}

// Set environment variables for CUDA before importing nodewhisper
if (config.withCuda) {
  process.env.WHISPER_CUDA = '1';
  process.env.WHISPER_CUDA_DEVICE = '0';
  console.log('🚀 CUDA enabled for Whisper processing');
}

// Track processing progress
let processedCount = 0;
let totalVideos = 0;
// Worker thread pool
let pool: any = null; // Worker thread pool

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
      // For Arabic text, we need to disable word timestamps to get proper phrase groups
      wordTimestamps: config.wordTimestamps,
      splitOnWord: config.splitOnWord,
      translateToEnglish: config.translateToEnglish,
      max_words_per_line: 7, // Add minimum words per line
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
    
    // Post-process the subtitle files to combine single characters into word groups
    const baseFileName = path.basename(videoPath, path.extname(videoPath));
    const dirPath = path.dirname(videoPath);
    
    // Process SRT and VTT files
    if (config.formats.srt) {
      const srtFile = path.join(dirPath, `${baseFileName}.srt`);
      if (await fs.pathExists(srtFile)) {
        await postProcessSubtitles(srtFile, 7); // Minimum 7 words per line as requested
      }
    }
    
    if (config.formats.vtt) {
      const vttFile = path.join(dirPath, `${baseFileName}.vtt`);
      if (await fs.pathExists(vttFile)) {
        await postProcessSubtitles(vttFile, 7);
      }
    }
    
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

// Worker thread for processing videos
function createWorkerScript() {
  // Create a worker script that can be executed in a separate thread
  const workerScript = `
    const { parentPort, workerData } = require('worker_threads');
    const { nodewhisper } = require('nodejs-whisper');
    const fs = require('fs-extra');
    const path = require('path');

    async function processVideoInWorker(videoPath, options) {
      try {
        await nodewhisper(videoPath, options);
        parentPort.postMessage({ success: true, videoPath });
      } catch (error) {
        parentPort.postMessage({ 
          success: false, 
          videoPath, 
          error: error.toString() 
        });
      }
    }

    processVideoInWorker(workerData.videoPath, workerData.options);
  `;

  const tempFilePath = path.join(__dirname, 'worker-script.js');
  fs.writeFileSync(tempFilePath, workerScript);
  return tempFilePath;
}

// Process multiple videos in parallel using worker threads
async function processVideosInParallel(videoPaths: string[], concurrency: number): Promise<void> {
  console.log(`Setting up parallel processing with ${concurrency} concurrent processes...`);
  
  // Create a worker thread pool
  pool = createPool({ max: concurrency });
  const workerScriptPath = createWorkerScript();
  
  // Process videos in parallel batches
  const promises = videoPaths.map(videoPath => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const filename = path.basename(videoPath);
        console.log(`Queuing: ${filename}`);
        
        // Detect language from filename
        const language = detectLanguage(filename);
        
        // Create whisper options with language if detected
        const whisperOptions: any = {
          outputInSrt: config.formats.srt,
          outputInVtt: config.formats.vtt,
          outputInJson: config.formats.json,
          outputInText: config.formats.text,
          outputInWords: config.formats.words,
          outputInLrc: config.formats.lrc,
          outputInCsv: config.formats.csv,
          // For Arabic text, we need to disable word timestamps to get proper phrase groups
          wordTimestamps: config.wordTimestamps,
          splitOnWord: config.splitOnWord,
          translateToEnglish: config.translateToEnglish,
          max_words_per_line: 7, // Add minimum words per line
        };
        
        // Add language parameter if detected
        if (language) {
          whisperOptions.language = language;
          console.log(`🌐 Using language for ${filename}: ${language}`);
        }
        
        const options = {
          modelName: config.modelName,
          autoDownloadModelName: config.modelName,
          removeWavFileAfterTranscription: config.removeWavFileAfterTranscription,
          // Enable GPU acceleration
          withCuda: config.withCuda,
          whisperOptions,
        };
        
        // Use worker pool to process the video
        pool.acquire(workerScriptPath, { videoPath, options } as WorkerData, function(err: Error | null, worker: Worker) {
          if (err) {
            console.error(`❌ Worker error for ${filename}:`, err);
            processedCount++;
            console.log(`⚠️ Progress: ${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete`);
            resolve();
            return;
          }
          
          // Listen for worker completion
          worker.on('message', async (result: WorkerMessage) => {
            if (result.success) {
              try {
                // Post-process the subtitle files
                const baseFileName = path.basename(videoPath, path.extname(videoPath));
                const dirPath = path.dirname(videoPath);
                
                // Process SRT and VTT files
                if (config.formats.srt) {
                  const srtFile = path.join(dirPath, `${baseFileName}.srt`);
                  if (await fs.pathExists(srtFile)) {
                    await postProcessSubtitles(srtFile, 7);
                  }
                }
                
                if (config.formats.vtt) {
                  const vttFile = path.join(dirPath, `${baseFileName}.vtt`);
                  if (await fs.pathExists(vttFile)) {
                    await postProcessSubtitles(vttFile, 7);
                  }
                }
                
                // After processing, handle the output files to preserve video ID
                await handleOutputFiles(videoPath);
                
                processedCount++;
                console.log(`✅ Completed: ${filename} (${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete)`);
              } catch (error) {
                console.error(`❌ Post-processing error for ${filename}:`, error);
                processedCount++;
                console.log(`⚠️ Progress: ${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete`);
              }
            } else {
              console.error(`❌ Error processing ${filename}:`, result.error);
              processedCount++;
              console.log(`⚠️ Progress: ${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete`);
            }
            resolve();
          });
          
          worker.on('error', (err: Error) => {
            console.error(`❌ Worker error for ${filename}:`, err);
            processedCount++;
            console.log(`⚠️ Progress: ${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete`);
            resolve();
          });
        });
      } catch (error) {
        console.error(`❌ Error queueing ${path.basename(videoPath)}:`, error);
        processedCount++;
        console.log(`⚠️ Progress: ${processedCount}/${totalVideos}, ${Math.round((processedCount/totalVideos)*100)}% complete`);
        resolve();
      }
    });
  });
  
  // Wait for all videos to be processed
  await Promise.all(promises);
  
  // Clean up the worker script
  try {
    fs.unlinkSync(workerScriptPath);
  } catch (e) {
    // Ignore cleanup errors
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
    
    // Create an array of file paths to process
    const videoPaths = videoFiles.map(file => path.join(config.videosDir, file));
    
    // Check if we should use AMD GPU optimization or parallel processing
    const useParallel = config.maxConcurrentProcesses > 1 || process.argv.includes('--parallel');
    
    if (useParallel) {
      console.log(`Using parallel processing with ${config.maxConcurrentProcesses} workers`);
      await processVideosInParallel(videoPaths, config.maxConcurrentProcesses);
    } else {
      // Process sequentially for testing or debugging
      console.log(`Using sequential processing (single thread)`);
      for (const videoPath of videoPaths) {
        await processVideo(videoPath);
      }
    }
    
    console.log('All videos processed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Clean up worker thread pool if used
    if (pool) {
      pool.destroy();
    }
  }
}

// Run the application
main(); 