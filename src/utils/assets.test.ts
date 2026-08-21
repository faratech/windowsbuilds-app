import { describe, expect, it } from 'vitest';
import { windowsBuildsAssetUrl } from './assets';

describe('windowsBuildsAssetUrl', () => {
  it('maps a Vite-emitted asset to the flattened XenForo asset directory', () => {
    expect(
      windowsBuildsAssetUrl('/builds/assets/wf-mark-QJtnAZ95.svg', true),
    ).toBe('/js/WindowsBuilds/wf-mark-QJtnAZ95.svg');
  });

  it('keeps the Vite development URL unchanged', () => {
    expect(windowsBuildsAssetUrl('/src/assets/wf-mark.svg', false)).toBe(
      '/src/assets/wf-mark.svg',
    );
  });

  it('preserves an unusable empty URL rather than inventing a path', () => {
    expect(windowsBuildsAssetUrl('', true)).toBe('');
  });

  it('leaves inline data URLs untouched', () => {
    expect(windowsBuildsAssetUrl('data:image/svg+xml,%3Csvg%3E', true)).toBe(
      'data:image/svg+xml,%3Csvg%3E',
    );
  });
});
