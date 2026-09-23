import { describe, expect, it } from 'vitest';
import { bindingScanPrompt, migratePanelArtworks } from '../../src/modules/comic/services/panelPromptService';
import type { LongProjectPanelArtwork, LongProjectStoryboardPanel } from '../../src/modules/comic/types';

/**
 * 「重新导入分镜后，旧画面描述归不归这一页」这条链的语义锁。
 *
 * 根因背景：原先迁移按**页序号**硬对位，正文变了也照样把旧描述搬过去（只标 stale），
 * 而 stale 又只写不读 —— 结果 17 页版重导入成 13 页版后，每页都挂着别人那页的描述，
 * 自动绑定再把这些描述当事实来源，就绑出了正文里根本没有的资产
 * （实例：P02 绑上「中年测验员」「测验魔石碑」，而两者只存在于过期描述中）。
 *
 * 判据收敛为一条：**同序号且正文逐字相同，才认作同一页**。分页结构重划时同序号正文必然不同，
 * 于是自然全部不继承，不用额外判页数。
 */

const CHAPTER = 'c1';

function panel(id: string, order: number, content: string): LongProjectStoryboardPanel {
  return { id, order, content, assetBindings: [] };
}

function artwork(overrides: Partial<LongProjectPanelArtwork> & { panelId: string }): LongProjectPanelArtwork {
  return {
    chapterId: CHAPTER,
    promptStatus: 'done',
    genStatus: 'none',
    updatedAt: 1,
    ...overrides,
  };
}

describe('画面描述参与绑定扫描的口径', () => {
  it('正常描述可参与扫描', () => {
    expect(bindingScanPrompt(artwork({ panelId: 'p1', imagePrompt: '林小雨站在雨里。' }))).toBe('林小雨站在雨里。');
  });

  it('过期描述不参与扫描（幽灵绑定的直接来源）', () => {
    const stale = artwork({ panelId: 'p1', imagePrompt: '中年测验员站在魔石碑旁。', promptStatus: 'stale' });
    expect(bindingScanPrompt(stale)).toBeUndefined();
  });

  it('无描述 / 空描述一律不参与扫描', () => {
    expect(bindingScanPrompt(undefined)).toBeUndefined();
    expect(bindingScanPrompt(artwork({ panelId: 'p1' }))).toBeUndefined();
    expect(bindingScanPrompt(artwork({ panelId: 'p1', imagePrompt: '   ' }))).toBeUndefined();
  });
});

