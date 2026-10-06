import { describe, expect, it } from 'vitest';
import {
  auditPanelRefReadiness,
  formatPanelRefReadinessIssues,
  summarizePanelsRefReadiness,
} from '../../src/modules/comic/services/panelRefReadiness';
import type {
  LongProjectAsset,
  LongProjectAssetVariant,
  LongProjectStoryboardAssetBinding,
  LongProjectStoryboardPanel,
} from '../../src/modules/comic/types';

const variant = (overrides: Partial<LongProjectAssetVariant> = {}): LongProjectAssetVariant =>
  ({
    id: 'v1',
    name: '便装',
    referenceImageIds: [],
    sourceChapterIds: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }) as LongProjectAssetVariant;

const asset = (overrides: Partial<LongProjectAsset> = {}): LongProjectAsset =>
  ({
    id: 'a1',
    type: 'character',
    name: '林小雨',
    aliases: [],
    importance: 'major',
    description: '',
    fixedTraits: [],
    attributes: {},
    variants: [variant()],
    sourceChapterIds: [],
    scope: 'project',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }) as LongProjectAsset;

const binding = (overrides: Partial<LongProjectStoryboardAssetBinding> = {}): LongProjectStoryboardAssetBinding =>
  ({
    assetId: 'a1',
    assetName: '林小雨',
    visualVersionId: 'v1',
    ...overrides,
  }) as LongProjectStoryboardAssetBinding;

const panel = (overrides: Partial<LongProjectStoryboardPanel> = {}): LongProjectStoryboardPanel =>
  ({
    id: 'p1',
    order: 1,
    content: '',
    cells: [],
    assetBindings: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }) as LongProjectStoryboardPanel;

describe('分镜参考图就绪门禁（panelRefReadiness）', () => {
  it('绑定齐全但该视觉状态没有成品图：报缺参考图（审计原本全绿的那种情况）', () => {
    const issues = auditPanelRefReadiness(
      panel({ assetBindings: [binding()] }),
      [asset()],
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      reason: 'missing-image',
      assetId: 'a1',
      assetName: '林小雨',
      variantId: 'v1',
      variantName: '便装',
    });
  });

  it('有生成图：不报', () => {
    const issues = auditPanelRefReadiness(
      panel({ assetBindings: [binding()] }),
      [asset({ variants: [variant({ generatedImageIds: ['img-1'] })] })],
    );
    expect(issues).toHaveLength(0);
  });

  it('只有用户自行上传的成品图：不报（口径 = 生成图 + 自传成品图）', () => {
    const issues = auditPanelRefReadiness(
      panel({ assetBindings: [binding()] }),
      [asset({ variants: [variant({ uploadedImageIds: ['up-1'] })] })],
    );
    expect(issues).toHaveLength(0);
  });

  it('只有给该状态自己生图用的参考图：仍然报（referenceImageIds 不进分镜）', () => {
    const issues = auditPanelRefReadiness(
      panel({ assetBindings: [binding()] }),
      [asset({ variants: [variant({ referenceImageIds: ['ref-1'] })] })],
    );
    expect(issues).toHaveLength(1);
  });

  it('同一资产多状态：只报没图的那个状态', () => {
    const target = asset({
      variants: [
        variant({ id: 'v1', name: '便装', generatedImageIds: ['img-1'] }),
        variant({ id: 'v2', name: '校服' }),
      ],
    });
    const issues = auditPanelRefReadiness(
      panel({
        assetBindings: [
          binding({ visualVersionId: 'v1' }),
          binding({ visualVersionId: 'v2' }),
        ],
      }),
      [target],
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].variantName).toBe('校服');
  });

  it('多个资产缺图：按人物 → 场景 → 道具的取图顺序返回', () => {
    const character = asset({ id: 'a1', name: '林小雨', type: 'character' });
    const scene = asset({ id: 'b1', name: '教室', type: 'scene', variants: [variant({ id: 'sv1', name: '全章默认' })] });
    const prop = asset({ id: 'c1', name: '怀表', type: 'prop', variants: [variant({ id: 'pv1', name: '全章默认' })] });
    const issues = auditPanelRefReadiness(
      panel({
        assetBindings: [
          binding({ assetId: 'c1', assetName: '怀表', visualVersionId: 'pv1' }),
          binding({ assetId: 'b1', assetName: '教室', visualVersionId: 'sv1' }),
          binding(),
        ],
      }),
      [prop, scene, character],
    );
    expect(issues.map((issue) => issue.assetName)).toEqual(['林小雨', '教室', '怀表']);
  });

  it('cellIndex：仅页级声明为 -1，格级声明为所在格序（0 起）', () => {
    const pageLevel = auditPanelRefReadiness(panel({ assetBindings: [binding()] }), [asset()]);
    expect(pageLevel[0].cellIndex).toBe(-1);

    const cellLevel = auditPanelRefReadiness(
      panel({
        cells: [
          {} as never,
          { assetBindings: [binding()] } as never,
        ],
        assetBindings: [binding()],
      }),
      [asset()],
    );
    expect(cellLevel[0].cellIndex).toBe(1);
  });

  it('同一状态在多个格出场只算一条', () => {
    const issues = auditPanelRefReadiness(
      panel({
        cells: [
          { assetBindings: [binding()] } as never,
          { assetBindings: [binding()] } as never,
        ],
        assetBindings: [binding()],
      }),
      [asset()],
    );
    expect(issues).toHaveLength(1);
  });

  it('摘要文案：同一「资产（状态）」只列一次', () => {
    const issues = auditPanelRefReadiness(
      panel({
        assetBindings: [
          binding({ visualVersionId: 'v1' }),
          binding({ visualVersionId: 'v2' }),
        ],
      }),
      [asset({ variants: [variant({ id: 'v1', name: '便装' }), variant({ id: 'v2', name: '便装' })] })],
    );
    expect(formatPanelRefReadinessIssues(issues)).toEqual(['林小雨（便装）']);
  });

  it('整章汇总：panelCount 按镜计，stateCount 按「资产+状态」跨镜去重', () => {
    const target = asset();
    const panels = [
      panel({ id: 'p1', order: 1, assetBindings: [binding()] }),
      panel({ id: 'p2', order: 2, assetBindings: [binding()] }),
    ];
    const summary = summarizePanelsRefReadiness(panels, [target]);
    expect(summary.panelCount).toBe(2);
    expect(summary.stateCount).toBe(1);
    expect(summary.items.map((item) => item.panelOrder)).toEqual([1, 2]);

    const noIssue = summarizePanelsRefReadiness(
      [panel({ assetBindings: [binding()] })],
      [asset({ variants: [variant({ generatedImageIds: ['img-1'] })] })],
    );
    expect(noIssue).toEqual({ panelCount: 0, stateCount: 0, items: [] });
  });
});
