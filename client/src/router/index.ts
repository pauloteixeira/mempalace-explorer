import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'explorer',
    component: () => import('@/views/ExplorerView.vue'),
  },
  {
    path: '/palace',
    name: 'palace',
    component: () => import('@/views/PalaceView.vue'),
  },
  {
    path: '/graph',
    name: 'graph',
    component: () => import('@/views/GraphView.vue'),
  },
  {
    path: '/query-lab',
    name: 'query-lab',
    component: () => import('@/views/QueryLabView.vue'),
  },
  {
    path: '/timeline',
    name: 'timeline',
    component: () => import('@/views/TimelineView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
