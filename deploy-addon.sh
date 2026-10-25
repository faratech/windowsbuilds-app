#!/usr/bin/env bash
# Export the XenForo add-on owned by this repository into the forum source tree.
# The destination is deployment output; it is not independently Git-owned.
#
# The export is staged and swapped in whole, and it preserves the deployed
# controller's activated asset paths: update-controller.sh rewrites only the
# deployed Builds.php, so a plain mirror would roll a successful activation
# back to the repo copy's stale hardcoded paths.
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$repo_root/xenforo-addon/"
destination_dir="${ADDON_DEST:-/web/public_html/src/addons/WindowsBuilds/}"

if [[ ! -d "$source_dir" ]]; then
  printf 'Missing add-on source: %s\n' "$source_dir" >&2
  exit 1
fi

if [[ -z "${ADDON_DEST:-}" ]]; then
  case "$destination_dir" in
    /web/public_html/src/addons/WindowsBuilds/|/web/public_html/src/addons/WindowsBuilds)
      ;;
    *)
      printf 'Refusing unexpected add-on destination: %s\n' "$destination_dir" >&2
      exit 1
      ;;
  esac
fi

destination_dir="${destination_dir%/}"
parent_dir="$(dirname -- "$destination_dir")"
mkdir -p "$parent_dir"

deployed_controller="$destination_dir/Pub/Controller/Builds.php"
cur_js=""; cur_css=""; cur_vendor=""
if [[ -f "$deployed_controller" ]]; then
  cur_js="$(sed -n "s/.*'js' => '\/js\/WindowsBuilds\/\([^']*\)'.*/\1/p" "$deployed_controller" | head -n 1 || true)"
  cur_css="$(sed -n "s/.*'css' => '\/js\/WindowsBuilds\/\([^']*\)'.*/\1/p" "$deployed_controller" | head -n 1 || true)"
  cur_vendor="$(sed -n "s/.*'vendor' => '\/js\/WindowsBuilds\/\([^']*\)'.*/\1/p" "$deployed_controller" | head -n 1 || true)"
fi

staging_dir="$(mktemp -d "$parent_dir/.wb-addon-stage.XXXXXX")"
backup_dir=""
cleanup() {
  rm -rf "$staging_dir"
  if [[ -n "$backup_dir" && ! -d "$destination_dir" && -d "$backup_dir" ]]; then
    mv "$backup_dir" "$destination_dir" || true
  fi
}
trap cleanup EXIT

rsync -a --delete \
  --exclude='.git' \
  --exclude='*.log' \
  "$source_dir" "$staging_dir/"

# Gate the whole staged tree on PHP syntax before it can go live.
while IFS= read -r php_file; do
  php -l "$php_file" >/dev/null
done < <(find "$staging_dir" -name '*.php' -type f)

# Preserve a successful controller activation across the export.
staged_controller="$staging_dir/Pub/Controller/Builds.php"
if [[ -f "$staged_controller" && -n "$cur_js" && -n "$cur_css" ]]; then
  sed -i \
    -e "s|'css' => '/js/WindowsBuilds/index-[^']*'|'css' => '/js/WindowsBuilds/$cur_css'|" \
    -e "s|'js' => '/js/WindowsBuilds/index-[^']*'|'js' => '/js/WindowsBuilds/$cur_js'|" \
    "$staged_controller"
  if [[ -n "$cur_vendor" ]]; then
    sed -i \
      -e "s|'vendor' => '/js/WindowsBuilds/vendor-[^']*'|'vendor' => '/js/WindowsBuilds/$cur_vendor'|" \
      "$staged_controller"
  fi
  php -l "$staged_controller" >/dev/null
fi

# Swap the complete staged tree in; restore the previous tree on any failure.
if [[ -d "$destination_dir" ]]; then
  backup_dir="$(mktemp -d "$parent_dir/.wb-addon-backup.XXXXXX")"
  rmdir "$backup_dir"
  mv "$destination_dir" "$backup_dir"
fi
if ! mv "$staging_dir" "$destination_dir"; then
  printf 'Add-on export failed; previous tree restored.\n' >&2
  exit 1
fi
trap - EXIT
if [[ -n "$backup_dir" ]]; then
  rm -rf "$backup_dir"
fi

printf 'Exported XenForo add-on to %s\n' "$destination_dir"
