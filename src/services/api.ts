import type { WindowsBuild, EdgeBuild, OfficeBuild, FilterOptions } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/builds';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ApiService {
  private cache: Map<string, CacheEntry<any>> = new Map();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async fetchWindowsBuilds(filters?: FilterOptions): Promise<WindowsBuild[]> {
    const cacheKey = `windows-builds-${JSON.stringify(filters || {})}`;
    const cached = this.getCached<WindowsBuild[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();

      // Determine Windows version based on tab
      const version = filters?.tab === 'windows10' ? 'Windows 10' :
                     filters?.tab === 'windowsServer' ? 'Windows Server' : 'Windows 11';
      params.append('version', version);

      if (filters?.selectedArch) params.append('arch', filters.selectedArch);
      if (filters?.buildFilter) params.append('search', filters.buildFilter);
      if (filters?.excludeInsider) params.append('exclude_insider', String(filters.excludeInsider));

      // Handle rolling date filter - use 'use_rolling' flag when "Last 30 Days" is selected
      if (filters?.selectedMonth === 'Last 30 Days') {
        params.append('use_rolling', 'true');
      } else {
        if (filters?.selectedMonth && filters.selectedMonth !== 'All') {
          params.append('month', filters.selectedMonth);
        }
        if (filters?.selectedYear && filters.selectedYear !== 'All') {
          params.append('year', filters.selectedYear);
        }
      }

      if (filters?.buildType) params.append('build_type', filters.buildType);

      const response = await fetch(`${API_BASE}/windows?${params}`);
      if (!response.ok) throw new Error('Failed to fetch Windows builds');

      const data = await response.json();
      const builds = data.builds || [];
      this.setCache(cacheKey, builds);
      return builds;
    } catch (error) {
      console.error('Error fetching Windows builds:', error);
      return [];
    }
  }

  async fetchEdgeBuilds(filters?: FilterOptions): Promise<EdgeBuild[]> {
    const cacheKey = `edge-builds-${JSON.stringify(filters || {})}`;
    const cached = this.getCached<EdgeBuild[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (filters?.excludeInsider) params.append('exclude_insider', 'true');
      if (filters?.buildFilter) params.append('search', filters.buildFilter);

      const response = await fetch(`${API_BASE}/edge?${params}`);
      if (!response.ok) throw new Error('Failed to fetch Edge builds');

      const data = await response.json();
      const builds = data.builds || [];
      this.setCache(cacheKey, builds);
      return builds;
    } catch (error) {
      console.error('Error fetching Edge builds:', error);
      return [];
    }
  }

  async fetchOfficeBuilds(filters?: FilterOptions): Promise<OfficeBuild[]> {
    const cacheKey = `office-builds-${JSON.stringify(filters || {})}`;
    const cached = this.getCached<OfficeBuild[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (filters?.buildFilter) params.append('search', filters.buildFilter);

      const response = await fetch(`${API_BASE}/office365?${params}`);
      if (!response.ok) throw new Error('Failed to fetch Office builds');

      const data = await response.json();
      const builds = data.builds || [];
      this.setCache(cacheKey, builds);
      return builds;
    } catch (error) {
      console.error('Error fetching Office builds:', error);
      return [];
    }
  }

  async fetchBuildSummary(uuid: string, title: string, buildType: string = 'windows'): Promise<string> {
    try {
      const params = new URLSearchParams();
      params.append('uuid', uuid);
      params.append('title', title);
      params.append('build_type', buildType);

      const response = await fetch(`${API_BASE}/summary?${params}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to fetch build summary');

      const data = await response.json();
      return data.summary || 'No summary available';
    } catch (error) {
      console.error('Error fetching build summary:', error);
      return 'Failed to load summary';
    }
  }

  async fetchAllBuilds(filters?: FilterOptions): Promise<{
    windows: WindowsBuild[];
    edge: EdgeBuild[];
    office: OfficeBuild[];
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.excludeInsider) params.append('exclude_insider', String(filters.excludeInsider));
      params.append('limit', '100');

      const response = await fetch(`${API_BASE}/all?${params}`);
      if (!response.ok) throw new Error('Failed to fetch all builds');

      const data = await response.json();
      return {
        windows: data.windows || [],
        edge: data.edge || [],
        office: data.office365 || []
      };
    } catch (error) {
      console.error('Error fetching all builds:', error);
      return { windows: [], edge: [], office: [] };
    }
  }

}

export const apiService = new ApiService();