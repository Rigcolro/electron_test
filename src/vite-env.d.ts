/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string
  readonly VITE_APP_TITLE: string
  readonly VITE_UPDATE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * preload 暴露给渲染进程的 API（与 electron/preload/index.ts 保持一致）
 */
export interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void
  platform: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

export {}
