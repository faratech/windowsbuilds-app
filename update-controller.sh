#!/bin/bash

# Script to automatically update the XenForo controller with new asset filenames after build

CONTROLLER_PATH="/web/public_html/src/addons/WindowsBuilds/Pub/Controller/Builds.php"
ASSETS_DIR="/web/public_html/js/WindowsBuilds"

echo "🔍 Finding latest asset files..."

# Find the newest CSS file (index-*.css)
CSS_FILE=$(ls -t "$ASSETS_DIR"/index-*.css 2>/dev/null | head -1 | xargs -n 1 basename)

# Find the newest JS file (index-*.js)
JS_FILE=$(ls -t "$ASSETS_DIR"/index-*.js 2>/dev/null | head -1 | xargs -n 1 basename)

if [ -z "$CSS_FILE" ] || [ -z "$JS_FILE" ]; then
    echo "❌ Error: Could not find CSS or JS files in $ASSETS_DIR"
    exit 1
fi

echo "📄 Found CSS: $CSS_FILE"
echo "📄 Found JS: $JS_FILE"

# Create backup of controller
cp "$CONTROLLER_PATH" "$CONTROLLER_PATH.bak"
echo "💾 Created backup: $CONTROLLER_PATH.bak"

# Update the controller file with new asset filenames
sed -i "s|'css' => '/js/WindowsBuilds/index-[^']*'|'css' => '/js/WindowsBuilds/$CSS_FILE'|" "$CONTROLLER_PATH"
sed -i "s|'js' => '/js/WindowsBuilds/index-[^']*'|'js' => '/js/WindowsBuilds/$JS_FILE'|" "$CONTROLLER_PATH"

echo "✅ Updated controller with new asset paths:"
echo "   CSS: /js/WindowsBuilds/$CSS_FILE"
echo "   JS:  /js/WindowsBuilds/$JS_FILE"

# Show the updated lines from the controller
echo ""
echo "📋 Controller assets section:"
grep -A1 -B1 "'css' =>" "$CONTROLLER_PATH"

echo ""
echo "✨ Controller update complete!"
echo ""
echo "💡 Remember to clear XenForo cache if needed:"
echo "   cd /web/public_html && php cmd.php xf:rebuild-master-data"