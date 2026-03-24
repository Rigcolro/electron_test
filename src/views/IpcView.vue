<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { IPC_CHANNELS } from '@ipc/channels'

const pingResult = ref<string>('')
const mainMsg = ref<string>('')
const broadcastLog = ref<string[]>([])

let offMain: (() => void) | null = null
let offBroadcast: (() => void) | null = null

async function ping() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.PING)) as {
    pong: boolean
    at: number
    pid: number
  }
  pingResult.value = `pong=${res.pong}, pid=${res.pid}, at=${new Date(res.at).toLocaleString()}`
  ElMessage.success('主进程响应成功（invoke）')
}

async function broadcast() {
  await window.electronAPI.invoke(IPC_CHANNELS.BROADCAST_TEST, { text: `hello-${Date.now()}` })
  ElMessage.info('已请求主进程向所有窗口广播')
}

onMounted(() => {
  offMain = window.electronAPI.on('main-process-message', (...args: unknown[]) => {
    mainMsg.value = String(args[0] ?? '')
  })
  offBroadcast = window.electronAPI.on('demo:broadcast', (...args: unknown[]) => {
    const payload = args[0] as { text?: string; at?: number }
    broadcastLog.value.unshift(`${new Date(payload.at ?? Date.now()).toLocaleTimeString()} — ${payload.text ?? ''}`)
    broadcastLog.value = broadcastLog.value.slice(0, 12)
  })
})

onBeforeUnmount(() => {
  offMain?.()
  offBroadcast?.()
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
          <span class="font-medium">主进程 → 渲染进程</span>：常用 <code>webContents.send</code>，页面侧用
          <code>preload</code> 暴露的 <code>on</code> 订阅（本 Demo 限制监听白名单）。
        </p>
        <p>
          <span class="font-medium">渲染进程 → 主进程</span>：推荐 <code>ipcMain.handle</code> +
          <code>ipcRenderer.invoke</code>（Promise 友好）。
        </p>
        <p>
          <span class="font-medium">跨窗口</span>：窗口 A 不直接访问窗口 B 的 DOM；通常由主进程转发消息（此处演示主进程广播）。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">Demo</div>
      </template>

      <div class="flex flex-wrap gap-3">
        <el-button type="primary" @click="ping">invoke：ping 主进程</el-button>
        <el-button @click="broadcast">广播一条消息（所有窗口接收）</el-button>
      </div>

      <el-divider />

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div class="text-xs font-medium text-slate-500">ping 返回</div>
          <div class="mt-2 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800">
            {{ pingResult || '（空）' }}
          </div>
        </div>
        <div>
          <div class="text-xs font-medium text-slate-500">主进程页面加载后推送</div>
          <div class="mt-2 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800">
            {{ mainMsg || '（等待 did-finish-load 推送）' }}
          </div>
        </div>
      </div>

      <div class="mt-4">
        <div class="text-xs font-medium text-slate-500">广播记录（最新在上）</div>
        <div class="mt-2 max-h-56 overflow-auto rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800">
          <div v-for="(line, idx) in broadcastLog" :key="idx">{{ line }}</div>
          <div v-if="broadcastLog.length === 0" class="text-slate-400">暂无</div>
        </div>
      </div>
    </el-card>
  </div>
</template>
