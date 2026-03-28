import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import type { AppView } from '../types';

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
