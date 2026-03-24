/**
 * Electron 主进程入口（Main Process）
 *
 * 与「渲染进程」（Vue 页面）不同：主进程负责：
 * - 创建窗口、系统托盘、全局快捷键、原生通知
 * - 访问 Node API（文件、数据库、系统对话框）
 * - 通过 IPC 响应渲染进程的受限调用
 *
 * 安全建议：保持 `contextIsolation: true`，禁用渲染进程 `nodeIntegration`，
 * 通过 preload + contextBridge 暴露白名单 API。
 */
import './env'
import { app, BrowserWindow, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { RENDERER_DIST, VITE_DEV_SERVER_URL } from './env'
import { openDatabase, closeDatabase } from './database'
import { registerIpcHandlers } from './ipcRegister'
import { createPlaceholderTrayIcon, createTray, destroyTray } from './tray'
import { registerDemoShortcuts, unregisterAll } from './shortcuts'
import { cacheClearExpired } from './cacheService'
import { logLine } from './logger'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let mainWindow: BrowserWindow | null = null

function getMainWindow() {
  return mainWindow
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: '企微调研 Demo',
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(indexHtml)
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  try {
    openDatabase()
    cacheClearExpired()
    registerIpcHandlers(getMainWindow)

    createTray({
      icon: createPlaceholderTrayIcon(),
      onShowMain: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      },
    })

    registerDemoShortcuts({
      onToggleDevTools: () => {
        const w = BrowserWindow.getFocusedWindow()
        if (w) w.webContents.toggleDevTools()
      },
    })

    logLine('info', 'App ready, creating main window')
    void createMainWindow()
  } catch (e) {
    logLine('error', `启动失败: ${(e as Error).message}`)
    throw e
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    unregisterAll()
    destroyTray()
    closeDatabase()
    app.quit()
  }
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createMainWindow()
})

app.on('will-quit', () => {
  unregisterAll()
})
