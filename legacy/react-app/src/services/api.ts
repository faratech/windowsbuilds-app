import axios from 'axios';
import { BuildsResponse, FilterState, TabType } from '../types';

const API_BASE_URL = '/builds-api.php';

const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const buildsApi = {
  fetchBuilds: async (
    tab: TabType,
    filters: FilterState
  ): Promise<BuildsResponse> => {
    const params = new URLSearchParams();
    
    params.append('tab', tab);
    params.append('selectedMonth', filters.month);
    params.append('selectedYear', filters.year);
    params.append('selectedArch', filters.architecture);
    
    if (filters.excludeInsider) {
      params.append('excludeInsider', '1');
    }
    
    if (filters.searchTerm) {
      params.append('buildFilter', filters.searchTerm);
    }
    
    if (filters.channel) {
      params.append('selectedChannel', filters.channel);
    }
    
    if (filters.application) {
      params.append('selectedApplication', filters.application);
    }

    const response = await api.get<BuildsResponse>(`${API_BASE_URL}?${params.toString()}`);
    return response.data;
  },

  fetchBuildSummary: async (
    uuid: string,
    title: string,
    type: 'windows' | 'edge' | 'office',
    additionalData?: Record<string, string>
  ): Promise<{ summary: string }> => {
    const params = new URLSearchParams();
    
    if (type === 'windows') {
      params.append('build_summary_uuid', uuid);
      params.append('build_title', title);
    } else if (type === 'edge') {
      params.append('edge_summary_uuid', uuid);
      if (additionalData?.version) params.append('version', additionalData.version);
      if (additionalData?.channel) params.append('channel', additionalData.channel);
      if (additionalData?.platform) params.append('platform', additionalData.platform);
    } else if (type === 'office') {
      params.append('office_summary_uuid', uuid);
      params.append('title', title);
      if (additionalData?.build_number) params.append('build_number', additionalData.build_number);
      if (additionalData?.channel) params.append('channel', additionalData.channel);
      if (additionalData?.version) params.append('version', additionalData.version);
      if (additionalData?.latest) params.append('latest', additionalData.latest);
    }

    const response = await api.get<{ summary: string }>(`/summary?${params.toString()}`);
    return response.data;
  },

  getChannels: async (type: 'office' | 'edge'): Promise<string[]> => {
    const response = await api.get<string[]>(`/channels/${type}`);
    return response.data;
  },

  getApplications: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/applications');
    return response.data;
  }
};