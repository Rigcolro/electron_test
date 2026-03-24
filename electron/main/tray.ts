import { app, Menu, Tray, nativeImage } from 'electron'
import type { NativeImage } from 'electron'

/**
 * 系统托盘：Windows / macOS 均支持。
 * Windows 下托盘图标建议使用 PNG / ICO（不要用 SVG）。
 */

let tray: Tray | null = null

export function createTray(opts: { icon: NativeImage; onShowMain: () => void }) {
  if (tray) return tray

  tray = new Tray(opts.icon)

  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => opts.onShowMain(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ])
  tray.setToolTip('企微调研 Demo')
  tray.setContextMenu(menu)
  return tray
}

/** 生成简单占位图标（避免依赖外部资源文件） */
export function createPlaceholderTrayIcon() {
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lc4g+wAAAABJRU5ErkJggg==',
    'base64'
  )
  return nativeImage.createFromBuffer(tinyPng)
}

export function destroyTray() {
  tray?.destroy()
  tray = null
}
