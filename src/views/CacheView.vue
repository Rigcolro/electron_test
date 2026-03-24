<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { IPC_CHANNELS } from '@ipc/channels'

const key = ref('demoKey')
const value = ref('demoValue')
const ttlSeconds = ref(30)
const readBack = ref<string>('')
const statsText = ref<string>('')

async function writeCache() {
  await window.electronAPI.invoke(IPC_CHANNELS.CACHE_SET, {
    key: key.value,
    value: { v: value.value, n: Date.now() },
    ttlMs: ttlSeconds.value > 0 ? ttlSeconds.value * 1000 : null,
  })
  ElMessage.success('已写入（带 TTL 元数据）')
}

async function readCache() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.CACHE_GET, { key: key.value })) as {
    value: unknown
  }
  readBack.value = res.value == null ? '（未命中或已过期）' : JSON.stringify(res.value)
}

async function clearExpired() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.CACHE_CLEAR_EXPIRED)) as { removed: number }
  ElMessage.success(`清理过期项：${res.removed}`)
}

async function stats() {
  const s = (await window.electronAPI.invoke(IPC_CHANNELS.CACHE_STATS)) as Record<string, unknown>
  statsText.value = JSON.stringify(s, null, 2)
}

async function themeRoundTrip() {
  const cur = (await window.electronAPI.invoke(IPC_CHANNELS.STORE_GET, 'theme')) as string | undefined
  const next = cur === 'dark' ? 'light' : 'dark'
  await window.electronAPI.invoke(IPC_CHANNELS.STORE_SET, { key: 'theme', value: next })
  ElMessage.success(`electron-store：theme 切换为 ${next}（持久化在 userData）`)
}

onMounted(() => {
  void stats()
})
</script>

<template>
  <div class="space-y-5">
    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">说明</div>
      </template>
      <div class="space-y-2 text-sm text-slate-700">
        <p>
          <span class="font-medium">存储位置</span>：本 Demo 将缓存元数据写入应用的
          <code>userData</code> 目录（不同操作系统路径不同，可用下方 stats 查看文件路径）。
        </p>
        <p>
          <span class="font-medium">有效期</span>：每个 key 记录 <code>expiresAt</code>；读取时若过期则删除并返回未命中。
        </p>
        <p>
          <span class="font-medium">清理机制</span>：应用启动时会做一次过期清理；也可手动触发清理。
        </p>
        <p>
          <span class="font-medium">electron-store</span>：更适合「小型配置/开关」，同样是 userData 下的 JSON（与业务缓存分层）。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">Demo：TTL 缓存 + electron-store</div>
      </template>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="space-y-3">
          <el-form label-position="top">
            <el-form-item label="Key">
              <el-input v-model="key" />
            </el-form-item>
            <el-form-item label="Value（写入 JSON 对象）">
              <el-input v-model="value" />
            </el-form-item>
            <el-form-item label="TTL（秒，0 表示不过期）">
              <el-input-number v-model="ttlSeconds" :min="0" :max="86400" />
            </el-form-item>
          </el-form>

          <div class="flex flex-wrap gap-2">
            <el-button type="primary" @click="writeCache">写入</el-button>
            <el-button @click="readCache">读取</el-button>
            <el-button @click="clearExpired">清理过期</el-button>
            <el-button @click="stats">刷新统计</el-button>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-xs font-medium text-slate-500">读取结果</div>
            <div class="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800">
              {{ readBack }}
            </div>
          </div>
          <div>
            <div class="text-xs font-medium text-slate-500">cache stats</div>
            <div class="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800">
              {{ statsText || '（空）' }}
            </div>
          </div>
          <el-button @click="themeRoundTrip">切换 theme（electron-store）</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>
