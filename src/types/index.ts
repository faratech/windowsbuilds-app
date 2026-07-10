// Windows Build Types
export interface WindowsBuild {
  uuid: string;
  title: string;
  arch: string;
  build: string;
  build_number?: string;
  build_type?: ReleaseChannel;
  /** Insider sub-channel label, e.g. "26H1" or "Future Platforms". */
  branch?: string | null;
  /** Artifact/update kind: enablement package, hotpatch, LTSC, .NET, etc. */
  kind?: BuildKind | null;
  /** Lifecycle status used for badges (e.g. Windows 10 -> 'eol'). */
  status?: BuildStatus | null;
  created: string;
  created_timestamp?: number;
  month?: string;
  year?: number;
  updated?: string;
  summary?: string;
  summary_tooltip?: string;
}

export interface EdgeBuild {
  Product: string;
  Version: string;
  Platform: string;
  Architecture: string;
  PublishedTime: string;
  ReleaseId?: number;
  ReleasedVersion?: string;
  build_type?: ReleaseChannel;
  Artifacts?: EdgeArtifact[];
  CVEs?: string[];
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
  title?: string;
  name?: string;
  build?: string;
  version: string;
  channel: string;
  build_type?: ReleaseChannel;
  releaseDate: string;
  latest?: boolean;
  notes?: string;
}

// Release channels across all products. 'experimental' and 'release-preview'
// were added 2026-04-24, when Microsoft renamed the Dev Channel to Experimental
// and folded Canary into it; 'canary'/'dev' are kept as historical labels for
// builds flighted before the cutover. Backend classification (the shared
// build_classification.json spec) emits exactly these values.
export type ReleaseChannel =
  | 'canary'
  | 'experimental'
  | 'dev'
  | 'beta'
  | 'release-preview'
  | 'insider'
  | 'release'
  | 'stable';

/** @deprecated Renamed to ReleaseChannel; kept as an alias for older imports. */
export type BuildType = ReleaseChannel;

// Orthogonal to channel: the kind of artifact/update and its lifecycle status.
export type BuildKind =
  | 'iso'
  | 'cumulative'
  | 'enablement'
  | 'hotpatch'
  | 'feature-update'
  | 'lts'
  | 'dotnet'
  | 'preview';

export type BuildStatus = 'preview' | 'current' | 'superseded' | 'eol';

export type ProductFamily = 'windows11' | 'windows10' | 'windowsServer' | 'edge' | 'office365';

export type Architecture = 'amd64' | 'arm64' | 'x86';

export type TabType = 'windows11' | 'windows10' | 'windowsServer' | 'edge' | 'office365';

/**
 * Envelope returned by every `/api/builds/*` list endpoint. `error` is present
 * on upstream failures that the backend still answers with HTTP 200, so it has
 * to be part of the contract rather than an afterthought.
 */
export interface BuildListResponse<T> {
  builds: T[];
  total?: number;
  cache_time?: string;
  error?: string;
}

export type SortBy =
  | 'date-desc' | 'date-asc'
  | 'build-desc' | 'build-asc'
  | 'version-desc' | 'version-asc';

export interface FilterOptions {
  /** One of `MONTH_OPTIONS`; rolling values force `selectedYear` to 'All'. */
  selectedMonth: string;
  selectedYear: string;
  selectedArch: string;
  excludeInsider: boolean;
  /** Windows channel chip. Applies to Windows records only — never Edge/Office. */
  buildType?: BuildType;
  officeChannel?: string;
  sortBy: SortBy;
}
