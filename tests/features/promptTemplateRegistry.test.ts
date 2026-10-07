import { describe, expect, it } from 'vitest';
import {
  LONG_STORY_TEMPLATE_TYPES,
  OUTPUT_FORMAT_SPECS,
  PANEL_BACKGROUND_RULES,
  PANEL_FLOAT_RULES,
  PANEL_LAYOUT_RULES,
  PANEL_POV_RULES,
  PANEL_STRUCTURE_NAMES,
  PANEL_STRUCTURE_SEMANTICS,
  RECOMMENDED_TEMPLATES,
  findUnknownVariables,
  getTemplateVariables,
  migrateTemplateContent,
  normalizeTemplateVariables,
  outputFormatSpec,
  renderPromptTemplate,
} from '../../src/modules/comic/services/promptTemplateRegistry';

describe('promptTemplateRegistry · 变量归一化与检测', () => {
  it('旧英文占位符归一化为中文占位符', () => {
    expect(normalizeTemplateVariables('【章节原文】\n{{chapter_content}}', 'analysis')).toBe('【章节原文】\n{{章节原文}}');
    expect(normalizeTemplateVariables('{{script_content}}+{{analysis}}', 'storyboard')).toBe('{{漫画剧本}}+{{原文分析}}');
    // asset-prompt 不再注册「风格上下文」：画风由生图时的共用属性拼接，不进绘画提示词，
    // 因此旧占位符 {{style}} 保持原样（渲染时按未注册占位符清理）
    expect(normalizeTemplateVariables('{{assets}}/{{style}}/{{target_model}}', 'asset-prompt')).toBe('{{状态清单}}/{{style}}/{{目标生图模型}}');
  });

  it('归一化按类型生效：chapter_content 在分镜模板中不识别', () => {
    // storyboard 的「章节原文」刻意不注册 legacy 别名：旧模板误用的 {{chapter_content}} 保持原样，
    // 会被 findUnknownVariables 检出并在渲染时清理，避免存量模板被灌进整章原文
    expect(normalizeTemplateVariables('{{chapter_content}}', 'storyboard')).toBe('{{chapter_content}}');
    expect(findUnknownVariables('{{chapter_content}}', 'storyboard')).toEqual(['chapter_content']);
  });

  it('findUnknownVariables 检出未注册占位符（含中文误插）', () => {
    expect(findUnknownVariables('{{章节原文}} {{画风}}', 'analysis')).toEqual(['画风']);
    expect(findUnknownVariables('{{章节原文}}', 'analysis')).toEqual([]);
  });

  it('migrateTemplateContent：需要迁移返回新内容，否则返回 null', () => {
    expect(migrateTemplateContent('{{chapter_content}}', 'script')).toBe('{{章节原文}}');
    expect(migrateTemplateContent('{{章节原文}}', 'script')).toBeNull();
  });
});

describe('promptTemplateRegistry · 渲染引擎', () => {
  it('变量在模板中：原地替换', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '请分析：\n{{章节原文}}',
      values: { 章节原文: '第一章……' },
    });
    expect(prompt).toContain('请分析：\n第一章……');
    expect(prompt).not.toContain('{{');
    // 渲染不再追加任何协议段（返回格式约定写在模板内容里）
    expect(prompt).toBe('请分析：\n第一章……');
  });

  it('变量在模板中但值为空：替换为 emptyText', () => {
    const prompt = renderPromptTemplate({
      type: 'script',
      content: '【原文分析】\n{{原文分析}}',
      values: { 章节原文: 'x', 原文分析: '' },
    });
    expect(prompt).toContain('（本章尚未生成原文分析）');
  });

  it('变量不在模板中：一律不出现（无自动追加兜底）', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '只做人物梳理。',
      values: { 章节原文: '第一章……' },
    });
    expect(prompt.startsWith('只做人物梳理。')).toBe(true);
    expect(prompt).not.toContain('第一章……');
    expect(prompt).not.toContain('【章节原文】');
  });

  it('未插入的变量即使有值也不出现（关键输入与辅助上下文一视同仁）', () => {
    const prompt = renderPromptTemplate({
      type: 'panel-prompt',
      content: '描述画面：{{当前分镜}}',
      values: { 当前分镜: '分镜序号：1', 风格上下文: '整体画风：日漫', 本章分镜概要: '分镜1：开场' },
    });
    expect(prompt).toContain('分镜序号：1');
    expect(prompt).not.toContain('整体画风：日漫');
    expect(prompt).not.toContain('分镜1：开场');
  });

  it('资产绘画提示词不再接收风格上下文：画风由生图共用属性拼接，模板中的该占位符被清理', () => {
    const prompt = renderPromptTemplate({
      type: 'asset-prompt',
      content: '【风格上下文】\n{{风格上下文}}\n请生成提示词。',
      values: { 状态清单: '- 状态1', 风格上下文: '整体画风：国风' },
    });
    expect(prompt).not.toContain('整体画风：国风');
    expect(prompt).not.toContain('{{风格上下文}}');
    expect(prompt).toContain('请生成提示词。');
  });

  it('未注册占位符构建时被清理', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '分析 {{章节原文}}，风格参考 {{画风}}',
      values: { 章节原文: 'x' },
    });
    expect(prompt).not.toContain('{{画风}}');
    expect(prompt).not.toContain('{{');
  });

  it('允许占位符两侧带空白：{{ 章节原文 }}', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '{{ 章节原文 }}',
      values: { 章节原文: 'x' },
    });
    expect(prompt).toContain('x');
  });
});

describe('promptTemplateRegistry · 推荐模板', () => {
  it('全部长篇类型的推荐模板都显式插入了该类型的全部变量（不再依赖兜底）', () => {
    for (const type of LONG_STORY_TEMPLATE_TYPES) {
      const template = RECOMMENDED_TEMPLATES[type];
      expect(template, `缺少推荐模板：${type}`).toBeTruthy();
      for (const spec of getTemplateVariables(type)) {
        expect(template!.content, `${type} 推荐模板缺少 {{${spec.name}}}`).toContain(`{{${spec.name}}}`);
      }
    }
  });
});

