# Tab 页签导航改造方案

> 状态:设计定稿,待评审后实施
> 日期:2026-09-07

## 一、背景与目标

当前应用为"星型导航":所有工具页面互相独立,切换必须经首页中转,调整系统设置(API 模型、图片模型)需要层层返回。同时各页面自带 header + 返回按钮,首页大卡片布局信息密度低。

本次改造目标:

1. 任意页面一步直达任意工具与系统设置;
2. 支持多任务并行(生图等结果时切去设置页调模型,切回状态不丢失);
3. 去掉各页面 header 的返回按钮,统一由 Tab 条承担导航;
4. 首页从"大卡片入口页"改版为"Dashboard 看板"(最近项目 + 紧凑工具网格)。

## 二、设计定稿

**形态:纯顶部 Tab 页签,无左侧栏。**

```
┌──────────────────────────────────────────────────────────────┐
│ [🏠首页(固定)] [漫画·县城咖啡店 ✕] [生图工作台 ✕] [系统设置 ✕] [+]  🌙 │  ← TabBar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                     当前 Tab 的页面内容                        │
│                     (keep-alive 保活)                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

交互规则:

1. **首页 Tab 永远固定为第一个**,不可关闭,图标 + "首页"文字;
2. **"+"按钮**位于 Tab 条尾部,下拉菜单一层平铺全部入口(含系统设置),点击即开新 Tab 或激活已有单例 Tab;
3. **主题切换**收在 Tab 条最右端,全局唯一,各页面不再重复放置;
4. **Tab 上限 8 个**(首页不计入),超限提示先关闭再打开;
5. 关闭 Tab 激活相邻 Tab;右键菜单:关闭其他 / 关闭全部(首页除外);
6. 快捷键:`Ctrl+Tab` 切换下一个、`Ctrl+W` 关闭当前、`Ctrl+1~9` 定位第 n 个 Tab(已确认 Electron 主进程未注册冲突快捷键)。

## 三、架构设计

### 3.1 新增文件

| 文件 | 职责 |
|------|------|
| `src/components/shell/AppShell.vue` | 应用壳:TabBar + 内容区(router-view + keep-alive) |
| `src/components/shell/TabBar.vue` | Tab 条:首页固定 Tab、任务 Tab、"+"菜单、主题切换、右键菜单 |
| `src/stores/tab.ts` | Pinia Tab 状态管理,localStorage 持久化 |

### 3.2 tabStore 设计

```ts
interface TabItem {
  id: string            // 唯一 id
  matchKey: string      // 归并键:单例 = meta.tabKey;多例 = meta.tabKey + ':' + 参数(如 projectId)
  fullPath: string      // 当前完整路径(Tab 内导航时更新)
  title: string         // Tab 标题(漫画项目内页随路由更新)
  icon: string          // 入口图标标识
  closable: boolean     // 首页为 false,其余 true
}
```

核心逻辑:

1. `watch route` → 按 `matchKey` 查找已有 Tab:有则激活并同步 fullPath/title,无则新建;
2. `cachedViews` 计算属性 = 当前打开 Tab 对应的组件 name 数组,供 `keep-alive :include` 使用,**关闭 Tab 即卸载组件**(优于现状"所有访问过的页面永久保活");
3. Tab 列表持久化到 localStorage,应用重启后恢复;恢复时若动态路由(如 projectId)对应数据已不存在,跳转失败则静默关闭该 Tab 并回首页。

### 3.3 App.vue 改造

```html
<template>
  <div id="app-shell" class="h-screen flex flex-col overflow-hidden">
    <AppShell>
      <template #default>
        <router-view v-slot="{ Component }">
          <keep-alive :include="tabStore.cachedViews">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </template>
    </AppShell>
    <!-- 全局 Modal / Toast 原样保留 -->
  </div>
