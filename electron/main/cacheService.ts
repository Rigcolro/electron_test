import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

/**
 * 本地缓存策略（调研 Demo）
 *
 * - 存储位置：userData/cache-store.json（元数据）+ userData/cache-blobs/（可选大对象可放文件，此处仅 JSON）
 * - 有效期：每个 key 记录 expiresAt（毫秒时间戳）
 * - 清理：启动时可清理过期项；也可手动调用 clearExpired()
 *
 * 与 IndexedDB / localStorage 区别：
 * - 这里演示的是「主进程侧文件缓存」，适合给多个窗口共享、或不想暴露给页面的数据。
 * - 渲染进程大量结构化数据可优先考虑 IndexedDB（异步、容量更大）。
 */
type CacheEntry<T> = {
  value: T
  expiresAt: number | null
  updatedAt: number
}

const manifestFile = () => path.join(app.getPath('userData'), 'cache-store.json')

function readManifest(): Record<string, CacheEntry<unknown>> {
  const f = manifestFile()
  if (!fs.existsSync(f)) return {}
  try {
    const raw = fs.readFileSync(f, 'utf8')
    return JSON.parse(raw) as Record<string, CacheEntry<unknown>>
  } catch {
    return {}
  }
}

function writeManifest(data: Record<string, CacheEntry<unknown>>) {
  fs.mkdirSync(path.dirname(manifestFile()), { recursive: true })
  fs.writeFileSync(manifestFile(), JSON.stringify(data, null, 2), 'utf8')
}

export function cacheSet<T>(key: string, value: T, ttlMs: number | null) {
  const all = readManifest()
  const now = Date.now()
  all[key] = {
    value,
    expiresAt: ttlMs == null ? null : now + ttlMs,
    updatedAt: now,
  }
  writeManifest(all)
}

export function cacheGet<T>(key: string): T | null {
  const all = readManifest()
  const hit = all[key]
  if (!hit) return null
  if (hit.expiresAt != null && Date.now() > hit.expiresAt) {
    delete all[key]
    writeManifest(all)
    return null
  }
  return hit.value as T
}

export function cacheClearExpired() {
  const all = readManifest()
  const now = Date.now()
  let removed = 0
  for (const k of Object.keys(all)) {
    const e = all[k]
    if (e.expiresAt != null && now > e.expiresAt) {
      delete all[k]
      removed++
    }
  }
  writeManifest(all)
  return removed
}

export function cacheStats() {
  const all = readManifest()
  const now = Date.now()
  let valid = 0
  let expired = 0
  for (const k of Object.keys(all)) {
    const e = all[k]
    if (e.expiresAt != null && now > e.expiresAt) expired++
    else valid++
  }
  return {
    file: manifestFile(),
    keysTotal: Object.keys(all).length,
    keysValidApprox: valid,
    keysExpiredApprox: expired,
  }
}
