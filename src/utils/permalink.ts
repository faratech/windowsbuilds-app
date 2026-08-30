// Persistent build URLs. The XenForo route is `/builds/<family>/<ref>/` where
// <ref> is a build number (26100.9278) or a version line (24h2; server lines
// are years). Mirrors BASE_TAGS in fastapi_app/build_detail.py and
// Builds::tagForBase() in the PHP add-on — keep the three in step.

import { isWindowsBuild, type BuildRecord } from './typeGuards';

export type WindowsFamily = 'windows11' | 'windows10' | 'windowsserver';

const FAMILY_LABEL: Record<WindowsFamily, string> = {
  windows11: 'Windows 11',
  windows10: 'Windows 10',
  windowsserver: 'Windows Server',
};

const CLIENT_BASE_TAGS: Record<string, string> = {
  '26300': '26H2',
  '28000': '26H1',
  '26200': '25H2',
  '26100': '24H2',
  '22631': '23H2',
  '22621': '22H2',
  '19045': '22H2',
  '19044': '21H2',
  '19043': '21H1',
  '19042': '20H2',
  '19041': '2004',
};

const SERVER_BASE_TAGS: Record<string, string> = {
  '26100': '2025',
  '20348': '2022',
  '17763': '2019',
  '14393': '2016',
};

const BUILD_RE = /^\d{4,5}\.\d{1,6}$/;
const TAG_RE = /\b(\d{2}H\d)\b/i;
const SERVER_YEAR_RE = /Windows Server[, ]+(?:version )?(\d{4})/i;

export function windowsFamily(title: string | undefined): WindowsFamily | null {
  const t = (title || '').toLowerCase();
  if (t.includes('windows server')) return 'windowsserver';
  if (t.includes('windows 11')) return 'windows11';
  if (t.includes('windows 10')) return 'windows10';
  return null;
}

export function familyLabel(family: WindowsFamily): string {
  return FAMILY_LABEL[family];
}

/** Version line for a build: 24H2 / 25H2 / 26H1, or a year for Server. */
export function versionTag(title: string | undefined, build: string | undefined, family: WindowsFamily): string | null {
  const m = TAG_RE.exec(title || '');
  if (m) return m[1].toUpperCase();
  const base = (build || '').split('.')[0];
  if (family === 'windowsserver') {
    const y = SERVER_YEAR_RE.exec(title || '');
    if (y) return y[1];
    return SERVER_BASE_TAGS[base] ?? null;
  }
  return CLIENT_BASE_TAGS[base] ?? null;
}

export function buildNumberOf(build: BuildRecord): string {
  if (!isWindowsBuild(build)) return '';
  return build.build_number || build.build || '';
}

/** `/builds/windows11/26100.9278/` for a Windows record, else null. */
export function buildPermalink(build: BuildRecord): string | null {
  if (!isWindowsBuild(build)) return null;
  const family = windowsFamily(build.title);
  const number = buildNumberOf(build);
  if (!family || !BUILD_RE.test(number)) return null;
  return `/builds/${family}/${number}/`;
}

export function versionLineUrl(family: WindowsFamily, tag: string): string {
  return `/builds/${family}/${tag.toLowerCase()}/`;
}

export interface LatestPerLine {
  family: WindowsFamily;
  tag: string;
  build: BuildRecord;
  number: string;
  permalink: string;
  lineUrl: string;
}

/** Sort key so 26H2 > 26H1 > 25H2 > 24H2 and 2025 > 2022. */
function tagRank(tag: string): number {
  const m = /^(\d{2})H(\d)$/.exec(tag);
  if (m) return Number(m[1]) * 10 + Number(m[2]);
  const y = Number(tag);
  return Number.isFinite(y) ? y : 0;
}

/**
 * Newest build per version line among the loaded records. Records without a
 * recognisable line (odd feed titles) are skipped rather than lumped together.
 */
export function latestPerLine(builds: BuildRecord[], timeOf: (b: BuildRecord) => number): LatestPerLine[] {
  const best = new Map<string, LatestPerLine>();
  for (const build of builds) {
    if (!isWindowsBuild(build)) continue;
    const family = windowsFamily(build.title);
    const number = buildNumberOf(build);
    if (!family || !BUILD_RE.test(number)) continue;
    const tag = versionTag(build.title, number, family);
    if (!tag) continue;
    const key = `${family}:${tag}`;
    const current = best.get(key);
    if (!current || timeOf(build) > timeOf(current.build)) {
      best.set(key, {
        family,
        tag,
        build,
        number,
        permalink: `/builds/${family}/${number}/`,
        lineUrl: versionLineUrl(family, tag),
      });
    }
  }
  return [...best.values()].sort((a, b) => tagRank(b.tag) - tagRank(a.tag));
}
