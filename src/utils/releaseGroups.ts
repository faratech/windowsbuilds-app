// Turns the raw feed into something a non-expert can read: every record gets a
// plain-language *update kind*, and records that are really one release — the
// same KB shipped to 24H2, 25H2 and 26H2, the same Edge version on five
// platforms, the same Office build on two channels — collapse into one row
// grouped under the UTC day it shipped.
//
// The feed does not say "this is the Patch Tuesday security update"; that is
// inferred. Explicitly titled records (Preview Update, OOBE, .NET, enablement,
// hotpatch) win. Untitled OS records ("Windows 11, version 25H2 (26200.9550)")
// take the kind of a titled record sharing their revision on the same day, else
// "security" on the second Tuesday, else a plain cumulative update.

import { isEdgeBuild, isOfficeBuild, isWindowsBuild, type BuildRecord } from './typeGuards';
import { buildTime, compareVersions } from './buildRecord';
import { buildNumberOf, buildPermalink, versionTag, windowsFamily } from './permalink';
import { channelMeta } from '../config/releaseChannels';

export type UpdateKind =
  | 'security'
  | 'preview'
  | 'update'
  | 'prerelease'
  | 'dotnet'
  | 'setup'
  | 'enablement'
  | 'hotpatch';

export interface UpdateKindMeta {
  label: string;
  /** One-sentence, jargon-free explanation (glossary + tooltips). */
  explain: string;
  /** Pill colours: light, dark. */
  pill: string;
  /** Solid dot colour for filter chips. */
  dot: string;
  order: number;
}

export const UPDATE_KIND_META: Record<UpdateKind, UpdateKindMeta> = {
  security: {
    label: 'Security update',
    explain: 'Fixes security vulnerabilities. For Windows this is the monthly Patch Tuesday update, which installs automatically.',
    pill: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
    dot: 'bg-rose-600',
    order: 1,
  },
  preview: {
    label: 'Optional preview',
    explain: 'Next month’s non-security fixes, early (usually the fourth week). Only installs if you ask for it.',
    pill: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
    dot: 'bg-sky-600',
    order: 2,
  },
  update: {
    label: 'Update',
    explain: 'A regular release. For Windows, a cumulative update that includes every earlier fix for that version.',
    pill: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    dot: 'bg-emerald-600',
    order: 3,
  },
  prerelease: {
    label: 'Pre-release',
    explain: 'Insider or preview-channel builds for testing. Not what regular users get.',
    pill: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    dot: 'bg-amber-500',
    order: 4,
  },
  dotnet: {
    label: '.NET Framework',
    explain: 'A separate update for apps built on .NET, installed alongside the monthly update.',
    pill: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200',
    dot: 'bg-indigo-600',
    order: 5,
  },
  setup: {
    label: 'Setup only',
    explain: 'Runs during first-time setup (OOBE) of a new PC. Nothing to do on a PC that is already set up.',
    pill: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    dot: 'bg-slate-500',
    order: 6,
  },
  enablement: {
    label: 'Enablement package',
    explain: 'A tiny package that switches an up-to-date PC to the next version — no full reinstall.',
    pill: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200',
    dot: 'bg-teal-600',
    order: 7,
  },
  hotpatch: {
    label: 'Hotpatch',
    explain: 'A security update that applies without a restart, on supported business editions.',
    pill: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
    dot: 'bg-orange-600',
    order: 8,
  },
};

const RELEASE_CHANNELS = new Set(['release', 'stable']);
const KB_RE = /\bKB\d{6,8}\b/i;

export function kbOf(title: string | undefined): string | null {
  const m = KB_RE.exec(title || '');
  return m ? m[0].toUpperCase() : null;
}

/** UTC calendar day, `YYYY-MM-DD`; '' when the record has no usable date. */
export function utcDay(epochMs: number): string {
  if (!epochMs) return '';
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** Nth weekday-of-month for a `YYYY-MM-DD` day: 2 for the second Tuesday, etc. */
function tuesdayOrdinal(day: string): number {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDay() !== 2) return 0;
  return Math.floor((d.getUTCDate() - 1) / 7) + 1;
}

export const isPatchTuesday = (day: string): boolean => tuesdayOrdinal(day) === 2;

/** Kind from the record alone, before same-day context is applied. */
export function intrinsicKind(build: BuildRecord): UpdateKind {
  if (isEdgeBuild(build)) {
    if (!RELEASE_CHANNELS.has((build.build_type || '').toLowerCase())) return 'prerelease';
    return build.CVEs && build.CVEs.length > 0 ? 'security' : 'update';
  }
  if (isOfficeBuild(build)) {
    const channel = (build.channel || '').toLowerCase();
    if (channel.includes('preview') || channel.includes('beta') || channel.includes('insider')) return 'prerelease';
    return 'update';
  }
  if (!isWindowsBuild(build)) return 'update';

  const channel = (build.build_type || 'release').toLowerCase();
  if (!RELEASE_CHANNELS.has(channel)) return 'prerelease';

  const title = build.title || '';
  if (build.kind === 'dotnet' || /\.NET/i.test(title)) return 'dotnet';
  if (/\bOOBE\b|setup dynamic|safe ?os/i.test(title)) return 'setup';
  if (build.kind === 'enablement' || /enablement/i.test(title)) return 'enablement';
  if (build.kind === 'hotpatch' || /hotpatch/i.test(title)) return 'hotpatch';
  if (/preview update|non-security preview/i.test(title)) return 'preview';
  return 'update';
}

