import React, { useMemo } from 'react';
import type { TabType } from '../types';
import { PRODUCT_GUIDE, windowsChannelsFor } from '../config/productGuide';
import { UPDATE_KIND_META } from '../utils/releaseGroups';
import { isEdgeBuild, isOfficeBuild, isWindowsBuild, type BuildRecord } from '../utils/typeGuards';
import { buildTime, compareVersions } from '../utils/buildRecord';
import { buildNumberOf } from '../utils/permalink';
import { cn } from '../utils/cn';

interface GuidePanelProps {
  tab: TabType;
  builds: BuildRecord[];
}

/** Newest build number per channel id, as the explainer keys them. */
function latestByChannel(builds: BuildRecord[]): Map<string, string> {
  const best = new Map<string, { number: string; time: number }>();
  const offer = (id: string, number: string, time: number, byVersion: boolean) => {
    if (!id || !number) return;
    const current = best.get(id);
    const newer = !current || (byVersion ? compareVersions(number, current.number) > 0 : time > current.time);
    if (newer) best.set(id, { number, time });
  };
  for (const b of builds) {
    if (isWindowsBuild(b)) offer((b.build_type || 'release').toLowerCase(), buildNumberOf(b), buildTime(b), false);
    else if (isEdgeBuild(b) && b.Platform === 'Windows') offer(b.Product, b.Version, buildTime(b), true);
    else if (isOfficeBuild(b)) offer(b.channel, b.build_number || b.build || '', buildTime(b), false);
  }
  return new Map([...best].map(([k, v]) => [k, v.number]));
}

const PANEL = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5';

export const GuidePanel: React.FC<GuidePanelProps> = ({ tab, builds }) => {
  const guide = PRODUCT_GUIDE[tab];
  const latest = useMemo(() => latestByChannel(builds), [builds]);
  const channels = useMemo(() => {
    // Only the Windows 11 explainer lists channels from the data (plus any
    // retired ones still present); the others are fixed copy.
    if (tab !== 'windows11') return guide.channels;
    return windowsChannelsFor(new Set(latest.keys()), guide.channels);
  }, [tab, guide.channels, latest]);
  const showNumbers = tab === 'windows11' || tab === 'edge' || tab === 'office365';

  return (
    <>
      <section aria-labelledby="wf-channels-heading" className={PANEL}>
        <h2 id="wf-channels-heading" className="text-base font-semibold text-gray-900 dark:text-white">
          {guide.channelsHeading}
        </h2>
        <p className="mt-1 text-sm leading-snug text-gray-600 dark:text-gray-400">{guide.channelsHint}</p>
        <ul className="mt-3 list-none">
          {channels.map((channel) => {
            const number = showNumbers ? latest.get(channel.id) : undefined;
            return (
              <li key={channel.id} className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] gap-x-2.5 py-2.5 border-t border-gray-100 dark:border-gray-800">
                <span aria-hidden="true" className={cn('mt-1.5 h-2.5 w-2.5 rounded-full', channel.dot)} />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{channel.name}</div>
                  <div className="text-[13px] leading-snug text-gray-600 dark:text-gray-400">{channel.who}</div>
                </div>
                {number && <span className="pt-0.5 font-mono text-xs text-gray-800 dark:text-gray-200">{number}</span>}
              </li>
            );
          })}
        </ul>
        {tab !== 'windows10' && (
          <div aria-hidden="true" className="mt-1 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>More stable</span>
            <span className="h-px flex-1 bg-linear-to-r from-emerald-500 to-amber-500" />
            <span>Newer, riskier</span>
          </div>
        )}
      </section>

      <section aria-labelledby="wf-kinds-heading" className={PANEL}>
        <h2 id="wf-kinds-heading" className="text-base font-semibold text-gray-900 dark:text-white">
          What the update types mean
        </h2>
        <dl className="mt-2">
          {guide.glossary.map((kind) => {
            const meta = UPDATE_KIND_META[kind];
            return (
              <div key={kind} className="py-2 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
                <dt>
                  <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', meta.pill)}>{meta.label}</span>
                </dt>
                <dd className="mt-1 text-[13px] leading-snug text-gray-600 dark:text-gray-400">{meta.explain}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </>
  );
};
