import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ComicProject, MaterialItem, ProjectAsset } from '../../src/modules/comic/types';

const electronState = vi.hoisted(() => ({ userDataPath: '' }));

vi.mock('electron', () => ({
  app: { getPath: () => electronState.userDataPath },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
    decryptString: (value: Buffer) => value.toString().replace(/^encrypted:/, ''),
  },
}));

/** 1×1 透明 PNG，作为「一张真实图片」的最小替身。 */
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
/** 另一张不同的图（内容不同 → sha1 不同）。 */
const OTHER_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let temporaryDirectory = '';
let ProjectImageStore: typeof import('../../electron/services/project-image-store').ProjectImageStore;
let buildProjectDirName: typeof import('../../electron/services/project-image-store').buildProjectDirName;
let parseComicImageUrl: typeof import('../../electron/services/project-image-store').parseComicImageUrl;
let hashImageDataUrl: typeof import('../../electron/services/project-image-store').hashImageDataUrl;
let resolveComicImageToFsPath: typeof import('../../electron/services/project-image-store').resolveComicImageToFsPath;
let externalizeProjectImages: typeof import('../../electron/services/comic-database.service').externalizeProjectImages;
let externalizeAssetImages: typeof import('../../electron/services/comic-database.service').externalizeAssetImages;
let externalizeMaterialImage: typeof import('../../electron/services/comic-database.service').externalizeMaterialImage;
let hasInlineProjectImages: typeof import('../../electron/services/comic-database.service').hasInlineProjectImages;
let ComicDatabaseService: typeof import('../../electron/services/comic-database.service').ComicDatabaseService;

beforeAll(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'gzh-project-images-'));
  electronState.userDataPath = temporaryDirectory;
  ({
    ProjectImageStore,
    buildProjectDirName,
    parseComicImageUrl,
    hashImageDataUrl,
    resolveComicImageToFsPath,
  } = await import('../../electron/services/project-image-store'));
  ({
    externalizeProjectImages,
    externalizeAssetImages,
    externalizeMaterialImage,
    hasInlineProjectImages,
    ComicDatabaseService,
  } = await import('../../electron/services/comic-database.service'));
});

