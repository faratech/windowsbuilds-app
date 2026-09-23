// Record-shape derived facts. Every one of these used to be inferred from the
// *active tab* (`activeTab.includes('edge') ? 'edge' : ...`), which meant an
// open modal could describe a Windows build as an Edge build the moment the tab
// changed underneath it. Deriving from the record itself makes that impossible.

import { isEdgeBuild, isWindowsBuild, type BuildRecord } from './typeGuards';
import { buildTimestamp } from './dates';

/**
 * Product a record belongs to. These exact strings are also the `build_type`
 * segment of the summary cache key on the backend (`{product}build_summary:…`),
 * so they must not be renamed without a coordinated backend change.
 */
export type BuildProduct = 'windows' | 'edge' | 'office';

export function buildProduct(build: BuildRecord): BuildProduct {
  if (isWindowsBuild(build)) return 'windows';
  if (isEdgeBuild(build)) return 'edge';
  return 'office';
}

/** Stable React key. Office records ship an always-empty `id`, hence the composite. */
export function buildKey(build: BuildRecord, index: number): string {
  if (isWindowsBuild(build)) return build.uuid;
  if (isEdgeBuild(build)) {
    return build.ReleaseId
      ? String(build.ReleaseId)
      : `${build.Product}-${build.Version}-${build.Platform}-${build.Architecture}`;
  }
  if (build.uuid) return build.uuid;
  return `${build.channel}-${build.version}-${build.build_number || build.build || build.title || index}`;
}

export function buildSearchText(build: BuildRecord): string {
  if (isWindowsBuild(build)) {
    return [build.title, build.build_number, build.build, build.arch, build.build_type]
      .filter(Boolean).join(' ');
  }
  if (isEdgeBuild(build)) {
    return [build.Product, build.Version, build.Platform, build.Architecture]
      .filter(Boolean).join(' ');
  }
  return [build.title, build.name, build.build_number, build.build, build.version, build.channel]
    .filter(Boolean).join(' ');
}

export function comparableVersion(build: BuildRecord): string {
  if (isWindowsBuild(build)) return build.build_number || build.build || '';
  if (isEdgeBuild(build)) return build.Version || '';
  return build.build_number || build.build || build.version || '';
}

/** Raw date field for a record, in whatever shape its endpoint emits. */
export function buildDateValue(build: BuildRecord): string | number | undefined {
  if (isWindowsBuild(build)) return build.created_timestamp ?? build.created;
  if (isEdgeBuild(build)) return build.PublishedTime;
  return build.created_timestamp ?? build.releaseDate ?? build.release_date;
}

/** Epoch millis, UTC-correct. See `utils/dates`. */
export function buildTime(build: BuildRecord): number {
  return buildTimestamp(buildDateValue(build));
}

/** Numeric-segment-aware compare, so `26200.1` sorts above `26100.9999`. */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split(/\D+/).filter(Boolean).map(Number);
  const bParts = b.split(/\D+/).filter(Boolean).map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (aParts[index] || 0) - (bParts[index] || 0);
    if (diff !== 0) return diff;
  }

  return a.localeCompare(b);
}
