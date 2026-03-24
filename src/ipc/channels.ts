/**
 * IPC 通道名集中定义（主进程 / preload / 渲染进程需保持一致）
 *
 * 为什么要有白名单：
 * - 渲染进程通过 preload 暴露的 API 调用主进程时，只应允许「已知业务通道」，
 *   避免任意字符串通道被滥用（减少攻击面）。
 */
export const IPC_CHANNELS = {
  /** 健康检查：验证主进程与 IPC 链路 */
  PING: 'demo:ping',

  /** SQLite：分页查询消息列表（禁止一次性全量拉取） */
  SQLITE_MESSAGES_PAGE: 'sqlite:messages:page',
  /** SQLite：写入演示数据（内部使用事务批量插入） */
  SQLITE_SEED_DEMO: 'sqlite:seed:demo',
  /** SQLite：演示事务：要么全部成功要么回滚 */
  SQLITE_TX_DEMO: 'sqlite:tx:demo',

  /** 本地缓存：写入带过期时间的键值 */
  CACHE_SET: 'cache:set',
  CACHE_GET: 'cache:get',
  CACHE_CLEAR_EXPIRED: 'cache:clearExpired',
  CACHE_STATS: 'cache:stats',

  /** electron-store：简单键值（用于「应用配置类」持久化演示） */
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',

  /** 窗口：打开子窗口 / 模态窗口 */
  WINDOW_OPEN_CHILD: 'window:openChild',
  WINDOW_OPEN_MODAL: 'window:openModal',
  /** 跨窗口广播：主进程向所有窗口发消息 */
  BROADCAST_TEST: 'broadcast:test',

  /** 系统能力 */
  NOTIFICATION_SHOW: 'native:notification',
  TRAY_BALLOON: 'native:trayBalloon',

  /** 安全：敏感字符串加解密（演示用，基于 safeStorage） */
  CRYPTO_ENCRYPT: 'security:encrypt',
  CRYPTO_DECRYPT: 'security:decrypt',
  SAFE_STORAGE_AVAILABLE: 'security:safeStorageAvailable',

  /** 日志：写入本地日志文件（演示） */
  LOG_WRITE: 'log:write',

  /** 更新：检查更新（占位，需配置 publish 地址） */
  UPDATER_CHECK: 'updater:check',

  /** 性能：简单基准测试 */
  PERF_SQLITE_BATCH: 'perf:sqliteBatch',
} as const

/**
 * 仅用于 preload 的 `ipcRenderer.on` 白名单（主进程主动推送的事件名）
 */
export const IPC_PUSH_CHANNELS = ['main-process-message', 'demo:broadcast'] as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
