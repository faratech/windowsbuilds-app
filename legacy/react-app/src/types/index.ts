export type TabType = 'windows11' | 'windows10' | 'windowsServer' | 'office' | 'edge';

export type BuildType = 'release' | 'insider' | 'beta' | 'dev' | 'canary';

export interface Build {
  uuid: string;
  title: string;
  build_number: string;
  version?: string;
  build_type: BuildType;
  created: string;
  created_timestamp: number;
  month: string;
  year: string;
  arch?: string;
  summary_tooltip?: string;
  channel?: string;
  platform?: string;
  architecture?: string;
  artifacts?: Artifact[];
  cves?: string[];
  application?: string;
  latest?: boolean;
}

export interface Artifact {
  name?: string;
  type?: string;
  url: string;
  size?: string | number;
  hash?: string;
}

export interface FilterState {
  month: string;
  year: string;
  architecture: string;
  buildType: BuildType | null;
  searchTerm: string;
  excludeInsider: boolean;
  channel?: string;
  application?: string;
}

export interface BuildsResponse {
  builds: Build[];
  lastPullTime: number;
  debugSource: string;
}

export interface ApiError {
  message: string;
  code?: string;
}