describe('分镜重导入后的画面工件迁移', () => {
  it('正文逐字相同 → 描述与成图整体继承，状态不变', () => {
    const oldPanels = [panel('old-1', 1, '石碑亮起三段大字。')];
    const newPanels = [panel('new-1', 1, '石碑亮起三段大字。')];
    const result = migratePanelArtworks(
      [artwork({ panelId: 'old-1', imagePrompt: '第1格：石碑特写。', selectedImageId: 'img-1', genStatus: 'done' })],
      oldPanels, newPanels, CHAPTER,
    );
    expect(result.droppedPromptCount).toBe(0);
    expect(result.artworks).toHaveLength(1);
    expect(result.artworks[0]).toMatchObject({
      panelId: 'new-1',
      imagePrompt: '第1格：石碑特写。',
      promptStatus: 'done',
      selectedImageId: 'img-1',
    });
  });

  it('正文已变且无成图 → 描述直接丢弃，不留空壳记录', () => {
    const oldPanels = [panel('old-2', 2, '萧炎握紧拳头抬起头。')];
    const newPanels = [panel('new-2', 2, '中年测验员走上高台宣布成绩。')];
    const result = migratePanelArtworks(
      [artwork({ panelId: 'old-2', imagePrompt: '第1格：测验员站在石碑旁公布。' })],
      oldPanels, newPanels, CHAPTER,
    );
    expect(result.droppedPromptCount).toBe(1);
    // 新页没有工件（描述为空，不参与扫描），旧记录也不保留 —— 作废的描述不该占体积
    expect(result.artworks).toEqual([]);
  });

  it('正文已变但已有成图 → 成图归新页，描述与旧记录都不留', () => {
    const oldPanels = [panel('old-2', 2, '萧炎握紧拳头抬起头。')];
    const newPanels = [panel('new-2', 2, '中年测验员走上高台宣布成绩。')];
    const result = migratePanelArtworks(
      [artwork({ panelId: 'old-2', imagePrompt: '第1格：测验员公布。', selectedImageId: 'img-9', genStatus: 'done' })],
      oldPanels, newPanels, CHAPTER,
    );
    expect(result.droppedPromptCount).toBe(1);
    expect(result.artworks).toHaveLength(1);
    expect(result.artworks[0]).toMatchObject({ panelId: 'new-2', selectedImageId: 'img-9', promptStatus: 'none', genStatus: 'done' });
    expect(result.artworks[0].imagePrompt).toBeUndefined();
    expect(result.artworks[0].promptSource).toBeUndefined();
  });

  it('分页结构重划（17 页 → 13 页）：同序号正文全不同 → 一条都不继承、一条都不留', () => {
    const oldPanels = Array.from({ length: 17 }, (_, i) => panel(`old-${i + 1}`, i + 1, `旧第${i + 1}页画面。`));
    const newPanels = Array.from({ length: 13 }, (_, i) => panel(`new-${i + 1}`, i + 1, `新第${i + 1}页画面。`));
    const oldArtworks = oldPanels.map((item) => artwork({ panelId: item.id, imagePrompt: `${item.id} 的描述` }));
    const result = migratePanelArtworks(oldArtworks, oldPanels, newPanels, CHAPTER);
    expect(result.droppedPromptCount).toBe(17);
    expect(result.artworks).toEqual([]);
  });

  it('末尾新增一页（其余正文不变）→ 前 N 页照常继承，新页无描述', () => {
    const oldPanels = [panel('old-1', 1, '第一页。'), panel('old-2', 2, '第二页。')];
    const newPanels = [panel('new-1', 1, '第一页。'), panel('new-2', 2, '第二页。'), panel('new-3', 3, '新增的第三页。')];
    const result = migratePanelArtworks(
      oldPanels.map((item) => artwork({ panelId: item.id, imagePrompt: `${item.id} 描述` })),
      oldPanels, newPanels, CHAPTER,
    );
    expect(result.droppedPromptCount).toBe(0);
    expect(result.artworks.map((item) => item.panelId).sort()).toEqual(['new-1', 'new-2']);
  });

  it('已标过期的描述即便正文相同也不继承（过期是历史欠账，不会自己还清）', () => {
    const oldPanels = [panel('old-1', 1, '石碑亮起三段大字。')];
    const newPanels = [panel('new-1', 1, '石碑亮起三段大字。')];
    const result = migratePanelArtworks(
      [artwork({ panelId: 'old-1', imagePrompt: '旧版错位描述。', promptStatus: 'stale' })],
      oldPanels, newPanels, CHAPTER,
    );
    expect(result.droppedPromptCount).toBe(1);
    expect(result.artworks).toEqual([]);
  });

  it('其他章节的工件原样保留', () => {
    const other = artwork({ panelId: 'x-1', chapterId: 'c2', imagePrompt: '别章描述' });
    const result = migratePanelArtworks([other], [panel('x-1', 1, 'a')], [panel('y-1', 1, 'b')], CHAPTER);
    expect(result.artworks).toEqual([other]);
  });

  it('同一新页只被一条旧记录占用（重复记录被丢弃而不是复制）', () => {
    const oldPanels = [panel('old-1', 1, '正文。')];
    const newPanels = [panel('new-1', 1, '正文。')];
    const result = migratePanelArtworks(
      [artwork({ panelId: 'old-1', imagePrompt: 'A' }), artwork({ panelId: 'old-1', imagePrompt: 'B' })],
      oldPanels, newPanels, CHAPTER,
    );
    expect(result.artworks).toHaveLength(1);
    expect(result.artworks[0]).toMatchObject({ panelId: 'new-1', imagePrompt: 'A' });
  });
});
