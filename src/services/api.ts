import type { WindowsBuild, EdgeBuild, OfficeBuild, FilterOptions } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api/builds').replace(/\/+$/, '');
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ApiService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchJson<T>(path: string, params: URLSearchParams, init?: RequestInit): Promise<T> {
    const query = params.toString();
    const response = await fetch(`${API_BASE}${path}${query ? `?${query}` : ''}`, init);

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = await response.json();
        detail = body.detail || body.message || detail;
      } catch {
        // Keep the status text if the backend returned a non-JSON error.
      }
      throw new Error(`${response.status} ${detail}`.trim());
    }

    return response.json() as Promise<T>;
  }

  async fetchWindowsBuilds(filters?: FilterOptions): Promise<WindowsBuild[]> {
    const cacheKey = `windows-builds-${JSON.stringify(filters || {})}`;
    const cached = this.getCached<WindowsBuild[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    const version = filters?.tab === 'windows10' ? 'Windows 10' :
                   filters?.tab === 'windowsServer' ? 'Windows Server' : 'Windows 11';
    params.append('version', version);

    if (filters?.selectedArch) params.append('arch', filters.selectedArch);
    if (filters?.buildFilter) params.append('search', filters.buildFilter);
    if (filters?.excludeInsider) params.append('exclude_insider', String(filters.excludeInsider));

    const currentYearStr = new Date().getFullYear().toString();
    const isCurrentYearOrAll = !filters?.selectedYear || filters?.selectedYear === 'All' || filters?.selectedYear === currentYearStr;

    if (isCurrentYearOrAll && filters?.selectedMonth === 'Last 60 Days') {
      params.append('use_rolling', 'true');
      params.append('rolling_days', '60');
    } else if (isCurrentYearOrAll && filters?.selectedMonth === 'Last 30 Days') {
      params.append('use_rolling', 'true');
      params.append('rolling_days', '30');
    } else {
      if (filters?.selectedMonth && filters.selectedMonth !== 'All' && filters.selectedMonth !== 'Last 60 Days' && filters.selectedMonth !== 'Last 30 Days') {
        params.append('month', filters.selectedMonth);
      }
      if (filters?.selectedYear && filters.selectedYear !== 'All') {
        params.append('year', filters.selectedYear);
      }
    }

    if (filters?.buildType) params.append('build_type', filters.buildType);

    const data = await this.fetchJson<{ builds?: WindowsBuild[] }>('/windows', params);
    const builds = data.builds || [];
    this.setCache(cacheKey, builds);
    return builds;
  }

  async fetchEdgeBuilds(filters?: FilterOptions): Promise<EdgeBuild[]> {
    const cacheKey = `edge-builds-${JSON.stringify(filters || {})}`;
    const cached = this.getCached<EdgeBuild[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    if (filters?.excludeInsider) params.append('exclude_insider', 'true');
    if (filters?.buildFilter) params.append('search', filters.buildFilter);

    const data = await this.fetchJson<{ builds?: EdgeBuild[] }>('/edge', params);
    const builds = data.builds || [];
    this.setCache(cacheKey, builds);
    return builds;
  }

  async fetchOfficeBuilds(filters?: FilterOptions): Promise<OfficeBuild[]> {
    const cacheKey = `office-builds-${JSON.stringify(filters || {})}`;
    const cached = this.getCached<OfficeBuild[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    if (filters?.buildFilter) params.append('search', filters.buildFilter);

    const data = await this.fetchJson<{ builds?: OfficeBuild[] }>('/office365', params);
    const builds = data.builds || [];
    this.setCache(cacheKey, builds);
    return builds;
  }

  async fetchBuildSummary(uuid: string, title: string, buildType: string = 'windows'): Promise<string> {
    const params = new URLSearchParams();
    params.append('uuid', uuid);
    params.append('title', title);
    params.append('build_type', buildType);

    const data = await this.fetchJson<{ summary?: string }>('/summary', params, {
      method: 'POST',
      body: '',
    });
    return data.summary || 'No summary available';
  }

  async fetchAllBuilds(filters?: FilterOptions): Promise<{
    windows: WindowsBuild[];
    edge: EdgeBuild[];
    office: OfficeBuild[];
  }> {
    const params = new URLSearchParams();
    if (filters?.excludeInsider) params.append('exclude_insider', String(filters.excludeInsider));
    params.append('limit', '100');

    const data = await this.fetchJson<{
      windows?: WindowsBuild[];
      edge?: EdgeBuild[];
      office365?: OfficeBuild[];
    }>('/all', params);
    return {
      windows: data.windows || [],
      edge: data.edge || [],
      office: data.office365 || []
    };
  }

}

export const apiService = new ApiService();
