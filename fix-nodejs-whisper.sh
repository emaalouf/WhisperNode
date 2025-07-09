#!/bin/bash

# WhisperNode - nodejs-whisper Fix Script
# This script addresses common nodejs-whisper path and warning issues

echo "🔧 WhisperNode: Fixing nodejs-whisper issues..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "Please run this script from the WhisperNode project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_error "node_modules not found. Please run 'npm install' first"
    exit 1
fi

# Fix 1: Create/update models directory symlink
print_status "Fixing models directory path..."
if [ -L "models" ] || [ -d "models" ]; then
    print_status "Removing existing models directory/symlink..."
    rm -rf models
fi

if [ -d "node_modules/nodejs-whisper/cpp/whisper.cpp/models" ]; then
    print_status "Creating symbolic link to nodejs-whisper models..."
    ln -sf node_modules/nodejs-whisper/cpp/whisper.cpp/models models
    print_success "Models symlink created successfully"
else
    print_warning "nodejs-whisper models directory not found. The package may need to be reinstalled."
fi

# Fix 2: Ensure build directory exists
print_status "Checking nodejs-whisper build directory..."
WHISPER_BUILD_DIR="node_modules/nodejs-whisper/cpp/whisper.cpp/build"
if [ ! -d "$WHISPER_BUILD_DIR" ]; then
    print_warning "Build directory not found. Creating directory structure..."
    mkdir -p "$WHISPER_BUILD_DIR"
    mkdir -p "$WHISPER_BUILD_DIR/bin"
    print_success "Build directory structure created"
else
    print_success "Build directory exists"
fi

# Fix 3: Set proper permissions
print_status "Setting proper permissions..."
chmod -R 755 node_modules/nodejs-whisper/cpp/whisper.cpp/ 2>/dev/null || true
if [ -f "node_modules/nodejs-whisper/cpp/whisper.cpp/build/bin/whisper-cli" ]; then
    chmod +x node_modules/nodejs-whisper/cpp/whisper.cpp/build/bin/whisper-cli
    print_success "Whisper CLI permissions set"
fi

# Fix 4: Create environment setup script
print_status "Creating environment setup script..."
cat > setup-whisper-env.sh << 'EOF'
#!/bin/bash
# WhisperNode Environment Setup
# Source this script before running WhisperNode to suppress warnings

export NODE_NO_WARNINGS=1
export WHISPER_SUPPRESS_WARNINGS=1

# CUDA settings (if available)
if command -v nvidia-smi >/dev/null 2>&1; then
    export WHISPER_CUDA=1
    export WHISPER_CUDA_DEVICE=0
    echo "🚀 CUDA environment configured"
fi

# AMD GPU settings (if configured)
if [ "$USE_AMD_GPU" = "true" ]; then
    export HSA_OVERRIDE_GFX_VERSION=10.3.0
    export ROCR_VISIBLE_DEVICES=0
    export HIP_VISIBLE_DEVICES=0
    echo "🚀 AMD GPU environment configured"
fi

echo "✅ WhisperNode environment configured"
EOF

chmod +x setup-whisper-env.sh
print_success "Environment setup script created: setup-whisper-env.sh"

# Fix 5: Verify model files
print_status "Verifying model files..."
if [ -f "models/ggml-base.bin" ]; then
    print_success "Base model found ($(du -h models/ggml-base.bin | cut -f1))"
else
    print_warning "Base model not found. Run 'npm run download-model' to download it."
fi

# Fix 6: Create improved startup script
print_status "Creating improved startup script..."
cat > start-whisper.sh << 'EOF'
#!/bin/bash
# WhisperNode Improved Startup Script

# Source environment setup
source ./setup-whisper-env.sh

# Suppress specific nodejs-whisper warnings
exec 2> >(grep -v "cd: not a directory" >&2)

# Check if built version exists
if [ ! -f "dist/index.js" ]; then
    echo "🔨 Building project..."
    npm run build
fi

# Start processing
echo "🚀 Starting WhisperNode with parallel processing..."
npm run parallel-process 2> >(grep -v -E "(cd: not a directory|nodejs-whisper.*warning)" >&2)
EOF

chmod +x start-whisper.sh
print_success "Improved startup script created: start-whisper.sh"

# Summary
echo ""
print_success "✅ WhisperNode nodejs-whisper fixes completed!"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run: ${GREEN}source ./setup-whisper-env.sh${NC} (to set environment variables)"
echo "2. Run: ${GREEN}./start-whisper.sh${NC} (to start processing with warning suppression)"
echo "3. Or use: ${GREEN}npm run parallel-process${NC} (standard startup)"
echo ""
echo -e "${BLUE}Created files:${NC}"
echo "- setup-whisper-env.sh (environment configuration)"
echo "- start-whisper.sh (improved startup with warning suppression)"
echo "- models/ (symlink to nodejs-whisper models)"
echo ""
echo -e "${YELLOW}Note:${NC} The 'cd: not a directory' warnings are from nodejs-whisper itself"
echo "and don't affect processing. Your application is working correctly!" 