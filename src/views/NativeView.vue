<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { IPC_CHANNELS } from '@ipc/channels'

async function openChild() {
  await window.electronAPI.invoke(IPC_CHANNELS.WINDOW_OPEN_CHILD)
  ElMessage.info('已请求打开子窗口（独立 BrowserWindow）')
}

async function openModal() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.WINDOW_OPEN_MODAL)) as {
    ok: boolean
    error?: string
  }
  if (!res.ok) ElMessage.error(res.error ?? '打开失败')
}

async function notify() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.NOTIFICATION_SHOW, {
    title: '企微调研 Demo',
    body: '这是一条系统通知（需系统通知权限）',
  })) as { ok: boolean; error?: string }
  if (!res.ok) ElMessage.warning(res.error ?? '通知不可用')
}

async function log() {
  await window.electronAPI.invoke(IPC_CHANNELS.LOG_WRITE, `用户点击写入日志：${new Date().toISOString()}`)
  ElMessage.success('已写入主进程日志文件（userData/logs）')
}
</script>

<template>
  <div class="space-y-5">
    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">说明</div>
      </template>
      <div class="space-y-2 text-sm text-slate-700">
        <p>
          <span class="font-medium">多窗口</span>：每个窗口一个 <code>BrowserWindow</code>；路由使用 hash，子窗口加载同一套页面但入口 hash 不同。
        </p>
        <p>
          <span class="font-medium">模态窗口</span>：<code>modal: true</code> 且指定 <code>parent</code>，阻塞父窗口交互（平台表现略有差异）。
        </p>
        <p>
          <span class="font-medium">托盘</span>：应用启动即创建（见主进程）；这里演示通知与日志。
        </p>
        <p>
          <span class="font-medium">快捷键</span>：主进程注册 <code>CommandOrControl+Shift+I</code> 切换 DevTools。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="font-semibold">Demo</div>
      </template>

      <div class="flex flex-wrap gap-3">
        <el-button type="primary" @click="openChild">打开子窗口（#/child）</el-button>
        <el-button @click="openModal">打开模态窗口（#/modal）</el-button>
        <el-button @click="notify">发送系统通知</el-button>
        <el-button @click="log">写入本地日志</el-button>
      </div>
    </el-card>
  </div>
</template>
