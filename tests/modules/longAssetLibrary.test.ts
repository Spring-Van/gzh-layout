import { describe, expect, it } from 'vitest';
import {
  assetCardThumbnail,
  collectLongAssetLibrary,
  countByCategory,
  countByProject,
  filterLibraryEntries,
} from '../../src/modules/comic/services/longAssetLibraryService';
import type {
  ComicProject,
  LongProjectAsset,
  LongProjectAssetVariant,
} from '../../src/modules/comic/types';

/**
 * 全局资产库聚合与四级过滤的语义锁：
 * - 收长篇项目全部资产（不过滤 scope；short 项目不进）；
 * - 章节筛选 = sourceChapterIds 包含即可（跨章资产在每个来源章命中）；
 * - 关键词命中名称与别名（归一化：trim + 小写 + 去空白）；
 * - 缩略图只走有效参考图（生成图 + 上传成品图），不含上传参考图。
 */

function variant(id: string, extra: Partial<LongProjectAssetVariant> = {}): LongProjectAssetVariant {
  return { id, name: id, referenceImageIds: [], sourceChapterIds: [], createdAt: 1, updatedAt: 1, ...extra };
}

function asset(partial: Partial<LongProjectAsset> & { id: string; name: string }): LongProjectAsset {
  return {
    type: 'character', aliases: [], fixedTraits: [], variants: [], sourceChapterIds: [],
    status: 'confirmed', scope: 'project', createdAt: 1, updatedAt: 1,
    ...partial,
  } as LongProjectAsset;
}

function project(partial: Partial<ComicProject> & { id: string; name: string }): ComicProject {
  return { createdAt: 1, updatedAt: 1, ...partial } as ComicProject;
}

const NODES = [
  { id: 'c1', type: 'chapter', name: '第一章', parentId: null, order: 1, createdAt: 1, updatedAt: 1 },
  { id: 'c2', type: 'chapter', name: '第二章', parentId: null, order: 2, createdAt: 1, updatedAt: 1 },
  { id: 'c0', type: 'chapter', name: '序章', parentId: null, order: 0, createdAt: 1, updatedAt: 1 },
];

function buildIndex() {
  const projects: ComicProject[] = [
    project({
      id: 'p-long', name: '斗气大陆', projectType: 'long',
      longProjectData: {
        nodes: NODES,
        assets: [
          asset({ id: 'a1', name: '萧炎', type: 'character', aliases: ['炎少'], sourceChapterIds: ['c0', 'c1'], variants: [variant('v1', { generatedImageIds: ['img-a1'] })] }),
          asset({ id: 'a2', name: '测验魔石碑', type: 'prop', sourceChapterIds: ['c1'], variants: [variant('v1', { referenceImageIds: ['ref-only'] })] }),
          asset({ id: 'a3', name: '迦南学院', type: 'scene', sourceChapterIds: ['c2'] }),
          asset({ id: 'a4', name: '只在本章', scope: 'chapter', sourceChapterIds: ['c1'] }),
        ],
      },
    }),
    project({ id: 'p-short', name: '短篇项目', projectType: 'short' }),
    project({ id: 'p-long2', name: '武动乾坤', projectType: 'long', longProjectData: { nodes: [], assets: [asset({ id: 'b1', name: '林动', type: 'character' })] } }),
  ];
  return collectLongAssetLibrary(projects);
}

describe('collectLongAssetLibrary', () => {
  it('聚合长篇项目全部资产（不过滤 scope），短篇项目不进', () => {
    const { entries, projects } = buildIndex();
    expect(projects.map((p) => p.projectId)).toEqual(['p-long', 'p-long2']);
    expect(entries.map((e) => e.asset.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'b1']);
    expect(entries[0].projectName).toBe('斗气大陆');
  });

  it('章节选项只含章节节点且按 order 排序', () => {
    const { projects } = buildIndex();
    expect(projects[0].chapters.map((c) => c.name)).toEqual(['序章', '第一章', '第二章']);
    expect(projects[1].chapters).toEqual([]);
  });
});

describe('filterLibraryEntries', () => {
  const { entries } = buildIndex();

  it('类别过滤', () => {
    expect(filterLibraryEntries(entries, { category: 'character', projectId: null, chapterId: null, keyword: '' }).map((e) => e.asset.id)).toEqual(['a1', 'a4', 'b1']);
    expect(filterLibraryEntries(entries, { category: 'prop', projectId: null, chapterId: null, keyword: '' }).map((e) => e.asset.id)).toEqual(['a2']);
  });

  it('项目过滤', () => {
    expect(filterLibraryEntries(entries, { category: null, projectId: 'p-long2', chapterId: null, keyword: '' }).map((e) => e.asset.id)).toEqual(['b1']);
  });

  it('章节过滤：sourceChapterIds 包含即命中，跨章资产每个来源章都出现', () => {
    const chapter = (id: string) => ({ category: null, projectId: null, chapterId: id, keyword: '' });
    expect(filterLibraryEntries(entries, chapter('c1')).map((e) => e.asset.id)).toEqual(['a1', 'a2', 'a4']);
    expect(filterLibraryEntries(entries, chapter('c2')).map((e) => e.asset.id)).toEqual(['a3']);
  });

  it('关键词命中名称与别名（trim/大小写/空白无关）', () => {
    expect(filterLibraryEntries(entries, { category: null, projectId: null, chapterId: null, keyword: '炎少' }).map((e) => e.asset.id)).toEqual(['a1']);
    expect(filterLibraryEntries(entries, { category: null, projectId: null, chapterId: null, keyword: ' 萧炎 ' }).map((e) => e.asset.id)).toEqual(['a1']);
    expect(filterLibraryEntries(entries, { category: null, projectId: null, chapterId: null, keyword: '不存在的名字' })).toEqual([]);
  });

  it('四级组合过滤', () => {
    const result = filterLibraryEntries(entries, { category: 'character', projectId: 'p-long', chapterId: 'c1', keyword: '' });
    expect(result.map((e) => e.asset.id)).toEqual(['a1', 'a4']);
  });
});

describe('countByCategory / countByProject', () => {
  it('徽标计数含全部', () => {
    const { entries } = buildIndex();
    const counts = countByCategory(entries);
    expect(counts).toEqual({ all: 5, character: 3, scene: 1, prop: 1 });
    const byProject = countByProject(entries);
    expect(byProject.get('p-long')).toBe(4);
    expect(byProject.get('p-long2')).toBe(1);
  });
});

describe('assetCardThumbnail', () => {
  it('取生成图 + 上传成品图的首图，不含上传参考图', () => {
    expect(assetCardThumbnail(asset({ id: 'x', name: 'x', variants: [variant('v1', { referenceImageIds: ['ref-only'] })] }))).toBeUndefined();
    expect(assetCardThumbnail(asset({ id: 'x', name: 'x', variants: [variant('v1', { referenceImageIds: ['ref-only'], generatedImageIds: ['gen-1'], uploadedImageIds: ['up-1'] })] }))).toBe('gen-1');
  });

  it('前面的状态没有图时继续向后找', () => {
    const target = asset({ id: 'x', name: 'x', variants: [variant('v-empty'), variant('v2', { uploadedImageIds: ['up-2'] })] });
    expect(assetCardThumbnail(target)).toBe('up-2');
  });
});
