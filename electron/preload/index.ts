import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC_CHANNELS, IPC_PUSH_CHANNELS } from '../../src/ipc/channels'

/**
 * Preload 脚本运行在「独立 JavaScript 世界」，比页面更早执行。
 *
 * 作用：
 * - 通过 `contextBridge.exposeInMainWorld` 把「有限 API」挂到 `window` 上
 * - 渲染进程不开启 nodeIntegration，因此无法直接 require('electron')
 * - 所有 IPC 通道应白名单化，避免页面 XSS 后任意调用主进程能力
 */

const INVOKE_ALLOW = new Set<string>(Object.values(IPC_CHANNELS))

function invoke(channel: string, ...args: unknown[]) {
  if (!INVOKE_ALLOW.has(channel)) {
    throw new Error(`[preload] 禁止的 invoke 通道: ${channel}`)
  }
  return ipcRenderer.invoke(channel, ...args)
}

const ON_ALLOW = new Set<string>([...IPC_PUSH_CHANNELS])

function on(channel: string, listener: (...args: unknown[]) => void) {
  if (!ON_ALLOW.has(channel)) {
    throw new Error(`[preload] 禁止监听通道: ${channel}`)
  }
  const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) => {
    listener(...args)
  }
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke,
  on,
  /** 当前操作系统：用于 UI 条件分支（如 macOS 与 Windows 快捷键文案） */
  platform: process.platform,
})
