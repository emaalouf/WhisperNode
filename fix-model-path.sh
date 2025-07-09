#!/bin/bash

# Fix Whisper Model Path Issue
# This script creates a symbolic link to make the nodejs-whisper models accessible

echo "🔧 Fixing WhisperNode model path issue..."

# Check if node_modules exists
if [ ! -d "node_modules/nodejs-whisper/cpp/whisper.cpp/models" ]; then
    echo "❌ Error: nodejs-whisper models directory not found."
    echo "   Please run 'npm install' first."
    exit 1
fi

# Remove existing models directory/symlink if it exists
if [ -L "models" ] || [ -d "models" ]; then
    echo "🗑️  Removing existing models directory/symlink..."
    rm -rf models
fi

# Create symbolic link to nodejs-whisper models
echo "🔗 Creating symbolic link to nodejs-whisper models..."
ln -sf node_modules/nodejs-whisper/cpp/whisper.cpp/models models

# Verify the link works
if [ -f "models/ggml-base.bin" ]; then
    echo "✅ Success! Model files are now accessible:"
    ls -la models/ggml-*.bin 2>/dev/null || echo "   No .bin model files found (they may need to be downloaded)"
    echo ""
    echo "🚀 You can now run your WhisperNode processing:"
    echo "   npm start"
    echo "   npm run parallel-process"
else
    echo "⚠️  Symbolic link created but model files not found."
    echo "   You may need to download the models first:"
    echo "   npm run download-model"
fi 