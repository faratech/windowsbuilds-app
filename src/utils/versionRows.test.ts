import { describe, expect, it } from 'vitest';
import type { VersionLine, WindowsBuild } from '../types';
import { lineRows } from './versionRows';
import { buildDateValue, buildTime, buildSearchText } from './buildRecord';
import { formatBuildDate, SHORT_DATE } from './dates';
import { intrinsicKind, groupReleases } from './releaseGroups';
import { versionTag } from './permalink';

const line: VersionLine = {
  family: 'windows11', family_label: 'Windows 11', tag: '26H2',
  status: 'mainstream', note: 'Current annual release',
  url: '/builds/windows11/26h2/', count: 40,
  latest: {
    build: '26340.9577', title: 'Windows 11 Insider Preview', created: 1790294400,
    created_iso: null, build_type: 'experimental', channel_label: 'Experimental',
    kind: 'preview', kb: null, uuid: 'insider', url: '/builds/windows11/26340.9577/',
  },
  latest_public: {
    build: '26300.9550', title: 'Windows 11 26H2', created: 1790683200,
    created_iso: null, build_type: 'release', channel_label: 'Release',
    kind: 'cumulative', kb: 'KB5124010', uuid: 'public',
    release_date: '2026-09-29', update_type: '2026-09 D', url: '/builds/windows11/26300.9550/',
  },
};

describe('public version guidance', () => {
  it('selects the public build over a newer Insider build and labels optional previews', () => {
    const [row] = lineRows([line]);
    expect(row.number).toBe('26300.9550');
    expect(row.href).toBe('/builds/windows11/26300.9550/');
    expect(row.releaseDate).toBe('2026-09-29');
    expect(row.note).toContain('optional non-security preview');
    expect(row.recommended).toBe(true);
  });

  it('keeps public Server builds with no UUP download UUID', () => {
    const [row] = lineRows([{ ...line, family: 'windowsserver', tag: '2022', status: 'supported',
      latest_public: { ...line.latest_public!, build: '20348.5631', uuid: null, update_type: '2026-09 B' } }]);
    expect(row.name).toBe('Server 2022');
    expect(row.number).toBe('20348.5631');
    expect(row.note).not.toContain('optional');
  });

  it('does not substitute an Insider build when a public build is unavailable', () => {
    const [row] = lineRows([{ ...line, status: 'preview', latest_public: null }]);
    expect(row.number).toBe('Insider only');
    expect(row.href).toBeNull();
    expect(row.time).toBeNull();
    expect(row.recommended).toBe(false);
  });

  it('accepts the old API response during activation', () => {
    const { latest_public: _public, ...legacy } = line;
    expect(lineRows([legacy])[0].number).toBe('26340.9577');
  });
});

describe('release metadata', () => {
  const build: WindowsBuild = {
    uuid: 'public', title: 'Windows 11, version 26H2 (26300.9550)',
    build: '26300.9550', arch: 'amd64', build_type: 'release',
    created: '2026-09-22T12:00:00Z', release_date: '2026-09-29', update_type: '2026-09 D',
  };

  it('uses the official date in the timeline while preserving the UUP filter timestamp', () => {
    expect(buildDateValue(build)).toBe('2026-09-29');
    expect(buildTime(build)).toBe(Date.parse(build.created));
    expect(groupReleases([build])[0].day).toBe('2026-09-29');
    expect(intrinsicKind(build)).toBe('preview');
  });

  it('renders a calendar release date consistently west of UTC', () => {
    expect(formatBuildDate('2026-09-29', { ...SHORT_DATE, timeZone: 'America/Los_Angeles' })).toBe('Sep 29, 2026');
    expect(formatBuildDate('2026-09-29T00:00:00Z', { ...SHORT_DATE, timeZone: 'America/Los_Angeles' })).toBe('Sep 28, 2026');
  });

  it('uses official version associations and preserves an unnamed future branch', () => {
    expect(buildSearchText({ ...build, title: 'Windows 11 Insider Preview', version_tag: '26H2' })).toContain('26H2');
    expect(versionTag('Windows 11 Insider Preview', '26340.9577', 'windows11', '26H2')).toBe('26H2');
    expect(versionTag('Windows 11 Insider Preview 26H1', '29671.1000', 'windows11', null)).toBeNull();
    expect(versionTag('Windows Server 2016 (1803)', '17134.1345', 'windowsserver')).toBeNull();
  });
});