</template>
```

删除现有的 `isHomePage / isExtractPage / ...` 一系列 per-page 判断(由路由 meta 驱动替代)。

### 3.4 关键前置:组件 name 统一

`keep-alive :include` 按组件 name 匹配,当前多数 View 是 `<script setup>` 无显式 name。**需为全部路由级组件补 `defineOptions({ name: 'XxxView' })`**,name 与 `meta.tabKey` 建立映射关系。这是容易遗漏的坑,列入 P1 验收检查项。

### 3.5 路由 meta 扩展

`router/index.ts` 每条路由增加 `meta.tab`:

```ts
meta: {
  tab: {
    key: 'image-studio',          // matchKey 前缀
    title: '生图工作台',
    icon: 'image',
  }
}
```

漫画模块子路由的 title 为动态(项目名 + 页面类型),由页面在加载项目数据后调用 `tabStore.updateTitle(tabId, title)` 更新。

### 3.6 设置页直达参数

`SettingsView.vue` 的 `activeCategory` 与 `route.query.tab` 双向同步:

- 进入 `#/settings?tab=image` 自动切到图片模型 Tab;
- 切 Tab 时 `router.replace({ query: { tab } })`,保证刷新/恢复后停留在原分类;
- 生图工作台左面板加"模型配置"快捷入口,直跳 `?tab=image`(P2)。

## 四、Tab 粒度规则表(V1)

