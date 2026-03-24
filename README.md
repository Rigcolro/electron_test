# 企微调研 Demo（Electron + Vue3 + Element Plus）

仿「企业微信基础聊天」前置调研的桌面端示例工程，覆盖 **进程通信、本地缓存、SQLite、窗口/托盘/通知、工程化与安全** 等维度，代码注释面向不熟悉 Electron 的前端同学。

## 技术栈（稳定版）

- **Electron** + **vite-plugin-electron**（与官方 `electron-vite-vue` 模板同源思路）
- **Vue 3** + **Vue Router（Hash）** + **Element Plus** + **Tailwind CSS**
- **better-sqlite3**（主进程）+ **electron-store**（配置持久化演示）
- **ESLint + Prettier**

## 环境要求

- **Node.js ≥ 18**（推荐 **20/22 LTS**）
- **pnpm**（推荐）或 npm

> 若你本机默认 Node 较旧，请用 nvm / fnm 切换到 18+，否则安装依赖可能失败。

## 安装与运行

```bash
pnpm install
pnpm dev
```

开发模式下会启动 Vite 开发服务器（默认端口见 `package.json` 的 `debug.env.VITE_DEV_SERVER_URL`），并拉起 Electron 主进程。

## 生产构建与打包

```bash
# 仅构建前端 + 主进程/预加载脚本（不生成安装包）
pnpm run build:vite

# 完整打包（electron-builder，生成安装包到 release/<version>/）
pnpm run build
```

### 环境变量（测试 / 生产）

- `.env.development`：本地开发（`pnpm dev` 默认 `development`）
- `.env.production`：生产构建（`vite build` 默认 `production`）

变量需以 **`VITE_`** 开头才能在渲染进程中通过 `import.meta.env` 读取。

## 功能地图（对应左侧菜单）

| 模块 | 说明 |
| --- | --- |
| 总览 | 模块入口与导航 |
| 进程通信（IPC） | `invoke` 调用主进程；主进程 `send` 推送；跨窗口广播 |
| 本地缓存 | `userData` 下 JSON 元数据 + TTL + 过期清理；`electron-store` 配置演示 |
| SQLite | 主进程 `better-sqlite3`；**分页查询**（禁止一次全量）；事务演示；批量写入性能 |
| 原生能力 | 子窗口 / 模态窗 / 系统通知 / 日志写入；托盘与全局快捷键见主进程代码 |
| 工程化与安全 | 构建与体积、`electron-updater` 占位、日志路径、`safeStorage` 加解密演示、文件路径校验说明 |

## 测试用例（建议）

1. **IPC**：在「进程通信」页点击 **ping** 与 **广播**，确认主窗口收到推送；再打开子窗口，确认子窗口同样收到广播。
2. **缓存**：写入 TTL=30s 的键，立即读取成功；等待过期后再读应未命中；点击清理过期项。
3. **SQLite**：先 **写入演示数据**，表格分页切换；观察图片 **懒加载**；分别触发事务成功/失败，列表行数变化符合预期。
4. **原生**：打开子窗口/模态窗；发送系统通知（需系统允许通知）；写入日志后检查 `userData/logs/app.log`。
5. **安全**：在「工程化与安全」页执行 **safeStorage 加密/解密**（Linux 无密钥环时可能不可用）。

## 数据与日志位置（跨平台）

- **SQLite**：`app.getPath('userData')/app-demo.sqlite`
- **缓存清单**：`userData/cache-store.json`
- **electron-store**：`userData/app-settings.json`（默认文件名由 store 配置）
- **日志**：`userData/logs/app.log`

Windows / macOS 的 `userData` 实际路径可在应用内「缓存统计」或系统文档中对照。

## 性能与体验约定（本仓库已实现）

- 列表数据 **分页拉取**，不做一次性全表查询。
- 表格图片使用 **懒加载**（`el-image` + `lazy`）。
- 数据请求使用 **loading** 状态（`v-loading`）。

## 许可证

MIT（模板部分版权归原作者所有，见原 `LICENSE`）。
