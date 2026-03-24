<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 子窗口页面：用于演示「同一套前端资源，多个 BrowserWindow」。
 * 跨窗口通信请回到主窗口的 IPC 页面触发广播。
 */

const lines = ref<string[]>([])

let off: (() => void) | null = null

onMounted(() => {
  off = window.electronAPI.on('demo:broadcast', (...args: unknown[]) => {
    const payload = args[0] as { text?: string; at?: number }
    lines.value.unshift(`${new Date(payload.at ?? Date.now()).toLocaleTimeString()} — ${payload.text ?? ''}`)
    lines.value = lines.value.slice(0, 20)
  })
})

onBeforeUnmount(() => {
  off?.()
})
</script>

<template>
  <div class="space-y-4">
    <el-alert
      title="这是子窗口（独立 BrowserWindow）"
      type="info"
      show-icon
      :closable="false"
      description="你可以同时打开主窗口与本窗口；在主窗口触发广播，这里也会收到。"
    />

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">本窗口收到的广播</div>
      </template>
      <div class="max-h-72 overflow-auto rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800">
        <div v-for="(l, idx) in lines" :key="idx">{{ l }}</div>
        <div v-if="lines.length === 0" class="text-slate-400">暂无（去主窗口 IPC 页触发广播）</div>
      </div>
    </el-card>
  </div>
</template>
