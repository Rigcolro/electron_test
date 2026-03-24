<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IPC_CHANNELS } from '@ipc/channels'

const env = import.meta.env

const lines = computed(() => [
  `VITE_APP_ENV = ${String(env.VITE_APP_ENV ?? '')}`,
  `VITE_APP_TITLE = ${String(env.VITE_APP_TITLE ?? '')}`,
  `MODE = ${String(env.MODE ?? '')}`,
])

async function updater() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.UPDATER_CHECK)) as Record<string, unknown>
  return JSON.stringify(res, null, 2)
}

const updaterText = ref('')

async function refreshUpdater() {
  updaterText.value = await updater()
}

async function safeStorage() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.SAFE_STORAGE_AVAILABLE)) as {
    available: boolean
  }
  return res.available
}

const safeText = ref('检测中…')
const cipherDemo = ref('')

async function refreshSafe() {
  safeText.value = (await safeStorage()) ? '可用（适合加密落盘短密钥）' : '不可用（常见于无密钥环的 Linux）'
}

async function encryptRoundTrip() {
  try {
    const plain = `token-${Date.now()}`
    const enc = (await window.electronAPI.invoke(IPC_CHANNELS.CRYPTO_ENCRYPT, plain)) as { cipher: string }
    const dec = (await window.electronAPI.invoke(IPC_CHANNELS.CRYPTO_DECRYPT, enc.cipher)) as { plain: string }
    cipherDemo.value = `plain=${plain}\ncipher(base64 存盘示例)=${enc.cipher.slice(0, 28)}…\nplain(dec)=${dec.plain}`
  } catch (e) {
    cipherDemo.value = `失败：${(e as Error).message}`
  }
}

onMounted(() => {
  void refreshUpdater()
  void refreshSafe()
})
</script>

<template>
  <div class="space-y-5">
    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">环境变量（.env.*）</div>
      </template>
      <div class="space-y-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-mono text-xs text-slate-800">
        <div v-for="(l, idx) in lines" :key="idx">{{ l }}</div>
      </div>
      <div class="mt-3 text-xs text-slate-600">
        开发使用 <code>.env.development</code>；生产构建使用 <code>.env.production</code>（由 Vite mode 决定）。
      </div>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">打包构建（electron-builder）</div>
      </template>
      <ul class="list-disc space-y-2 pl-5 text-sm text-slate-700">
        <li>
          产物输出目录见 <code>electron-builder.json5</code> 的 <code>directories.output</code>（按版本分目录）。
        </li>
        <li>
          <span class="font-medium">体积优化</span>：生产启用 minify；原生依赖使用 <code>asarUnpack</code> 解压
          <code>better-sqlite3</code>；避免渲染进程引入 Node polyfill。
        </li>
        <li>
          <span class="font-medium">签名</span>：Windows 需要代码签名证书（EV/标准）；macOS 需要 Apple Developer ID 与公证（notarize）。
        </li>
      </ul>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="font-semibold">自动更新（占位）</div>
          <el-button size="small" @click="refreshUpdater">刷新检查结果</el-button>
        </div>
      </template>
      <pre class="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-mono text-xs text-slate-800">{{
        updaterText || '加载中…'
      }}</pre>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">日志 / 异常监控（建议）</div>
      </template>
      <div class="text-sm text-slate-700">
        <p>
          本 Demo 主进程写入 <code>userData/logs/app.log</code>。线上可接入 <code>electron-log</code>、Sentry（渲染进程 +
          主进程）或自建上报。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="font-semibold">安全：本地文件权限与敏感数据</div>
          <div class="flex gap-2">
            <el-button size="small" @click="refreshSafe">检测 safeStorage</el-button>
            <el-button size="small" type="primary" @click="encryptRoundTrip">加密/解密一轮</el-button>
          </div>
        </div>
      </template>

      <div class="space-y-3 text-sm text-slate-700">
        <p>
          <span class="font-medium">文件读写</span>：业务路径应限制在 <code>userData</code> 或用户选择目录；主进程对入参路径做规范化与前缀校验（见
          <code>security.ts</code> 的示例函数）。
        </p>
        <p>
          <span class="font-medium">敏感数据</span>：优先 <code>safeStorage</code>（系统密钥环）；避免把明文密钥写死在仓库。
        </p>
        <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">safeStorage：{{ safeText }}</div>
        <pre class="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800">{{
          cipherDemo || '（点击按钮生成示例）'
        }}</pre>
      </div>
    </el-card>
  </div>
</template>
