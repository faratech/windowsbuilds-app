#!/usr/bin/env bash
# Copy the built assets into the web root. Explicit deployment only:
# `npm run build` never does this.
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

assets_dir="${ASSETS_DIR:-/web/public_html/js/WindowsBuilds}"

if [[ ! -d dist/assets ]]; then
  printf 'No dist/assets directory. Run `npm run build` first.\n' >&2
  exit 1
fi

mkdir -p "$assets_dir"
cp -a dist/assets/. "$assets_dir/"
printf 'Deployed assets to %s\n' "$assets_dir"
