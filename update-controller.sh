#!/bin/bash
#
# Point the XenForo controller at the freshly-built React entry assets.
#
# Resolves the entry chunk deterministically from Vite's manifest
# (dist/.vite/manifest.json) rather than guessing with `ls -t`.
#
# Activation is gated and reversible:
#   1. the built assets must already be present in ASSETS_DIR
#   2. the rewrite is staged in a temp file and syntax-checked with `php -l`
#   3. only then is it moved into place, preserving owner and mode
#   4. any failure restores the previous controller from BACKUP_DIR
#
# Stale hashed assets are NOT purged here. The previous entry chunk must survive
# for as long as opcache may still be serving the previous controller, which
# still references it. Purge later, deliberately:
#
#     ./update-controller.sh --prune
#
set -euo pipefail

# Overridable so the script can be exercised against a sandbox tree.
APP_DIR="${APP_DIR:-/web/windowsbuilds_app}"
CONTROLLER_PATH="${CONTROLLER_PATH:-/web/public_html/src/addons/WindowsBuilds/Pub/Controller/Builds.php}"
ASSETS_DIR="${ASSETS_DIR:-/web/public_html/js/WindowsBuilds}"
MANIFEST="${MANIFEST:-$APP_DIR/dist/.vite/manifest.json}"
# Never /tmp: it is tmpfs (RAM) on these nodes.
BACKUP_DIR="${BACKUP_DIR:-/var/backups/windowsbuilds}"

PRUNE_ONLY=0
[ "${1:-}" = "--prune" ] && PRUNE_ONLY=1

if [ ! -f "$MANIFEST" ]; then
    echo "❌ Vite manifest not found: $MANIFEST"
    echo "   Build with manifest enabled first (npm run build)."
    exit 1
fi

# Emit: <js basename>\n<css basename>\n<space-separated full keep set>
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
# imported chunks (the vendor split, the rolldown runtime) must survive too
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

# ---------------------------------------------------------------- prune mode
if [ "$PRUNE_ONLY" -eq 1 ]; then
    # `windowsbuilds.js` is the separate XenForo widget script and is never hashed;
    # the explicit globs below must never match it.
    keepset=" $KEEP "
    purged=0
    shopt -s nullglob
    for f in "$ASSETS_DIR"/index-*.js "$ASSETS_DIR"/index-*.css \
             "$ASSETS_DIR"/vendor-*.js "$ASSETS_DIR"/rolldown-runtime-*.js; do
        b="$(basename "$f")"
        case "$keepset" in
            *" $b "*) : ;;
            *) rm -f "$f"; purged=$((purged + 1)); echo "   purged $b" ;;
        esac
    done
    shopt -u nullglob
    echo "✅ Pruned $purged stale asset(s); kept: $KEEP"
    exit 0
fi

# ------------------------------------------------------------- activate mode
if [ ! -f "$ASSETS_DIR/$JS_FILE" ] || [ ! -f "$ASSETS_DIR/$CSS_FILE" ]; then
    echo "❌ Built assets not deployed yet ($JS_FILE / $CSS_FILE missing in $ASSETS_DIR)."
    echo "   Run 'npm run deploy' first."
    exit 1
fi

# Every chunk the entry imports must be on disk before we point the page at it.
for asset in $KEEP; do
    if [ ! -f "$ASSETS_DIR/$asset" ]; then
        echo "❌ Entry chunk '$asset' is missing from $ASSETS_DIR. Refusing to activate."
        exit 1
    fi
done

echo "📄 JS:  $JS_FILE"
echo "📄 CSS: $CSS_FILE"

mkdir -p "$BACKUP_DIR"
BACKUP_PATH="$BACKUP_DIR/Builds.php.$(date +%Y%m%dT%H%M%S)"
cp -p "$CONTROLLER_PATH" "$BACKUP_PATH"

# Stage the rewrite, never edit the live file in place. `sed -i` on a served PHP
# file both races the request that is reading it and can silently reassign owner.
CANDIDATE="$(mktemp "${BACKUP_DIR}/Builds.php.candidate.XXXXXX")"
trap 'rm -f "$CANDIDATE"' EXIT

sed -e "s|'css' => '/js/WindowsBuilds/index-[^']*'|'css' => '/js/WindowsBuilds/$CSS_FILE'|" \
    -e "s|'js' => '/js/WindowsBuilds/index-[^']*'|'js' => '/js/WindowsBuilds/$JS_FILE'|" \
    "$CONTROLLER_PATH" > "$CANDIDATE"

# The sed above is silent when its pattern does not match. Assert the result.
if ! grep -qF "'/js/WindowsBuilds/$JS_FILE'" "$CANDIDATE" \
   || ! grep -qF "'/js/WindowsBuilds/$CSS_FILE'" "$CANDIDATE"; then
    echo "❌ Controller rewrite did not take — asset path pattern not found."
    echo "   Left $CONTROLLER_PATH untouched. Backup: $BACKUP_PATH"
    exit 1
fi

if ! php -l "$CANDIDATE" >/dev/null 2>&1; then
    echo "❌ Rewritten controller is not valid PHP. Left $CONTROLLER_PATH untouched."
    php -l "$CANDIDATE" || true
    exit 1
fi

# Preserve owner/group/mode: an lsphp-served file that flips to a restrictive
# owner takes the whole page down with a 500.
OWNER="$(stat -c '%U:%G' "$CONTROLLER_PATH")"
MODE="$(stat -c '%a' "$CONTROLLER_PATH")"

if ! (chown "$OWNER" "$CANDIDATE" && chmod "$MODE" "$CANDIDATE" && mv -f "$CANDIDATE" "$CONTROLLER_PATH"); then
    echo "❌ Activation failed; restoring previous controller."
    cp -p "$BACKUP_PATH" "$CONTROLLER_PATH"
    exit 1
fi
trap - EXIT

echo "✅ Controller activated (backup: $BACKUP_PATH)."
echo ""
echo "💡 Stale assets were intentionally kept so opcache can finish serving the"
echo "   previous controller. Once /builds/ is confirmed healthy:"
echo "     ./update-controller.sh --prune"
echo ""
echo "💡 If templates/routes changed, rebuild XenForo master data:"
echo "   cd /web/public_html && php cmd.php xf:rebuild-master-data"
