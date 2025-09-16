#!/bin/bash

# WindowsBuilds React App Build Script - Integrated with Addon

echo "Building WindowsBuilds React App..."

# Navigate to react app directory
cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the app
echo "Building production bundle..."
npm run build

# Create addon assets directory
mkdir -p ../Public/assets

# Copy built assets to addon Public directory
echo "Deploying assets to addon directory..."
cp dist/assets/* ../Public/assets/

# Create builds directory if it doesn't exist
mkdir -p ../../../../builds

# Copy built files to public directory (maintaining backwards compatibility)
echo "Deploying to /builds directory..."
cp -r dist/* ../../../../builds/

# Update asset paths in the standalone HTML file
echo "Updating standalone HTML file..."
sed -i 's|/builds/assets/|/builds/assets/react/|g' ../../../../builds/react-app.html

echo "Build complete!"
echo "- React assets are now managed within the WindowsBuilds addon"
echo "- Standalone app available at /builds/react-app.html"
echo "- Integrated app available via XenForo at /builds-react/ (when route is working)"