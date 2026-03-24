<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const active = computed(() => route.path || '/')

const platform = window.electronAPI?.platform ?? 'web'
</script>

<template>
  <div class="min-h-full">
    <el-container class="min-h-full">
      <el-aside width="240px" class="aside-panel border-r border-slate-200/80 bg-white/70 backdrop-blur">
        <div class="px-5 py-6">
          <div class="text-lg font-semibold tracking-tight text-slate-900">企微调研 Demo</div>
          <div class="mt-1 text-xs text-slate-500">
            平台：<span class="font-mono">{{ platform }}</span>
          </div>
        </div>
        <el-menu :default-active="active" router class="border-none bg-transparent px-2 pb-6">
          <el-menu-item index="/">
            <span>总览</span>
          </el-menu-item>
          <el-menu-item index="/ipc">
            <span>进程通信（IPC）</span>
          </el-menu-item>
          <el-menu-item index="/cache">
            <span>本地缓存</span>
          </el-menu-item>
          <el-menu-item index="/sqlite">
            <span>SQLite</span>
          </el-menu-item>
          <el-menu-item index="/native">
            <span>原生能力</span>
          </el-menu-item>
          <el-menu-item index="/engineering">
            <span>工程化与安全</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header
          height="64px"
          class="header-bar flex items-center border-b border-slate-200/80 bg-white/60 backdrop-blur"
        >
          <div class="text-sm text-slate-600">
            {{ route.meta.title ?? '调研导航' }}
          </div>
        </el-header>
        <el-main class="main-shell">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.aside-panel :deep(.el-menu-item.is-active) {
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(99, 102, 241, 0.12));
}

.main-shell {
  padding: 22px 26px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 160ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
