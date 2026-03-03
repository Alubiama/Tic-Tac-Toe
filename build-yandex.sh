#!/bin/bash
# Build script for Yandex Games
# Creates a ZIP archive ready for upload to https://yandex.ru/games/developer
#
# Usage: ./build-yandex.sh

set -e

BUILD_DIR="build-yandex"
ZIP_NAME="infinite-tictactoe-yandex.zip"

echo "🎮 Building Infinite Tic-Tac-Toe for Yandex Games..."

# Clean previous build
rm -rf "$BUILD_DIR" "$ZIP_NAME"
mkdir -p "$BUILD_DIR/js" "$BUILD_DIR/css"

# Copy game files
cp index.html "$BUILD_DIR/"
cp css/style.css "$BUILD_DIR/css/"
cp css/animations.css "$BUILD_DIR/css/"
cp js/app.js "$BUILD_DIR/js/"
cp js/game.js "$BUILD_DIR/js/"
cp js/board.js "$BUILD_DIR/js/"
cp js/ai.js "$BUILD_DIR/js/"
cp js/yandex.js "$BUILD_DIR/js/"
cp js/sound.js "$BUILD_DIR/js/"
cp js/telegram.js "$BUILD_DIR/js/"
cp js/firebase.js "$BUILD_DIR/js/"
cp js/config.js "$BUILD_DIR/js/"

# Create ZIP
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -x ".*"
cd ..

# Cleanup
rm -rf "$BUILD_DIR"

SIZE=$(du -h "$ZIP_NAME" | cut -f1)
echo ""
echo "✅ Build complete: $ZIP_NAME ($SIZE)"
echo ""
echo "📋 Next steps:"
echo "  1. Go to https://yandex.ru/games/developer"
echo "  2. Click 'Add game' / 'Добавить игру'"
echo "  3. Upload $ZIP_NAME"
echo "  4. Fill in game info:"
echo "     - Name: Infinite Tic-Tac-Toe"
echo "     - Category: Puzzle / Board / Strategy"
echo "     - Description: Крестики-нолики с бесконечной механикой!"
echo "     - Enable ads for monetization"
echo "  5. Submit for review"
