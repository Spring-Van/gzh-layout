import { describe, expect, it } from 'vitest';
import { buildRefNoteSection, previewRefImageIndexes } from '../../src/modules/comic/services/assetRefManifest';

/**
 * 资产生图的参考图图号口径。
 *
 * 这里**故意没有「动态参考图清单」的测试**：清单是分镜绘图侧的机制，
 * 资产侧只靠「共用属性块自带图号行 + 用户手写的参考描述」两件事说明图号。
 * 2026-10-24 用户实报后撤掉了资产侧的清单（共用属性 5 张图会重复列 5 行同样的说明）。
 *
 * 因此本文件锁两件事：
 * 1. 参考描述段的标题按资产类型给、统一带【】、空串不出段；
 * 2. 选图弹窗「插入图号」按**确认后的最终数组**推演（增删图后图号仍然对）。
 */

describe('assetRefManifest · 状态级「参考描述」', () => {
  it('有描述才出段，空串 / 空白 / 未传都不拼标题', () => {
    expect(buildRefNoteSection('图2 只取脸，发型照参考', 'character')).toBe('【人物角色一致性】\n图2 只取脸，发型照参考');
    expect(buildRefNoteSection('   ', 'character')).toBe('');
    expect(buildRefNoteSection('', 'scene')).toBe('');
    expect(buildRefNoteSection(undefined)).toBe('');
    expect(buildRefNoteSection(null)).toBe('');
  });

  it('标题按资产类型给，且统一套【】（与版式 / 主体描述同一套标签风格）', () => {
    expect(buildRefNoteSection('保持同一空间朝向', 'scene')).toBe('【场景一致性】\n保持同一空间朝向');
    expect(buildRefNoteSection('金属反光控制住', 'prop')).toBe('【道具一致性】\n金属反光控制住');
    // 不带类型的兜底也要有标签，不能因为缺类型就退化成裸正文
    expect(buildRefNoteSection('只取脸')).toBe('【参考图说明】\n只取脸');
  });

  it('描述原样保留（含换行），不做任何图号改算', () => {
    // 图号是用户在弹窗里按「确认后的最终数组」插入的真实文本，这里不能再动它
    const section = buildRefNoteSection('图3 只取脸\n图4 只取配色', 'character');
    expect(section).toContain('图3 只取脸\n图4 只取配色');
  });
});

describe('assetRefManifest · 选图弹窗的图号预览', () => {
  it('追加模式按确认后的最终数组推演（去重后的位置）', () => {
    const map = previewRefImageIndexes({
      selected: ['new-1', 'old-1', 'new-2'],
      existing: ['old-1'],
      append: true,
      baseCount: 2,
    });
    // 最终 = [old-1, new-1, new-2]；baseCount 2（共用属性图占前 2 张）
    // → old-1 = 图3（已在列表，不占新位置）、new-1 = 图4、new-2 = 图5
    expect(map.get('old-1')).toBe(3);
    expect(map.get('new-1')).toBe(4);
    expect(map.get('new-2')).toBe(5);
  });

  it('替换模式按勾选顺序重排', () => {
    const map = previewRefImageIndexes({
      selected: ['a', 'b'],
      existing: ['c', 'd'],
      append: false,
      baseCount: 0,
    });
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
  });

  it('关掉拼接共用属性时 baseCount 为 0，图号从 1 起', () => {
    const map = previewRefImageIndexes({ selected: ['x'], existing: [], append: true, baseCount: 0 });
    expect(map.get('x')).toBe(1);
  });
});
