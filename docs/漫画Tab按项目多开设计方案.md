# 漫画 Tab 按项目多开 + 项目名标题 设计方案

> 状态:设计定稿待确认,未改任何代码
> 前置:已实施《Tab页签导航改造方案》(P1~P3),本方案为其 V2 增量

## 一、现状确认(基于代码实查)

| 项 | 现状 |
|---|---|
| 漫画 Tab 归并 | **单例**。`router/index.ts` 中全部 8 条 `/comic/*` 子路由 `meta.tab.key = 'comic'`,tabStore 按 key 归并,打开项目 B 顶掉项目 A |
| Tab 标题 | 随子路由 `meta.tab.title` 变化(如"页面编辑"),无项目名 |
| 组件缓存 | App 层 keep-alive 只缓存 `ComicLayout` 一个实例(include 按组件名过滤);ComicLayout 内部 `<router-view />` 无 keep-alive |
| 页面编辑器数据安全 | `usePageEditorPersistence` 已有 300ms 防抖自动存盘(IPC 落盘)+ sessionStorage,`onBeforeUnmount` 有 flush 兜底 |
| 持久化 | Tab 列表存 localStorage(`fullPath` 含 projectId),重启可恢复路由 |

## 二、目标

1. **按项目多开**:每个 projectId 一个独立 Tab;同一项目的所有子页面(项目编辑/资产/页面编辑/导出/同步/长篇)在**同一 Tab 内导航**;项目列表页保持单例"漫画工作台"Tab;
2. **标题带项目名**:`项目名 · 子页面名`,如"县城咖啡店 · 页面编辑",Tab 内导航时后半段自动更新;
3. **精确释放**:关闭某项目 Tab 只销毁该项目的组件实例,其他 Tab 不受影响;
4. **重启恢复**:项目 Tab 恢复后标题立即显示项目名(项目名随 Tab 持久化,不等异步加载)。

## 三、核心设计

### 3.1 动态归并键 matchKey

- `tab.ts` 新增纯函数 `resolveMatchKey(route)`:
  - 路由 `meta.tab.dk === 'comic-project'` 时 → `comic:p:${route.params.projectId}`;
  - 否则 → `meta.tab.key`(现状逻辑);
- `router/index.ts`:7 条带 `:projectId` 的子路由 `meta.tab` 增加 `dk: 'comic-project'` 标记;`/comic/projects`(项目列表)保持 `key: 'comic'` 单例;
- `tabStore.syncWithRoute` 改用 `resolveMatchKey` 归并/新建 → ProjectList 里点项目、页面间跳转**零改动**自然多开;
- Tab 上限 `MAX_TASK_TABS = 8` 逻辑不变,多项目并行更易触顶,超限时沿用现有拦截提示。

### 3.2 Tab 标题 = 项目名(label) + 子页面名

- `TabItem` 新增 `label` 字段(项目名,**随 localStorage 持久化**);
- `syncWithRoute` 命中已有 Tab 时:`title = label ? \`${label} · ${meta.tab.title}\` : meta.tab.title` —— Tab 内从"页面编辑"跳"导出发布",标题自动变为"项目名 · 导出发布";
- 各漫画子页面在项目数据加载完成后调用 `tabStore.setLabel(myKey, project.name)`:
  - `myKey` 必须在 **setup 阶段同步捕获**(`resolveMatchKey(route)`),避免异步加载完成后用户已切走导致标错 Tab;
  - 加载完成前标题显示"页面编辑"等默认名,持久化恢复场景因 label 已存则直接显示项目名;
- `setLabel(matchKey, label)` 按 matchKey 定位 Tab,同 key 归并保证唯一命中。

### 3.3 多实例缓存与精确释放(关键技术点)

**问题**:App 层 keep-alive 的 `include` 按组件名过滤。多个项目 Tab 各需一个独立的 `ComicLayout` 实例(各保自己的子页面状态),但组件名只有一个 `ComicLayout`;且 Vue 的 keep-alive 没有"按 key 驱逐单个实例"的 API —— 关 Tab 无法精确释放。

**方案(业界成熟做法,vben admin 同款):每个 Tab 一个唯一组件名的包装组件**

- 新增 `src/utils/tabComponent.ts`:
  - `getTabComponent(rawComponent, matchKey)`:内部 `Map<matchKey, WrappedComponent>` 缓存;
  - 包装组件 `name = 'Tab_' + sanitized(matchKey)`(如 `Tab_comic_p_aaa3f2`),render 原 ComicLayout;
- `App.vue` 的 router-view 改为渲染包装组件(无 `meta.tab` 的路由仍渲染原组件):
  ```
  matchKey = resolveMatchKey(route)
  <component :is="getTabComponent(Component, matchKey)" />
  ```
