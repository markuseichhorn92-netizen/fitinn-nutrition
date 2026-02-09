#!/bin/bash

# Xcode Cloud post-clone script
# Install Node.js and sync Capacitor plugins

set -e

echo "📦 Installing Homebrew..."
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true

echo "📦 Installing Node.js via Homebrew..."
brew install node || true

# Add to PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "📍 Node version: $(node --version || echo 'not found')"
echo "📍 NPM version: $(npm --version || echo 'not found')"

echo "📦 Installing dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "🔄 Syncing Capacitor iOS plugins..."
npx cap sync ios

echo "✅ CI post-clone complete!"