const revisionOf = (number: string): string => number.split('.')[1] ?? '';

export interface GroupItem {
  /** Version line (25H2), Edge platform, or Office channel. */
  label: string;
  number: string;
  href: string | null;
  build: BuildRecord;
}

export interface ReleaseGroup {
  key: string;
  kind: UpdateKind;
  title: string;
  detail: string | null;
  kb: string | null;
  time: number;
  items: GroupItem[];
  /** The record the details dialog opens on. */
  primary: BuildRecord;
  /** Every feed record merged into this row (duplicates included). */
  members: BuildRecord[];
}

export interface ReleaseDay {
  day: string;
  label: string;
  note: string | null;
  groups: ReleaseGroup[];
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

const KIND_TITLE: Record<UpdateKind, string> = {
  security: 'Security update',
  preview: 'Optional preview update',
  update: 'Cumulative update',
  prerelease: 'Insider preview',
  dotnet: '.NET Framework update',
  setup: 'Setup update',
  enablement: 'Enablement package',
  hotpatch: 'Hotpatch',
};

function windowsGroups(builds: BuildRecord[], day: string): ReleaseGroup[] {
  const records = builds.filter(isWindowsBuild);
  const kinds = new Map<BuildRecord, UpdateKind>();
  const titledRevisions = new Map<string, UpdateKind>();

  for (const b of records) {
    const kind = intrinsicKind(b);
    kinds.set(b, kind);
    if (kind === 'preview' || kind === 'hotpatch') titledRevisions.set(revisionOf(buildNumberOf(b)), kind);
  }
  for (const b of records) {
    if (kinds.get(b) !== 'update') continue;
    const inherited = titledRevisions.get(revisionOf(buildNumberOf(b)));
    if (inherited) kinds.set(b, inherited);
    else if (isPatchTuesday(day)) kinds.set(b, 'security');
  }

  const groups = new Map<string, { kind: UpdateKind; members: BuildRecord[] }>();
  for (const b of records) {
    const kind = kinds.get(b)!;
    const number = buildNumberOf(b);
    let sub: string;
    if (kind === 'prerelease') sub = (b.build_type || 'insider').toLowerCase();
    else if (kind === 'dotnet' || kind === 'setup' || kind === 'enablement') sub = kbOf(b.title) ?? number;
    else sub = revisionOf(number) || number;
    const key = `${kind}:${sub}`;
    const entry = groups.get(key) ?? { kind, members: [] };
    entry.members.push(b);
    groups.set(key, entry);
  }

  return [...groups.entries()].map(([key, { kind, members }]) => {
    const seen = new Set<string>();
    const items: GroupItem[] = [];
    for (const b of members.filter(isWindowsBuild)) {
      const number = buildNumberOf(b);
      if (!number || seen.has(number)) continue;
      seen.add(number);
      const family = windowsFamily(b.title);
      const tag = family ? versionTag(b.title, number, family) : null;
      items.push({
        label: tag ? (family === 'windowsserver' ? `Server ${tag}` : tag) : '',
        number,
        href: buildPermalink(b),
        build: b,
      });
    }
    items.sort((a, b) => compareVersions(b.number, a.number));

    const first = members[0];
    const firstTitle = isWindowsBuild(first) ? first.title : '';
    const tags = uniq(items.map((i) => i.label).filter(Boolean));
    const kb = uniq(members.map((m) => (isWindowsBuild(m) ? kbOf(m.title) : null)).filter(Boolean))[0] ?? null;
    const summary = members.map((m) => (isWindowsBuild(m) ? m.summary : undefined)).find(Boolean) ?? null;

    let title: string;
    // Insider flights are named by channel (their builds rarely map to a
    // version line). Anything else unrecognisable keeps its feed title.
    if (kind === 'prerelease' && windowsFamily(firstTitle)) {
      const channel = channelMeta(isWindowsBuild(first) ? first.build_type : null).label;
      title = `${channel} channel${tags.length ? ` · ${joinList(tags)}` : ''}`;
    } else if (!tags.length) {
      title = firstTitle || KIND_TITLE[kind];
    } else {
      title = `${KIND_TITLE[kind]} for ${joinList(tags)}`;
    }

    return {
      key: `${day}:${key}`,
      kind,
      title,
      detail: summary,
      kb,
      time: Math.max(...members.map(buildTime)),
      items,
      primary: members.find((m) => isWindowsBuild(m) && m.summary) ?? first,
      members,
    };
  });
}

function edgeGroups(builds: BuildRecord[], day: string): ReleaseGroup[] {
  const groups = new Map<string, BuildRecord[]>();
  for (const b of builds) {
    if (!isEdgeBuild(b)) continue;
    const key = `${b.Product}:${b.Version}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  return [...groups.entries()].map(([key, members]) => {
    const first = members[0];
    const edge = members.filter(isEdgeBuild);
    const platforms = uniq(edge.map((b) => b.Platform).filter(Boolean));
    const cves = Math.max(0, ...edge.map((b) => b.CVEs?.length ?? 0));
    const e0 = edge[0];
    return {
      key: `${day}:edge:${key}`,
      kind: intrinsicKind(first),
      title: `Edge ${e0.Product} ${e0.Version}`,
      detail: [
        platforms.length ? platforms.join(', ') : null,
        cves ? `fixes ${cves} security ${cves === 1 ? 'vulnerability' : 'vulnerabilities'}` : null,
      ].filter(Boolean).join(' · ') || null,
      kb: null,
      time: Math.max(...members.map(buildTime)),
      items: [],
      primary: edge.find((b) => b.Platform === 'Windows') ?? first,
      members,
    };
  });
}

function officeGroups(builds: BuildRecord[], day: string): ReleaseGroup[] {
  const groups = new Map<string, BuildRecord[]>();
  for (const b of builds) {
    if (!isOfficeBuild(b)) continue;
    const key = `${b.version}:${b.build_number || b.build || ''}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  return [...groups.entries()].map(([key, members]) => {
    const office = members.filter(isOfficeBuild);
    const o0 = office[0];
    const channels = uniq(office.map((b) => b.channel).filter(Boolean));
    const number = o0.build_number || o0.build || '';
    const release = office.find((b) => intrinsicKind(b) !== 'prerelease');
    const isVersionCode = /^\d{4}$/.test(o0.version || '');
    return {
      key: `${day}:office:${key}`,
      kind: intrinsicKind(release ?? o0),
      // Perpetual releases ("LTSB2021") read better as their product name.
      title: `${isVersionCode ? `Version ${o0.version}` : (o0.channel || '').replace(/\s*Perpetual.*$/i, '') || o0.version}${number ? ` (Build ${number})` : ''}`,
      detail: channels.join(', ') || null,
      kb: null,
      time: Math.max(...members.map(buildTime)),
      items: [],
      primary: release ?? o0,
      members,
    };
  });
}

const DAY_LABEL: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };

/** Group records into UTC days (newest first), each holding merged release rows. */
export function groupReleases(builds: BuildRecord[]): ReleaseDay[] {
  const byDay = new Map<string, BuildRecord[]>();
  for (const b of builds) {
    const day = utcDay(buildTime(b));
    if (!day) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), b]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([day, records]) => {
      const groups = [...windowsGroups(records, day), ...edgeGroups(records, day), ...officeGroups(records, day)]
        .sort((a, b) => UPDATE_KIND_META[a.kind].order - UPDATE_KIND_META[b.kind].order || b.time - a.time);
      const hasWindows = records.some(isWindowsBuild);
      let note: string | null = null;
      if (hasWindows && isPatchTuesday(day)) note = 'Patch Tuesday';
      else if (groups.some((g) => g.kind === 'preview')) note = 'Optional preview release';
      return {
        day,
        label: new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', DAY_LABEL),
        note,
        groups,
      };
    });
}

