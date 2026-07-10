import { describe, expect, it, vi, beforeEach } from 'vitest';
import { downloadTarget, hasDownload, isSafeExternalUrl, openExternal, OFFICE_DOWNLOAD_CENTER } from './downloads';
import type { EdgeBuild, OfficeBuild, WindowsBuild } from '../types';

const windowsBuild: WindowsBuild = {
  uuid: 'ac945022-cfbe-44e9-9859-bdc079cc6d45',
  title: 'Windows 11 Insider Preview',
  arch: 'amd64',
  build: '28120.2387',
  created: '2026-07-07T07:46:49',
};

const edgeWithArtifact: EdgeBuild = {
  Product: 'Canary', Version: '152.0.4146.0', Platform: 'Windows', Architecture: 'x86',
  PublishedTime: '2026-07-09T20:15:00', ReleaseId: 124029,
  Artifacts: [{ ArtifactName: 'msi', Location: 'https://msedge.example/setup.msi' }],
};

const edgeWithoutArtifact: EdgeBuild = { ...edgeWithArtifact, ReleaseId: 124030, Artifacts: [] };

const officeBuild: OfficeBuild = {
  id: '', title: 'Microsoft 365 Current', build: '20228.20050',
  version: '2607', channel: 'Current Channel (Preview)', releaseDate: '2026-07-09T21:48:06.833Z',
};

describe('downloadTarget', () => {
  it('routes Windows builds through UUP Dump, escaping the uuid', () => {
    expect(downloadTarget(windowsBuild)).toEqual({
      url: `https://uupdump.net/selectlang.php?id=${windowsBuild.uuid}`,
      label: 'Download from UUP Dump',
    });
  });

  it('uses the first published Edge artifact', () => {
    expect(downloadTarget(edgeWithArtifact)?.url).toBe('https://msedge.example/setup.msi');
  });

  it('returns null for an Edge build with no artifacts', () => {
    expect(downloadTarget(edgeWithoutArtifact)).toBeNull();
  });

  it('returns null for Office — there is no per-build installer', () => {
    // Every Office row used to render a Download button pointing at the same
    // generic Download Center page, implying this servicing build was fetchable.
    expect(downloadTarget(officeBuild)).toBeNull();
    expect(hasDownload(officeBuild)).toBe(false);
  });
});

describe('isSafeExternalUrl', () => {
  it('accepts https', () => {
    expect(isSafeExternalUrl('https://uupdump.net/x')).toBe(true);
    expect(isSafeExternalUrl(OFFICE_DOWNLOAD_CENTER)).toBe(true);
  });

  it('rejects non-https schemes, including javascript: payloads', () => {
    // Artifacts[].Location is upstream Microsoft data, not ours.
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('http://insecure.example')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeExternalUrl('not a url at all')).toBe(false);
  });
});

describe('openExternal', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('always passes noopener,noreferrer', () => {
    openExternal('https://msedge.example/setup.msi');
    expect(window.open).toHaveBeenCalledWith('https://msedge.example/setup.msi', '_blank', 'noopener,noreferrer');
  });

  it('refuses to open an unsafe or empty url', () => {
    openExternal('javascript:alert(1)');
    openExternal(null);
    openExternal(undefined);
    expect(window.open).not.toHaveBeenCalled();
  });
});
