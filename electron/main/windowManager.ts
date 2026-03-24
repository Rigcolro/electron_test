import path from 'node:path'
import { BrowserWindow, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import { RENDERER_DIST, VITE_DEV_SERVER_URL } from './env'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 子窗口 / 模态窗口与主窗口共用 preload，保持 contextIsolation，不开启 nodeIntegration */

export function createBrowserWindow(opts: {
  title: string
  hash?: string
  modal?: boolean
  parent?: BrowserWindow
  width?: number
  height?: number
}) {
  const preload = path.join(__dirname, '../preload/index.mjs')
  const indexHtml = path.join(RENDERER_DIST, 'index.html')

  const child = new BrowserWindow({
    title: opts.title,
    width: opts.width ?? 900,
    height: opts.height ?? 640,
    modal: opts.modal ?? false,
    parent: opts.parent,
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  child.once('ready-to-show', () => child.show())

  const viteUrl = VITE_DEV_SERVER_URL
  if (viteUrl) {
    const url = opts.hash ? `${viteUrl}#${opts.hash}` : viteUrl
    child.loadURL(url)
  } else {
    if (opts.hash) child.loadFile(indexHtml, { hash: opts.hash })
    else child.loadFile(indexHtml)
  }

  child.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  return child
}

/** 向所有窗口广播（跨窗口通信演示：主进程转发） */
export function broadcastToAllWindows(channel: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}