- `tabStore.cachedViews` 改为 `tabs.map(t => cacheName(t.matchKey))`(由 matchKey 纯函数推导,**无需持久化**);
- **效果**:
  - 每个项目 Tab 的 ComicLayout 以独立名字进入 keep-alive 缓存,两个项目实例并存、状态互不干扰;
  - 关闭项目 Tab → 该名字从 include 移除 → keep-alive 自动驱逐实例 → 触发子树 `onBeforeUnmount` → PageEditor flush 落盘。精确、无泄漏、无 hack;
  - 非漫画 Tab 同样走包装(`Tab_settings` 等),机制全项目统一;
- `TabItem.visited` 字段随之**废弃**(其唯一职责就是提供 include 名,被 cacheName 取代),持久化加载时忽略旧字段,结构更简。

### 3.4 行为边界(明确不在本期范围)

- **同一 Tab 内子页面切换**(页面编辑→导出→同步):子组件仍不保活(ComicLayout 内 router-view 无 keep-alive),与现状一致,由 300ms 防抖存盘兜底。若未来要子页面保活,需在 ComicLayout 内再加一层 keyed keep-alive,驱逐逻辑复杂度上升,**本期不做**;
- **关闭确认弹窗**:不加。自动存盘 + unmount flush 已兜底,弹窗是纯摩擦;
- **同项目重复打开**:matchKey 相同自动归并到已有 Tab(幂等),不会开重;
- **项目删除后残留 Tab**:页面自身已有 projectId 无效时回退项目列表的兜底,验收项覆盖。

### 3.5 入口联动

- **ProjectList**:零改动,点项目 `router.push` 自然开新 Tab;
- **HomeView 最近项目**:若该项目 Tab 已开 → push 该 Tab 的 `fullPath`(回到当时页面);未开 → push 默认入口(短线 `/comic/project-editor/:id`,长篇 `/comic/long-project/:id`);
- **"+"菜单**:现有"漫画工作台"入口打开单例列表 Tab,行为不变;
- **TabBar**:无结构改动,仅确认长标题省略号(max-width + truncate)正常。

## 四、涉及文件清单

| 文件 | 改动 |
|---|---|
| `src/stores/tab.ts` | resolveMatchKey、label 机制、cacheName、cachedViews 改造、持久化兼容 |
| `src/utils/tabComponent.ts`(新) | 包装组件工厂 + Map 缓存,约 30 行 |
| `src/App.vue` | router-view 渲染包装组件 |
| `src/router/index.ts` | 7 条 :projectId 子路由 meta.tab 加 dk 标记 |
| 漫画 6 个子页面 | ProjectEditor / LongProject / ProjectAssets / PageEditor / PageExport / PageSync:setup 捕获 matchKey + 项目加载后 setLabel,每文件约 3~5 行 |
| `src/pages/HomeView.vue` | 最近项目点击逻辑:已开 Tab 回 fullPath(小改) |
| `src/components/shell/TabBar.vue` | 仅样式确认,可能零改动 |

## 五、风险与验收

**风险:**
1. keep-alive 多实例同组件 → 唯一 name 包装解决,技术成熟;需实测 `ComicLayout` 内 Toast 的模块级 `registerToast` 在多实例切换下指向正确(同一时刻仅一个实例激活,预期正常,低风险);
2. 旧 localStorage Tab 数据兼容 → 加载时忽略 `visited`,重算 cacheName;
3. 300ms 防抖窗口内关 Tab → 依赖 `onBeforeUnmount` flush,**必须实测 keep-alive 驱逐确实触发 unmount 钩子**。

**验收清单(实施时逐项过):**
- [ ] 两个项目各开 Tab,互切,各自页面状态(滚动/表单/编辑器内存态)保留;
- [ ] 关闭项目 Tab 后实例释放(DevTools Memory 快照对比 ComicLayout 实例数);
- [ ] 关 Tab 前 300ms 内的编辑,重开项目后不丢;
- [ ] 标题链路:打开→"页面编辑"→加载完成→"项目名 · 页面编辑"→Tab 内跳导出→"项目名 · 导出发布";
- [ ] 重启恢复:项目 Tab 标题立即显示项目名(label 已持久化);
- [ ] 任务 Tab 达 8 个时新开被拦截并提示;
- [ ] 在 Tab A 中删除 Tab B 对应项目后,切到 Tab B 正确兜底回项目列表;
- [ ] vue-tsc + vite build 通过。

## 六、实施建议

改动集中在 `tab.ts` + `tabComponent.ts` + `App.vue` 三处核心,6 个子页面是机械性小改,**建议一次交付不分期**,一次性回归上表全部验收项。预估净新增约 80~120 行,删除 visited 相关约 20 行。