afterAll(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('buildProjectDirName', () => {
  it('保留可读的项目名并拼上 id 前 6 位', () => {
    expect(buildProjectDirName('咖啡店日常', '8f3a2b1c-1111-2222-3333-444455556666'))
      .toBe('咖啡店日常__8f3a2b');
  });

  it('清掉路径分隔符等危险字符，避免目录逃逸', () => {
    expect(buildProjectDirName('a/b\\c:d*e?f"g<h>i|j', 'abcdef12')).toBe('a b c d e f g h i j__abcdef');
  });

  it('项目名为空或是纯点号时回落到 project', () => {
    expect(buildProjectDirName('   ', 'abcdef12')).toBe('project__abcdef');
    expect(buildProjectDirName('...', 'abcdef12')).toBe('project__abcdef');
    expect(buildProjectDirName(undefined, 'abcdef12')).toBe('project__abcdef');
  });
});

describe('parseComicImageUrl', () => {
  it('解析出目录名、分类与内容 hash', () => {
    const hash = 'a'.repeat(40);
    expect(parseComicImageUrl(`app-image://comic/%E5%92%96%E5%95%A1/generated/${hash}.png`)).toEqual({
      dirName: '咖啡',
      kind: 'generated',
      filename: `${hash}.png`,
      hash,
    });
  });

  it('段数不对 / 分类非法 / 文件名不是内容寻址时返回 null', () => {
    const hash = 'a'.repeat(40);
    expect(parseComicImageUrl(`app-image://comic/dir/generated/${hash}.png`)).not.toBeNull();
    expect(parseComicImageUrl(`app-image://comic/${hash}.png`)).toBeNull();
    expect(parseComicImageUrl(`app-image://comic/dir/whatever/${hash}.png`)).toBeNull();
    expect(parseComicImageUrl('app-image://comic/dir/generated/not-a-hash.png')).toBeNull();
    expect(parseComicImageUrl('app-image://history/whatever.png')).toBeNull();
    expect(parseComicImageUrl('data:image/png;base64,AAAA')).toBeNull();
  });
});

describe('ProjectImageStore.persistProjectImage', () => {
  it('按内容寻址落盘并返回 app-image 引用', async () => {
    const store = new ProjectImageStore();
    const url = await store.persistProjectImage(PNG_DATA_URL, '项目A__abc123', 'generated');
    const hash = hashImageDataUrl(PNG_DATA_URL);

    expect(url).toBe(`app-image://comic/%E9%A1%B9%E7%9B%AEA__abc123/generated/${hash}.png`);
    const written = await readFile(
      path.join(temporaryDirectory, 'comic-images', '项目A__abc123', 'generated', `${hash}.png`),
    );
    expect(written.equals(Buffer.from(PNG_DATA_URL.split(',')[1], 'base64'))).toBe(true);
  });

  it('同一张图重复落盘只写一个文件（内容寻址去重）', async () => {
    const store = new ProjectImageStore();
    const first = await store.persistProjectImage(PNG_DATA_URL, '项目B__def456', 'generated');
    const second = await store.persistProjectImage(PNG_DATA_URL, '项目B__def456', 'generated');
    expect(second).toBe(first);
    const files = readdirSync(
      path.join(temporaryDirectory, 'comic-images', '项目B__def456', 'generated'),
    );
    expect(files).toHaveLength(1);
  });

  it('非图片 dataURL 不落盘', async () => {
    const store = new ProjectImageStore();
    expect(await store.persistProjectImage('data:text/plain;base64,AAAA', '项目C__aaa111', 'uploaded'))
      .toBeNull();
    expect(await store.persistProjectImage('https://example.com/a.png', '项目C__aaa111', 'uploaded'))
      .toBeNull();
  });
});

describe('ProjectImageStore.resolveImagePath', () => {
  it('解析合法三段路径，且结果落在 comic-images 根目录内', async () => {
    const store = new ProjectImageStore();
    const hash = hashImageDataUrl(PNG_DATA_URL) as string;
    const resolved = store.resolveImagePath(`项目A__abc123/generated/${hash}.png`);
    expect(resolved).toBe(
      path.join(temporaryDirectory, 'comic-images', '项目A__abc123', 'generated', `${hash}.png`),
    );
  });

  it('拦截路径穿越与非法段', () => {
    const store = new ProjectImageStore();
    const hash = 'a'.repeat(40);
    const cases = [
      `../etc/generated/${hash}.png`, // 目录名含 ..
      `..%2F..%2Fetc/generated/${hash}.png`, // 编码后的穿越（解码后目录名含 /）
      `dir/generated/../../${hash}.png`, // 段数超三段
      `dir/../../etc/passwd`, // 段数超三段
      `dir/generated/${hash}.exe`, // 扩展名不在白名单
      `dir/generated/not-a-hash.png`, // 文件名不是内容寻址
      `dir/unknown/${hash}.png`, // 分类不在白名单
      `dir//${hash}.png`, // 空分类段
      `/generated/${hash}.png`, // 缺少目录名
    ];
    for (const candidate of cases) {
      expect(store.resolveImagePath(candidate), candidate).toBeNull();
    }
  });
});

describe('ProjectImageStore 目录管理', () => {
  it('改名成功后才跟随迁移；目标已存在时拒绝改名', async () => {
    const store = new ProjectImageStore();
    await store.persistProjectImage(PNG_DATA_URL, '旧名__aaa111', 'generated');
    expect(store.renameProjectDir('旧名__aaa111', '新名__aaa111')).toBe(true);
    expect(existsSync(path.join(temporaryDirectory, 'comic-images', '新名__aaa111', 'generated'))).toBe(true);

    await store.persistProjectImage(OTHER_PNG_DATA_URL, '占用__bbb222', 'generated');
    expect(store.renameProjectDir('新名__aaa111', '占用__bbb222')).toBe(false);
    // 目标已存在时源目录必须原样保留，否则会丢图
    expect(existsSync(path.join(temporaryDirectory, 'comic-images', '新名__aaa111', 'generated'))).toBe(true);
  });

  it('按项目 id 后缀回收目录（改名失败留下的旧目录也能清掉）', async () => {
    const store = new ProjectImageStore();
    await store.persistProjectImage(PNG_DATA_URL, '另一名字__ccc333', 'reference');
    expect(store.removeProjectDirByProjectId('ccc333aa-bbbb-cccc-dddd-eeeeffff0000')).toBe(true);
    expect(existsSync(path.join(temporaryDirectory, 'comic-images', '另一名字__ccc333'))).toBe(false);
    expect(store.removeProjectDirByProjectId('ccc333aa-bbbb-cccc-dddd-eeeeffff0000')).toBe(false);
  });
});

/** 造一个最小的长篇项目：同一个 dataURL 同时出现在生成图与参考图字段里，用来验去重。 */
function makeLongProject(id: string, name: string): ComicProject {
  return {
    id,
    name,
    updatedAt: 1,
    longProjectData: {
      nodes: [],
      assets: [{
        id: 'asset-1',
        variants: [{
          id: 'variant-1',
          generatedImageIds: [PNG_DATA_URL],
          uploadedImageIds: [],
          referenceImageIds: [PNG_DATA_URL],
        }],
      }],
      assetGenConfig: {
        sharedBlocks: [{ id: 'block-1', referenceImages: [OTHER_PNG_DATA_URL] }],
      },
    },
  } as unknown as ComicProject;
}

/**
 * 造一个最小的公众号 / 短篇项目。
 * 三类图片字段各来一张：`generatedImages`（字典）、`pageRefImages`（嵌套三类）、
 * `syncData.cover.generatedCoverImage`（单张）。
 */
function makeWechatProject(id: string, name: string): ComicProject {
  return {
    id,
    name,
    updatedAt: 1,
    pageData: { title: 't', summary: 's', pages: [] },
    publishData: { title: 't', tags: [], creativeNotes: {} },
    generatedImages: { '0': PNG_DATA_URL },
    pageRefImages: { 0: { character: [OTHER_PNG_DATA_URL], scene: [], prop: [] } },
    syncData: {
      title: 't',
      subtitle: '',
      cover: { templateId: 'tpl', selectedImageIds: [], generatedCoverImage: PNG_DATA_URL },
      layout: { templateId: 'tpl' },
      styleInsert: { header: {}, footer: {}, between: {} },
      contentBlocks: [],
      containerStyle: {},
    },
  } as unknown as ComicProject;
}

/** 取「资产 variant 的生成图引用」，测试里反复要用。 */
function generatedRefOf(project: ComicProject): string {
  const data = project.longProjectData as unknown as {
    assets: Array<{ variants: Array<{ generatedImageIds: string[]; referenceImageIds: string[] }> }>;
  };
  return data.assets[0].variants[0].generatedImageIds[0];
}

describe('externalizeProjectImages', () => {
  it('内联 base64 → app-image 引用，同图在项目内只落一份', async () => {
    const store = new ProjectImageStore();
    const project = makeLongProject('proj-111111', '咖啡店日常');
    await externalizeProjectImages(project, store);

    const generatedRef = generatedRefOf(project);
    expect(generatedRef).toBe(
      `app-image://comic/${encodeURIComponent('咖啡店日常__proj11')}/generated/${hashImageDataUrl(PNG_DATA_URL)}.png`,
    );
    // 同一张图在参考图字段里复用同一引用（不按分类再存一份）
    const variant = (project.longProjectData as any).assets[0].variants[0];
    expect(variant.referenceImageIds[0]).toBe(generatedRef);
    // 共用属性块也外置了
    expect((project.longProjectData as any).assetGenConfig.sharedBlocks[0].referenceImages[0])
      .toMatch(/^app-image:\/\/comic\/.+\/reference\/[a-f0-9]{40}\.png$/);
  });

  it('幂等：再次外置不改动任何引用', async () => {
    const store = new ProjectImageStore();
    const project = makeLongProject('proj-aaaaaa', '幂等项目');
    await externalizeProjectImages(project, store);
    const snapshot = JSON.parse(JSON.stringify(project));
    await externalizeProjectImages(project, store);
    expect(JSON.parse(JSON.stringify(project))).toEqual(snapshot);
  });

  it('公众号 / 短篇项目：generatedImages / pageRefImages / 封面生成图全部外置', async () => {
    const store = new ProjectImageStore();
    const project = makeWechatProject('wechat-1', '公众号项目');
    await externalizeProjectImages(project, store);

    // id `wechat-1` → 去非字母数字后取前 6 位 = `wechat`
    const dir = `app-image://comic/${encodeURIComponent('公众号项目__wechat')}`;
    const data = project as any;
    expect(data.generatedImages['0']).toBe(
      `${dir}/generated/${hashImageDataUrl(PNG_DATA_URL)}.png`,
    );
    // 封面生成图与 generatedImages 是同一张图 → 复用同一条引用（项目内去重）
    expect(data.syncData.cover.generatedCoverImage).toBe(data.generatedImages['0']);
    // pageRefImages 的三类都归 reference
    expect(data.pageRefImages[0].character[0]).toBe(
      `${dir}/reference/${hashImageDataUrl(OTHER_PNG_DATA_URL)}.png`,
    );
    expect(hasInlineProjectImages(project)).toBe(false);
  });

  it('不认识的字段名不会被误外置（scene / prop 这类通用名字不能进白名单）', async () => {
    const store = new ProjectImageStore();
    const project = {
      id: 'wechat-2',
      name: '未知结构',
      pageData: { pages: [{ image: PNG_DATA_URL }], scene: [PNG_DATA_URL] },
    } as unknown as ComicProject;
    await externalizeProjectImages(project, store);
    expect((project as any).pageData.pages[0].image).toBe(PNG_DATA_URL);
    expect((project as any).pageData.scene[0]).toBe(PNG_DATA_URL);
  });

  it('外置后同步页的图片签名跟着刷新（否则会被判「图片已变」并清空用户编辑）', async () => {
    const store = new ProjectImageStore();
    const project = makeWechatProject('wechat-3', '签名项目');
    // 模拟用户此前保存过同步数据，签名是当时的 base64 路径串
    (project as any).syncData.imageSignature = PNG_DATA_URL;

    await externalizeProjectImages(project, store);

    const signature = (project as any).syncData.imageSignature;
    expect(signature).toMatch(/^app-image:\/\/comic\//);
    expect(signature).toBe((project as any).generatedImages['0']);
  });

  it('没同步过的项目不会被凭空加上 imageSignature', async () => {
    const store = new ProjectImageStore();
    const project = makeWechatProject('wechat-4', '无同步数据');
    await externalizeProjectImages(project, store);
    expect((project as any).syncData.imageSignature).toBeUndefined();
  });

  it('项目改名后目录跟随迁移，引用前缀同步替换', async () => {
    const store = new ProjectImageStore();
    const project = makeLongProject('proj-bbbbbb', '旧名字');
    await externalizeProjectImages(project, store);
    const before = generatedRefOf(project);
    expect(before).toContain(encodeURIComponent('旧名字__projbb'));

    project.name = '新名字';
    await externalizeProjectImages(project, store);

    const after = generatedRefOf(project);
    expect(after).toContain(encodeURIComponent('新名字__projbb'));
    expect(after).not.toBe(before);
    expect(existsSync(path.join(temporaryDirectory, 'comic-images', '新名字__projbb', 'generated'))).toBe(true);
    expect(existsSync(path.join(temporaryDirectory, 'comic-images', '旧名字__projbb'))).toBe(false);
  });

  it('saveProject 返回外置后的项目（渲染层据此整体替换内存）', async () => {
    const service = new ComicDatabaseService();
    await service.init();
    const saved = await service.saveProject(makeLongProject('proj-999999', '落库项目'));
    expect(generatedRefOf(saved)).toMatch(/^app-image:\/\/comic\/.+\/generated\/[a-f0-9]{40}\.png$/);
  });
});

describe('externalizeAssetImages / externalizeMaterialImage', () => {
  it('资产的参考图（reference）与生成图（generated）按传入目录外置', async () => {
    const store = new ProjectImageStore();
    const asset = {
      id: 'asset-1',
      projectId: 'proj-1',
      type: 'character',
      code: 'C1',
      name: '主角',
      description: '',
      prompt: '',
      referenceImages: [PNG_DATA_URL],
      generatedImages: [OTHER_PNG_DATA_URL],
      aiGenerated: false,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    } as unknown as ProjectAsset;

    await externalizeAssetImages(asset, '项目__proj-1', store);

    const dir = `app-image://comic/${encodeURIComponent('项目__proj-1')}`;
    expect(asset.referenceImages[0]).toBe(
      `${dir}/reference/${hashImageDataUrl(PNG_DATA_URL)}.png`,
    );
    expect(asset.generatedImages[0]).toBe(
      `${dir}/generated/${hashImageDataUrl(OTHER_PNG_DATA_URL)}.png`,
    );
  });

  it('素材（MaterialItem.url）归 reference；非图片 url 原样保留', async () => {
    const store = new ProjectImageStore();
    const material = {
      id: 'm1',
      projectId: 'proj-1',
      url: PNG_DATA_URL,
      name: '素材',
      assetType: 'character',
      createdAt: 1,
    } as unknown as MaterialItem;
    const remote = { ...material, id: 'm2', url: 'https://example.com/a.png' } as unknown as MaterialItem;

    await externalizeMaterialImage(material, '项目__proj-1', store);
    await externalizeMaterialImage(remote, '项目__proj-1', store);

    expect(material.url).toMatch(/^app-image:\/\/comic\/.+\/reference\/[a-f0-9]{40}\.png$/);
    expect(remote.url).toBe('https://example.com/a.png');
  });
});

describe('resolveComicImageToFsPath', () => {
  it('外置引用解析成 comic-images 下的磁盘绝对路径', () => {
    const hash = hashImageDataUrl(PNG_DATA_URL) as string;
    const url = `app-image://comic/${encodeURIComponent('项目A__abc123')}/generated/${hash}.png`;
    expect(resolveComicImageToFsPath(url)).toBe(
      path.join(temporaryDirectory, 'comic-images', '项目A__abc123', 'generated', `${hash}.png`),
    );
  });

  it('非外置引用与非法引用返回 null（上传链路据此回落原逻辑）', () => {
    const hash = 'a'.repeat(40);
    expect(resolveComicImageToFsPath(PNG_DATA_URL)).toBeNull();
    expect(resolveComicImageToFsPath('https://example.com/a.png')).toBeNull();
    expect(resolveComicImageToFsPath('/Users/x/a.png')).toBeNull();
    expect(resolveComicImageToFsPath(`app-image://comic/../../etc/generated/${hash}.png`)).toBeNull();
    expect(resolveComicImageToFsPath(`app-image://comic/dir/unknown/${hash}.png`)).toBeNull();
  });
});
