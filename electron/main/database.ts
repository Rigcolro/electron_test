import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { logLine } from './logger'

/**
 * better-sqlite3 运行在 Electron「主进程」（Node 环境）。
 *
 * 为什么不直接在渲染进程开库：
 * - 渲染进程默认不应直接访问原生模块与文件系统（安全边界更清晰）。
 * - 通过 IPC 暴露「分页查询」等受限接口，避免页面脚本一次性读取全表。
 *
 * 性能提示：
 * - 批量写入用事务（BEGIN / COMMIT）包裹，可显著快于逐条自动提交。
 * - 为常用查询字段建索引（本 Demo 对 created_at 建索引）。
 */

let db: InstanceType<typeof Database> | null = null

export function getDbPath() {
  return path.join(app.getPath('userData'), 'app-demo.sqlite')
}

export function openDatabase() {
  if (db) return db
  const p = getDbPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  db = new Database(p)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      image_url TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
  `)
  logLine('info', `SQLite 已打开: ${p}`)
  return db
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

/** 分页查询：禁止一次性 SELECT * 全表（Demo 强制 LIMIT） */
export function listMessagesPage(page: number, pageSize: number) {
  const d = openDatabase()
  const offset = Math.max(0, (page - 1) * pageSize)
  const limit = Math.min(100, Math.max(1, pageSize))
  const rows = d
    .prepare(
      `SELECT id, title, body, image_url, created_at FROM messages
       ORDER BY id DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<{
    id: number
    title: string
    body: string
    image_url: string | null
    created_at: number
  }>
  const totalRow = d.prepare(`SELECT COUNT(1) as c FROM messages`).get() as { c: number }
  return { rows, total: totalRow.c, page, pageSize: limit }
}

/** 演示事务：要么两条都插入成功，要么都不插入 */
export function demoTransaction(success: boolean) {
  const d = openDatabase()
  const run = d.transaction(() => {
    d.prepare(`INSERT INTO messages(title, body, created_at) VALUES (?, ?, ?)`).run(
      '事务消息 A',
      success ? '本条与下条在同一事务内' : '将触发失败',
      Date.now()
    )
    if (!success) {
      throw new Error('演示：主动失败以触发回滚')
    }
    d.prepare(`INSERT INTO messages(title, body, created_at) VALUES (?, ?, ?)`).run(
      '事务消息 B',
      '若上条失败，整条事务回滚',
      Date.now()
    )
  })
  try {
    run()
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: (e as Error).message }
  }
}

/** 批量造数：单事务插入多行，用于对比性能 */
export function seedDemoRows(count: number) {
  const d = openDatabase()
  const n = Math.min(5000, Math.max(1, count))
  const insert = d.prepare(
    `INSERT INTO messages(title, body, image_url, created_at) VALUES (?, ?, ?, ?)`
  )
  const run = d.transaction(() => {
    for (let i = 0; i < n; i++) {
      insert.run(
        `演示消息 ${i + 1}`,
        '用于分页与懒加载图片演示。'.repeat(3),
        `https://picsum.photos/seed/${i + 1}/640/400`,
        Date.now() - i * 1000
      )
    }
  })
  run()
  return { inserted: n }
}

/** 性能演示：批量插入计时 */
export function perfBatchInsert(count: number) {
  const d = openDatabase()
  const n = Math.min(20000, Math.max(1, count))
  const insert = d.prepare(
    `INSERT INTO messages(title, body, created_at) VALUES (?, ?, ?)`
  )
  const t0 = process.hrtime.bigint()
  const run = d.transaction(() => {
    for (let i = 0; i < n; i++) {
      insert.run(`perf-${i}`, 'x', Date.now())
    }
  })
  run()
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  return { count: n, ms: Math.round(ms * 100) / 100 }
}