| 入口 | matchKey | 粒度 | Tab 内导航 |
|------|----------|------|-----------|
| 首页 | `home` | 固定单例 | — |
| 生图工作台 /image-studio | `image-studio` | 单例 | — |
| 漫画工作台 /comic/** | `comic` | 单例(V1) | 项目列表→编辑→页面编辑→导出,均在同一 Tab 内导航,标题跟随(如"县城咖啡店·页面编辑") |
| 公众号矩阵 /setup /typeset /sync | `wechat-flow` | 单例 | 三步向导在同一 Tab 内走完 |
| 图片提取 /extract | `extract` | 单例 | — |
| 画夹 /gallery | `gallery` | 单例 | — |
| 常用提示词 /prompt-templates | `prompt-templates` | 单例 | — |
| 样式模板 /style-templates | `style-templates` | 单例 | — |
| 系统设置 /settings | `settings` | 单例 | 内部 6 个分类 Tab 为页内状态,不产生新页签 |

**V2(可选,后置)**:漫画项目列表右键"在新标签页打开",matchKey = `comic:projectId`,实现多项目并行。

## 五、各页面 header 处理清单

原则:**返回按钮、logo 徽标、主题切换按钮全部删除**(Tab 条已承担);**页面级操作按钮保留**,降级为页内工具条。

| 文件 | 现状 | 处理 |
|------|------|------|
| `src/pages/HomeView.vue` | 大卡片 + 右上角主题按钮 | P3 重写为 Dashboard;主题按钮删除 |
| `src/pages/ImageStudioView.vue` | header(返回+logo+标题 / 画夹按钮 / 主题按钮) | 删整行 header;"画夹"入口移入左侧参数面板底部(P2) |
| `src/pages/SettingsView.vue` | 外层 header(返回+logo+标题+主题)+ 页内大标题 | 删外层 header 与主题按钮;页内大标题保留;补 query.tab 同步 |
| `src/pages/GalleryView.vue` | header(返回生图+标题 / 新建分类 / 主题) | 删返回按钮与主题按钮;"新建分类"移入页内工具条 |
| `src/pages/PromptTemplatesView.vue` | header(返回生图+标题 / 新建提示词 / 主题) | 同上 |
| `src/pages/StyleTemplateView.vue` | header($router.back()+标题 / 新建样式) | 删返回按钮;"新建样式"移入页内工具条(此页仍为 slate 老配色,统一主题色列为可选,不强制本次做) |
| `src/pages/ExtractView.vue` | header(返回+标题+主题) | 删返回按钮与主题按钮 |
| `src/pages/SetupView.vue` `TypesetView.vue` `SyncView.vue` | 使用 AppHeader | 跟随 AppHeader 改造 |
| `src/components/layout/AppHeader.vue` | 公众号向导条(返回首页+logo+标题 / 步骤条 / 全局配置下拉+主题) | 删返回按钮、logo 徽标、主题按钮;**保留步骤条与全局配置下拉**(有业务语义),作为 Tab 条下方的二级工具条仅在向导三页显示 |
| `src/modules/comic/views/ProjectList.vue` | header(返回+logo+标题+主题) | 删返回按钮、logo、主题按钮,保留紧凑标题行(或并入页面内容) |
| `src/modules/comic/views/ProjectEditor.vue` | header(含返回首页) | 删返回首页按钮;项目内"返回列表"改为 Tab 内 `router.push('/comic/projects')` |
| `src/modules/comic/views/LongProject.vue` 等 | 页内导航 | 检查所有 `router.push('/')`,改为 Tab 内导航或关闭 Tab |

**布局适配**:所有 View 根节点 `h-screen`(100vh)改为 `h-full`,由 AppShell 提供高度约束,否则 Tab 条下方内容溢出。实施时全局检索 `h-screen` 逐一确认。

## 六、首页 Dashboard 改版(P3)

1. 顶部:紧凑问候条(问候语 + 日期),替代现在的大图标欢迎区;
2. "继续创作"区:最近 3 个项目/任务卡片(漫画项目名 + 进度、生图批次、公众号同步状态),点击直达;
   - 数据来源:漫画项目用 `projectStore`(需确认是否有 updatedAt 字段,无则补充);生图历史用 `imageStudio` store;无数据的入口首期可隐藏该区;
3. "全部工具"区:小卡片网格(图标 + 名称 + 一句话描述),替代现在的大卡片,单屏内展示完毕;
4. 删除顶部渐变装饰条、功能标签堆叠、"可用"徽章等冗余元素。

## 七、分期实施计划

### P1:Tab 壳核心(先保证可用,不动各页 header)

1. 新建 `tabStore` + `AppShell` + `TabBar`(含"+"菜单、固定首页 Tab);
2. 路由 meta.tab 补全;全部路由级组件补 `defineOptions name`;
3. App.vue 接入新壳,keep-alive 改 include 驱动;
4. 全部 View `h-screen` → `h-full`。

**验收**:任意页面可通过"+"一步打开其他工具/设置;各 Tab 状态独立保活;关闭 Tab 后重开为全新状态;现有功能无回归(各页旧 header 暂保留)。

### P2:页面瘦身与直达

1. 按第五节清单删除各页返回按钮/主题按钮/logo,操作按钮移入页内工具条;
2. AppHeader 向导条适配(仅向导三页显示,去掉返回/logo/主题);
3. SettingsView 接入 `?tab=` 直达;生图工作台加"模型配置"快捷跳转;
4. 快捷键(Ctrl+Tab / Ctrl+W / Ctrl+1~9)、右键菜单、Tab 上限。

**验收**:全局仅 Tab 条右端一个主题切换;任何位置两步内到达"图片模型"编辑;向导流程可完整走完。

### P3:首页 Dashboard + 持久化

1. HomeView 重写(最近项目 + 工具网格);
2. Tab 列表 localStorage 持久化 + 启动恢复 + 失效路由兜底;
3. (可选 V2)漫画项目右键"在新标签页打开"。

**验收**:重启应用 Tab 恢复;首页单屏承载全部入口 + 最近 3 个项目。

## 八、风险评估与回滚

| 风险 | 等级 | 应对 |
|------|------|------|
| keep-alive include 与组件 name 不匹配导致保活失效 | 高 | P1 验收项强制检查:逐 Tab 开关验证状态保留;name 命名与 tabKey 映射写在 tabStore 单一常量表中 |
| h-screen 残漏导致内容溢出/滚动异常 | 中 | 全局 grep `h-screen`,验收时逐页检查 |
| 漫画编辑器等重组件多开导致内存压力 | 中 | Tab 上限 8;关闭即卸载;V2 多开默认关闭 |
| 动态路由恢复失败(项目已删除) | 中 | 恢复失败静默关 Tab 回首页,不阻塞启动 |
| Electron 快捷键冲突 | 低 | 已确认主进程无 globalShortcut 注册 |
| StyleTemplateView 等老配色页与新壳视觉不齐 | 低 | 本次仅删按钮不重刷配色,统一主题另立任务 |
| 公众号向导步骤条与 Tab 条叠加占高 | 低 | 向导条压缩为二级细条(h-12 内) |

**回滚方案**:P1/P2 改动集中在新 shell 组件与各页 header 删除,建议在独立分支开发,P2 完成前不合主干;异常时 revert 分支即可回到现状。

## 九、明确不做的事

1. 不引入新 UI 框架,Tab 组件手写(Tailwind 已有全部所需样式原语);
2. 不改各页面内部业务逻辑与 store;
3. 不做拖拽排序 Tab、Tab 分组、拆分窗口等高级特性;
4. StyleTemplateView 配色统一不在本次范围;
5. 漫画项目多开(V2)不阻塞 P1~P3 交付。
