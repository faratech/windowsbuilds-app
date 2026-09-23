// Plain-language copy for the "what does all this mean" parts of the page:
// how to check your own version, what each release channel is for, and which
// channels exist per product. Presentation only — classification lives in
// utils/releaseGroups.ts and the backend's build_classification.json.

import type { ReleaseChannel, TabType } from '../types';
import type { UpdateKind } from '../utils/releaseGroups';

export interface ChannelStep {
  /** Matches a Windows record's `build_type`, an Edge `Product`, or an Office `channel`. */
  id: string;
  name: string;
  who: string;
  /** Dot colour, stable → risky. */
  dot: string;
}

export interface ProductGuide {
  versionHeading: string;
  versionHint: string;
  checkHint: string;
  channelsHeading: string;
  channelsHint: string;
  channels: ChannelStep[];
  /** Update kinds explained in the glossary, in display order. */
  glossary: UpdateKind[];
}

const WINDOWS_CLIENT_CHANNELS: ChannelStep[] = [
  { id: 'release', name: 'Release', who: 'What Windows Update installs for everyone. Choose this.', dot: 'bg-emerald-600' },
  { id: 'release-preview', name: 'Release Preview', who: 'Next month’s fixes a few weeks early. Very stable.', dot: 'bg-teal-600' },
  { id: 'insider', name: 'Insider', who: 'Previews of the next Windows version.', dot: 'bg-sky-600' },
  { id: 'beta', name: 'Beta', who: 'Features close to shipping. Occasional bugs.', dot: 'bg-indigo-600' },
  { id: 'experimental', name: 'Experimental', who: 'Earliest, roughest builds — test PCs only. Replaced Dev and Canary in 2026.', dot: 'bg-amber-500' },
];

/** Historical Windows channels, listed only when the loaded data still has them. */
export const HISTORICAL_WINDOWS_CHANNELS: ChannelStep[] = [
  { id: 'dev', name: 'Dev (retired)', who: 'Renamed Experimental in 2026.', dot: 'bg-orange-500' },
  { id: 'canary', name: 'Canary (retired)', who: 'Folded into Experimental in 2026.', dot: 'bg-red-500' },
];

const WINDOWS_GLOSSARY: UpdateKind[] = ['security', 'preview', 'update', 'setup', 'dotnet', 'enablement', 'prerelease'];

export const PRODUCT_GUIDE: Record<TabType, ProductGuide> = {
  windows11: {
    versionHeading: 'Which version should I be on?',
    versionHint: 'The latest build of every Windows 11 version. Most people should be on the one marked recommended.',
    checkHint: 'Check yours: press Win + R, type winver',
    channelsHeading: 'Release channels, explained',
    channelsHint: 'Microsoft tests changes in stages. Everyone gets Release; the rest are opt-in previews through the Windows Insider Program.',
    channels: WINDOWS_CLIENT_CHANNELS,
    glossary: WINDOWS_GLOSSARY,
  },
  windows10: {
    versionHeading: 'Windows 10 versions',
    versionHint: 'Windows 10 support ended October 14, 2025. Only PCs enrolled in Extended Security Updates (ESU) and LTSC editions still get patches.',
    checkHint: 'Check yours: press Win + R, type winver',
    channelsHeading: 'Still on Windows 10?',
    channelsHint: 'Without ESU, a Windows 10 PC no longer receives security fixes. Your options:',
    channels: [
      { id: 'upgrade', name: 'Upgrade to Windows 11', who: 'Free, if the PC meets the requirements.', dot: 'bg-emerald-600' },
      { id: 'esu', name: 'Enroll in ESU', who: 'Paid security-only updates for a limited time.', dot: 'bg-sky-600' },
      { id: 'ltsc', name: 'LTSC editions', who: 'Business editions with a fixed, longer support period.', dot: 'bg-indigo-600' },
    ],
    glossary: ['security', 'update', 'dotnet'],
  },
  windowsServer: {
    versionHeading: 'Windows Server releases',
    versionHint: 'The latest update for each Windows Server release.',
    checkHint: 'Check yours: run winver',
    channelsHeading: 'Servicing, explained',
    channelsHint: 'Server releases follow the Long-Term Servicing Channel: about five years of mainstream support, then five of extended.',
    channels: [
      { id: 'mainstream', name: 'Mainstream support', who: 'Security fixes plus non-security improvements.', dot: 'bg-emerald-600' },
      { id: 'extended', name: 'Extended support', who: 'Security fixes only.', dot: 'bg-teal-600' },
      { id: 'experimental', name: 'Insider (Experimental)', who: 'Previews of the next Server release. Labs only.', dot: 'bg-amber-500' },
    ],
    glossary: ['security', 'update', 'hotpatch', 'prerelease'],
  },
  edge: {
    versionHeading: 'Current Edge versions',
    versionHint: 'The newest Windows build in each Edge channel. Mac, Linux, iOS and Android follow the same version numbers.',
    checkHint: 'Check yours: open edge://settings/help',
    channelsHeading: 'Edge channels, explained',
    channelsHint: 'Each channel is a separate browser you can install side by side.',
    channels: [
      { id: 'Stable', name: 'Stable', who: 'The Edge that comes with Windows. Updated about every four weeks.', dot: 'bg-emerald-600' },
      { id: 'Extended Stable', name: 'Extended Stable', who: 'For businesses: a new version every eight weeks.', dot: 'bg-teal-600' },
      { id: 'Beta', name: 'Beta', who: 'Next month’s Stable, early.', dot: 'bg-indigo-600' },
      { id: 'Dev', name: 'Dev', who: 'Updated weekly.', dot: 'bg-amber-500' },
      { id: 'Canary', name: 'Canary', who: 'Updated daily. Expect breakage.', dot: 'bg-red-500' },
    ],
    glossary: ['security', 'update', 'prerelease'],
  },
  office365: {
    versionHeading: 'Office & Microsoft 365 versions',
    versionHint: 'Home users are on Current Channel. Businesses often choose a slower channel.',
    checkHint: 'Check yours: File › Account › About',
    channelsHeading: 'Update channels, explained',
    channelsHint: 'Channels decide how often Office gets new features. Security fixes reach all of them.',
    channels: [
      { id: 'Current Channel', name: 'Current', who: 'New features every month. The default for home.', dot: 'bg-emerald-600' },
      { id: 'Monthly Enterprise Channel', name: 'Monthly Enterprise', who: 'Monthly, on a predictable day.', dot: 'bg-sky-600' },
      { id: 'Semi-Annual Enterprise Channel', name: 'Semi-Annual Enterprise', who: 'New features twice a year.', dot: 'bg-teal-600' },
      { id: 'Current Channel (Preview)', name: 'Current (Preview)', who: 'Next Current build, early.', dot: 'bg-amber-500' },
      { id: 'perpetual', name: 'Office 2019 / 2021 / 2024', who: 'One-time purchase. Security fixes, no new features.', dot: 'bg-slate-500' },
    ],
    glossary: ['update', 'prerelease'],
  },
};

/** Windows channels that belong in the explainer for this tab's data. */
export function windowsChannelsFor(present: Set<ReleaseChannel | string>, base: ChannelStep[]): ChannelStep[] {
  return [...base, ...HISTORICAL_WINDOWS_CHANNELS.filter((c) => present.has(c.id))];
}
