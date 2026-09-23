import React from 'react';
import { cn } from '../../utils/cn';
import type { ReleaseChannel } from '../../types';
import { QUICK_FILTER_CHANNELS, channelMeta } from '../../config/releaseChannels';

interface QuickFilterBarProps {
  activeChannel: ReleaseChannel | null;
  onSelect: (channel: ReleaseChannel | null) => void;
  /** Records per channel in the current result set. Channels with none are
   *  hidden (the live page offered eight chips, several always empty) — except
   *  the active one, so a selection can always be cleared. */
  counts: Map<string, number>;
}

// Windows channel chips, derived from the shared releaseChannels config. No
// emoji: several (🐤 🔓 🧪) render as tofu boxes on Windows' default fonts.
export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({ activeChannel, onSelect, counts }) => {
  const channels = QUICK_FILTER_CHANNELS.filter((ch) => (counts.get(ch) ?? 0) > 0 || ch === activeChannel);
  if (channels.length < 2 && !activeChannel) return null;

  const chip = 'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors';
  const on = 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900';
  const off = 'border-gray-300 bg-white text-gray-800 hover:border-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200';

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by release channel">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Channel</span>
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={activeChannel === null}
        className={cn(chip, activeChannel === null ? on : off)}
      >
        Any
      </button>
      {channels.map((ch) => {
        const meta = channelMeta(ch);
        const active = activeChannel === ch;
        return (
          <button
            key={ch}
            type="button"
            onClick={() => onSelect(active ? null : ch)}
            aria-pressed={active}
            aria-label={meta.aria}
            className={cn(chip, active ? on : off)}
          >
            {meta.label}
            <span className="text-xs opacity-70">{counts.get(ch) ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
};
