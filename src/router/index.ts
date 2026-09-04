import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/HomeView.vue'),
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../pages/SetupView.vue'),
  },
  {
    path: '/typeset',
    name: 'Typeset',
    component: () => import('../pages/TypesetView.vue'),
  },
  {
    path: '/sync',
    name: 'Sync',
    component: () => import('../pages/SyncView.vue'),
  },
  {
    path: '/extract',
    name: 'Extract',
    component: () => import('../pages/ExtractView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../pages/SettingsView.vue'),
  },
  {
    path: '/style-templates',
    name: 'StyleTemplates',
    component: () => import('../pages/StyleTemplateView.vue'),
  },
  {
    path: '/image-studio',
    name: 'ImageStudio',
    component: () => import('../pages/ImageStudioView.vue'),
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('../pages/GalleryView.vue'),
  },
  {
    path: '/prompt-templates',
    name: 'PromptTemplates',
    component: () => import('../pages/PromptTemplatesView.vue'),
  },
  // ========== Comic 模块（漫画工作台） ==========
  {
    path: '/comic',
    component: () => import('../modules/comic/ComicLayout.vue'),
    redirect: '/comic/projects',
    children: [
      {
        path: 'projects',
        name: 'ComicProjectList',
        component: () => import('../modules/comic/views/ProjectList.vue'),
        meta: { module: 'comic', title: '漫画工作台' },
      },
      {
        path: 'project-editor/:projectId',
        name: 'ComicProjectEditor',
        component: () => import('../modules/comic/views/ProjectEditor.vue'),
        meta: { module: 'comic', title: '项目编辑' },
      },
      {
        path: 'long-project/:projectId',
        name: 'ComicLongProject',
        component: () => import('../modules/comic/views/LongProject.vue'),
        meta: { module: 'comic', title: '长篇项目' },
      },
      {
        path: 'project-assets/:projectId',
        name: 'ComicProjectAssets',
        component: () => import('../modules/comic/views/ProjectAssets.vue'),
        meta: { module: 'comic', title: '项目资产' },
      },
      {
        path: 'page-editor/:projectId',
        name: 'ComicPageEditor',
        component: () => import('../modules/comic/views/page/PageEditor.vue'),
        meta: { module: 'comic', title: '页面编辑' },
      },
      {
        path: 'page-export/:projectId',
        name: 'ComicPageExport',
        component: () => import('../modules/comic/views/page/PageExport.vue'),
        meta: { module: 'comic', title: '导出发布' },
      },
      {
        path: 'page-sync/:projectId',
        name: 'ComicPageSync',
        component: () => import('../modules/comic/views/page/PageSync.vue'),
        meta: { module: 'comic', title: '同步至公众号' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
