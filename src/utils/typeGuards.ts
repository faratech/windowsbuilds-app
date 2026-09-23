// Shared discriminators for the three build shapes. Previously these guards were
// copy-pasted into App, BuildCard, BuildDetailsModal and BuildListItem; keeping
// them in one place avoids the four copies drifting apart.

import type { EdgeBuild, OfficeBuild, WindowsBuild } from '../types';

export type BuildRecord = WindowsBuild | EdgeBuild | OfficeBuild;

// Live Office records carry a `uuid` too, so `uuid` alone is not a Windows
// discriminator: without the `channel` check every Office build was classified
// as Windows (wrong summary cache key, dead Office channel filter).
export const isWindowsBuild = (build: BuildRecord): build is WindowsBuild =>
  'uuid' in build && !('channel' in build) && !('Version' in build);

export const isEdgeBuild = (build: BuildRecord): build is EdgeBuild => 'Version' in build;

export const isOfficeBuild = (build: BuildRecord): build is OfficeBuild =>
  'channel' in build && !('Version' in build);
