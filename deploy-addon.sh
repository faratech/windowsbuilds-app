#!/usr/bin/env bash
# Export the XenForo add-on owned by this repository into the forum source tree.
# The destination is deployment output; it is not independently Git-owned.
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$repo_root/xenforo-addon/"
destination_dir="${ADDON_DEST:-/web/public_html/src/addons/WindowsBuilds/}"

if [[ ! -d "$source_dir" ]]; then
  printf 'Missing add-on source: %s\n' "$source_dir" >&2
  exit 1
fi

case "$destination_dir" in
  /web/public_html/src/addons/WindowsBuilds/|/web/public_html/src/addons/WindowsBuilds)
    ;;
  *)
    printf 'Refusing unexpected add-on destination: %s\n' "$destination_dir" >&2
    exit 1
    ;;
esac

mkdir -p "$destination_dir"
rsync -a --delete \
  --exclude='.git' \
  --exclude='*.log' \
  "$source_dir" "$destination_dir"

printf 'Exported XenForo add-on to %s\n' "$destination_dir"
