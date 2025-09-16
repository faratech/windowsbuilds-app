// Windows Build Types
export interface WindowsBuild {
  uuid: string;
  title: string;
  arch: string;
  build: string;
  build_number?: string;
  build_type?: BuildType;
  created: string;
  created_timestamp?: number;
  month?: string;
  year?: number;
  updated?: string;
  summary?: string;
  summary_tooltip?: string;
  branch?: string;
  type?: BuildType;
}

export interface EdgeBuild {
  Product: string;
  Version: string;
  Platform: string;
  Architecture: string;
  PublishedTime: string;
  ReleasedVersion?: string;
  Artifacts?: EdgeArtifact[];
}

export interface EdgeArtifact {
  ArtifactName: string;
  Location: string;
  Hash?: string;
  HashAlgorithm?: string;
  SizeInBytes?: number;
}

export interface OfficeBuild {
  id: string;
  name: string;
  version: string;
  channel: string;
  releaseDate: string;
  notes?: string;
}

export type BuildType = 'canary' | 'dev' | 'beta' | 'insider' | 'release' | 'stable';

export type TabType = 'windows11' | 'windows10' | 'windowsServer' | 'edge' | 'office365';

export interface FilterOptions {
  selectedMonth?: string;
  selectedYear?: string;
  selectedArch?: string;
  excludeInsider?: boolean;
  buildFilter?: string;
  buildType?: BuildType;
  tab?: TabType;
  officeChannel?: string;
  sortBy?: 'date-desc' | 'date-asc' | 'build-desc' | 'build-asc' | 'version-desc' | 'version-asc';
}

export interface BuildsState {
  windowsBuilds: WindowsBuild[];
  edgeBuilds: EdgeBuild[];
  officeBuilds: OfficeBuild[];
  loading: boolean;
  error: string | null;
  activeTab: TabType;
  filters: FilterOptions;
  searchQuery: string;
}