# 项目长期约定 — gzh-layout（漫画/公众号排版工具）

> 主文件只留**口径与红线**，细节按需读专题：
> - `topics/llm-layer.md` — LLM 调用层 / 请求传输层 / 测试连接
> - `topics/asset-pipeline.md` — 资产提取归属匹配 / 确认落库 / 绑定回填 / 提示词协议与解析器 / 8 类模板解析机制 / 引用完整性
> - `topics/binding.md` — 绑定身份与多状态 / 绑定审计与一键补绑 / 描述写入后同步
> - `topics/ref-manifest.md` — 参考图清单与图号口径 / 有效参考图 / 成图口径 / refUsage / 资产配色
> - `topics/panel-prompt.md` — 画面描述管线（模板类型与三层拼接）/「图N = …」产出点 / 中栏资产区 / 批量弹窗与导入入口 / 工件迁移
> - `topics/multi-prompt.md` — 多提示词（候选条）数据模型 / 图号重算 / 写入路径 / 右栏排布 / 实机验收
> - `topics/formats.md` — 输出格式口径（全链路 Markdown v5 / 长篇分镜格式 / 模板约定）
> - `topics/local-debug.md` — 本机调试环境（Bash/PowerShell/Electron/代理/Playwright）/ 工程校验三件套 / 工具用法坑
> - `topics/cleanup.md` — 项目数据清理（级联删除 / 版本压缩）

## 布局与滚动

- `custom-scrollbar` 只改外观不设 `overflow`；能滚三件套：父链一路 `min-h-0` + `flex-1` + `overflow-y-auto`。
- 弹窗统一 `fixed inset-0` + Teleport 到 body；**Teleport 浮层必须自己写 `position: fixed`**。z-index 谱系：z-40 菜单｜**z-50** 常规弹窗｜z-100/101 全屏抽屉｜z-120 覆盖确认｜**z-[130]/z-[131] 抽屉内子弹窗**｜z-140 导入弹窗｜z-200 大图预览｜z-300/9999 PageSync/Toast（Tailwind 裸值 `z-130` 无效）。通用组件用 `zIndexClass` prop。
- 组件 scoped 样式（0,2,0）压过 Tailwind 工具类（0,1,0）—— 局部覆盖必须在 scoped 里写同层级类，且定义在基类之后。

## UI 约定

- **禁止假保存提示**：只有用户主动写入才点亮「已保存✓」。多条目共用卡片实例加 `:key="item.id"`。
- 「在弹窗内」= 同一弹窗同一视图增删内容；换配置不作废输入；多模式状态按模式分开存。
- AI 结果一律人工确认后才写回；有结果未填充时关闭弹窗二次确认。`item.text` / `item.result` 分字段存。
- 主题色：`darkMode: 'class'` + CSS 变量；语义色 `-700 dark:-300`；状态色只加标题元素不加容器；`bg-x/50` 对 `var(--...)` 不生效。
- 左栏分镜列表状态**只反映生图维度**（生图中/生图失败/已成图/未生图）—— 一栏不塞两套状态。
- 用户 UI 偏好：极简风、小圆角 4px、无多余装饰（详见会话记忆）。

## 章节阶段（node.stage）只升不降

`LONG_CHAPTER_STAGE_ORDER`：empty → source-ready → analysis-ready → script-ready → **assets-ready → storyboard-ready** → prompts-ready → completed。统一口径在 `utils/chapterStage.ts`，**任何写 stage 的地方先过这里算目标值**（历史 bug：自动保存把 storyboard-ready 打回 source-ready）。

## 绑定（详见 `topics/binding.md`）

- 身份键 `(assetId ?? 归一名) :: (visualVersionId ?? '')`；页级与格级都允许同资产多状态。**manual 是用户锚点**但绑定以文本为事实来源；写库统一走 `LongProjectStoryboardTab.applyBindingFix`；唯一扫描口径 `bindingScanPrompt(artwork?)`；写描述的四条路径必须走 `syncBindingsAfterPromptWrite`。
- **分镜文本 = 原文（blockText）**：`panel.blockText` 是页块文本唯一事实来源，程序唯一能改的是「出场资产：」行（`patchBlockTextAssetLines`）；文本格数与 cells 对不上时整体跳过回写。

## 中断恢复：每个「先落 running 再回写」的环节都要有 recover

分镜（`useStoryboardRun.recoverInterrupted`）、文档（`useChapterDocRun`）、资产提取（`LongProject.vue:recoverAssetExtraction`）三处。漏掉的后果是 `PromptRunBar :disabled` 硬锁死。新增同类环节照此办理。

## 持久化：数据在两层，写哪一层别看错

- **项目根（`ComicProject`）**：`imageGenConfig`（分镜绘图）、`assetGenConfig`（资产生图，与分镜**数据不互通**）、`comicConfig` 与元信息 → 写 **`mutateProject`**。
- **`longProjectData`**：节点树 / 资产 / 章节资产 / 分镜版本 / 画面工件 / 提取记录 / 分析 / 剧本 → 写 `mutateLongProjectData`。
- ⚠️ 用错会出现「DB 写了但页面不刷新」的假成功。

## 时间戳语义：判断「内容变过」只能用 createdAt

`updatedAt` 会被绑定重算 / 悬空修复 / 覆盖确认反复推高，拿它比对必然误判。分镜页 `assetsChangedAfterStoryboard` 用 `run.createdAt`。一键重推必须复用顶栏链路，不要另写生成逻辑。

## 输出格式与模板（详见 `topics/formats.md`）

- **全链路输出语法统一为 Markdown**（`#` 标题 + `- 字段：内容`），**解析器保持专用**，禁止过度抽象。
- **能被用户改的拼法必须以用户模板存在**；推荐模板只作新建底稿，**不做「模板缺失时内置兜底」**。
- 长篇分镜：页头 `## 分镜 N · 双格`、格 `### 第X格`、字段 `- 字段名：内容`；**入库去包装、出库带包装**。
