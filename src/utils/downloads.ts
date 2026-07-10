// Where a build can actually be downloaded from — and, just as importantly,
// where it cannot.
//
// Office 365 has no per-build download. Every Office row used to render a
// "Download" button pointing at the same generic Download Center page, which
// tells the user this specific servicing build is downloadable when it is not.
// `downloadTarget` now returns `null` for Office; the Download Center is
// surfaced once, as a clearly-labelled section link.

import { isEdgeBuild, isOfficeBuild, isWindowsBuild, type BuildRecord } from './typeGuards';

/** Generic Microsoft 365 Download Center. Not build-specific — never per-row. */
export const OFFICE_DOWNLOAD_CENTER = 'https://www.microsoft.com/en-us/download/office';

export interface DownloadTarget {
  url: string;
  /** Button/link text. Says where the link goes, not just "Download". */
  label: string;
}

/**
 * Direct download for a single build, or `null` when none exists.
 * Windows resolves through UUP Dump; Edge uses its first published artifact.
 */
export function downloadTarget(build: BuildRecord): DownloadTarget | null {
  if (isWindowsBuild(build)) {
    return {
      url: `https://uupdump.net/selectlang.php?id=${encodeURIComponent(build.uuid)}`,
      label: 'Download from UUP Dump',
    };
  }

  if (isEdgeBuild(build)) {
    const artifact = build.Artifacts?.[0];
    return artifact ? { url: artifact.Location, label: 'Download' } : null;
  }

  // Office: no per-build artifact exists. Deliberately null.
  return null;
}

export const hasDownload = (build: BuildRecord): boolean => downloadTarget(build) !== null;

/** Office rows should point at the Download Center, but never claim to be it. */
export const isOfficeRecord = (build: BuildRecord): boolean => isOfficeBuild(build);

/**
 * Only ever hand `window.open` an absolute HTTPS URL we resolved ourselves.
 * `Artifacts[].Location` is upstream Microsoft data; treating it as trusted
 * would let a `javascript:` payload through into a new browsing context.
 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url, window.location.origin).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * `noopener,noreferrer` on every path. One call site (the Edge artifact list)
 * previously omitted it, handing the opened page a live `window.opener`.
 */
export function openExternal(url: string | null | undefined): void {
  if (!url || !isSafeExternalUrl(url)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
