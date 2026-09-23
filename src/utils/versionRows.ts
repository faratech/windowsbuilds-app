// Rows for the "Which version should I be on?" table. Windows families come
// from /api/builds/lines/<family> (newest build per version line over the whole
// feed); Edge and Office have no lines endpoint, so their rows are the newest
// record per channel among the loaded builds.

import type { EdgeBuild, LineStatus, OfficeBuild, VersionLine } from '../types';
import { isEdgeBuild, isOfficeBuild, type BuildRecord } from './typeGuards';
import { buildTime, compareVersions } from './buildRecord';
import { parseBuildDate } from './dates';

export type Tone = 'emerald' | 'sky' | 'amber' | 'indigo' | 'teal' | 'slate' | 'rose';

export const TONE_PILL: Record<Tone, string> = {
  emerald: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  sky: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  indigo: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200',
  teal: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200',
  slate: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  rose: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
};

export interface VersionRow {
  key: string;
  name: string;
  status: string;
  tone: Tone;
  note: string | null;
  number: string;
  /** Build permalink, when the product has one. */
  href: string | null;
  kb: string | null;
  /** Epoch millis of the newest build, or null. */
  time: number | null;
  historyHref: string | null;
  historyLabel: string | null;
  recommended: boolean;
  ended: boolean;
  /** Record for the details dialog (Edge/Office rows). */
  build: BuildRecord | null;
}

const LINE_STATUS: Record<LineStatus, { status: string; tone: Tone }> = {
  mainstream: { status: 'Current · recommended', tone: 'emerald' },
  supported: { status: 'Supported', tone: 'sky' },
  silicon: { status: 'New PCs only', tone: 'indigo' },
  preview: { status: 'Coming next', tone: 'amber' },
  extended: { status: 'Extended support', tone: 'teal' },
  eol: { status: 'Ended', tone: 'slate' },
};

/** Recommended first, then by how relevant a line is to most readers. */
const LINE_ORDER: Record<LineStatus, number> = { mainstream: 0, supported: 1, silicon: 2, preview: 3, extended: 4, eol: 5 };

export function lineRows(lines: VersionLine[]): VersionRow[] {
  const ordered = lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) =>
      (a.line.status ? LINE_ORDER[a.line.status] : 9) - (b.line.status ? LINE_ORDER[b.line.status] : 9) || a.index - b.index)
    .map(({ line }) => line);
  return ordered.map((line) => {
    const meta = line.status ? LINE_STATUS[line.status] : { status: 'Unknown', tone: 'slate' as Tone };
    return {
      key: `${line.family}:${line.tag}`,
      name: line.family === 'windowsserver' ? `Server ${line.tag}` : line.tag,
      status: meta.status,
      tone: meta.tone,
      note: line.note,
      number: line.latest.build,
      href: line.latest.url || null,
      kb: line.latest.kb,
      time: parseBuildDate(line.latest.created),
      historyHref: line.url || null,
      historyLabel: line.count ? `All ${line.count} builds` : 'All builds',
      recommended: line.status === 'mainstream',
      ended: line.status === 'eol',
      build: null,
    };
  });
}

const EDGE_CHANNELS: Array<{ product: string; status: string; tone: Tone }> = [
  { product: 'Stable', status: 'Everyone', tone: 'emerald' },
  { product: 'Extended Stable', status: 'Businesses', tone: 'teal' },
  { product: 'Beta', status: 'Preview', tone: 'sky' },
  { product: 'Dev', status: 'Weekly preview', tone: 'amber' },
  { product: 'Canary', status: 'Daily preview', tone: 'rose' },
];

export function edgeRows(builds: BuildRecord[]): VersionRow[] {
  const edge = builds.filter(isEdgeBuild);
  const rows: VersionRow[] = [];
  for (const channel of EDGE_CHANNELS) {
    const inChannel = edge.filter((b) => b.Product === channel.product);
    const pool = inChannel.some((b) => b.Platform === 'Windows') ? inChannel.filter((b) => b.Platform === 'Windows') : inChannel;
    const newest = pool.reduce<EdgeBuild | null>(
      (best, b) => (!best || compareVersions(b.Version, best.Version) > 0 ? b : best),
      null,
    );
    if (!newest) continue;
    const cves = newest.CVEs?.length ?? 0;
    rows.push({
      key: `edge:${channel.product}`,
      name: channel.product,
      status: channel.status,
      tone: channel.tone,
      note: cves ? `Fixes ${cves} security ${cves === 1 ? 'vulnerability' : 'vulnerabilities'}` : null,
      number: newest.Version,
      href: null,
      kb: null,
      time: buildTime(newest) || null,
      historyHref: null,
      historyLabel: null,
      recommended: channel.product === 'Stable',
      ended: false,
      build: newest,
    });
  }
  return rows;
}

function officeChannelMeta(channel: string): { status: string; tone: Tone; order: number } {
  const c = channel.toLowerCase();
  if (c.includes('perpetual') || c.includes('ltsc')) return { status: 'One-time purchase', tone: 'slate', order: 5 };
  if (c.includes('preview')) return { status: 'Early access', tone: 'amber', order: 4 };
  if (c.startsWith('current')) return { status: 'Home & most users', tone: 'emerald', order: 1 };
  if (c.includes('monthly')) return { status: 'Businesses, monthly', tone: 'sky', order: 2 };
  if (c.includes('semi-annual')) return { status: 'Businesses, twice a year', tone: 'teal', order: 3 };
  return { status: 'Channel', tone: 'slate', order: 6 };
}

export function officeRows(builds: BuildRecord[]): VersionRow[] {
  const newest = new Map<string, OfficeBuild>();
  for (const b of builds) {
    if (!isOfficeBuild(b) || !b.channel) continue;
    const current = newest.get(b.channel);
    if (!current || buildTime(b) > buildTime(current)) newest.set(b.channel, b);
  }
  return [...newest.entries()]
    .map(([channel, b]) => {
      const meta = officeChannelMeta(channel);
      const number = b.build_number || b.build || '';
      const versionCode = /^\d{4}$/.test(b.version || '');
      return {
        order: meta.order,
        row: {
          key: `office:${channel}`,
          name: channel.replace(/\s*Perpetual.*$/i, '').replace(/ Channel\b/, ''),
          status: meta.status,
          tone: meta.tone,
          note: null,
          number: versionCode ? `${b.version} (${number})` : number || b.version,
          href: null,
          kb: null,
          time: buildTime(b) || null,
          historyHref: null,
          historyLabel: null,
          recommended: channel === 'Current Channel',
          ended: false,
          build: b,
        } satisfies VersionRow,
      };
    })
    .sort((a, b) => a.order - b.order || a.row.name.localeCompare(b.row.name))
    .map((entry) => entry.row);
}
