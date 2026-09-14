import { describe, expect, it } from 'vitest';
import {
  normalizeModelOutput,
  parseAssetPromptResponse,
  targetKey,
  type AssetPromptParseContext,
} from '../../src/modules/comic/services/assetPromptParser';

/** 构造解析上下文（与 assetPromptService.buildTargetList 同构）。 */
function makeContext(entries: Array<[string, string]>, parser?: AssetPromptParseContext['parser']): AssetPromptParseContext {
  const ordered = entries.map(([assetName, variantName], index) => ({
    assetId: `asset-${index}`,
    variantId: `variant-${index}`,
    assetName,
    variantName,
  }));
  const index = new Map<string, (typeof ordered)[number]>();
  ordered.forEach((ref, i) => {
    index.set(String(i + 1), ref);
    index.set(targetKey(ref.assetName, ref.variantName), ref);
  });
  return { index, ordered, parser };
}

const twoTargets: Array<[string, string]> = [['小明', '少年期'], ['小巷', '雨夜']];

describe('归一化预处理', () => {
  it('剥代码块围栏、零宽字符与 emoji，保留正文', () => {
    expect(normalizeModelOutput('```json\n[]\n```')).toBe('[]');
    expect(normalizeModelOutput('黑色\u200B短发\u{1F600}少年')).toBe('黑色短发少年');
    expect(normalizeModelOutput('第一段\n\n---\n\n第二段')).toBe('第一段\n\n第二段');
  });
});

