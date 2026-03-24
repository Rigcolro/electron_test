import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

/**
 * 极简文件日志（调研用）
 *
 * 生产环境可替换为：
 * - electron-log（落盘 + 控制台）
 * - 或上报 Sentry / 自建采集端
 */
const logsDir = () => path.join(app.getPath('userData'), 'logs')

function ensureLogsDir() {
  fs.mkdirSync(logsDir(), { recursive: true })
}

export function logLine(level: 'info' | 'warn' | 'error', message: string) {
  ensureLogsDir()
  const line = `${new Date().toISOString()} [${level}] ${message}\n`
  const file = path.join(logsDir(), 'app.log')
  fs.appendFileSync(file, line, 'utf8')
  if (level === 'error') console.error(message)
  else if (level === 'warn') console.warn(message)
  else console.log(message)
}
