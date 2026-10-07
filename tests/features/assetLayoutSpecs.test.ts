import { describe, expect, it } from 'vitest';
import {
  LAYOUT_SPEC_FIELDS,
  RECOMMENDED_LAYOUT_SPECS,
  resolveLayoutPrompt,
} from '../../src/modules/comic/services/assetLayoutSpecs';

/**
 * 设定图版式（2026-10-06）：版式从 `asset-prompt` 模板搬到生图配置的「版式」设置，
 * 按资产类型三段维护、生图前拼接。这些断言守住三件事：
 * ① 三段推荐文本齐全且**不再出现在模板里**（模板侧的归零断言在 promptTemplateRegistry.test.ts）；
 * ② 人物版式的「脸只出现一次」红线仍在（参考图可读性的关键）；
 * ③ 机位图豁免：场景版式不能在机位图状态上拼接，否则与提示词正文里的九宫格版式打架。
 */
describe('assetLayoutSpecs · 设定图版式按资产类型三段', () => {
  it('推荐版式三段齐全，且只覆盖三种资产类型', () => {
    expect(Object.keys(RECOMMENDED_LAYOUT_SPECS).sort()).toEqual(['character', 'prop', 'scene']);
    for (const [type, text] of Object.entries(RECOMMENDED_LAYOUT_SPECS)) {
      expect(text.trim().length, `${type} 推荐版式为空`).toBeGreaterThan(40);
    }
  });

  it('人物版式：四联非等宽 + 脸只出现一次 + A-POSE 约束', () => {
    const character = RECOMMENDED_LAYOUT_SPECS.character;
    expect(character).toContain('四联角色设定图');
    expect(character).toContain('1×4 非等宽');
    expect(character).toContain('2:3 竖幅');
    // 核心机制：全图只保留一处高分辨率人脸，后三格把画幅让给服装
    expect(character).toContain('整张图的脸只出现一次');
    expect(character).toContain('头部完全在画幅之外');
    expect(character).toContain('颈部中段以下开始');
    expect(character).toContain('裁切至锁骨');
    // 必须告诉模型这是刻意的，否则它会「补全」头部
    expect(character).toContain('刻意的版式');
    expect(character).toContain('不是裁切失误');
    expect(character).toContain('不要补画头部与五官');
    expect(character).toContain('背对镜头、看不到脸');
    // 影棚中性灰无缝背景 + 伦勃朗光
    expect(character).toContain('18% 灰');
    expect(character).toContain('伦勃朗光');
    expect(character).toContain('无缝背景');
    // 姿态与画面纯净度：四格 A-POSE，手部动作在版式里被禁掉（提取阶段不该给姿态）
    expect(character).toContain('A-POSE');
    expect(character).toContain('不插兜');
    expect(character).toContain('无文字、无标注');
    expect(character).not.toContain('FRONT');
  });

  it('场景版式：establishing shot 且不出现人物；道具版式：三视图 + 标号 + 中性灰背景', () => {
    const scene = RECOMMENDED_LAYOUT_SPECS.scene;
    expect(scene).toContain('establishing shot');
    expect(scene).toContain('广角平视');
    expect(scene).toContain('不出现人物与动物');
    expect(scene).toContain('无文字与水印');

    const prop = RECOMMENDED_LAYOUT_SPECS.prop;
    expect(prop).toContain('正面、侧面、顶视三个视图等距并排');
    expect(prop).toContain('同比例同大小');
    expect(prop).toContain('阿拉伯数字 1–4');
    expect(prop).toContain('中性 18% 灰哑光背景');
    expect(prop).toContain('不出现人物');
    expect(prop).toContain('不出现手持动作');
  });

  it('UI 字段与推荐版式一一对应', () => {
    expect(LAYOUT_SPEC_FIELDS.map((field) => field.type)).toEqual(['character', 'scene', 'prop']);
    // 字段只带类型与标签：输入框顶部的说明文案已按用户要求移除（2026-10-06）
    for (const field of LAYOUT_SPEC_FIELDS) {
      expect(field.label.trim()).not.toBe('');
      expect(Object.keys(field).sort()).toEqual(['label', 'type']);
    }
  });

  it('取版式：按类型取值，用户清空即空串（不回落推荐文本）', () => {
    const config = { layoutPrompts: { character: RECOMMENDED_LAYOUT_SPECS.character, scene: '', prop: '   ' } };
    expect(resolveLayoutPrompt(config, 'character')).toBe(RECOMMENDED_LAYOUT_SPECS.character);
    expect(resolveLayoutPrompt(config, 'scene')).toBe('');
    expect(resolveLayoutPrompt(config, 'prop')).toBe('');
  });

  it('从未配置（字段缺失）时回落到推荐版式，避免升级即静默丢版式', () => {
    // 旧项目 / 未打开过「版式」tab：字段整个缺失
    expect(resolveLayoutPrompt(undefined, 'character')).toBe(RECOMMENDED_LAYOUT_SPECS.character);
    expect(resolveLayoutPrompt({}, 'scene')).toBe(RECOMMENDED_LAYOUT_SPECS.scene);
    expect(resolveLayoutPrompt({ layoutPrompts: undefined }, 'prop')).toBe(RECOMMENDED_LAYOUT_SPECS.prop);
    // 字段存在（哪怕三段全空）= 用户已表过态，一律以用户值为准，不再兜底
    expect(resolveLayoutPrompt({ layoutPrompts: {} }, 'character')).toBe('');
    expect(resolveLayoutPrompt({ layoutPrompts: { character: '', scene: '', prop: '' } }, 'scene')).toBe('');
  });

  it('机位图豁免：场景的「机位图」状态不拼场景版式（九宫格版式由提示词正文自带）', () => {
    const config = { layoutPrompts: { scene: RECOMMENDED_LAYOUT_SPECS.scene } };
    // 默认状态照拼
    expect(resolveLayoutPrompt(config, 'scene', '白天')).toBe(RECOMMENDED_LAYOUT_SPECS.scene);
    // 机位图状态跳过
    expect(resolveLayoutPrompt(config, 'scene', '机位图')).toBe('');
    expect(resolveLayoutPrompt(config, 'scene', '夜间·机位图')).toBe('');
    // 豁免只作用于场景：人物的状态名里出现同样字样也不受影响
    expect(resolveLayoutPrompt({ layoutPrompts: { character: 'X' } }, 'character', '机位图')).toBe('X');
  });
});
