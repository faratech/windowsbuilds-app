#!/bin/bash
#
# Update the XenForo controller with the freshly-built React asset filenames and
# purge stale hashed assets. Resolves the entry assets deterministically from
# Vite's manifest (dist/.vite/manifest.json) instead of guessing with `ls -t`,
# which was fragile (vendor vs index ambiguity, 100+ stale files, deploy races).
#
set -euo pipefail

APP_DIR="/web/windowsbuilds_app"
CONTROLLER_PATH="/web/public_html/src/addons/WindowsBuilds/Pub/Controller/Builds.php"
ASSETS_DIR="/web/public_html/js/WindowsBuilds"
MANIFEST="$APP_DIR/dist/.vite/manifest.json"

if [ ! -f "$MANIFEST" ]; then
    echo "❌ Vite manifest not found: $MANIFEST"
    echo "   Build with manifest enabled first (npm run build)."
    exit 1
fi

echo "🔍 Reading entry assets from manifest..."

# Emit three lines: <js basename> <css basename> <space-separated keep basenames>
read_manifest() {
    python3 - "$MANIFEST" <<'PY'
import json, os, sys
m = json.load(open(sys.argv[1]))
entry = next((v for v in m.values() if v.get('isEntry')), None)
if not entry:
    sys.exit("no entry chunk in manifest")
css = (entry.get('css') or [None])[0]
keep = [entry['file']]
if css:
    keep.append(css)
# imported chunks (e.g. the vendor split) must survive the purge too
for k in entry.get('imports', []):
    f = m.get(k, {}).get('file')
    if f:
        keep.append(f)
print(os.path.basename(entry['file']))
print(os.path.basename(css) if css else '')
print(' '.join(os.path.basename(f) for f in keep))
PY
}

mapfile -t MF < <(read_manifest)
JS_FILE="${MF[0]}"
CSS_FILE="${MF[1]}"
KEEP="${MF[2]}"

if [ -z "$JS_FILE" ] || [ -z "$CSS_FILE" ]; then
    echo "❌ Could not resolve entry js/css from manifest"
    exit 1
fi

# The deploy step flattens dist/assets/* into ASSETS_DIR; verify the entry files
# actually landed before rewriting the controller.
if [ ! -f "$ASSETS_DIR/$JS_FILE" ] || [ ! -f "$ASSETS_DIR/$CSS_FILE" ]; then
    echo "❌ Built assets not deployed yet ($JS_FILE / $CSS_FILE missing in $ASSETS_DIR)."
    echo "   Run 'npm run deploy' (cp dist/assets/* -> $ASSETS_DIR) first."
    exit 1
fi

echo "📄 JS:  $JS_FILE"
echo "📄 CSS: $CSS_FILE"

# Back up + rewrite the hardcoded asset paths in the controller.
cp "$CONTROLLER_PATH" "$CONTROLLER_PATH.bak"
sed -i "s|'css' => '/js/WindowsBuilds/index-[^']*'|'css' => '/js/WindowsBuilds/$CSS_FILE'|" "$CONTROLLER_PATH"
sed -i "s|'js' => '/js/WindowsBuilds/index-[^']*'|'js' => '/js/WindowsBuilds/$JS_FILE'|" "$CONTROLLER_PATH"

# Purge stale hashed assets, keeping only the current entry/css/vendor set.
keepset=" $KEEP "
purged=0
shopt -s nullglob
for f in "$ASSETS_DIR"/index-*.js "$ASSETS_DIR"/index-*.css "$ASSETS_DIR"/vendor-*.js; do
    b="$(basename "$f")"
    case "$keepset" in
        *" $b "*) : ;;                # keep
        *) rm -f "$f"; purged=$((purged + 1)) ;;
    esac
done
shopt -u nullglob

echo "✅ Controller updated; purged $purged stale asset(s)."
echo ""
echo "💡 If templates/routes changed, rebuild XenForo master data:"
echo "   cd /web/public_html && php cmd.php xf:rebuild-master-data"
