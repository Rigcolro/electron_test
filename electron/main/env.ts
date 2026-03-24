import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 统一解析应用根目录与静态资源路径。
 * 开发时 __dirname 指向源码编译输出 dist-electron/main，向上两级为项目根。
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
if (!process.env.APP_ROOT) {
  process.env.APP_ROOT = path.join(__dirname, '../..')
}

export const APP_ROOT = process.env.APP_ROOT
export const MAIN_DIST = path.join(APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, 'public')
  : RENDERER_DIST
