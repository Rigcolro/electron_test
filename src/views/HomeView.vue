<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const cards = [
  {
    title: '进程通信（IPC）',
    desc: '主进程 ↔ 渲染进程 invoke；主进程向多窗口广播（跨窗口）。',
    to: '/ipc',
    accent: 'from-sky-500/20 to-indigo-500/10',
  },
  {
    title: '本地缓存策略',
    desc: 'userData 元数据 + TTL + 过期清理；附 electron-store 配置演示。',
    to: '/cache',
    accent: 'from-emerald-500/20 to-teal-500/10',
  },
  {
    title: 'SQLite（better-sqlite3）',
    desc: '主进程持库；分页查询；事务；批量写入性能基准。',
    to: '/sqlite',
    accent: 'from-fuchsia-500/15 to-violet-500/10',
  },
  {
    title: '原生能力',
    desc: '多窗口 / 模态窗 / 托盘 / 快捷键 / 通知。',
    to: '/native',
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  {
    title: '工程化与安全',
    desc: '构建、更新占位、日志、文件权限、加密与签名说明。',
    to: '/engineering',
    accent: 'from-slate-500/15 to-slate-700/10',
  },
]
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/60 bg-white/70 p-7 shadow-sm backdrop-blur">
      <div class="text-2xl font-semibold text-slate-900">仿企业微信基础聊天：桌面端前置调研</div>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        本应用用于验证 Electron 在「多窗口、持久化、系统能力、工程化」等维度的可行性与风险点。左侧菜单按模块拆分 Demo。
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="c in cards"
        :key="c.to"
        type="button"
        class="group rounded-2xl border border-slate-200/70 bg-white/70 p-5 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
        @click="router.push(c.to)"
      >
        <div
          class="h-20 rounded-xl bg-gradient-to-br p-4"
          :class="c.accent"
        >
          <div class="text-base font-semibold text-slate-900">{{ c.title }}</div>
        </div>
        <div class="mt-3 text-sm text-slate-600">{{ c.desc }}</div>
        <div class="mt-4 text-xs font-medium text-sky-700 opacity-0 transition group-hover:opacity-100">
          进入模块 →
        </div>
      </button>
    </div>
  </div>
</template>
