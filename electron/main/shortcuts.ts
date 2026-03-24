import { globalShortcut } from 'electron'

/**
 * 全局快捷键：在 app ready 后注册，在 app will-quit 前注销。
 * 注意：与系统或其他应用冲突时可能注册失败，需要降级提示。
 */

export function registerDemoShortcuts(opts: { onToggleDevTools: () => void }) {
  const ok = globalShortcut.register('CommandOrControl+Shift+I', () => {
    opts.onToggleDevTools()
  })
  return { toggleDevtoolsRegistered: ok }
}

export function unregisterAll() {
  globalShortcut.unregisterAll()
}
