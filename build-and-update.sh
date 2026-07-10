#!/bin/bash
#
# Build the React app, copy the assets into the web root, then point the
# XenForo controller at them.
#
# `npm run build` deliberately no longer deploys: a plain build must never
# mutate /web/public_html. Deployment is this script's job, and it is explicit.
#
set -euo pipefail

echo "🚀 Starting build and update process..."
echo ""

echo "📦 Building React app..."
npm run build

echo ""
echo "📦 Copying assets into the web root..."
npm run deploy

echo ""
echo "✅ Build complete!"
echo ""

echo "🔄 Updating XenForo controller..."
./update-controller.sh

echo ""
echo "🎉 Build and update complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Visit https://windowsforum.com/builds/ and confirm the page renders"
echo "   2. Once healthy, drop the superseded assets:"
echo "      ./update-controller.sh --prune"
echo "   3. If templates/routes changed, clear the XenForo cache:"
echo "      cd /web/public_html && php cmd.php xf:rebuild-master-data"
