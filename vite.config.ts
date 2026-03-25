import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'
/**
 * 主进程/Preload 不得把业务依赖全部 external：
 * 安装包只含 dist / dist-electron / package.json，无完整 node_modules；
 * 链式 ESM 子路径（如 conf → ajv/dist/2020.js）在 asar 里常会缺文件导致 ERR_MODULE_NOT_FOUND。
 * 仅外置 Electron 运行时与带 .node 的原生模块。
 */
const electronMainExternal = ['electron', 'better-sqlite3']
const preloadExternal = ['electron']

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  fs.rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  /** 供主进程构建时读取（与 .env.* 中 VITE_ 变量对齐） */
  Object.assign(process.env, env)

  return {
    resolve: {
      alias: {
        '@ipc': path.resolve(__dirname, 'src/ipc'),
      },
    },
    plugins: [
      vue(),
      electron({
        main: {
          entry: 'electron/main/index.ts',
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log('[startup] Electron App')
            } else {
              startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: electronMainExternal,
              },
            },
          },
        },
        preload: {
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined,
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: preloadExternal,
              },
            },
          },
        },
        renderer: {},
      }),
    ],
    server:
      process.env.VSCODE_DEBUG &&
      (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
        return {
          host: url.hostname,
          port: +url.port,
        }
      })(),
    clearScreen: false,
    build: {
      /** 压缩体积：生产包去除 console / debugger；测试包仅去除 debugger，保留日志便于验收 */
      esbuild: isBuild
        ? {
            legalComments: 'none',
            ...(mode === 'production'
              ? { drop: ['console', 'debugger'] as const }
              : mode === 'test'
                ? { drop: ['debugger'] as const }
                : {}),
          }
        : undefined,
      /** Element Plus 全量引入会导致单 chunk 偏大；调研阶段先放宽告警阈值，后续可改按需引入进一步瘦身 */
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
            'element-plus': ['element-plus'],
          },
        },
      },
    },
  }
})
