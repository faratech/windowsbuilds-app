// Single source of truth for how release channels / kinds / statuses are
// PRESENTED (label, colour, icon, ordering, a11y). Backend classification lives
// in the shared spec (fastapi_app/data/build_classification.json); this file is
// purely the frontend's display vocabulary. Add a channel here once and every
// badge, filter, and legend picks it up — no more editing five files.

import type { ReleaseChannel, BuildKind, BuildStatus } from '../types';

export interface ChannelMeta {
  label: string;
  icon: string;
  /** Solid pill classes used by every build-type badge/filter. */
  badgeClass: string;
  /** Bleeding-edge (low) → stable (high); drives legend/sort ordering. */
  order: number;
  /** Screen-reader description. */
  aria: string;
}

export const CHANNEL_META: Record<ReleaseChannel, ChannelMeta> = {
  experimental: {
    label: 'Experimental',
    icon: '🧪',
    badgeClass: 'bg-amber-500 text-white',
    order: 1,
    aria: 'Experimental channel build (formerly the Dev Channel)',
  },
  canary: {
    label: 'Canary',
    icon: '🐤',
    badgeClass: 'bg-red-500 text-white',
    order: 2,
    aria: 'Canary channel build',
  },
  dev: {
    label: 'Dev',
    icon: '⚡',
    badgeClass: 'bg-orange-500 text-white',
    order: 3,
    aria: 'Dev channel build (historical; renamed to Experimental in 2026)',
  },
  beta: {
    label: 'Beta',
    icon: '🔬',
    badgeClass: 'bg-blue-500 text-white',
    order: 4,
    aria: 'Beta channel build',
  },
  'release-preview': {
    label: 'Release Preview',
    icon: '🚀',
    badgeClass: 'bg-teal-500 text-white',
    order: 5,
    aria: 'Release Preview channel build',
  },
  insider: {
    label: 'Insider',
    icon: '🔓',
    badgeClass: 'bg-purple-500 text-white',
    order: 6,
    aria: 'Windows Insider build',
  },
  release: {
    label: 'Release',
    icon: '📦',
    badgeClass: 'bg-green-600 text-white',
    order: 7,
    aria: 'Retail / general availability release build',
  },
  stable: {
    label: 'Stable',
    icon: '✅',
    badgeClass: 'bg-green-600 text-white',
    order: 7,
    aria: 'Stable release build',
  },
};

const UNKNOWN_META: ChannelMeta = {
  label: 'Unknown',
  icon: '❔',
  badgeClass: 'bg-gray-500 text-white',
  order: 99,
  aria: 'Build channel',
};

/** Look up channel metadata, tolerating raw/unknown strings (warns once). */
const warned = new Set<string>();
export function channelMeta(channel?: string | null): ChannelMeta {
  if (!channel) return UNKNOWN_META;
  const key = channel.toLowerCase() as ReleaseChannel;
  const meta = CHANNEL_META[key];
  if (!meta) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[releaseChannels] unknown channel "${channel}" — add it to CHANNEL_META`);
    }
    return { ...UNKNOWN_META, label: channel };
  }
  return meta;
}

/** Channels offered as quick-filter chips, ordered edge → stable. */
export const QUICK_FILTER_CHANNELS: ReleaseChannel[] = (
  ['release', 'release-preview', 'beta', 'experimental', 'dev', 'canary', 'insider'] as ReleaseChannel[]
);

// --- Build kind (artifact/update type) -------------------------------------
export interface KindMeta {
  label: string;
  badgeClass: string;
}
export const KIND_META: Partial<Record<BuildKind, KindMeta>> = {
  enablement: { label: 'Enablement', badgeClass: 'bg-indigo-500 text-white' },
  hotpatch: { label: 'Hotpatch', badgeClass: 'bg-cyan-600 text-white' },
  lts: { label: 'LTSC', badgeClass: 'bg-slate-600 text-white' },
  dotnet: { label: '.NET', badgeClass: 'bg-violet-600 text-white' },
};
export function kindMeta(kind?: BuildKind | null): KindMeta | null {
  return kind ? KIND_META[kind] ?? null : null;
}

// --- Lifecycle status ------------------------------------------------------
export interface StatusMeta {
  label: string;
  badgeClass: string;
  aria: string;
}
export const STATUS_META: Partial<Record<BuildStatus, StatusMeta>> = {
  eol: { label: 'End of life', badgeClass: 'bg-red-600 text-white', aria: 'End of support' },
  current: { label: 'Current', badgeClass: 'bg-green-600 text-white', aria: 'Current servicing build' },
};
export function statusMeta(status?: BuildStatus | null): StatusMeta | null {
  return status ? STATUS_META[status] ?? null : null;
}

// --- Edge channels (Product field) -----------------------------------------
// Extended Stable is the enterprise 8-week stable channel added by Microsoft.
export const EDGE_PRODUCTS = ['Stable', 'Extended Stable', 'Beta', 'Dev', 'Canary'] as const;
