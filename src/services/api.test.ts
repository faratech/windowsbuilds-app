import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { apiService, ApiError } from './api';

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const windowsQuery = {
  tab: 'windows11' as const,
  arch: 'amd64',
  excludeInsider: false,
  date: { mode: 'rolling', days: 60 } as const,
};

describe('build list responses', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('throws when the backend reports an error alongside HTTP 200', async () => {
    // fastapi_app/routers/builds.py answers upstream failures with
    // 200 + {"builds": [], "error": "Failed to fetch data"}. Reading `builds`
    // at face value rendered an outage as a cheerful empty state.
    vi.mocked(fetch).mockResolvedValue(okJson({ builds: [], error: 'Failed to fetch data' }));

    await expect(apiService.fetchWindowsBuilds(windowsQuery)).rejects.toThrow('Failed to fetch data');
  });

  it('throws when the payload has no builds array', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ total: 0 }));
    await expect(apiService.fetchWindowsBuilds(windowsQuery)).rejects.toThrow(/missing "builds" array/);
  });

  it('throws when the payload is not an object', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson('nope'));
    await expect(apiService.fetchWindowsBuilds(windowsQuery)).rejects.toBeInstanceOf(ApiError);
  });

  it('accepts a genuinely empty build list', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ builds: [], total: 0 }));
    await expect(apiService.fetchWindowsBuilds(windowsQuery)).resolves.toEqual([]);
  });

  it('lowercases channel slugs without mutating the parsed response', async () => {
    const payload = { builds: [{ uuid: 'a', build_type: 'Release-Preview' }] };
    vi.mocked(fetch).mockResolvedValue(okJson(payload));

    const builds = await apiService.fetchWindowsBuilds(windowsQuery);
    expect(builds[0].build_type).toBe('release-preview');
  });

  it('surfaces a non-2xx status', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: 'boom' }), { status: 503 }),
    );
    await expect(apiService.fetchWindowsBuilds(windowsQuery)).rejects.toThrow('503 boom');
  });
});

describe('windows query parameters', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ builds: [] }))));
  afterEach(() => vi.unstubAllGlobals());

  const requestedUrl = () => new URL(vi.mocked(fetch).mock.calls[0][0] as string, 'https://example.test');

  it('sends the rolling window and no year', async () => {
    await apiService.fetchWindowsBuilds(windowsQuery);
    const params = requestedUrl().searchParams;
    expect(params.get('version')).toBe('Windows 11');
    expect(params.get('use_rolling')).toBe('true');
    expect(params.get('rolling_days')).toBe('60');
    expect(params.has('year')).toBe(false);
  });

  it('never sends build_type — the endpoint does not accept it', async () => {
    await apiService.fetchWindowsBuilds(windowsQuery);
    expect(requestedUrl().searchParams.has('build_type')).toBe(false);
  });

  it('maps the tab onto the version parameter', async () => {
    await apiService.fetchWindowsBuilds({ ...windowsQuery, tab: 'windowsServer' });
    expect(requestedUrl().searchParams.get('version')).toBe('Windows Server');
  });
});

describe('cancellation and timeouts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('propagates an aborted caller signal', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })));

    const controller = new AbortController();
    const pending = apiService.fetchWindowsBuilds(windowsQuery, controller.signal);
    controller.abort();

    await expect(pending).rejects.toBeDefined();
  });

  it('aborts a hung request instead of waiting forever', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })));

    const pending = apiService.fetchWindowsBuilds(windowsQuery);
    const assertion = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;

    vi.useRealTimers();
  });
});

describe('fetchBuildSummary', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns the summary text', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ summary: 'A summary.', cached: true }));
    await expect(apiService.fetchBuildSummary('id', 'title', 'windows')).resolves.toBe('A summary.');
  });

  it('throws on the 200-with-error shape', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ error: 'API key required' }));
    await expect(apiService.fetchBuildSummary('id', 'title', 'windows')).rejects.toThrow('API key required');
  });

  it('POSTs, and keeps the product in build_type for the backend cache key', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ summary: 'x' }));
    await apiService.fetchBuildSummary('uuid-1', 'Some Build', 'edge');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(new URL(url as string, 'https://example.test').searchParams.get('build_type')).toBe('edge');
  });
});
