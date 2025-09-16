#!/bin/bash

# Combined script to build the React app and update the XenForo controller

echo "🚀 Starting build and update process..."
echo ""

# Run the build
echo "📦 Building React app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""

# Run the controller update script
echo "🔄 Updating XenForo controller..."
./update-controller.sh

if [ $? -ne 0 ]; then
    echo "❌ Controller update failed!"
    exit 1
fi

echo ""
echo "🎉 Build and update complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Visit https://windowsforum.com/builds/ to see your changes"
echo "   2. If needed, clear XenForo cache:"
echo "      cd /web/public_html && php cmd.php xf:rebuild-master-data"