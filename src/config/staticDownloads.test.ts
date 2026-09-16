import { describe, expect, it } from 'vitest';
import {
  STATIC_DOWNLOADS,
  STATIC_DOWNLOAD_LINKS_VERIFIED,
  STATIC_DOWNLOADS_NEWEST,
  isStaticDownloadsStale,
} from './staticDownloads';

describe('staticDownloads', () => {
  it('contains valid HTTPS download entries', () => {
    expect(STATIC_DOWNLOADS.length).toBeGreaterThanOrEqual(4);
    for (const d of STATIC_DOWNLOADS) {
      expect(d.url).toMatch(/^https:\/\//);
      expect(['x64', 'arm64']).toContain(d.architecture);
      expect(['iso', 'update']).toContain(d.type);
      expect(d.releasedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('includes the 26H2 KB5121794 enablement packages for x64 and arm64', () => {
    const ekb26h2 = STATIC_DOWNLOADS.filter((d) => d.title.includes('KB5121794'));
    expect(ekb26h2).toHaveLength(2);

    const x64 = ekb26h2.find((d) => d.architecture === 'x64');
    expect(x64).toBeDefined();
    expect(x64?.url).toContain('KB5121794-x64');
    expect(x64?.type).toBe('update');
    expect(x64?.releasedDate).toBe('2026-08-28');

    const arm64 = ekb26h2.find((d) => d.architecture === 'arm64');
    expect(arm64).toBeDefined();
    expect(arm64?.url).toContain('KB5121794-arm64');
    expect(arm64?.type).toBe('update');
    expect(arm64?.releasedDate).toBe('2026-08-28');
  });

  it('reports fresh media when checked against recent date', () => {
    expect(STATIC_DOWNLOADS_NEWEST).toBe('2026-08-28');
    expect(STATIC_DOWNLOAD_LINKS_VERIFIED).toBe('2026-09-12');
    // Checked as of 2026-09-12 (within 4 months of 2026-08-28)
    expect(isStaticDownloadsStale(new Date('2026-09-12T00:00:00Z'))).toBe(false);
    // Becomes stale after 4 months
    expect(isStaticDownloadsStale(new Date('2027-01-01T00:00:00Z'))).toBe(true);
  });
});
