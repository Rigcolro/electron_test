<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { IPC_CHANNELS } from '@ipc/channels'

type Row = {
  id: number
  title: string
  body: string
  image_url: string | null
  created_at: number
}

const loading = ref(false)
const page = ref(1)
const pageSize = ref(8)
const total = ref(0)
const rows = ref<Row[]>([])

const seedCount = ref(80)
const txHint = ref('')
const perfMs = ref<string>('')

async function loadPage() {
  loading.value = true
  try {
    const res = (await window.electronAPI.invoke(IPC_CHANNELS.SQLITE_MESSAGES_PAGE, {
      page: page.value,
      pageSize: pageSize.value,
    })) as { rows: Row[]; total: number }
    rows.value = res.rows
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function seed() {
  loading.value = true
  try {
    await window.electronAPI.invoke(IPC_CHANNELS.SQLITE_SEED_DEMO, { count: seedCount.value })
    ElMessage.success('已写入演示数据（事务批量插入）')
    page.value = 1
    await loadPage()
  } finally {
    loading.value = false
  }
}

async function runTx(success: boolean) {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.SQLITE_TX_DEMO, { success })) as {
    ok: boolean
    error?: string
  }
  txHint.value = res.ok ? '事务提交成功（两条都写入）' : `事务回滚：${res.error ?? ''}`
  await loadPage()
}

async function perf() {
  const res = (await window.electronAPI.invoke(IPC_CHANNELS.PERF_SQLITE_BATCH, 8000)) as {
    count: number
    ms: number
  }
  perfMs.value = `批量插入 ${res.count} 条，耗时 ${res.ms} ms（单事务）`
}

onMounted(() => {
  void loadPage()
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
          <span class="font-medium">位置</span>：数据库文件位于 <code>userData/app-demo.sqlite</code>（WAL 模式）。
        </p>
        <p>
          <span class="font-medium">查询策略</span>：列表接口强制分页（LIMIT/OFFSET），避免一次性读取全表造成卡顿与内存尖峰。
        </p>
        <p>
          <span class="font-medium">图片</span>：下方表格使用 <code>el-image</code> 的懒加载，避免首屏并发请求过多。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="rounded-2xl border border-slate-200/70">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="font-semibold">Demo：分页列表</div>
          <div class="flex flex-wrap items-center gap-2">
            <el-input-number v-model="seedCount" :min="1" :max="5000" />
            <el-button type="primary" :loading="loading" @click="seed">写入演示数据</el-button>
            <el-button :loading="loading" @click="loadPage">刷新当前页</el-button>
            <el-button @click="perf">性能：批量插入 8000 条</el-button>
          </div>
        </div>
      </template>

      <div v-if="perfMs" class="mb-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
        {{ perfMs }}
      </div>

      <div class="mb-4 flex flex-wrap gap-2">
        <el-button @click="runTx(true)">事务成功（两条插入）</el-button>
        <el-button @click="runTx(false)">事务失败（触发回滚）</el-button>
      </div>
      <div class="mb-4 text-xs text-slate-600">{{ txHint }}</div>

      <el-table v-loading="loading" :data="rows" stripe class="w-full rounded-xl" style="width: 100%">
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column label="预览图" width="160">
          <template #default="{ row }">
            <el-image
              v-if="row.image_url"
              class="h-[72px] w-[120px] rounded-lg"
              :src="row.image_url"
              lazy
              fit="cover"
            />
            <span v-else class="text-xs text-slate-400">无图</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column prop="body" label="内容" min-width="220" show-overflow-tooltip />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[8, 12, 20]"
          @current-change="loadPage"
          @size-change="loadPage"
        />
      </div>
    </el-card>
  </div>
</template>
