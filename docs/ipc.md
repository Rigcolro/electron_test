# Electron 进程间通信（IPC）机制详解

# 一、前言

Electron 应用基于主进程（Main Process）和渲染进程（Renderer Process）的架构设计，进程间相互隔离，无法直接共享数据或调用方法。因此，Electron 提供了一套完善的进程间通信（IPC）机制，用于实现主进程与渲染进程、渲染进程与渲染进程（跨窗口）之间的通信，是 Electron 开发的核心知识点之一。

本文将详细讲解 Electron 进程间通信的核心原理、常用方式、实现步骤及最佳实践，覆盖主进程与渲染进程通信、跨窗口通信的全场景，适配 Electron 10+ 安全规范。

# 二、核心进程概念

在学习 IPC 机制前，需明确 Electron 中两个核心进程的定位，二者的隔离性是 IPC 存在的前提。

## 2.1 主进程（Main Process）

- 运行入口为项目根目录的 `main.js`，是 Electron 应用的核心进程，整个应用只有一个主进程。

- 拥有完整的 Node.js 环境和 Electron 原生 API 调用权限，负责管理应用的生命周期、窗口创建与销毁、系统托盘、菜单、文件操作、网络请求等全局操作。

- 通过 `ipcMain` 模块监听和处理来自渲染进程的消息。

## 2.2 渲染进程（Renderer Process）

- 每个窗口（`BrowserWindow`）对应一个独立的渲染进程，负责渲染网页内容（HTML/CSS/JS、Vue/React 等前端框架）。

- 默认情况下，渲染进程处于安全隔离状态，**无法直接访问 Node.js 环境和 Electron 原生 API**（需通过预加载脚本桥接）。

- 通过 `ipcRenderer` 模块向主进程发送消息、监听主进程的响应。

## 2.3 进程隔离核心原因

为了保障应用安全，Electron 开启了上下文隔离（`contextIsolation: true`），将渲染进程的 JavaScript 上下文与 Node.js 上下文分离，避免前端代码恶意调用系统资源，因此必须通过 IPC 机制实现进程间的数据交互。

# 三、IPC 核心基础配置（必做）

现代 Electron 项目（10+ 版本）必须遵循安全规范，通过预加载脚本（`preload.js`）作为主进程与渲染进程的通信桥梁，禁止直接在渲染进程中使用 Node.js 或 IPC 模块。

## 3.1 窗口配置（main.js）

创建窗口时，需在 `webPreferences` 中配置上下文隔离、预加载脚本路径，关闭直接 Node 集成：

```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,  // 必须开启：上下文隔离，保障安全
      nodeIntegration: false,  // 必须关闭：禁止渲染进程直接访问 Node.js
      preload: path.join(__dirname, 'preload.js')  // 预加载脚本，通信桥梁
    }
  })

  // 加载渲染页面（本地文件或开发服务器地址）
  win.loadFile('index.html')
  // 打开开发者工具（调试用）
  win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

```

## 3.2 预加载脚本（preload.js）

预加载脚本在渲染进程加载前执行，拥有 Node.js 环境权限，通过`contextBridge` 向渲染进程暴露安全的 IPC 接口，避免直接暴露 `ipcRenderer` 模块带来的安全风险。

```javascript
const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程的全局作用域暴露 API（命名为 electronAPI，可自定义）
contextBridge.exposeInMainWorld('electronAPI', {
  // 1. 渲染进程 → 主进程：单向发送消息
  sendToMain: (channel, data) => ipcRenderer.send(channel, data),

  // 2. 主进程 → 渲染进程：监听主进程消息
  onMainMessage: (channel, callback) => {
    // 过滤合法频道，避免恶意调用
    const validChannels = ['reply-from-main', 'broadcast-msg']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
    }
  },

  // 3. 双向通信：渲染进程发起请求，主进程处理后返回结果
  invokeMain: (channel, data) => ipcRenderer.invoke(channel, data),

  // 4. 跨窗口通信：向主进程发送跨窗口消息
  sendToOtherWindow: (data) => ipcRenderer.send('cross-window-msg', data)
})

```

