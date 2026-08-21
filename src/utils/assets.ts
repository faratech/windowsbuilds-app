/**
 * Vite emits imported assets under its configured `/builds/assets/` base, but
 * the XenForo release process deliberately flattens `dist/assets/*` into
 * `/js/WindowsBuilds/`. Keep development URLs untouched and translate the
 * production URL to the directory where the hashed file is actually shipped.
 */
export function windowsBuildsAssetUrl(
  viteUrl: string,
  production = import.meta.env.PROD,
): string {
  if (!production || !viteUrl.startsWith('/')) return viteUrl;

  const path = viteUrl.split(/[?#]/, 1)[0] ?? '';
  const fileName = path.slice(path.lastIndexOf('/') + 1);

  return fileName ? `/js/WindowsBuilds/${fileName}` : viteUrl;
}
