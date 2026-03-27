import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import type { AppView } from '../types';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/project',
  },
  {
    path: '/project',
    name: 'Project',
    component: () => import('../pages/ProjectPage.vue'),
  },
  {
    path: '/project/workspace',
    name: 'ProjectWorkspace',
    component: () => import('../pages/ProjectWorkspace.vue'),
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('../pages/TemplatesPage.vue'),
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../pages/HistoryPage.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../pages/SettingsPage.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;

export function navigateTo(view: AppView) {
  const routeMap: Record<AppView, string> = {
    home: '/project',
    project: '/project',
    templates: '/templates',
    history: '/history',
    settings: '/settings',
  };
  router.push(routeMap[view] || '/project');
}
