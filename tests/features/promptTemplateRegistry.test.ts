import { describe, expect, it } from 'vitest';
import {
  LONG_STORY_TEMPLATE_TYPES,
  OUTPUT_FORMAT_SPECS,
  PANEL_FLOAT_RULES,
  PANEL_LAYOUT_RULES,
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
  });

  // 上游 novel-to-manga 对照补齐（2026-10-05）：道具设定版式 + 禁止项 + 去 AI 味
  it('资产绘画提示词模板：道具设定版式、禁止项与去 AI 味', () => {
    const recommended = RECOMMENDED_TEMPLATES['asset-prompt']?.content ?? '';
    // 三种版式齐备，道具从「单件展示」升级为「多视图设定版式」
    expect(recommended).toContain('角色设定版式');
    expect(recommended).toContain('空间全景版式');
    expect(recommended).toContain('道具设定版式');
    expect(recommended).not.toContain('单件展示版式');
    expect(recommended).toContain('中性 18% 灰哑光背景');
    expect(recommended).toContain('等距并排');
    expect(recommended).toContain('不出现人物');
    expect(recommended).toContain('不出现手持动作');
    // 禁止项：不许写成固定尾段（用户反馈：每条提示词末尾都挂同一段通用禁令清单）
    expect(recommended).toContain('【禁止项】');
    expect(recommended).toContain('不许写成固定尾段');
    expect(recommended).toContain('不要给每条提示词挂同一段通用禁令清单');
    // 反面典型必须留在模板里，模型才知道「那种写法」是被禁的
    expect(recommended).toContain('不得改变 X 配色');
    expect(recommended).toContain('否定句合计');
    // 旧口径（逐条把通用禁令写进每条提示词）必须归零
    expect(recommended).not.toContain('必须逐条以否定句写进每条提示词');
    // 必要条件改为并进版式声明
    expect(recommended).toContain('画面只有本角色与四个画格');
    expect(recommended).toContain('无文字与水印');
    // 去 AI 味：不完美注入（场景门槛更高，3 项）+ 媒介质感锚
    expect(recommended).toContain('【去 AI 味】');
    expect(recommended).toContain('场景 ≥3 项');
    expect(recommended).toContain('媒介质感锚');
    // 「不写风格类负面提示词」与「版式声明里的画面内容描述例外」并存
    expect(recommended).toContain('风格类负面提示词');
    // 2026-10-05：场景两种版式（全景 establishing shot + 3×3 九宫格机位图）+ 六段骨架
    expect(recommended).toContain('六段骨架');
    expect(recommended).toContain('establishing shot');
    expect(recommended).toContain('九宫格机位图版式');
    expect(recommended).toContain('3×3 九宫格');
    expect(recommended).toContain('9 个互不重复的机位');
    for (const machine of ['高位俯视', '正面广角', '左前 45°', '右前 45°', '电影主机位', '反打机位', '内部向外', '侧面横向', '低机位']) {
      expect(recommended, `九宫格缺少机位：${machine}`).toContain(machine);
    }
    expect(recommended).toContain('标志物');
    expect(recommended).toContain('互相自洽');
    // 时段变体只改光照、空间结构不变
    expect(recommended).toContain('只改光照');
    // 视图标号仍要放行（否则九宫格/三视图的 1–9 标号被自己禁掉）——现在写在版式声明里
    expect(recommended).toContain('单字符数字标号');
    expect(recommended).toContain('视图标号');
    // 机位图交付命名固定，跨章复用同一套机位资料时靠它区分全景图
    expect(recommended).toContain('LOC-');
    expect(recommended).toContain('机位图.png');
    // 角色设定只管当前环节
    expect(recommended).not.toContain('外貌一致性的唯一锚');
    expect(recommended).not.toContain('与后续漫画页质感一致');
  });

  // 2026-10-05：人物四联设定图 —— 整张图只保留一处高分辨率人脸（参考图可读性的关键）
  it('资产绘画提示词模板：人物四联设定图只保留一处人脸，远景格裁掉头部', () => {
    const recommended = RECOMMENDED_TEMPLATES['asset-prompt']?.content ?? '';
    // 四联非等宽排版 + 第 1 格 2:3 竖幅
    expect(recommended).toContain('四联角色设定图');
    expect(recommended).toContain('1×4 非等宽');
    expect(recommended).toContain('2:3 竖幅');
    expect(recommended).toContain('宽度明显大于后三格');
    // 核心机制：脸只出现一次，远景格把画幅让给服装
    expect(recommended).toContain('整张图的脸只出现一次');
    expect(recommended).toContain('头部完全在画幅之外');
    expect(recommended).toContain('颈部中段以下开始');
    expect(recommended).toContain('裁切至锁骨');
    // 关键：必须告诉模型这是刻意的，否则它会「补全」头部
    expect(recommended).toContain('刻意的版式');
    expect(recommended).toContain('不是裁切失误');
    expect(recommended).toContain('不要补画头部与五官');
    // 第 4 格保留头部但背对镜头（后脑与发型背面资料）
    expect(recommended).toContain('背对镜头、看不到脸');
    // 影棚中性灰无缝背景 + 伦勃朗光（光线方向明确写死）
    expect(recommended).toContain('无缝背景');
    expect(recommended).toContain('伦勃朗光');
    expect(recommended).toContain('45° 侧上方主光');
    // 无文字无标注：旧版的「基础信息卡」「FRONT/SIDE/BACK 标志」已删除
    expect(recommended).toContain('无文字、无标注');
    expect(recommended).not.toContain('FRONT');
    expect(recommended).not.toContain('附角色基础信息');
    // 自查同步到新版式
    expect(recommended).toContain('第 2／3 格头部在画幅之外');
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
    // 多视角禁令必须给机位图让路，否则两条规则互锁
    expect(assetPrompt).toContain('多视图只在版式本身要求时出现');
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
      // 禁止项
      expect(content).toContain('【禁止项】');
      expect(content).toContain('不得添加分镜之外的角色');
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
});