describe('资产提示词回填解析（多层容错）', () => {
  it('① 标准【资产名｜状态名】协议：精确命中且内容不串台', () => {
    const { items, diagnostics } = parseAssetPromptResponse(
      [
        '【小明｜少年期】黑色短发少年，校服湿透，站在雨中，冷色调。',
        '【小巷｜雨夜】狭窄小巷，湿漉地面反光，暖黄路灯。',
      ].join('\n'),
      makeContext(twoTargets),
    );
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.match === 'exact')).toBe(true);
    expect(items[1].variantId).toBe('variant-1');
    expect(items[0].imagePrompt).toBe('黑色短发少年，校服湿透，站在雨中，冷色调。');
    expect(items[1].imagePrompt).toBe('狭窄小巷，湿漉地面反光，暖黄路灯。');
    expect(diagnostics.stage).toBe('ok');
  });

  it('② 代码块围栏 + 客套前言/结尾：不影响解析，尾部说明被剔除', () => {
    const raw = [
      '好的，以下是根据清单生成的绘画提示词：',
      '```markdown',
      '【小明｜少年期】黑色短发少年，校服湿透。',
      '【小巷｜雨夜】狭窄小巷，湿漉地面反光。',
      '```',
      '希望对你有帮助！',
    ].join('\n');
    const { items } = parseAssetPromptResponse(raw, makeContext(twoTargets));
    expect(items).toHaveLength(2);
    expect(items[0].imagePrompt).toBe('黑色短发少年，校服湿透。');
    expect(items[1].imagePrompt).toBe('狭窄小巷，湿漉地面反光。');
  });

  it('③ 换包裹符号（半角方括号 / 加粗 / 标题 / 括号并列）都能识别', () => {
    const variants: Array<[string, string]> = [
      ['[小明|少年期] 黑色短发少年。', '黑色短发少年。'],
      ['**小明｜少年期**：黑色短发少年。', '黑色短发少年。'],
      ['### 小明 - 少年期\n黑色短发少年。', '黑色短发少年。'],
      ['小明（少年期）：黑色短发少年。', '黑色短发少年。'],
      ['小明｜少年期：黑色短发少年。', '黑色短发少年。'],
      ['- 小明 - 少年期\n黑色短发少年。', '黑色短发少年。'],
    ];
    for (const [raw, expected] of variants) {
      const { items } = parseAssetPromptResponse(raw, makeContext([['小明', '少年期']]));
      expect(items, raw).toHaveLength(1);
      expect(items[0].imagePrompt, raw).toBe(expected);
    }
  });

  it('④ 【资产名（状态名）】整体被当成资产名时，拆括号后仍精确命中', () => {
    const { items } = parseAssetPromptResponse('【小明（少年期）】黑色短发少年。', makeContext([['小明', '少年期']]));
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe('variant-0');
  });

  it('⑤ 名字漂移：状态名少字 / 资产名写错，靠模糊匹配回填并标记 fuzzy', () => {
    const shortState = parseAssetPromptResponse('【小明｜少年】黑色短发少年。', makeContext([['小明', '少年期']]));
    expect(shortState.items).toHaveLength(1);
    expect(shortState.items[0].match).toBe('fuzzy');
    expect(shortState.items[0].variantId).toBe('variant-0');

    // 资产名写错，但状态名在全库唯一 → 认状态名
    const wrongAsset = parseAssetPromptResponse(
      '【小明明｜童年】扎双马尾，校服裙摆。',
      makeContext([['小明', '少年期'], ['小红', '童年']]),
    );
    expect(wrongAsset.items).toHaveLength(1);
    expect(wrongAsset.items[0].assetId).toBe('asset-1');
  });

  it('⑥ 正文行里的连字符不会被误判成头部（段落不被切碎）', () => {
    const { items } = parseAssetPromptResponse(
      [
        '【小明｜少年期】身高一米七，黑色短发。',
        '- 视觉描述：少年模样 - 略显疲惫',
        '【小巷｜雨夜】狭窄小巷，湿漉地面反光。',
      ].join('\n'),
      makeContext(twoTargets),
    );
    expect(items).toHaveLength(2);
    expect(items[0].imagePrompt).toContain('略显疲惫');
    expect(items[1].imagePrompt).toBe('狭窄小巷，湿漉地面反光。');
  });

  it('⑦ 模型模仿输入清单写法：资产名：X｜状态名：Y', () => {
    const { items } = parseAssetPromptResponse(
      '资产名：小明｜状态名：少年期｜黑色短发少年，校服湿透。',
      makeContext([['小明', '少年期']]),
    );
    expect(items).toHaveLength(1);
    expect(items[0].imagePrompt).toContain('黑色短发少年');
  });

  it('⑧ 序号行（状态N：/ 1. / ①）按序号回填', () => {
    for (const raw of [
      '状态1：黑色短发少年。\n状态2：狭窄小巷。',
      '1. 黑色短发少年。\n2. 狭窄小巷。',
      '①黑色短发少年。\n②狭窄小巷。',
    ]) {
      const { items } = parseAssetPromptResponse(raw, makeContext(twoTargets));
      expect(items, raw).toHaveLength(2);
      expect(items[0].variantId, raw).toBe('variant-0');
      expect(items[0].imagePrompt, raw).toBe('黑色短发少年。');
      expect(items[1].variantId, raw).toBe('variant-1');
    }
  });

  it('⑨ JSON 结构化（含围栏与尾部说明、容器形状、中文键名）', () => {
    const arrayForm = parseAssetPromptResponse(
      [
        '```json',
        '[{"asset":"小明","variant":"少年期","prompt":"黑色短发少年。"},',
        ' {"asset":"小巷","variant":"雨夜","prompt":"狭窄小巷。"}]',
        '```',
        '以上是全部结果。',
      ].join('\n'),
      makeContext(twoTargets),
    );
    expect(arrayForm.items).toHaveLength(2);
    expect(arrayForm.items[1].imagePrompt).toBe('狭窄小巷。');

    const containerForm = parseAssetPromptResponse(
      '{"items":[{"资产名":"小明","状态名":"少年期","提示词":"黑色短发少年。"}]}',
      makeContext([['小明', '少年期']]),
    );
    expect(containerForm.items).toHaveLength(1);
    expect(containerForm.items[0].imagePrompt).toBe('黑色短发少年。');
  });

  it('⑩ 只给裸提示词（无任何标记）：段数等于目标数时按清单顺序兜底', () => {
    const { items, diagnostics } = parseAssetPromptResponse(
      '黑色短发少年，校服湿透，冷色调。\n\n狭窄小巷，湿漉地面反光，暖黄路灯。',
      makeContext(twoTargets),
    );
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.match === 'order')).toBe(true);
    expect(items[0].imagePrompt).toContain('黑色短发少年');
    expect(items[1].imagePrompt).toContain('暖黄路灯');
    expect(diagnostics.stage).toBe('ok');
  });

  it('⑪ 条数与目标数不一致时顺序兜底不猜（宁可不填也不静默错配）', () => {
    const { items, diagnostics } = parseAssetPromptResponse('只有一段提示词，模型漏了一条。', makeContext(twoTargets));
    expect(items).toHaveLength(0);
    expect(diagnostics.parsed).toBe(0);
    expect(diagnostics.expected).toBe(2);
    expect(diagnostics.missing).toEqual(['小明｜少年期', '小巷｜雨夜']);
  });

  it('⑫ 显式解析方式：bracket 档不认序号，json 档不认纯文本，plain 档全文回填单条', () => {
    const bracketOnly = parseAssetPromptResponse('状态1：黑色短发少年。', makeContext([['小明', '少年期']], 'bracket'));
    expect(bracketOnly.items).toHaveLength(0);
    expect(bracketOnly.diagnostics.stage).toBe('bracket');

    const jsonOnly = parseAssetPromptResponse('【小明｜少年期】黑色短发少年。', makeContext([['小明', '少年期']], 'json'));
    expect(jsonOnly.items).toHaveLength(0);
    expect(jsonOnly.diagnostics.stage).toBe('json');

    const plain = parseAssetPromptResponse('黑色短发少年，校服湿透。', makeContext([['小明', '少年期']], 'plain'));
    expect(plain.items).toHaveLength(1);
    expect(plain.items[0].imagePrompt).toBe('黑色短发少年，校服湿透。');
  });

  it('⑬ sequential 档：段数不等时报错而非错配', () => {
    const ok = parseAssetPromptResponse('第一段提示词。\n\n第二段提示词。', makeContext(twoTargets, 'sequential'));
    expect(ok.items).toHaveLength(2);

    const bad = parseAssetPromptResponse('只有一段提示词。', makeContext(twoTargets, 'sequential'));
    expect(bad.items).toHaveLength(0);
    expect(bad.diagnostics.stage).toBe('order');
  });

  it('⑭ 未注册的目标不会被误填，缺失项在诊断里列全', () => {
    const { items, diagnostics } = parseAssetPromptResponse(
      '【不存在的东西｜幽灵状态】凭空出现的提示词。',
      makeContext(twoTargets),
    );
    expect(items).toHaveLength(0);
    expect(diagnostics.missing).toHaveLength(2);
  });
});
