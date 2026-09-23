import { describe, expect, it } from 'vitest';
import type { EdgeBuild, OfficeBuild, WindowsBuild } from '../types';
import { filterDays, groupReleases, intrinsicKind, isPatchTuesday, kbOf, recordKinds } from './releaseGroups';

const win = (uuid: string, title: string, build: string, created: string, extra: Partial<WindowsBuild> = {}): WindowsBuild => ({
  uuid, title, build, build_number: build, arch: 'amd64', build_type: 'release', created, ...extra,
});

// Shapes copied from the live feed of 2026-09-22 / 2026-09-08.
const sep22 = '2026-09-22T17:00:45';
const sep8 = '2026-09-08T17:03:09';
const feed: WindowsBuild[] = [
  win('p25', 'Preview Update for Windows 11 (26200.9550)', '26200.9550', sep22, { kind: 'cumulative', summary: 'Emoji 17.0 and fixes.' }),
  win('g24', 'Windows 11, version 24H2 (26100.9550)', '26100.9550', sep22),
  win('g26', 'Windows 11, version 26H2 (26300.9550)', '26300.9550', sep22),
  win('g25', 'Windows 11, version 25H2 (26200.9550)', '26200.9550', sep22),
  win('oobe1', 'Critical OOBE Update for Windows 11 - KB5128942 (26100.9544)', '26100.9544', sep22, { kind: 'cumulative' }),
  win('oobe2', 'Critical OOBE Update for Windows 11 - KB5128942 (26100.9544) (2)', '26100.9544', sep22, { kind: 'cumulative' }),
  win('pt25', 'Windows 11, version 25H2 (26200.9445)', '26200.9445', sep8),
  win('pt24', 'Windows 11, version 24H2 (26100.9445)', '26100.9445', sep8),
  win('pt23', 'Cumulative Update for Windows 11, version 23H2 (22631.7582)', '22631.7582', sep8, { kind: 'cumulative' }),
  win('net', '.NET Framework Security Update for Windows 11 - KB5126052 (26200.9347)', '26200.9347', sep8, { kind: 'dotnet' }),
  win('exp', 'Windows 11 Insider Preview 29661.1000 (rs_prerelease)', '29661.1000', sep8, { build_type: 'experimental', kind: 'preview' }),
];

describe('patch tuesday', () => {
  it('is the second Tuesday of the month', () => {
    expect(isPatchTuesday('2026-09-08')).toBe(true);
    expect(isPatchTuesday('2026-09-22')).toBe(false);
    expect(isPatchTuesday('2026-09-09')).toBe(false);
  });
});

describe('intrinsicKind', () => {
  it('reads explicit titles and channels', () => {
    expect(intrinsicKind(feed[0])).toBe('preview');
    expect(intrinsicKind(feed[4])).toBe('setup');
    expect(intrinsicKind(feed[9])).toBe('dotnet');
    expect(intrinsicKind(feed[10])).toBe('prerelease');
    expect(intrinsicKind(feed[1])).toBe('update');
  });

  it('extracts KB numbers', () => {
    expect(kbOf('x - kb5128942 (1)')).toBe('KB5128942');
    expect(kbOf('Windows 11, version 25H2')).toBeNull();
  });
});

describe('groupReleases', () => {
  const days = groupReleases(feed);

  it('groups by UTC day, newest first, and labels Patch Tuesday', () => {
    expect(days.map((d) => d.day)).toEqual(['2026-09-22', '2026-09-08']);
    expect(days[0].note).toBe('Optional preview release');
    expect(days[1].note).toBe('Patch Tuesday');
  });

  it('merges one revision across version lines into a single preview row', () => {
    const preview = days[0].groups.filter((g) => g.kind === 'preview');
    expect(preview).toHaveLength(1);
    expect(preview[0].items.map((i) => i.label)).toEqual(['26H2', '25H2', '24H2']);
    expect(preview[0].title).toBe('Optional preview update for 26H2, 25H2 & 24H2');
    expect(preview[0].items[0].href).toBe('/builds/windows11/26300.9550/');
    expect(preview[0].detail).toBe('Emoji 17.0 and fixes.');
  });

  it('collapses duplicate feed entries of the same setup update', () => {
    const setup = days[0].groups.filter((g) => g.kind === 'setup');
    expect(setup).toHaveLength(1);
    expect(setup[0].items).toHaveLength(1);
    expect(setup[0].kb).toBe('KB5128942');
    expect(setup[0].members).toHaveLength(2);
  });

  it('calls untitled Patch Tuesday records security updates', () => {
    const security = days[1].groups.filter((g) => g.kind === 'security');
    expect(security.map((g) => g.title)).toEqual([
      'Security update for 25H2 & 24H2',
      'Security update for 23H2',
    ]);
  });

  it('keeps pre-release builds apart, named by channel', () => {
    const pre = days[1].groups.find((g) => g.kind === 'prerelease');
    expect(pre?.title).toMatch(/^Experimental channel/);
  });

  it('filters by kind and maps records back to their resolved kind', () => {
    const onlySecurity = filterDays(days, 'security');
    expect(onlySecurity).toHaveLength(1);
    expect(recordKinds(days).get(feed[6])).toBe('security');
  });
});

describe('edge and office grouping', () => {
  it('merges an Edge version across platforms', () => {
    const edge: EdgeBuild[] = ['Windows', 'MacOS', 'Linux'].map((Platform, i) => ({
      Product: 'Stable', Version: '153.0.4234.48', Platform, Architecture: 'x64',
      PublishedTime: '2026-09-18T10:00:00', ReleaseId: i + 1, build_type: 'stable', CVEs: ['CVE-1', 'CVE-2'],
    }));
    const [day] = groupReleases(edge);
    expect(day.groups).toHaveLength(1);
    expect(day.groups[0]).toMatchObject({ kind: 'security', title: 'Edge Stable 153.0.4234.48' });
    expect(day.groups[0].detail).toBe('Windows, MacOS, Linux · fixes 2 security vulnerabilities');
  });

  it('merges an Office build shipped to two channels, preferring the release one', () => {
    const office: OfficeBuild[] = [
      { uuid: 'a', title: 'M365 Current', build_number: '20430.20092', version: '2609', channel: 'Current Channel (Preview)', created_timestamp: 1790091215 },
      { uuid: 'b', title: 'M365 Current', build_number: '20430.20092', version: '2609', channel: 'Current Channel', created_timestamp: 1790091215 },
    ];
    const [day] = groupReleases(office);
    expect(day.groups).toHaveLength(1);
    expect(day.groups[0]).toMatchObject({ kind: 'update', title: 'Version 2609 (Build 20430.20092)' });
    expect(day.groups[0].primary).toBe(office[1]);
  });
});
