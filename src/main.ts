import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import './style.css'

/**
 * Vue 应用入口（渲染进程）。
 * 不在这里直接访问 Node API；统一走 window.electronAPI（preload 注入）。
 */
const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
