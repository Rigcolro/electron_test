import path from 'node:path'
import crypto from 'node:crypto'
import { app, safeStorage } from 'electron'

/**
 * 校验路径是否位于 userData 之下，防止「路径穿越」读写任意磁盘文件。
 * 业务若允许用户选择目录，应始终做类似校验。
 */
export function assertPathInsideUserData(candidatePath: string) {
  const root = app.getPath('userData')
  const resolved = path.resolve(candidatePath)
  const normalizedRoot = path.resolve(root)
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error('拒绝访问：路径不在应用 userData 目录内')
  }
}

/**
 * 使用操作系统提供的 safeStorage（Windows: DPAPI，macOS: Keychain）加密短字符串。
 * 适合加密「需要落盘的小密钥 / token」，不适合加密大文件。
 */
export function encryptSensitive(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前环境不可用 safeStorage 加密（常见于部分 Linux 无密钥环）')
  }
  const buf = safeStorage.encryptString(plain)
  return buf.toString('base64')
}

export function decryptSensitive(encoded: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前环境不可用 safeStorage 解密')
  }
  const buf = Buffer.from(encoded, 'base64')
  return safeStorage.decryptString(buf)
}

/**
 * 演示：不依赖 safeStorage 的 AES-256-GCM（用于说明「应用层对称加密」形态）
 * 注意：真实业务中密钥来源与轮换策略要单独设计。
 */
export function aesGcmEncrypt(plain: string, key: Buffer): { iv: string; tag: string; data: string } {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  }
}
