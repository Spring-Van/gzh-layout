# 专题：参考图清单 · 图号口径 · 资产配色（漫画长篇项目）

> 从 MEMORY.md 拆出（2026-09-23）。主文件只留指针。

## 一、参考图清单 = 全项目唯一图号来源

`services/panelRefManifest.ts` 的 `buildPanelRefManifest()`。编号顺序：前置共用属性图（sortOrder→上传序）→ 人物 → 场景 → 道具；「插入最后」的块不参与取图与编号；不截断；纯函数实时算。不变式：`images[i]` 就是「图 i+1」。消费方四处统一：panelRefImages / currentRefGroups / 画面描述变量 / assetUsageService 角标。

## 二、有效参考图口径（2026-09-23 定稿）

`effectiveVariantRefImages(variant)` = **生成图 + 自上传成品图**（`generatedImageIds` + `uploadedImageIds`）。上传的**参考图**（`referenceImageIds`）只作给本状态生图的输入参数，不进分镜清单/缩略图/角标/图号。分镜取图、清单、usage 统计全走这一个函数，别在别处再拼。

- **「从资产库选择参考图」的图源只有生成图（2026-09-23）**：复用 `effectiveVariantRefImages`（= `generatedImageIds`）。
- **上传参考图的图号**：发送顺序 = 共用属性图 → 本状态上传图；`AssetVariantCard` 角标常驻 `图N`，`N = 共用属性图张数 + index + 1`。关掉「拼接共用属性」时共用图不发，上传图从「图1」重编。
- **共用属性图号行用等号**：`buildBlockText` 输出 `图N、图M = 属性名。`

## 三、「当前资产」区（AssetVariantCard）= 本状态成品图，三来源

1. AI 生成（`generatedImageIds`）；2. 自行上传（`uploadedImageIds`，卡片「上传图片」入口）；3. 引用其他章节同一视觉状态（`chapterAssets`，`appearance:'reused'` + `origin:'manual'`，**只关联不复制** —— 引用的就是同一条 variant 记录）。

- 卡片传 `canDeleteImages / linkedChapterName / detachVisible`：**图只能在原章节（`sourceChapterIds[0]`；`scope:'project'` 视为公共）删**，引用方只读 + 可「移出本章」（只删本章引用条目）。删除确认在状态被别章引用时列出章节名并说明同步消失（数据来自 usage 索引）。
- **手工引用必须在提取确认时保留**：`buildExtractionConfirmResult` 只重建 `extraction` 来源的本章引用，`origin:'manual'` 的条目原样保留（有单测锁）。

## 四、成图口径 = 显示哪张就用哪张（2026-09-19 定稿）

无「候选图/点击采纳」；`selectedImageId` = 当前显示图 = 导出图；生成成功即选中新图；多张悬停左右切换（立即落库）。删成图一律 ConfirmDialog；删资产图时 `updateAssetVariant` 按 patch 差集清扫页级+格级绑定 `selectedImageIds`。删空回落 `genStatus:'none'`。

## 五、参考图用途描述可配置（2026-09-22 定稿）

`services/refUsage.ts` 是唯一实现。**`图N`/资产名/`（状态名）`/格号永远由代码算**（必须与真实发送的图片数组同序），用户只写「资产名（状态）」之后那整句；占位符 `{类型}`、`{格号}`（自带「第1、3格」）。优先级 **资产 `asset.refUsage` → 项目 `imageGenConfig.refUsage[type]` → 内置 `DEFAULT_REF_USAGE`**（空串视为未填）。**新增配置字段必须同步加进 `normalizeImageGenConfig`** —— 白名单返回，漏了会被静默丢掉。

## 六、资产配色与高亮

- 颜色值只在 `src/theme/tokens.css`（`--asset-character/scene/prop`）；`utils/assetTypeTheme.ts` 只做映射，消费方走 `assetTagClass()`，底面用 `color-mix(...var(--asset-x)...)`。Tag 类定义在 `src/style.css` `@layer components`。
- **输入框资产名高亮已整体删除（2026-09-22，用户要求）**：`useAssetHighlight.ts`、`.asset-highlight`、`assetHighlightStyle()` 移除，两个编辑框 textarea 改回 `text-text-primary`；**连带删掉「光标落在资产名上打开参考图大图」**（依赖 `spans` + `selectionStart`）。`detectAssetSpans` 仍被 `detectAssetsInText` 内部使用，**不要删**。`AssetHoverCard` 亦已删除。