/** Per-kind counts of timeline rows, for the filter chips. */
export function kindCounts(days: ReleaseDay[]): Map<UpdateKind, number> {
  const counts = new Map<UpdateKind, number>();
  for (const d of days) for (const g of d.groups) counts.set(g.kind, (counts.get(g.kind) ?? 0) + 1);
  return counts;
}

/** Record -> kind as resolved in context (so grid/list filter like the timeline). */
export function recordKinds(days: ReleaseDay[]): Map<BuildRecord, UpdateKind> {
  const kinds = new Map<BuildRecord, UpdateKind>();
  for (const d of days) for (const g of d.groups) for (const m of g.members) kinds.set(m, g.kind);
  return kinds;
}

/** Keep only groups of one kind; days left empty are dropped. */
export function filterDays(days: ReleaseDay[], kind: UpdateKind | null): ReleaseDay[] {
  if (!kind) return days;
  return days
    .map((d) => ({ ...d, groups: d.groups.filter((g) => g.kind === kind) }))
    .filter((d) => d.groups.length > 0);
}

export const UPDATE_KINDS = (Object.keys(UPDATE_KIND_META) as UpdateKind[])
  .sort((a, b) => UPDATE_KIND_META[a].order - UPDATE_KIND_META[b].order);

export function isUpdateKind(value: string | undefined | null): value is UpdateKind {
  return !!value && value in UPDATE_KIND_META;
}
