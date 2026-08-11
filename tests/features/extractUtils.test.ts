import { describe, expect, it } from 'vitest';
import {
  buildFilterDescription,
  detectImageFormat,
  getPreviewFilteredIds,
  isFilterActive,
  rebuildGroupsFromResults,
} from '../../src/features/extract/extractUtils';
import type { ExtractedImage, ExtractFilterThresholds } from '../../src/features/extract/types';

const noFilter: ExtractFilterThresholds = { minWidth: 0, minHeight: 0, minSizeKB: 0 };

function image(id: string, fileSize?: number, downloaded = false): ExtractedImage {
  return { id, url: `${id}.jpg`, originalUrl: `${id}.jpg`, filename: `${id}.jpg`, platform: 'unknown', downloaded, fileSize };
}

describe('extract utilities', () => {
  it('detects whether any filter is active', () => {
    expect(isFilterActive(noFilter)).toBe(false);
    expect(isFilterActive({ ...noFilter, minWidth: 100 })).toBe(true);
  });

  it('previews only known, undersized, not-yet-downloaded images', () => {
    const options = { ...noFilter, minSizeKB: 10 };
    const ids = getPreviewFilteredIds([
      image('small', 5 * 1024),
      image('large', 20 * 1024),
      image('unknown'),
      image('downloaded', 5 * 1024, true),
    ], options);
    expect([...ids]).toEqual(['small']);
  });

  it('describes active thresholds and the preview count', () => {
    expect(buildFilterDescription([image('small', 1024), image('large', 20 * 1024)], {
      minWidth: 100,
      minHeight: 200,
      minSizeKB: 10,
    })).toBe('将过滤 1/2 张不满足 [宽≥100px / 高≥200px / 大小≥10KB] 的图片');
  });

  it.each([
    ['cover.PNG', '', 'png'],
    ['cover.jpeg', '', 'jpeg'],
    ['cover', 'https://example.com/a.webp?x=1', 'webp'],
    ['cover.gif', '', 'gif'],
    ['cover', 'no-extension', 'jpeg'],
  ] as const)('detects %s / %s as %s', (filename, url, expected) => {
    expect(detectImageFormat(filename, url)).toBe(expected);
  });

  it('rebuilds groups with a new split size and preserves empty group count', () => {
    const items = [image('1'), image('2'), image('3')];
    expect(rebuildGroupsFromResults([items], items, 2).map((group) => group.map(({ id }) => id)))
      .toEqual([['1', '2'], ['3']]);
    expect(rebuildGroupsFromResults([[], []], [], 2)).toEqual([[], []]);
  });
});