说明：通过 `validChannels` 过滤合法频道，可进一步提升安全性，避免渲染进程滥用 IPC 接口。

# 四、主进程 ↔ 渲染进程通信（核心场景）

主进程与渲染进程的通信是最常用的场景，分为单向通信和双向通信两种方式，根据业务需求选择合适的方式。

## 4.1 方式1：渲染进程 → 主进程（单向通信）

场景：渲染进程向主进程发送通知、触发操作（如打开文件、最小化窗口、提交表单数据），无需主进程返回结果。

### 4.1.1 渲染进程代码（HTML/JS/Vue）

通过预加载脚本暴露的 `electronAPI.sendToMain` 发送消息：

```javascript
// 渲染进程页面（如 index.js 或 Vue 组件）
// 向主进程发送消息，频道为 "open-file"，数据为文件路径
window.electronAPI.sendToMain('open-file', '/Users/test/file.txt')

// 监听主进程的回调（可选，若主进程有反馈）
window.electronAPI.onMainMessage('file-opened', (event, data) => {
  console.log('文件打开成功：', data)
})

```

### 4.1.2 主进程代码（main.js）

通过 `ipcMain.on` 监听渲染进程的消息，处理后可通过 `event.reply` 向发送方返回反馈：

```javascript
const { ipcMain, fs } = require('electron')

// 监听渲染进程发送的 "open-file" 消息
ipcMain.on('open-file', (event, filePath) => {
  try {
    // 模拟读取文件操作（主进程拥有文件操作权限）
    const content = fs.readFileSync(filePath, 'utf8')
    // 向发送消息的渲染进程返回结果
    event.reply('file-opened', content)
  } catch (err) {
    event.reply('file-opened', `打开失败：${err.message}`)
  }
})

```

## 4.2 方式2：主进程 → 渲染进程（单向通信）

场景：主进程主动向渲染进程推送消息（如系统通知、下载进度、全局状态更新）。

### 4.2.1 主进程代码（main.js）

通过 `win.webContents.send` 向指定窗口的渲染进程发送消息（需保存窗口实例）：

```javascript
const { app, BrowserWindow } = require('electron')
let mainWindow // 保存主窗口实例

function createWindow() {
  mainWindow = new BrowserWindow({/* 窗口配置 */})
  mainWindow.loadFile('index.html')

  // 模拟主进程主动推送消息（如定时更新进度）
  setInterval(() => {
    mainWindow.webContents.send('download-progress', {
      percent: Math.random() * 100,
      time: new Date().toLocaleTimeString()
    })
  }, 1000)
}

app.whenReady().then(createWindow)

```

### 4.2.2 渲染进程代码

通过预加载脚本暴露的 `electronAPI.onMainMessage` 监听主进程消息：

```javascript
// 渲染进程页面
window.electronAPI.onMainMessage('download-progress', (event, data) => {
  console.log(`下载进度：${data.percent.toFixed(2)}%，时间：${data.time}`)
  // 更新页面进度条
  document.getElementById('progress').style.width = `${data.percent}%`
})

```

## 4.3 方式3：双向通信（推荐）

场景：渲染进程向主进程发起请求，主进程处理后返回结果（如查询数据库、读取本地文件、调用系统 API），是最常用的通信方式。

核心 API：渲染进程 `ipcRenderer.invoke` + 主进程 `ipcMain.handle`，支持异步 await 语法，结构清晰。

### 4.3.1 渲染进程代码

```javascript
// 渲染进程页面（异步函数）
async function queryUserInfo() {
  try {
    // 向主进程发起请求，频道为 "query-user"，数据为用户 ID
    const userInfo = await window.electronAPI.invokeMain('query-user', 1001)
    console.log('用户信息：', userInfo)
    // 渲染到页面
    document.getElementById('user-info').innerText = JSON.stringify(userInfo)
  } catch (err) {
    console.error('查询失败：', err)
  }
}

// 调用函数
queryUserInfo()

```

