import Store from 'electron-store'

/**
 * electron-store：把「小型配置 / 开关」持久化到 JSON 文件（位于 userData）。
 * 与上方 cacheService 的区别：更偏「应用设置」，API 简单，自带迁移能力可扩展。
 */
export const appStore = new Store<{
  theme: 'light' | 'dark'
  lastWindowBounds?: { width: number; height: number; x: number; y: number }
}>({
  name: 'app-settings',
  defaults: {
    theme: 'light',
  },
})
