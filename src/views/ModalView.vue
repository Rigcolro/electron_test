<script setup lang="ts">
/**
 * 模态窗口页面：配合 BrowserWindow({ modal: true, parent })
 * 用于演示「阻塞父窗口交互」的原生窗口形态（细节因平台略有差异）。
 */
</script>

<template>
  <div class="space-y-4">
    <el-result icon="success" title="模态窗口" sub-title="尝试点击父窗口：通常无法切换焦点回父窗口，直到关闭本窗口。" />
    <div class="text-sm text-slate-600">
      关闭方式：使用系统窗口关闭按钮，或在业务里调用 <code>window.close()</code>（需允许）。
    </div>
  </div>
</template>
