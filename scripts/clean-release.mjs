#!/usr/bin/env node
/**
 * 打包前清理 release/，并尽量结束上一次从 win-unpacked / 安装目录启动的 Demo，
 * 避免无法覆盖 app.asar（EBUSY / file in use）。
 * 注意：不要全局结束 electron.exe，否则会误杀 Cursor 等其它 Electron 应用。
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = process.cwd()
const releaseDir = path.join(root, 'release')

function tryKillWindowsDemo() {
  if (process.platform !== 'win32') return
  try {
    execSync('taskkill /IM "企微调研Demo.exe" /F', { stdio: 'ignore' })
    console.log('[clean-release] taskkill: 企微调研Demo.exe')
  } catch {
    /* 未运行 */
  }
  try {
    execSync(
      `powershell -NoProfile -Command "Stop-Process -Name '企微调研Demo' -Force -ErrorAction SilentlyContinue"`,
      { stdio: 'ignore' }
    )
  } catch {
    /* ignore */
  }
}

async function rmReleaseDir() {
  if (!fs.existsSync(releaseDir)) return

  for (let i = 0; i < 12; i++) {
    tryKillWindowsDemo()
    try {
      fs.rmSync(releaseDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
      console.log('[clean-release] 已删除 release 目录')
      return
    } catch (e) {
      if (i === 11) {
        const err = /** @type NodeJS.ErrnoException */ (e)
        console.error(
          [
            '[clean-release] 仍无法删除 release/（文件被占用）。请手动：',
            '1) 关掉所有「企微调研Demo」窗口（含从 release\\\\...\\\\win-unpacked 启动的）；',
            '2) 任务管理器结束「企微调研Demo」进程；',
            '3) 关闭 pnpm dev，避免 better_sqlite3.node / 构建目录被锁；',
            '4) 暂时关闭杀毒对项目目录的实时扫描后重试。',
            `最后错误: ${err.code ?? ''} ${err.message}`,
          ].join('\n')
        )
        process.exit(1)
      }
      console.warn(`[clean-release] 删除 release/ 重试 ${i + 1}/12…`)
      await delay(400 + i * 150)
    }
  }
}

await rmReleaseDir()
