import type { WindowsBuild, EdgeBuild, OfficeBuild, BuildListResponse, TabType, VersionLine } from '../types';

const LINE_FAMILY: Partial<Record<TabType, string>> = {
  windows11: 'windows11',
  windows10: 'windows10',
  windowsServer: 'windowsserver',
};
import { toQueryParams, type DateFilter } from '../utils/dateFilter';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api/builds').replace(/\/+$/, '');

/** A hung fetch used to hang forever; the UI would sit on skeletons indefinitely. */
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  // Declared explicitly rather than as a constructor parameter property:
  // `erasableSyntaxOnly` (tsconfig.app.json) rejects syntax that emits code.
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * `AbortSignal.any` is recent enough that jsdom (and older Safari) may lack it.
 * Compose manually rather than feature-gate the timeout away.
 */
function withTimeout(signal: AbortSignal | undefined, ms: number): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);

  const abort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  }

  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    },
  };
}

async function fetchJson<T>(
  path: string,
  params: URLSearchParams,
  init: RequestInit = {},
): Promise<T> {
  const query = params.toString();
  const { signal, done } = withTimeout(init.signal ?? undefined, REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}${query ? `?${query}` : ''}`, { ...init, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    done();
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail || body.message || body.error || detail;
    } catch {
      // Non-JSON error body; the status text is the best we have.
    }
    throw new ApiError(`${response.status} ${detail}`.trim(), response.status);
  }

  return response.json() as Promise<T>;
}

/**
 * The builds API answers upstream failures with **HTTP 200** and a body of
 * `{"builds": [], "error": "Failed to fetch data"}` (see fastapi_app/routers/
 * builds.py). Taking `data.builds || []` at face value rendered that outage as
 * a cheerful "No builds found" empty state. Treat the error field as fatal and
 * insist the payload is actually shaped like a build list.
 */
function unwrapBuildList<T>(payload: unknown, endpoint: string): T[] {
  if (typeof payload !== 'object' || payload === null) {
    throw new ApiError(`Malformed response from ${endpoint}`);
  }

  const body = payload as Partial<BuildListResponse<T>> & { error?: unknown };

  if (typeof body.error === 'string' && body.error) {
    throw new ApiError(body.error);
  }

  if (!Array.isArray(body.builds)) {
    throw new ApiError(`Malformed response from ${endpoint}: missing "builds" array`);
  }

  return body.builds;
}

/**
 * Backends emit lowercase channel slugs, but casing has drifted between the
 * Python and PHP sources before. Normalise onto a copy — mutating the parsed
 * response in place would corrupt any object React Query has already cached.
 */
function normalizeChannels<T extends { build_type?: string }>(builds: T[]): T[] {
  return builds.map((build) =>
    typeof build.build_type === 'string'
      ? { ...build, build_type: build.build_type.toLowerCase() as T['build_type'] }
      : build,
  );
}

const WINDOWS_VERSION: Record<string, string> = {
  windows10: 'Windows 10',
  windowsServer: 'Windows Server',
  windows11: 'Windows 11',
};

/** Server-side parameters only. Sort order, channel chips, search, platform and
 *  Office-channel selection are all applied client-side and must never widen a
 *  query key, or every local filter click becomes a network round-trip. */
export interface WindowsQuery {
  tab: TabType;
  arch: string;
  excludeInsider: boolean;
  date: DateFilter;
}

export interface EdgeQuery {
  excludeInsider: boolean;
}

export const apiService = {
  /** Newest OS build per version line (24H2, 25H2, 26H1 ...) with the line's status note. */
  async fetchLines(tab: TabType, signal?: AbortSignal): Promise<VersionLine[]> {
    const family = LINE_FAMILY[tab];
    if (!family) return [];
    const payload = await fetchJson<{ lines?: unknown }>(`/lines/${family}`, new URLSearchParams(), { signal });
    return Array.isArray(payload.lines) ? (payload.lines as VersionLine[]) : [];
  },

  async fetchWindowsBuilds(query: WindowsQuery, signal?: AbortSignal): Promise<WindowsBuild[]> {
    const params = new URLSearchParams({
      version: WINDOWS_VERSION[query.tab] ?? 'Windows 11',
      arch: query.arch,
    });
    if (query.excludeInsider) params.set('exclude_insider', 'true');
    for (const [key, value] of Object.entries(toQueryParams(query.date))) {
      params.set(key, value);
    }

    // NB: no `build_type` param. `/api/builds/windows` does not accept one —
    // FastAPI silently ignored it while it fragmented the client cache key.

    const payload = await fetchJson<unknown>('/windows', params, { signal });
    return normalizeChannels(unwrapBuildList<WindowsBuild>(payload, '/windows'));
  },

  async fetchEdgeBuilds(query: EdgeQuery, signal?: AbortSignal): Promise<EdgeBuild[]> {
    const params = new URLSearchParams();
    if (query.excludeInsider) params.set('exclude_insider', 'true');

    const payload = await fetchJson<unknown>('/edge', params, { signal });
    return normalizeChannels(unwrapBuildList<EdgeBuild>(payload, '/edge'));
  },

  async fetchOfficeBuilds(signal?: AbortSignal): Promise<OfficeBuild[]> {
    const payload = await fetchJson<unknown>('/office365', new URLSearchParams(), { signal });
    return normalizeChannels(unwrapBuildList<OfficeBuild>(payload, '/office365'));
  },

  async fetchBuildSummary(
    uuid: string,
    title: string,
    buildType: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const params = new URLSearchParams({ uuid, title, build_type: buildType });
    const payload = await fetchJson<{ summary?: unknown; error?: unknown }>(
      '/summary',
      params,
      { method: 'POST', signal },
    );

    if (typeof payload.error === 'string' && payload.error) throw new ApiError(payload.error);
    if (typeof payload.summary !== 'string' || !payload.summary) {
      throw new ApiError('No summary available');
    }
    return payload.summary;
  },
};
