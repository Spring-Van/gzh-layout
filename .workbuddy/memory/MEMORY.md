# 项目长期约定 — gzh-layout（漫画/公众号排版工具）

## 浮层 z-index 层级体系（重要，新增弹窗务必对照）

弹窗都用 `fixed inset-0` + `Teleport to="body"`。**层级数值决定谁盖谁**，必须按下面的谱系选值：

| 层级 | 值 | 用途 |
|------|-----|------|
| 局部装饰 | z-10 / z-20 / z-30 | 卡片上的角标、按钮、侧栏 |
| 菜单/下拉 | z-40 | 上下文菜单、页签下拉面板 |
| 常规弹窗 | **z-50** | 默认弹窗（ConfirmDialog 默认值、创建/导入弹窗） |
| 运行栏浮层 | 已被提到 130/131 | PromptRunBar 的模型·模板配置浮层（原 60/70） |
| 抽屉 / 全屏面板 | **z-100（遮罩）/ z-101（面板）** | 资产全屏抽屉、MaterialLibrary、ImageConfigDrawer、AssetImageGenDrawer 原值 |
| **抽屉内子弹窗** | **z-130（遮罩）/ z-131（面板）** | 在 z-101 抽屉里打开的弹窗必须用这一档 |
| 二次确认（提层） | z-120 | 导入弹窗之上的覆盖确认（LongProject.vue） |
| 大图预览 | **z-200** | ImagePreviewModal / AssetImagePreviewModal（终端视图，最高业务层） |
| 特殊 | z-300 | PageSync |
| Toast | z-9999 | Toast.vue |

**判定规则**：弹窗的 z 值必须**大于其宿主容器**。宿主是普通页面 → z-50 即可；宿主是全屏抽屉（101）→ 必须用 z-130/131；宿主是 130 级弹窗内的子确认框 → 再往上（140+，目前无此场景）。

**踩过的坑**：
1. 资产全屏抽屉（`LongProjectStoryboardTab.vue` 的 `z-[101]`）里打开子弹窗，子弹窗是 z-50 → 被抽屉盖住看不见。已把资产链路 6 个浮层提到 130/131 修复。
2. `.menu-item { color: inherit }` 等 scoped 样式会编译成 `.menu-item[data-v-x]`（特异性 0,2,0），**压过** `text-red-400`（0,1,0）—— 需要颜色时用同层级的自定义类，别用 Tailwind 语义色叠加。
3. 通用组件（如 ManualResultImportDialog）**不能硬提层级**，要加 `zIndexClass` prop 由调用方决定；否则会破坏它在低层级场景（如与其配对的高一层确认弹窗）的表现。

## 长篇故事 · 分镜格式（v4，详见 docs/长篇故事剧本与分镜格式定稿.md）

- 符号规则：分镜格用 `【第X格】`；字段名用 `「XXX」`；冒号后写内容。
- 页头 `## 分镜 N · 双格`，左栏第二行显示解析出的格数标签。
- **入库去包装、出库带包装**：`cell.dialogue/narration` 存裸文本，页级字段喂给画面描述提示词时不带标记。
- 解析器兼容 v4 / v3（`①【镜头】画面` + `说话人：【台词】`）/ v2（`‖`）/ 旧 `- 字段：`。

## 工程校验三件套

改完代码固定跑：`npx vue-tsc --noEmit -p tsconfig.json` → `npx vitest run` → `npx vite build --outDir "D:/<临时目录>" --emptyOutDir`（构建产物要**明确写 Windows 绝对路径**，Git Bash 的 `$TEMP` 会被 vite 解析到 D:\tmp，之后清理不掉）。
