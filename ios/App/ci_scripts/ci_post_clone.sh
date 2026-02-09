#!/bin/bash

# Xcode Cloud post-clone script
# Install dependencies and sync Capacitor plugins

set -e

echo "📦 Installing Node.js dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "🔄 Syncing Capacitor iOS plugins..."
npx cap sync ios

echo "✅ CI post-clone complete!"
