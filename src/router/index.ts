import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 使用 Hash 路由：在 Electron 使用 file:// 加载打包后的 index.html 时更省心
 * （history 模式需要额外配置本地文件服务）。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { title: '总览' },
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/ipc',
      name: 'ipc',
      meta: { title: '进程通信（IPC）' },
      component: () => import('../views/IpcView.vue'),
    },
    {
      path: '/cache',
      name: 'cache',
      meta: { title: '本地缓存' },
      component: () => import('../views/CacheView.vue'),
    },
    {
      path: '/sqlite',
      name: 'sqlite',
      meta: { title: 'SQLite' },
      component: () => import('../views/SqliteView.vue'),
    },
    {
      path: '/native',
      name: 'native',
      meta: { title: '原生能力' },
      component: () => import('../views/NativeView.vue'),
    },
    {
      path: '/engineering',
      name: 'engineering',
      meta: { title: '工程化与安全' },
      component: () => import('../views/EngineeringView.vue'),
    },
    {
      path: '/child',
      name: 'child',
      meta: { title: '子窗口' },
      component: () => import('../views/ChildView.vue'),
    },
    {
      path: '/modal',
      name: 'modal',
      meta: { title: '模态窗口' },
      component: () => import('../views/ModalView.vue'),
    },
  ],
})

export default router
