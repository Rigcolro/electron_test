import { BrowserWindow, Notification, ipcMain, safeStorage } from 'electron'
import { IPC_CHANNELS } from '../../src/ipc/channels'
import * as db from './database'
import * as cache from './cacheService'
import { appStore } from './appStore'
import { logLine } from './logger'
import * as security from './security'
import { broadcastToAllWindows, createBrowserWindow } from './windowManager'

/**
 * 注册所有 IPC：invoke 模式（异步 Promise）适合「请求 / 响应」类 API。
 * send/on 适合单向推送（见 preload 暴露的 on）。
 */

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle(IPC_CHANNELS.PING, async () => {
    return { pong: true, at: Date.now(), pid: process.pid }
  })

  ipcMain.handle(
    IPC_CHANNELS.SQLITE_MESSAGES_PAGE,
    async (_e, payload: { page: number; pageSize: number }) => {
      return db.listMessagesPage(payload.page, payload.pageSize)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SQLITE_SEED_DEMO, async (_e, payload: { count: number }) => {
    return db.seedDemoRows(payload.count)
  })

  ipcMain.handle(IPC_CHANNELS.SQLITE_TX_DEMO, async (_e, payload: { success: boolean }) => {
    return db.demoTransaction(payload.success)
  })

  ipcMain.handle(
    IPC_CHANNELS.CACHE_SET,
    async (_e, payload: { key: string; value: unknown; ttlMs: number | null }) => {
      cache.cacheSet(payload.key, payload.value, payload.ttlMs)
      return { ok: true }
    }
  )

  ipcMain.handle(IPC_CHANNELS.CACHE_GET, async (_e, payload: { key: string }) => {
    return { value: cache.cacheGet(payload.key) }
  })

  ipcMain.handle(IPC_CHANNELS.CACHE_CLEAR_EXPIRED, async () => {
    return { removed: cache.cacheClearExpired() }
  })

  ipcMain.handle(IPC_CHANNELS.CACHE_STATS, async () => {
    return cache.cacheStats()
  })

  ipcMain.handle(IPC_CHANNELS.STORE_GET, async (_e, key: string) => {
    if (key !== 'theme') return undefined
    return appStore.get('theme')
  })

  ipcMain.handle(IPC_CHANNELS.STORE_SET, async (_e, payload: { key: 'theme'; value: 'light' | 'dark' }) => {
    appStore.set(payload.key, payload.value)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_OPEN_CHILD, async () => {
    createBrowserWindow({ title: '子窗口', hash: '/child' })
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_OPEN_MODAL, async () => {
    const parent = getMainWindow()
    if (!parent) return { ok: false, error: '无主窗口' }
    createBrowserWindow({
      title: '模态窗口',
      hash: '/modal',
      modal: true,
      parent,
      width: 520,
      height: 420,
    })
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.BROADCAST_TEST, async (_e, payload: { text: string }) => {
    broadcastToAllWindows('demo:broadcast', { text: payload.text, at: Date.now() })
    return { ok: true }
  })

  ipcMain.handle(
    IPC_CHANNELS.NOTIFICATION_SHOW,
    async (_e, payload: { title: string; body: string }) => {
      if (!Notification.isSupported()) return { ok: false, error: '系统不支持通知' }
      new Notification({ title: payload.title, body: payload.body }).show()
      return { ok: true }
    }
  )

  ipcMain.handle(IPC_CHANNELS.TRAY_BALLOON, async () => {
    // Windows 曾支持 Tray.displayBalloon；新版 Electron 推荐 Notification。
    return { ok: true, hint: '已用 Notification 替代传统 balloon（跨平台一致）' }
  })

  ipcMain.handle(IPC_CHANNELS.CRYPTO_ENCRYPT, async (_e, plain: string) => {
    const cipher = security.encryptSensitive(plain)
    return { cipher }
  })

  ipcMain.handle(IPC_CHANNELS.CRYPTO_DECRYPT, async (_e, cipher: string) => {
    const plain = security.decryptSensitive(cipher)
    return { plain }
  })

  ipcMain.handle(IPC_CHANNELS.SAFE_STORAGE_AVAILABLE, async () => {
    return { available: safeStorage.isEncryptionAvailable() }
  })

  ipcMain.handle(IPC_CHANNELS.LOG_WRITE, async (_e, message: string) => {
    logLine('info', `[renderer] ${message}`)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, async () => {
    /**
     * 自动更新常见方案：electron-updater + 静态文件服务器（latest.yml / blockmap）。
     * 此处仅占位，避免在未配置 publish 时真正访问网络。
     */
    return {
      checked: false,
      hint: '请在主进程配置 autoUpdater.setFeedURL 与打包 publish 地址；开发环境通常关闭自动更新。',
    }
  })

  ipcMain.handle(IPC_CHANNELS.PERF_SQLITE_BATCH, async (_e, count: number) => {
    return db.perfBatchInsert(count)
  })
}