### 4.3.2 主进程代码

```javascript
const { ipcMain } = require('electron')

// 处理渲染进程的 "query-user" 请求，返回结果
ipcMain.handle('query-user', async (event, userId) => {
  // 模拟数据库查询（异步操作）
  const mockUser = {
    id: userId,
    name: '张三',
    age: 25,
    email: 'zhangsan@example.com'
  }
  // 模拟耗时操作
  await new Promise(resolve => setTimeout(resolve, 1000))
  // 返回结果（会被渲染进程的 await 接收）
  return mockUser
})

```

# 五、跨窗口通信（渲染进程 ↔ 渲染进程）

Electron 中，不同窗口的渲染进程相互隔离，无法直接通信，需通过主进程中转（官方推荐）或直接通过窗口 ID 通信，其中主进程中转方式最稳定、最安全。

## 5.1 方案1：主进程中转（推荐）

核心流程：窗口 A（渲染进程）→ 主进程 → 窗口 B（渲染进程），主进程作为消息转发者，需保存所有窗口实例。

### 5.1.1 主进程代码（main.js）

```javascript
const { app, BrowserWindow } = require('electron')
let winA, winB // 保存两个窗口实例

// 创建窗口 A
function createWinA() {
  winA = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  winA.loadFile('winA.html')
}

// 创建窗口 B
function createWinB() {
  winB = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  winB.loadFile('winB.html')
}

// 应用就绪后创建两个窗口
app.whenReady().then(() => {
  createWinA()
  createWinB()

  // 监听窗口 A 发送的跨窗口消息，转发给窗口 B
  ipcMain.on('cross-window-msg', (event, data) => {
    if (winB) {
      winB.webContents.send('msg-from-winA', data)
    }
  })
})

```

### 5.1.2 窗口 A（发送方）代码

```javascript
// winA.html 对应的 JS
document.getElementById('send-btn').addEventListener('click', () => {
  const msg = document.getElementById('msg-input').value
  // 向主进程发送跨窗口消息
  window.electronAPI.sendToOtherWindow(msg)
})

```

### 5.1.3 窗口 B（接收方）代码

```javascript
// winB.html 对应的 JS
// 监听主进程转发的来自窗口 A 的消息
window.electronAPI.onMainMessage('msg-from-winA', (event, data) => {
  const msgList = document.getElementById('msg-list')
  const li = document.createElement('li')
  li.innerText = `来自窗口 A：${data}`
  msgList.appendChild(li)
})

```

## 5.2 方案2：按窗口 ID 直接通信（无中转）

核心：主进程中通过窗口的 `webContents.id` 获取窗口唯一 ID，直接向目标窗口发送消息，适用于窗口数量较少、场景简单的情况。

```javascript
// 主进程代码
ipcMain.on('send-direct-to-win', (event, targetWinId, data) => {
  // 根据窗口 ID 获取窗口实例
  const targetWin = BrowserWindow.fromId(targetWinId)
  if (targetWin) {
    targetWin.webContents.send('direct-msg', data)
  }
})

// 窗口 A 代码（发送方，需获取窗口 B 的 ID）
async function sendDirectMsg() {
  // 向主进程请求窗口 B 的 ID（需主进程暴露接口）
  const winBId = await window.electronAPI.invokeMain('get-winB-id')
  // 发送消息到窗口 B
  window.electronAPI.sendToMain('send-direct-to-win', winBId, '直接发送的消息')
}

```

## 5.3 方案3：全局广播（向所有窗口发送消息）

场景：主进程向所有打开的渲染进程发送全局消息（如应用退出通知、全局配置更新）。