describe('promptTemplateRegistry · 返回格式（写在模板内容里）', () => {
  it('渲染不再追加任何协议段：模板内容就是最终提示词', () => {
    const prompt = renderPromptTemplate({
      type: 'panel-prompt',
      content: '内容',
      values: {},
    });
    expect(prompt).toBe('内容');
    expect(prompt).not.toContain('【返回格式】');
    expect(prompt).not.toContain('【内容要求】');
  });

  it('需要解析的环节：推荐模板内容自带【返回格式】段', () => {
    for (const type of ['storyboard', 'extract', 'asset-prompt'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      expect(content, `${type} 推荐模板缺少格式约定`).toContain('【返回格式】');
      expect(content).toContain(outputFormatSpec(type));
    }
  });

  it('需要 Markdown 的长篇类型明确声明 Markdown；分镜只声明页级标题使用 Markdown', () => {
    for (const type of ['analysis', 'script', 'extract', 'asset-prompt', 'panel-prompt', 'panel-prompt-chapter'] as const) {
      expect(outputFormatSpec(type).length).toBeGreaterThan(0);
      expect(outputFormatSpec(type), `${type} 应明确要求 Markdown 返回`).toContain('Markdown');
    }
    expect(outputFormatSpec('storyboard')).toContain('仅页级标题使用 Markdown');
    expect(outputFormatSpec('style')).toBe('');
    expect(OUTPUT_FORMAT_SPECS.story).toBeUndefined();
  });

  it('asset-prompt 返回格式只有一份：批量与逐条同格式（逐条只解析一条）', () => {
    const format = outputFormatSpec('asset-prompt');
    expect(format).toContain('Markdown');
    expect(format).toContain('## 资产名｜状态名');
  });

  it('画面描述协议不要求模型输出参考图、图号或共用属性', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const format = outputFormatSpec(type);
      expect(format).toContain('纯画面内容');
      expect(format).toContain('不要输出资产参考图清单、图号、共用属性');
      expect(RECOMMENDED_TEMPLATES[type]!.content).not.toContain('{{参考图清单}}');
      expect(RECOMMENDED_TEMPLATES[type]!.content).not.toContain('{{全章参考图清单}}');
    }
  });

  it('画面描述模板内嵌漫画规则库与气泡规范（写模板正文，用户可改）', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      // 规则库：结构 / 占比 / 景深 / 视角一致性 / 光线 / 连续性
      expect(content).toContain('【漫画画面规则】');
      expect(content).toContain('人物占比');
      expect(content).toContain('浅景深');
      expect(content).toContain('视角一致性');
      // 气泡规范：含画外音的气尾指向（不得指向画面内人物）
      expect(content).toContain('【文字元素与气泡】');
      expect(content).toContain('气尾');
      expect(content).toContain('不得指向画面内的任何人物');
      expect(content).toContain('旁白');
      // 资产名指代：绑定扫描靠它，外观交给参考图
      expect(content).toContain('不要描写人物外貌、服装、发型、配饰与颜色');
      // 表现元素：拟声词艺术字 / 速度线 / 情绪符号 / 气氛网点 / 留白 / 情绪背景
      // 节标题与输出行标签必须是同一个 token（旧节标题叫「漫画表现元素」、输出行叫「表现元素：」→ 已统一）
      expect(content).toContain('【表现元素】');
      expect(content).not.toContain('漫画表现元素');
      expect(content).toContain('拟声词');
      expect(content).toContain('速度线');
      expect(content).toContain('情绪符号');
      expect(content).toContain('留白');
      // 拟声词属于画面艺术字，不进气泡
      expect(content).toContain('拟声词不进气泡');
      // 页面结构（漫画排版）与要素齐全要求
      expect(content).toContain('页面结构');
      expect(content).toContain('一个都不能缺');
      // 输出协议：气泡层是画面的一部分（不再禁止写台词）
      const format = outputFormatSpec(type);
      expect(format).toContain('气泡');
      expect(format).toContain('版面：');
      expect(format).toContain('表现元素');
      expect(format).toContain('文字元素：');
      expect(format).toContain('一个都不能缺');
      expect(format).not.toContain('不要写对白或旁白');
      expect(content).not.toContain('不写对白与旁白');
    }
  });

  it('剧本模板：旁白独立成行（不再折进剧情），声音字段含可画的拟声词', () => {
    const content = RECOMMENDED_TEMPLATES.script!.content;
    expect(content).toContain('旁白独立成行');
    expect(content).toContain('旁白逐字保留');
    expect(content).toContain('拟声词');
    // 旧口径「旁白叙述直接写进「剧情」」已翻转
    expect(content).not.toContain('旁白叙述直接写进「剧情」');
    const format = outputFormatSpec('script');
    expect(format).toContain('旁白');
    expect(format).toContain('原文叙述逐字');
    expect(format).not.toContain('旁白叙述直接写进「剧情」，不进「对白」');
  });

  // 2026-10-05：对齐上游 novel-to-manga 技能暴露的三类缺口
  //（世界观画面硬规则 / 代称角色待确认 / 伏笔与关键道具）
  it('原文分析模板：补齐世界观硬规则、代称角色待确认、伏笔与关键道具三类小节', () => {
    const content = RECOMMENDED_TEMPLATES.analysis!.content;
    expect(content).toContain('且会约束画面内容的世界观设定与硬规则');
    expect(content).toContain('身份尚未被原文点名');
    expect(content).toContain('本章埋设或回收的伏笔');
    expect(content).toContain('重要性（主要／次要／群演）');
    expect(content).toContain('外貌锚点');
    expect(content).toContain('光线时段（日／夜／黄昏／特定时刻及主光源方向）');
    expect(content).toContain('单独标注「存疑」');
    // 格式段的小节清单必须与正文同步（改规则两处都要改）
    const format = outputFormatSpec('analysis');
    expect(format).toContain('## 世界观与画面硬规则');
    expect(format).toContain('## 待确认角色');
    expect(format).toContain('## 伏笔与关键道具');
    expect(format).toContain('没有内容的小节整节省略');
  });

  it('剧本模板：伏笔动作不得删减、高潮不得压缩，剧情目的含伏笔与高潮取值', () => {
    const content = RECOMMENDED_TEMPLATES.script!.content;
    expect(content).toContain('伏笔动作不得当作过渡删减');
    expect(content).toContain('高潮不得压缩成结果');
    expect(content).toContain('伏笔埋设／伏笔回收／高潮');
    expect(content).toContain('供下游分镜判断该场景不可压缩');
    const format = outputFormatSpec('script');
    expect(format).toContain('伏笔埋设/伏笔回收/高潮');
  });

  // 2026-10-07：爆款开头 + 章末留人（用户实报要求：把小说爆点前置吸引人、结尾留足悬念）
  it('剧本模板：开场与收尾——爆点前置三禁、章末六类钩子、禁止收干净', () => {
    const content = RECOMMENDED_TEMPLATES.script!.content;
    const format = outputFormatSpec('script');

    // 结构节与「先定两端」的流程步骤必须存在，否则模型仍从日常铺垫写起
    expect(content).toContain('【开场与收尾】');
    expect(content).toContain('先定两端，再写中间');
    expect(content).toContain('连载内容的留人节奏');

    // 开场：禁铺垫 + 允许前置
    expect(content).toContain('开场——本章第一场的第一件事就要有冲击力');
    expect(content).toContain('**禁止**用环境交代、天气、日常起居、人物出场介绍、身世与世界观说明开场');

    // 前置的三条硬约束（缺任何一条都会出事：编造 / 剧透 / 资产状态错乱）
    expect(content).toContain('不得新增原文没有的事件');
    expect(content).toContain('只给入口，不给答案');
    expect(content).toContain('不得跨越服装或时期的状态切换点');
    expect(content).toContain('下游分镜无法判断该格该声明哪个资产状态');

    // 章末：禁止收干净 + 六类钩子齐备 + 只调落点不调内容
    expect(content).toContain('禁止把情绪收干净');
    expect(content).toContain('不得只写「收束」');
    for (const hook of ['危机降临', '真相前一秒', '反转暗示', '新威胁入场', '倒计时']) {
      expect(content, `章末钩子缺少类型：${hook}`).toContain(hook);
    }
    expect(content).toContain('钩子**只调落点，不调内容**');
    expect(content).toContain('平静之下最不对劲的那一处');
    expect(content).toContain('必须是能画出来的具体动作、表情或画面');
    expect(content).toContain('不写「气氛变得紧张」');

    // 中段：每 3~5 场一个爆点
    expect(content).toContain('每 3~5 场安排一次明确的信息爆点');

    // 字段契约：钩子进字段表，且只在首尾两场出现（防退化成每场都挂一句的固定尾段）
    expect(format).toContain('场景 / 钩子 / 剧情');
    expect(format).toContain('钩子：**只有第 1 场与最后一场写，其余场景整行省略**');
    expect(format).toContain('开场·前置');
    expect(format).toContain('取自第 N 场');
    expect(format).toContain('不揭示结果');
    expect(format).toContain('开场·切入');
    expect(format).toContain('危机降临/真相前一秒/反转暗示/新威胁入场/倒计时');
    // 正文与格式段同源：两处都要有「只在首尾场」的约束
    expect(content).toContain('只有第 1 场与最后一场写');
  });

  it('分镜模板：旁白有来源/用量/字数/分配规则，音效要求写出可画的拟声词', () => {
    const content = RECOMMENDED_TEMPLATES.storyboard!.content;
    expect(content).toContain('【旁白怎么写】');
    expect(content).toContain('逐字继承剧本的「旁白」行');
    expect(content).toContain('一格最多一条');
    expect(content).toContain('每格 ≤ 20 字');
    expect(content).toContain('短旁白页');
    expect(content).toContain('拟声词用引号单独写出');
  });

  it('分镜格式说明：只有页头使用 Markdown，格内使用普通文本', () => {
    const spec = outputFormatSpec('storyboard');
    expect(spec).toContain('## 分镜 N');
    expect(spec).toContain('第X格');
    expect(spec).toContain('字段名：内容');
    expect(spec).not.toContain('### 第X格');
    expect(spec).not.toContain('- 字段名：内容');
  });

  it('分镜格式说明：列出 14 个字段（含出场资产），台词类字段四选一且带说话人', () => {
    const spec = outputFormatSpec('storyboard');
    expect(spec).toContain('景别 / 镜头 / 画面 / 人物 / 出场资产 / 动作 / 表情 / 台词 / 心声 / 画外 / 旁白 / 音效 / 光效 / 备注');
    expect(spec).toContain('说话人：“台词”');
    expect(spec).toContain('旁白不带说话人');
    // 【】不再用于台词包装（旧 v3 协议已废弃）
    expect(spec).not.toContain('说话人：【台词】');
  });

  // 上游 novel-to-manga 对照补齐（2026-10-05）：格形语言 / 页级字数 / 跨页轴线
  it('分镜模板：格形结构与页级字数上限，跨页延续首格重复定位', () => {
    const content = RECOMMENDED_TEMPLATES.storyboard!.content;
    const spec = outputFormatSpec('storyboard');
    // 页头枚举与 panel-prompt 的分格结构词表对齐（修掉「分镜阶段选不出不规则主从格」的口径断层）
    // 2026-10-05 扩表：4 格不再一律「不规则主从格」，补 跨栏主格 / 左右分栏，2 格补 上下错位双格，3 格补 一主两辅
    // 2026-10-05 二次扩表：用户否决「条带连打」（等占比窄条沿同一条页边平铺），换成悬浮类结构名
    for (const label of ['单格满版', '满版出血', '上下错位双格', '左右双格', '上下双格', '一主两辅', '三格递进', '跨栏主格', '错落浮格', '左右分栏', '不规则主从格', '悬浮散格', '浮格连排', '多格连打']) {
      expect(content, `分镜正文缺少页头结构名：${label}`).toContain(label);
      expect(spec, `分镜格式段缺少页头结构名：${label}`).toContain(label);
    }
    // 被否决的旧结构名必须归零（否则模型仍会选它、排出等宽窄条阵列）
    expect(content).not.toContain('条带连打');
    expect(spec).not.toContain('条带连打');
    // 悬浮散格规则与结构名词表同一份常量，分镜正文与格式段都要带上
    expect(content).toContain(PANEL_FLOAT_RULES);
    expect(content).toContain('不得排成等宽等高、沿同一条页边平铺的窄条阵列');
    expect(spec).toContain('不得排成等宽等高、沿同一条页边平铺的窄条阵列');
    expect(content).toContain('格形本身在叙事');
    expect(content).toContain('斜切格只用于冲击且整页最多一处');
    // 页级字数：单格 ≤ 20 / 单格满版 ≤ 30 / 每页台词+旁白合计 ≤ 60
    expect(content).toContain('每格 ≤ 20 字');
    expect(content).toContain('每页「台词 + 旁白」合计 ≤ 60 字');
    expect(spec).toContain('每页「台词 + 旁白」合计不超过 60 字');
    // 跨页轴线（原先只有页内两条）
    expect(content).toContain('跨页延续');
    expect(content).toContain('本页第一格必须重复定位信息');
    // 页尾钩子刻意不写进分镜：备注会被 cellScanText 扫描，钩子提到角色名会误报「未绑定」
    expect(content).not.toContain('页尾钩子');
    expect(spec).not.toContain('页尾钩子');
  });

  // 上游 novel-to-manga 对照补齐（2026-10-05）：动态版式 + 文字铁律 + 反 AI 味 + 页尾钩子
  it('画面描述模板：动态版式、文字铁律、反 AI 味与页尾钩子（两份同源）', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      // 动态版式硬性：禁整齐 2×2 / 大小差 / 错位格底 / 出血 / splash 稀缺
      expect(content).toContain('禁止等宽等高的整齐方格阵列');
      expect(content).toContain('4%~8%');
      expect(content).toContain('出血到页缘');
      expect(content).toContain('单格满版是稀缺资源');
      // 页尾钩子（条漫「继续往下滑」）——归画面描述层，靠构图而非改台词
      expect(content).toContain('页尾钩子');
      expect(content).toContain('不要把情绪收干净');
      expect(content).toContain('不改动也不删减给定的台词与旁白文字');
      // 2026-10-07：章末页强化（本章最后一镜是追更/付费卡点，比普通页高一档）
      expect(content).toContain('章末页强化');
      expect(content).toContain('章末页要再高一档');
      expect(content).toContain('清单里的最后一镜就是章末页');
      expect(content).toContain('不要每页都上最强悬念');
      expect(content).toContain('绝不允许在本页把情绪或事件收干净');
      // 跨镜延续时首格重复定位
      expect(content).toContain('本镜第一格必须重复定位信息');
      // 文字铁律：单泡字数 / 手写感笔迹 / 可读优先
      expect(content).toContain('单个气泡内文字尽量 ≤ 12 字');
      expect(content).toContain('手写感笔迹');
      expect(content).toContain('不要印刷体');
      expect(content).toContain('文字的清晰可读优先级最高');
      // 反 AI 味：非居中构图 + 不完美细节 + 不重复描述媒介质感（那是共用属性块的职责）
      expect(content).toContain('【反 AI 味】');
      expect(content).toContain('非居中构图');
      expect(content).toContain('至少给 2 处不完美');
      expect(content).toContain('重复描述会互相打架');
    }
    // 格式段硬约束（两份同源）：章末页 + 「不要把这句判断写进输出」（防变成新的固定尾段）
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const spec = outputFormatSpec(type);
      expect(spec).toContain('章末页（本章最后一个分镜）的最后 1~2 格必须写成最强悬念');
      expect(spec).toContain('禁止收束式画面（情绪落地、事情讲完、平静空镜）');
      expect(spec).toContain('不要把这句判断写进输出');
    }
    // 分镜模板仍然不碰钩子：待在这里会触碰「备注被绑定扫描」的已知坑
    const storyboard = RECOMMENDED_TEMPLATES.storyboard!.content;
    expect(storyboard).not.toContain('章末页强化');
    expect(storyboard).not.toContain('页尾钩子');
  });

  it('资产提取格式说明：三级标题结构与解析器对齐', () => {
    const spec = outputFormatSpec('extract');
    expect(spec).toContain('# 人物、# 场景、# 道具');
    expect(spec).toContain('## 资产名称');
    expect(spec).toContain('### 视觉状态：状态名');
    expect(spec).toContain('状态标签、视觉描述、剧情锚点');
    expect(spec).not.toContain('{{章节原文}}');
    expect(spec).not.toContain('{{原文分析}}');
    const recommended = RECOMMENDED_TEMPLATES.extract?.content ?? '';
    expect(recommended).toContain('少年时期·回忆校服');
    expect(recommended).toContain('完好/损坏');
    expect(recommended).toContain('必须完整阅读【章节原文】【原文分析】【漫画剧本】【已有资产】四部分');
    expect(recommended).toContain('漫画是否采用及出场范围以【漫画剧本】为准');
    expect(recommended).toContain('客观视觉细节以【章节原文】为准');
    expect(recommended).toContain('实体归属和既有状态命名以【已有资产】为准');
    // 2026-10-05：角色设定只管当前环节，不再向后看
    expect(recommended).not.toContain('不是最终绘画提示词');
    expect(recommended).not.toContain('供后续');
    expect(recommended).not.toContain('画面描述环节');
    // 新口径（2026-09-26）：全维度脑补 + 共享空间地图，取代旧的「不脑补、不要求尺寸」口径
    expect(recommended).not.toContain('不得脑补');
    expect(recommended).not.toContain('不要求坐标、米数或十个视角');
    expect(recommended).toContain('脑补原则：全维度填充');
    expect(recommended).toContain('零矛盾');
    expect(recommended).toContain('共享空间地图');
    expect(recommended).toContain('皮肤质感与瑕疵');
    expect(recommended).toContain('禁止「完美无瑕」');
    expect(recommended).toContain('9 个维度');
    expect(recommended).toContain('6 维物理描述');
    expect(recommended).toContain('瓷娃娃肌');
    expect(recommended).toContain('一个真实对象只建立一个资产实体');
    expect(recommended).toContain('如果不单独提供该状态，生图是否会把人物的时期或服装画错');
    // 状态口径（2026-09-26 二次收敛）：状态只用于人物时期/服装大跨度，场景/道具只输出一个状态
    expect(recommended).toContain('视觉状态拆分门槛：只用于人物，跨度要明显');
    expect(recommended).toContain('单个人物通常 ≤3 个状态');
    expect(recommended).toContain('指甲刺伤掌心」写进人物默认状态的一句视觉描述即可');
    expect(recommended).toContain('场景只输出一个视觉状态');
    expect(recommended).toContain('道具只输出一个视觉状态');
    expect(recommended).toContain('一闪而过');
    expect(recommended).toContain('一次性出现的台词、数值、测验结果');
    expect(recommended.match(/\{\{章节原文\}\}/g)?.length).toBe(1);
    expect(recommended.match(/\{\{原文分析\}\}/g)?.length).toBe(1);
    expect(recommended.match(/\{\{漫画剧本\}\}/g)?.length).toBe(1);
    expect(recommended.match(/\{\{已有资产\}\}/g)?.length).toBe(1);
  });

  // 上游 novel-to-manga 对照补齐（2026-10-05）：识别锚点 / 剪影体型差 / 时代地域锚点 / 道具各面
  it('资产提取模板：补齐识别锚点、剪影体型差、时代地域锚点与道具各面', () => {
    const recommended = RECOMMENDED_TEMPLATES.extract?.content ?? '';
    // 识别锚点：写进资产「描述」，2~5 个，「多于 5 个模型记不住」
    expect(recommended).toContain('识别锚点');
    expect(recommended).toContain('2~5 个');
    expect(recommended).toContain('多于 5 个模型记不住');
    expect(recommended).toContain('只要求够辨认、可画');
    // 剪影可辨 + 本章内体型错开
    expect(recommended).toContain('剪影可辨与体型差');
    expect(recommended).toContain('涂成纯黑剪影');
    expect(recommended).toContain('身高、体型');
    // 场景时代地域锚点（防日式教室穿帮）
    expect(recommended).toContain('时代地域锚点');
    expect(recommended).toContain('标志性物件清单');
    expect(recommended).toContain('日式木地板教室');
    // 道具各面可画（下游按多视图设定版式出图）
    expect(recommended).toContain('各个面');
    expect(recommended).toContain('正面、侧面、俯视');
    // 格式段硬约束与正文同源（两处同改红线）
    const spec = outputFormatSpec('extract');
    expect(spec).toContain('「描述」必须写明');
    expect(spec).toContain('识别锚点');
    expect(spec).toContain('时代与地域');
    // 2026-10-07 口径修正：不是「性格」，是「气质」（用户实报）。
    // 拆成两处落点——基调词写资产级字段行，静态落点写「描述」第 3 维（面部张力）
    expect(recommended).toContain('气质（人物专属）');
    expect(recommended).toContain('气质必须在脸上看得见');
    expect(recommended).toContain('气质三禁');
    expect(recommended).toContain('场景与道具不写气质');
    expect(recommended).toContain('不得混进状态「视觉描述」的外观项');
    expect(spec).toContain('人物必须再补一行气质');
    expect(spec).toContain('不得写进「视觉描述」');
    // 「性格」这个词在资产模板里必须归零（口径已修正为气质）
    expect(recommended).not.toContain('性格');
    // 面部张力并入第 3 维，脸型维补颧骨与下颌（骨相可画性）
    expect(recommended).toContain('五官特征与面部张力');
    expect(recommended).toContain('颧骨的高低与位置');
    expect(recommended).toContain('咬肌与下颌放松还是绷住');
    // 人物差异矩阵：同章主要人物两两至少 5 维明显不同（防全员同脸）
    expect(recommended).toContain('人物差异矩阵');
    expect(recommended).toContain('至少 5 个维度');
    expect(recommended).toContain('鹅蛋脸＋黑色直发＋大眼睛＋高鼻梁＋中性表情');
    expect(recommended).toContain('撞脸或撞剪影');
    // 脑补的取舍顺序（气质优先于骨相与配色）
    expect(recommended).toContain('补全的取舍顺序');
    expect(recommended).toContain('气质** → **识别锚点**');
  });

  // 2026-10-07：模板重构成「资产设定稿」——清单给事实骨架，笼统/缺失维度补全到可画精度
  it('资产绘画提示词模板：清单优先 + 脑补补全，人物六层维度写全', () => {
    const recommended = RECOMMENDED_TEMPLATES['asset-prompt']?.content ?? '';
    // 角色定位从「转译器」升级为「设定稿撰写者」
    expect(recommended).toContain('资产设定稿撰写者');
    expect(recommended).toContain('把设定补全成成稿');
    // 清单四个字段各有归属，模型才知道读哪里（固定特征/属性字段此前从未在模板里说明过）
    expect(recommended).toContain('【清单怎么读】');
    for (const field of ['固定特征', '资产描述', '属性字段', '视觉描述']) {
      expect(recommended, `清单字段说明缺失：${field}`).toContain(field);
    }
    expect(recommended).toContain('开头必写、逐字保留');
    // 脑补补全三档分寸必须显式分级（用户要求：变量之外可自行设计出来）
    expect(recommended).toContain('【清单优先，脑补补全】');
    for (const tier of ['**必须补全**', '**克制补全**', '**禁止补全**']) {
      expect(recommended, `补全分寸缺失：${tier}`).toContain(tier);
    }
    // 脑补的边界：零矛盾优先于丰富；强身份特征跨状态必须共用同一套取值
    expect(recommended).toContain('零矛盾是底线');
    expect(recommended).toContain('同一资产的所有状态必须共用同一套取值');
    expect(recommended).toContain('跨状态一致');
    expect(recommended).toContain('新增清单外实体');
    // 人物六层维度（用户明确要求：性别、年龄、身高＋外貌特征＋详细服装）
    for (const layer of ['性别与年龄段', '身高与体型', '外貌特征', '识别锚点', '详细服装', '妆造与长期配饰']) {
      expect(recommended, `人物维度缺失：${layer}`).toContain(layer);
    }
    expect(recommended).toContain('款式＋颜色＋材质＋版型＋装饰细节');
    expect(recommended).toContain('不许只写「一件外套」了事');
    // 2026-10-07：气质要落成**看得见的静态生理结构**（眉眼/唇角/咬肌下颌/目光），不许写成情绪
    expect(recommended).toContain('人物要带出气质');
    expect(recommended).toContain('看得见的静态生理结构');
    expect(recommended).toContain('咬肌与下颌');
    expect(recommended).toContain('不是情绪');
    expect(recommended).toContain('人物的「气质」也在这里');
    expect(recommended).not.toContain('性格');
    // 补全方案打架时的裁决顺序（照搬 character-casting-studio 的「气质优先」链）
    expect(recommended).toContain('补全的取舍顺序');
    expect(recommended).toContain('硬事实永远第一');
    // 人物骨架的外貌特征层要含颧骨、下颌与面部张力
    expect(recommended).toContain('颧骨高低与下颌线走向');
    expect(recommended).toContain('面部张力（气质的落点）');
    // 场景 / 道具的层次同样点全
    for (const layer of ['空间类型与用途', '时代与地域', '尺度与结构', '使用痕迹', '各面差异', '尺寸与比例参照']) {
      expect(recommended, `场景/道具维度缺失：${layer}`).toContain(layer);
    }
    // 旧口径「清单是唯一事实源、禁止编造」与新规则直接打架 → 必须归零
    for (const stale of ['清单是唯一事实源', '清单没写的特征不要编造', '也不要为「更像真实」而补写', '最小必要补全']) {
      expect(recommended, `旧口径残留：${stale}`).not.toContain(stale);
    }
    // 分工声明必须显式存在，模型才知道哪些内容不归它写
    expect(recommended).toContain('【与共用属性、版式的分工】');
    expect(recommended).toContain('A-POSE');
    // 版式来自生图配置的「版式」设置（按资产类型三段），模板不再自己产出版式
    expect(recommended).toContain('「版式」设置');
    expect(recommended).toContain('「场景」版式会自动跳过这一条');
    // 三类版式声明一律从模板移出（改由「版式」设置按类型拼接）
    for (const banned of ['统一角色设定版式', '统一道具设定版式', '统一空间全景版式', 'establishing shot', '六段骨架', '单件展示版式', '中性 18% 灰哑光背景', '等距并排']) {
      expect(recommended, `模板仍在输出版式声明：${banned}`).not.toContain(banned);
    }
    // 归属措辞不能再把版式/背景/打光说成「共用属性」的事——那是「版式」设置的职责，
    // 写错会让模型误判边界（2026-10-06 修掉四处残留）
    for (const stale of ['共用属性的版式块', '那是共用属性的事', '由共用属性给']) {
      expect(recommended, `模板残留旧归属措辞：${stale}`).not.toContain(stale);
    }
    // 人物只写一次服装（不再为第 2/3/4 格重复同一套衣服）
    expect(recommended).toContain('同一套服装只写一次');
    // 越界项写进正文与自查
    expect(recommended).toContain('姿态与手部动作');
    expect(recommended).toContain('镜头机位');
    expect(recommended).toContain('版式与画格排布');
    // 禁止项：不许写成固定尾段（用户反馈：每条提示词末尾都挂同一段通用禁令清单）
    expect(recommended).toContain('【禁止项】');
    expect(recommended).toContain('不许写成固定尾段');
    expect(recommended).toContain('不要给每条提示词挂同一段通用禁令清单');
    // 反面典型必须留在模板里，模型才知道「那种写法」是被禁的
    expect(recommended).toContain('不得改变 X 配色');
    expect(recommended).toContain('否定句合计');
    // 旧口径（逐条把通用禁令写进每条提示词）必须归零
    expect(recommended).not.toContain('必须逐条以否定句写进每条提示词');
    expect(recommended).toContain('无文字与水印');
    // 去 AI 味：只剩不完美注入（场景门槛更高，3 项）
    expect(recommended).toContain('【去 AI 味】');
    expect(recommended).toContain('场景 ≥3 项');
    // 2026-10-07：删除「每条带 1 个媒介质感锚」——用户实报：生成的每条末尾都是同一句
    // 「带有轻微漫画杂志印刷质感」。媒介质感属全局画风，归共用属性；模板里只准有「不写」的禁令。
    expect(recommended).not.toContain('媒介质感锚');
    expect(recommended).toContain('不写媒介质感与画风词');
    expect(recommended).toContain('去 AI 味的落点是主体自身的具体瑕疵');
    // 禁令不能把「质感标签」原文抄回来（抄了模型就会照写）
    expect(recommended).not.toContain('带有轻微漫画杂志印刷质感');
    expect(recommended).toContain('风格类负面提示词');
    // 角色设定只管当前环节
    expect(recommended).not.toContain('外貌一致性的唯一锚');
    expect(recommended).not.toContain('与后续漫画页质感一致');
    // 格式段与正文同源：都声明「不写版式」，并给出机位图这一唯一例外
    const spec = outputFormatSpec('asset-prompt');
    expect(spec).toContain('版式与画格分工');
    expect(spec).toContain('唯一例外');
  });

  // 2026-10-06：机位图是唯一仍由本环节输出版式的分支（板块里不放它，避免与场景全景版式同拼）
  it('资产绘画提示词模板：机位图版式仍由本环节输出，人物/道具/场景默认版式一律不写', () => {
    const recommended = RECOMMENDED_TEMPLATES['asset-prompt']?.content ?? '';
    // 机位图版式全文保留（含 9 个机位语义与交付命名）
    expect(recommended).toContain('统一机位图版式');
    expect(recommended).toContain('3×3 九宫格');
    expect(recommended).toContain('9 个互不重复的机位');
    for (const machine of ['高位俯视', '正面广角', '左前 45°', '右前 45°', '电影主机位', '反打机位', '内部向外', '侧面横向', '低机位']) {
      expect(recommended, `九宫格缺少机位：${machine}`).toContain(machine);
    }
    expect(recommended).toContain('标志物');
    expect(recommended).toContain('互相自洽');
    expect(recommended).toContain('只改光照');
    expect(recommended).toContain('单字符数字标号');
    expect(recommended).toContain('LOC-');
    expect(recommended).toContain('机位图.png');
    expect(recommended).toContain('由本环节自己输出完整版式');
    // 人物四联版式（参考图可读性的关键规则）已移出模板 → 这些措辞必须归零
    for (const banned of ['四联角色设定图', '1×4 非等宽', '2:3 竖幅', '宽度明显大于后三格', '整张图的脸只出现一次', '头部完全在画幅之外', '颈部中段以下开始', '裁切至锁骨', '刻意的版式', '不是裁切失误', '不要补画头部与五官', '背对镜头、看不到脸', '无缝背景', '伦勃朗光', '45° 侧上方主光', '无文字、无标注', 'FRONT', '附角色基础信息']) {
      expect(recommended, `人物版式仍在模板里：${banned}`).not.toContain(banned);
    }
  });

  // 2026-10-05：两个模板的角色设定只处理当前环节，不描述后续管线
  it('提取与资产提示词模板：角色设定不谈后续环节，状态描述只写自身', () => {
    const extract = RECOMMENDED_TEMPLATES.extract?.content ?? '';
    const assetPrompt = RECOMMENDED_TEMPLATES['asset-prompt']?.content ?? '';
    // 下游词表一律不出现（避免模型把注意力花在后续环节上）
    for (const [name, content] of [['extract', extract], ['asset-prompt', assetPrompt]] as const) {
      for (const banned of ['供后续', '下游', '后续所有分镜', '画面描述环节', '参考图接管', '分镜绑定']) {
        expect(content, `${name} 仍残留下游措辞：${banned}`).not.toContain(banned);
      }
    }
    // 视觉描述只写本状态，不做跨状态比较
    expect(extract).toContain('只写本状态自身的样貌');
    expect(extract).toContain('不与其他状态作任何比较');
    expect(extract).not.toContain('与其他状态差异');
    expect(outputFormatSpec('extract')).not.toContain('与其他状态差异');
    expect(outputFormatSpec('extract')).toContain('不得与其他状态作横向比较');
    // 多视图排布不归本环节写（机位图版式是唯一例外）
    expect(assetPrompt).toContain('不写多视图排布');
  });

  // 2026-10-05 三轮收敛：格数上限放宽到 8 + 叙事页/连打页双模式 + 信息取舍（分镜层）
  it('分镜模板：8 格硬上限、叙事页/连打页双模式与信息取舍规则', () => {
    const content = RECOMMENDED_TEMPLATES.storyboard!.content;
    const spec = outputFormatSpec('storyboard');
    // 硬上限必须写死，否则与「一格里只放一个角色的台词」自相矛盾
    expect(content).toContain('8 格是硬上限');
    expect(content).toContain('超过 8 个信息单元就拆页');
    expect(content).toContain('先把「反应格 + POV 格」拆到新的一页');
    expect(content).toContain('格数分配');
    expect(content).toContain('信息爆点');
    // 正文与格式段两处同改
    expect(spec).toContain('8 格为硬上限');
    expect(spec).toContain('超出必须拆页');
    // 双模式：叙事页 1~4 / 连打页 5~8，且连打页不得塞对话
    expect(content).toContain('叙事页');
    expect(content).toContain('连打页不得塞入对话往返');
    expect(spec).toContain('5~8 格为连打页');
    // 信息取舍：心理→特写/旁白、环境→压缩、伏笔动作单独成格
    expect(content).toContain('【信息取舍】');
    expect(content).toContain('转成表情特写格');
    expect(content).toContain('压缩成 1~2 个场景格');
    expect(content).toContain('伏笔的「埋」与「收」动作必须各占一格');
  });

  // 2026-10-05 三轮收敛：连打页写法（5~8 格）—— 逐格时间差 / 特写连打 / 冲击主格 / 文字极简
  it('分镜模板：连打页小节（逐格时间差、特写连打、冲击主格、文字极简）', () => {
    const content = RECOMMENDED_TEMPLATES.storyboard!.content;
    expect(content).toContain('【连打页怎么写】');
    // 逐格只推进一个极小时间差
    expect(content).toContain('每一格只推进一个极小的时间差');
    // 景别以特写/POV/近景为主 + POV 必须拆两格
    expect(content).toContain('景别以 特写 / POV / 近景 为主');
    expect(content).toContain('POV 必须拆成两格');
    // 冲击主格
    expect(content).toContain('冲击主格');
    // 文字极简 + 字数上限（正文与格式段两处同改）
    expect(content).toContain('文字极简');
    expect(content).toContain('连打页每格 ≤ 12 字');
    expect(content).toContain('连打页不超过 12 字');
    // 占比约束
    expect(content).toContain('全章建议 ≤ 20%');
  });

  // 2026-10-07：全章「台词 + 旁白」要能连读成一条故事线（叙事连贯）
  it('分镜模板：叙事连贯——三类断层用衔接旁白过桥，主线落在文字上', () => {
    const content = RECOMMENDED_TEMPLATES.storyboard!.content;
    const spec = outputFormatSpec('storyboard');
    // 新小节 + 判定标准
    expect(content).toContain('【叙事连贯】');
    expect(content).toContain('连起来，必须是一条能独立看懂的故事线');
    // 三类断层（时间／地点／视角）必须用旁白过桥
    expect(content).toContain('时间跨越');
    expect(content).toContain('地点转移');
    expect(content).toContain('视角切换');
    expect(content).toContain('衔接旁白');
    // 取材于剧本场景头、只交代跨度不写剧情
    expect(content).toContain('取材只允许来自剧本的场景头');
    expect(content).toContain('只交代跨度，不写剧情');
    // 主线落在文字上 + 不许复述
    expect(content).toContain('主线必须落在文字上');
    expect(content).toContain('不许复述');
    // 不是每页都写（防固定尾段）+ 自检不写进输出
    expect(content).toContain('只在断层处补，不是每页都写');
    expect(content).toContain('不要为了「连贯」给每一页挂一条旁白');
    expect(content).toContain('不要写进任何一格的输出');
    // 旁白两种职责 + 台词承载主线
    expect(content).toContain('两种职责、两个来源');
    expect(content).toContain('原文旁白');
    expect(content).toContain('台词是故事主线的主要载体');
    // 格式段（硬约束）与正文同源
    expect(spec).toContain('连起来必须是一条能独立看懂的故事线');
    expect(spec).toContain('不要把这条自检写进逐格输出行');
    // 回归守卫：衔接旁白不引入分镜层「页尾钩子」
    expect(content).not.toContain('页尾钩子');
    expect(spec).not.toContain('页尾钩子');
  });

  // 2026-10-05 三轮收敛：画面描述层为连打页补节奏排布 + 气泡字数随格数收紧（两份同源）
  it('画面描述模板：连打页节奏排布与气泡字数收敛（两份同源）', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      // 连打页走悬浮散格：格子尺寸与水平位置逐格变化，冲击格放大（旧的「平均分配格高」说法已废弃）
      expect(content).toContain('5 格以上的连打页');
      expect(content).toContain('优先用悬浮散格');
      expect(content).toContain('冲击格明显放大并对准动作顶点');
      expect(content).toContain('不要沿同一条页边平铺成一列等宽窄条');
      // 格数 ≥5 时逐格声明阅读顺序
      expect(content).toContain('格数 ≥5 时必须逐格写明');
      // 气泡字数随格数收紧
      expect(content).toContain('连打页气泡控制在 ≤ 8 字');
    }
  });

  // 2026-10-05：统一「本格无文字」的终止符 —— 正文原写「无文字」，与格式段/写作要求的
  // 「文字元素：无」不一致，模型会在两个 token 之间摇摆，导致输出形态不定。
  // 2026-10-05 三轮：「文字气泡」升级为「文字元素」（含 音效 艺术字，不再只是气泡）。
  it('画面描述模板：本格无文字的终止符统一为「文字元素：无」（两份同源）', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      const spec = outputFormatSpec(type);
      expect(content).not.toContain('写「无文字」');
      expect(content).toContain('本格没有任何文字元素时整段写「文字元素：无」');
      // 正文与格式段必须写同一个 token
      expect(spec).toContain('文字元素：无');
      // 旧 token 必须归零（两份模板都不许残留）
      // 2026-10-05：节标题原叫「漫画表现元素」、输出行叫「表现元素：」—— 同一模板两个 token 会让模型摇摆，
      // 已统一为「表现元素」（情绪背景也并进这一行），正文与格式段一起归零。
      for (const dead of ['文字气泡：无', '本格没有文字的写', '页面结构：', '漫画表现元素']) {
        expect(content, `${type} 仍残留旧 token：${dead}`).not.toContain(dead);
      }
      // 正文与格式段必须写同一个 token（节标题 ↔ 输出行标签）
      expect(content).toContain('【表现元素】');
      expect(content).toContain('表现元素：');
      expect(spec).toContain('表现元素：');
      // 格式段：旧 token 全清
      for (const dead of ['文字气泡：无', '页面结构：', '漫画表现元素']) {
        expect(spec, `${type} 格式段仍残留旧 token：${dead}`).not.toContain(dead);
      }
    }
  });

  // 2026-10-05 二轮收敛：版式声明具体化 / 阅读顺序 / 文字铁律 / 禁止项 / 写法原则（画面描述层）
  it('画面描述模板：版式声明具体化、阅读顺序、文字铁律、禁止项与写法原则（两份同源）', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      // 版式声明必须写成具体布局语言，不能只抄结构名
      expect(content).toContain('具体的布局语言');
      expect(content).toContain('只抄结构名不算落地');
      // 阅读顺序声明（不规则布局必须写）
      expect(content).toContain('阅读顺序不能乱');
      expect(content).toContain('阅读顺序：自上而下、自左而右');
      // 视线方向决定气泡顺序
      expect(content).toContain('人物视线方向决定台词气泡的先后与摆放');
      // 文字铁律：唯一允许的文字 + 禁止编号/水印
      expect(content).toContain('【文字铁律】');
      expect(content).toContain('唯一允许出现的文字');
      expect(content).toContain('不得出现任何编号或序号');
      expect(content).toContain('水印、签名、作者名、页码');
      // 禁止项（2026-10-07：只禁「剧情角色」，给群众/背景让路）
      expect(content).toContain('【禁止项】');
      expect(content).toContain('不得添加分镜之外的**剧情角色**');
      expect(content).toContain('不得改动分镜声明的格数、格序、主格位置');
      // 写法原则（信噪比）
      expect(content).toContain('【写法原则】');
      expect(content).toContain('肯定句为主');
      expect(content).toContain('最多 1 条');
      // 情绪必须落成可画的动作，不写抽象情绪词
      expect(content).toContain('情绪一律落成可见的肢体与表情动作');
      expect(content).toContain('不写「在说话」「很难过」');
      // 格式段同步：页面结构行要补布局与阅读顺序，且限定画面文字边界
      const format = outputFormatSpec(type);
      expect(format).toContain('具体的布局语言');
      expect(format).toContain('阅读顺序：自上而下、自左而右');
      expect(format).toContain('画面上唯一允许出现的文字');
      expect(format).toContain('不得出现编号、序号、水印、签名');
    }
  });

  // 2026-10-05 四轮：漫画排版（不规则分栏）+ 气泡形状与放置规则 + 情绪背景
  //（用户给了参考条漫页与一份期望的输出样例，据此定稿）
  it('画面描述模板：不规则版面、气泡形状与放置规则、情绪背景（两份同源，且与分镜词表同源）', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      const format = outputFormatSpec(type);
      // 版面段：用户样例的输出形状
      expect(content).toContain('第一行写「版面：」');
      expect(content).toContain('表现元素：');
      expect(content).toContain('文字元素：');
      // 分栏分组（用户样例：左栏 4 格堆叠 + 右栏 1 格贯通整栏）
      expect(content).toContain('左栏分镜：');
      expect(content).toContain('右栏分镜：');
      expect(content).toContain('格号跨栏连续');
      // 结构名 → 排布语义：必须与 storyboard 同一份常量（「分镜选的名字画面层认不出」是老病）
      expect(content).toContain(PANEL_STRUCTURE_SEMANTICS);
      expect(content).toContain(PANEL_LAYOUT_RULES);
      // 悬浮散格规则：与 storyboard 同一份常量（多格页默认不拼满整页）
      expect(content).toContain(PANEL_FLOAT_RULES);
      expect(content).toContain('跨栏主格');
      expect(content).toContain('左右分栏');
      expect(content).toContain('悬浮散格');
      expect(content).not.toContain('条带连打');
      // 版面展开必须交代「哪些格不占满页宽 / 落在左中右哪一处 / 谁压住谁」，且不许写成等宽窄条阵列
      expect(format).toContain('哪些格不占满页宽');
      expect(format).toContain('等宽窄条阵列');
      // 气泡形状承载情绪
      expect(content).toContain('气泡形状本身就在传情绪');
      for (const shape of ['锯齿尖角', '虚线或抖动的细边气泡', '云朵边', '方角矩形框', '小圆点']) {
        expect(content, `气泡形态缺失：${shape}`).toContain(shape);
      }
      // 放置规则（顺序 / 避让 / 溢出 / 引流）
      expect(content).toContain('从上到下、从左到右');
      expect(content).toContain('一格最多 3 个气泡');
      expect(content).toContain('不超过该格的 1/3');
      expect(content).toContain('绝不遮挡角色的');
      expect(content).toContain('眼睛与脸部表情');
      expect(content).toContain('气泡可以溢出格线');
      expect(content).toContain('用气泡把视线引向下一格');
      expect(content).toContain('沉默格');
      // 情绪背景
      expect(content).toContain('【情绪背景】');
      expect(content).toContain('情绪焦点格');
      expect(content).toContain('同一页最多 1~2 格');
      expect(content).toContain('把写实背景整体替换');
      expect(content).toContain('闪亮粉色');
      // 情绪背景属于表现元素：必须写明它落到哪一行（否则模型会单开一段、漏进最终提示词）
      expect(content).toContain('情绪背景属于表现元素');
      expect(content).toContain('写进该格的「表现元素：」行');
      // 格式段同步
      expect(format).toContain('左栏分镜：');
      expect(format).toContain('文字元素：');
      expect(format).toContain('对话气泡／内心气泡／旁白框／说明框／音效');
    }
    // 四份模板共用同一份结构名词表（不是各写一份；旧词表只有 6 个名字、4 格一律「不规则主从格」）
    const storyboard = RECOMMENDED_TEMPLATES.storyboard!.content;
    expect(storyboard).toContain(PANEL_STRUCTURE_NAMES);
    expect(storyboard).toContain(PANEL_STRUCTURE_SEMANTICS);
    expect(storyboard).toContain(PANEL_LAYOUT_RULES);
    expect(outputFormatSpec('storyboard')).toContain(PANEL_STRUCTURE_NAMES);
    // 排版要有变化，不能再通篇同样的格子
    expect(storyboard).toContain('同一章内相邻两页不要用同一个结构名');
  });

  // 2026-10-05：用户否决「条带连打」（等占比窄条格沿同一条页边平铺，如「1~4 格各占约 12%、沿页面右侧纵向排列」），
  // 改为悬浮散格 —— 格子大小与水平位置逐格变化、左右交替错开、浮在页面上，满宽格与偏窄格交替。
  it('版面模板：多格页走悬浮散格，不再排等宽窄条阵列（四份模板同源）', () => {
    // 规则常量本身：七条硬要求一条不少
    for (const key of [
      '一格不必占满页宽',
      '55%~85%',
      '交替出现',
      '水平起点都要不同',
      '禁止把多格沿同一条页边等距平铺成一列等宽窄条',
      '局部叠压',
      'POV、特写、反应格优先做成偏窄的悬浮格',
    ]) {
      expect(PANEL_FLOAT_RULES, `悬浮散格规则缺少：${key}`).toContain(key);
    }
    // 词表：旧名归零，新名接位
    expect(PANEL_STRUCTURE_NAMES).not.toContain('条带连打');
    for (const label of ['悬浮散格', '浮格连排', '错落浮格']) {
      expect(PANEL_STRUCTURE_NAMES, `结构名词表缺少：${label}`).toContain(label);
      expect(PANEL_STRUCTURE_SEMANTICS, `结构名语义缺少：${label}`).toContain(label);
    }
    // 语义里要逐条交代「不占满页宽」这个新维度
    expect(PANEL_STRUCTURE_SEMANTICS).toContain('不占满页宽');
    expect(PANEL_STRUCTURE_SEMANTICS).toContain('分散浮在页面上');
    // 连打页段落跟着改口（旧写法是「连续小格 + 沿动作方向依次递进」＝条带）
    const storyboard = RECOMMENDED_TEMPLATES.storyboard!.content;
    expect(storyboard).toContain('跟着主格分散错落');
    expect(storyboard).not.toContain('条带连打');
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      expect(content, `${type} 仍残留条带式排布描述`).not.toContain('沿动作方向依次递进');
      expect(content, `${type} 未带上悬浮散格规则`).toContain(PANEL_FLOAT_RULES);
    }
  });

  // 2026-10-05 用户实报：产出里出现「萧媚视线方向用一条极淡的细引导线穿过人群，指向画面右远处的背影，不压人物面部」。
  // 病根是我上一轮在悬浮规则里写了「格与格之间可用一条细引导线、视线或气尾串起阅读路径」——
  // 漫画里没有画在画面上的引导线，阅读引导只靠构图、视线方向、气尾指向与气泡摆放位置完成。
  it('版面模板：不画引导线／指示线／视线连线（四份模板同源，旧措辞归零）', () => {
    // 规则常量：正面禁止 + 旧写法归零
    expect(PANEL_FLOAT_RULES).toContain('不要在画面里画引导线');
    expect(PANEL_FLOAT_RULES).not.toContain('可用一条细引导线');
    expect(PANEL_FLOAT_RULES).not.toContain('串起阅读路径');
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      // 【表现元素】里的硬约束
      expect(content, `${type} 缺少「不画引导线」规则`).toContain('**不画引导线**');
      // 【禁止项】里的禁令
      expect(content, `${type} 禁止项缺少引导线禁令`).toContain('不得出现引导线、指示线、视线连线、指向箭头');
      // 旧措辞归零
      expect(content, `${type} 仍残留旧措辞`).not.toContain('可用一条细引导线');
      // 硬约束不得被要求逐格输出，否则又变成新的固定尾段
      expect(content, `${type} 的引导线约束会被逐格抄进提示词`).toContain('不要写进「表现元素：」行');
    }
  });

  // 2026-10-07 用户实报三件事（画面描述层）：
  // ① 只写「人物低头看手机」→ 生图模型把手机屏幕翻向读者、屏幕内容也画出来：
  //    一个镜头里不可能同时完成「看人」和「看屏幕」，模型只能把屏幕转过来。分镜层本来就要求
  //    「看东西拆两格」，但画面描述层没有任何「物件背面朝外、内容另占 POV 格」的落地口径 → 补上。
  // ② 没有场景的格留空 → 出来是纯色/虚化背景；群众也从来不写。
  // ③ 分镜给足的旁白/台词被漏画 → 补一条「文字零遗漏」下限。
  it('画面描述模板：主观视角、背景与群众补全、文字零遗漏（两份同源）', () => {
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      // 主观视角：与分镜层「看东西拆两格」配套，观看格只画背面/侧缘
      expect(content, `${type} 未带上主观视角规则`).toContain(PANEL_POV_RULES);
      expect(content).toContain('【主观视角】');
      expect(content).toContain('物件只露背面或侧缘');
      expect(content).toContain('屏幕内容、信纸字迹、书页图文一律不画');
      expect(content).toContain('这一格不出现人物的脸和上半身');
      // 不许自行加格——格数/格序由分镜锁定，加格会与页头结构名对不上
      expect(content).toContain('分镜没给 POV 格时不许自己加格');

      // 背景与群众：没有场景的格必须补，群众用群体词一笔带过
      expect(content, `${type} 未带上背景与群众规则`).toContain(PANEL_BACKGROUND_RULES);
      expect(content).toContain('【背景与群众】');
      expect(content).toContain('禁止用「背景虚化」「纯色背景」「无背景」「留白」搪塞');
      expect(content).toContain('群众是背景，不是角色');
      expect(content).toContain('群众一律用**群体词**指代');
      // 禁止项同步放开群众；旧口径「不得添加分镜之外的角色」与补背景直接打架，必须归零
      expect(content).toContain('不得添加分镜之外的**剧情角色**');
      expect(content).toContain('不得给群众与路人起名号');
      expect(content).not.toContain('不得添加分镜之外的角色、道具或场景元素');

      // 文字零遗漏：给定几条就写几条，交付前清点
      expect(content).toContain('给定了几条就输出几条「文字元素」条目');
      expect(content).toContain('**交付前做一次文字清点**');
      // 自检不得被逐格输出（否则又变成新的固定尾段）
      expect(content).toContain('不要写进输出');
      // 旧口径归零：允许按情境补背景之后，「不要补写原文没有的细节」不再成立
      expect(content).not.toContain('不要补写原文没有的细节');
      expect(content).toContain('不要补写原文没有的**剧情**');
      // 第 4 条指向新小节，避免两条 POV 口径各说各话
      expect(content).toContain('POV 内容单独成格（细则见【主观视角】）');
    }

    // 分镜层：POV 拆格是分镜的职责（画面描述不能加格），硬约束与正文同步
    const storyboard = RECOMMENDED_TEMPLATES.storyboard!.content;
    expect(storyboard).toContain('一格「看的动作」');
    expect(storyboard).toContain('一格「看到的内容」');
    expect(storyboard).not.toContain('同时读者也要看到内容');
    const storyboardSpec = outputFormatSpec('storyboard');
    expect(storyboardSpec).toContain('画面只写内容物正面特写');
    expect(storyboardSpec).toContain('不要把这条判断写进输出');

    // 画面描述格式段（硬约束层）：三件事都要有
    for (const type of ['panel-prompt', 'panel-prompt-chapter'] as const) {
      const format = outputFormatSpec(type);
      expect(format).toContain('给定了几条就写几条，一条不少、一字不改');
      expect(format).toContain('没有给出场景的格必须自己补出写实背景');
      expect(format).toContain('观看格只画物件背面或侧缘、不画内容物正面');
    }
  });
});
