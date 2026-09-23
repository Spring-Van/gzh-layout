import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Tab 页签归并配置;dk='comic-project' 表示按 route.params.projectId 动态归并(按项目多开 Tab) */
    tab?: {
      key: string;
      title: string;
      icon: string;
      component: string;
      dk?: string;
    };
    /** 公众号向导页:显示 AppHeader 步骤条 */
    wizard?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/HomeView.vue'),
    meta: { tab: { key: 'home', title: '首页', icon: 'home', component: 'HomeView' } },
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../pages/SetupView.vue'),
    meta: {
      wizard: true,
      tab: { key: 'wechat-flow', title: '公众号矩阵', icon: 'wechat-flow', component: 'SetupView' },
    },
  },
  {
    path: '/typeset',
    name: 'Typeset',
    component: () => import('../pages/TypesetView.vue'),
    meta: {
      wizard: true,
      tab: { key: 'wechat-flow', title: '公众号矩阵 · 批量排版', icon: 'wechat-flow', component: 'TypesetView' },
    },
  },
  {
    path: '/sync',
    name: 'Sync',
    component: () => import('../pages/SyncView.vue'),
    meta: {
      wizard: true,
      tab: { key: 'wechat-flow', title: '公众号矩阵 · 发布同步', icon: 'wechat-flow', component: 'SyncView' },
    },
  },
  {
    path: '/extract',
    name: 'Extract',
    component: () => import('../pages/ExtractView.vue'),
    meta: { tab: { key: 'extract', title: '图片提取', icon: 'extract', component: 'ExtractView' } },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../pages/SettingsView.vue'),
    meta: { tab: { key: 'settings', title: '系统设置', icon: 'settings', component: 'SettingsView' } },
  },
  {
    path: '/style-templates',
    name: 'StyleTemplates',
    component: () => import('../pages/StyleTemplateView.vue'),
    meta: { tab: { key: 'style-templates', title: '样式模板', icon: 'style-templates', component: 'StyleTemplateView' } },
  },
  {
    path: '/image-studio',
    name: 'ImageStudio',
    component: () => import('../pages/ImageStudioView.vue'),
    meta: { tab: { key: 'image-studio', title: '生图工作台', icon: 'image-studio', component: 'ImageStudioView' } },
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('../pages/GalleryView.vue'),
    meta: { tab: { key: 'gallery', title: '画夹', icon: 'gallery', component: 'GalleryView' } },
  },
  {
    path: '/prompt-templates',
    name: 'PromptTemplates',
    component: () => import('../pages/PromptTemplatesView.vue'),
    meta: { tab: { key: 'prompt-templates', title: '常用提示词', icon: 'prompt-templates', component: 'PromptTemplatesView' } },
  },
  // ========== Comic 模块（漫画工作台） ==========
  // 嵌套路由:App 层 keep-alive 缓存的是每个 Tab 的 ComicLayout 包装实例;
  // 带 :projectId 的子路由 dk='comic-project' → 按项目多开 Tab,项目列表保持 'comic' 单例
  {
    path: '/comic',
    component: () => import('../modules/comic/ComicLayout.vue'),
    redirect: '/comic/projects',
    children: [
      {
        path: 'projects',
        name: 'ComicProjectList',
        component: () => import('../modules/comic/views/ProjectList.vue'),
        meta: { module: 'comic', title: '漫画工作台', tab: { key: 'comic', title: '漫画工作台', icon: 'comic', component: 'ComicLayout' } },
      },
      {
        path: 'project-editor/:projectId',
        name: 'ComicProjectEditor',
        component: () => import('../modules/comic/views/ProjectEditor.vue'),
        meta: { module: 'comic', title: '项目编辑', tab: { key: 'comic', title: '项目编辑', icon: 'comic', component: 'ComicLayout', dk: 'comic-project' } },
      },
      {
        path: 'long-project/:projectId',
        name: 'ComicLongProject',
        component: () => import('../modules/comic/views/LongProject.vue'),
        meta: { module: 'comic', title: '长篇项目', tab: { key: 'comic', title: '长篇项目', icon: 'comic', component: 'ComicLayout', dk: 'comic-project' } },
      },
      {
        path: 'project-assets/:projectId',
        name: 'ComicProjectAssets',
        component: () => import('../modules/comic/views/ProjectAssets.vue'),
        meta: { module: 'comic', title: '项目资产', tab: { key: 'comic', title: '项目资产', icon: 'comic', component: 'ComicLayout', dk: 'comic-project' } },
      },
      {
        path: 'page-editor/:projectId',
        name: 'ComicPageEditor',
        component: () => import('../modules/comic/views/page/PageEditor.vue'),
        meta: { module: 'comic', title: '页面编辑', tab: { key: 'comic', title: '页面编辑', icon: 'comic', component: 'ComicLayout', dk: 'comic-project' } },
      },
      {
        path: 'page-export/:projectId',
        name: 'ComicPageExport',
        component: () => import('../modules/comic/views/page/PageExport.vue'),
        meta: { module: 'comic', title: '导出发布', tab: { key: 'comic', title: '导出发布', icon: 'comic', component: 'ComicLayout', dk: 'comic-project' } },
      },
      {
        path: 'page-sync/:projectId',
        name: 'ComicPageSync',
        component: () => import('../modules/comic/views/page/PageSync.vue'),
        meta: { module: 'comic', title: '同步至公众号', tab: { key: 'comic', title: '同步至公众号', icon: 'comic', component: 'ComicLayout', dk: 'comic-project' } },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