```javascript
// 主进程代码
function broadcastMsg(data) {
  // 遍历所有打开的窗口，发送广播消息
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('broadcast-msg', data)
  })
}

// 调用广播（如应用即将退出时）
app.on('before-quit', () => {
  broadcastMsg('应用即将退出，请保存数据！')
})

// 所有渲染进程代码（接收广播）
window.electronAPI.onMainMessage('broadcast-msg', (event, data) => {
  alert(data)
})

```

# 六、核心 API 对照表

|模块|进程|API|作用|
|---|---|---|---|
|ipcMain|主进程|on(channel, callback)|监听渲染进程的单向消息|
|ipcMain|主进程|handle(channel, callback)|处理渲染进程的双向请求，返回结果|
|ipcRenderer|渲染进程|send(channel, data)|向主进程发送单向消息|
|ipcRenderer|渲染进程|on(channel, callback)|监听主进程的消息|
|ipcRenderer|渲染进程|invoke(channel, data)|向主进程发起双向请求，接收返回结果|
|webContents|主进程|send(channel, data)|向指定窗口的渲染进程发送消息|
|contextBridge|预加载脚本|exposeInMainWorld(key, api)|向渲染进程暴露安全的 API|
# 七、常见问题与解决方案

## 7.1 报错：ipcRenderer is not defined

- 原因：未通过预加载脚本暴露 `ipcRenderer`，或关闭了 `contextIsolation` 后直接使用 `require('electron').ipcRenderer`。

- 解决方案：严格按照预加载脚本配置，通过 `contextBridge` 暴露 API，不直接在渲染进程中引入 `electron` 模块。

## 7.2 消息接收不到

- 原因1：主进程与渲染进程的消息频道（channel）不一致（大小写敏感）。

- 原因2：窗口未创建完成就发送消息（如主进程在 `app.whenReady()` 前发送消息）。

- 原因3：预加载脚本未正确配置，API 未暴露成功。

- 解决方案：核对频道名称、确保窗口就绪后发送消息、检查预加载脚本路径和代码。

## 7.3 跨窗口通信失败

- 原因：主进程未保存目标窗口实例，或窗口已被销毁。

- 解决方案：在主进程中全局保存窗口实例，发送消息前判断窗口是否存在（`if (winB)`）。

## 7.4 安全风险提示

- 禁止关闭 `contextIsolation`，避免渲染进程恶意调用系统资源。

- 不直接暴露完整的 `ipcRenderer` 或 `ipcMain` 模块，仅暴露必要的通信方法。

- 对渲染进程发送的消息进行校验（如频道过滤、数据格式校验），避免恶意数据注入。

# 八、最佳实践

1. 优先使用 `ipcRenderer.invoke` + `ipcMain.handle` 实现双向通信，代码结构更清晰、支持异步 await。

2. 跨窗口通信必须通过主进程中转，避免直接操作窗口实例带来的稳定性问题。

3. 所有 IPC 通信都通过预加载脚本暴露的 API 实现，严格遵循安全规范。

4. 消息频道命名规范：使用“业务-操作”格式（如 `user-query`、`file-open`），避免冲突。

5. 主进程中保存窗口实例时，注意在窗口关闭后清空实例（避免内存泄漏）：
       `winA.on('closed', () => {
  winA = null // 窗口关闭后清空实例
})
`

6. 调试时，打开开发者工具（`win.webContents.openDevTools()`），查看 IPC 消息日志（在 Console 中过滤 `ipc` 相关信息）。

# 九、总结

Electron 进程间通信的核心是基于 `ipcMain` 和 `ipcRenderer` 的事件驱动机制，通过预加载脚本实现安全桥接，保障应用安全性。

- 主进程与渲染进程通信：支持单向（send/on）和双向（invoke/handle），双向通信更适合大部分业务场景。

- 跨窗口通信：优先使用主进程中转，稳定且安全；简单场景可通过窗口 ID 直接通信。

遵循安全规范和最佳实践，可避免大部分 IPC 相关的问题，提升应用的稳定性和安全性。