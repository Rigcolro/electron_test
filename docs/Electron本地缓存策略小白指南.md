# Electron本地缓存策略小白指南

**文档说明**：全程使用 Electron + Node.js 原生 API，**零第三方依赖**，不用装任何额外包，代码直接复制就能用，用大白话讲清缓存的存储、过期、清理全流程，纯小白也能直接上手。

---

## 前言：Electron 本地缓存是干嘛的？

简单说：把接口数据、图片、用户配置**存在用户电脑本地**，不用每次打开软件都重新请求 / 加载，让软件更快、断网也能用。
本方案一次性解决你所有疑问：

1. 缓存存在电脑的哪个文件夹？（安全不报错）

2. 缓存多久会过期？（旧数据自动失效）

3. 过期缓存怎么清理？（不占电脑空间）

---

## 一、缓存存储位置（小白必看：选对路径不崩溃）

### 1. 官方推荐唯一安全路径

❌ 禁止自己随便写硬盘路径（会出现权限不足、无法写入、卸载残留垃圾）
✅ 统一用 Electron 内置的 `userData` 目录，我们在里面新建一个 `cache` 文件夹专门存缓存。

### 2. 跨平台自动适配路径

不用你手动改路径，软件会自动适配不同系统，你也可以手动找到这个文件夹：

|系统|缓存文件夹路径|
|---|---|
|Windows|`C:\Users\你的用户名\AppData\Roaming\你的软件名\cache`|
|Mac|`/Users/你的用户名/Library/Application Support/你的软件名/cache`|
|Linux|`/home/你的用户名/.config/你的软件名/cache`|
### 3. 为什么选这个路径？

1. 系统权限充足，永远不会出现「无法写入文件」的报错

2. 跨平台通用，一套代码在 Windows/Mac/Linux 都能用

3. 软件卸载时，系统会自动清理这个文件夹，不会残留垃圾

---

## 二、缓存有效期策略（自动过期，不用手动管）

### 1. 核心原理：给缓存加「保质期」

就像超市的面包，每个缓存都有保质期，过期了就不能用了：

1. 存缓存的时候，记录下**保存的时间**

2. 读缓存的时候，自动对比当前时间

3. 超过保质期 → 直接作废，删除这个缓存

### 2. 推荐有效期配置（直接用）

你可以根据自己的需求改，默认用下面的配置就够了：

|缓存类型|有效期（秒）|说明|
|---|---|---|
|临时接口数据|300（5 分钟）|频繁更新的接口数据|
|用户配置信息|86400（1 天）|不常修改的用户设置|
|图片 / 静态资源|604800（7 天）|长期不变的图片、图标|
---

## 三、缓存清理机制（全自动，解放双手）

我们设计了 3 种极简清理方式，不用你手动删缓存：

### 1. 启动清理（最重要）

软件**每次打开**的时候，自动扫描所有缓存，把过期的全部删掉。

### 2. 定时清理

软件运行的时候，**每 1 小时**自动清理一次过期缓存，防止后台堆垃圾。

### 3. 手动清理

给用户加了「清空缓存」的功能，用户点一下就能一键删掉所有缓存，适配软件的设置页。

---

## 四、完整可复制代码（开箱即用）

### 1. 第一步：缓存工具类 `cacheManager.js`

在你的项目根目录新建这个文件，把下面的代码全部复制进去：

```javascript

const { app } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const fsSync = require('fs');

class ElectronCacheManager {
  constructor() {
    // 缓存根目录：userData/cache
    this.cacheDir = path.join(app.getPath('userData'), 'cache');
    // 自动创建缓存文件夹
    this.initCacheDir();
  }

  // 初始化缓存目录，不存在就自动创建
  async initCacheDir() {
    if (!fsSync.existsSync(this.cacheDir)) {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 存储缓存
   * @param {string} key 缓存的唯一标识（比如接口地址、图片名）
   * @param {any} data 要缓存的数据
   * @param {number} expireSeconds 有效期(秒)，默认5分钟
   */
  async set(key, data, expireSeconds = 300) {
    try {
      const cacheContent = {
        data: data,
        timestamp: Date.now(), // 记录存储的时间
        expire: expireSeconds  // 记录保质期
      };
      // 把缓存存为JSON文件，key作为文件名
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(cacheContent), 'utf-8');
    } catch (err) {
      console.error('缓存保存失败：', err);
    }
  }

  /**
   * 读取缓存（自动判断过期）
   * @param {string} key 缓存的唯一标识
   * @returns 缓存数据 / null（过期/不存在返回null）
   */
  async get(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      // 文件不存在，说明没有缓存
      if (!fsSync.existsSync(filePath)) return null;

      // 读取缓存文件
      const content = await fs.readFile(filePath, 'utf-8');
      const cache = JSON.parse(content);
      const now = Date.now();

      // 判断是否过期
      if (now - cache.timestamp > cache.expire * 1000) {
        // 过期了，删除这个缓存文件
        await fs.unlink(filePath);
        return null;
      }

      // 没过期，返回缓存的数据
      return cache.data;
    } catch (err) {
      console.error('缓存读取失败：', err);
      return null;
    }
  }

  // 清理所有过期缓存
  async clearExpiredCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const cache = JSON.parse(content);
        const now = Date.now();

        // 过期就删除
        if (now - cache.timestamp > cache.expire * 1000) {
          await fs.unlink(filePath);
        }
      }
      console.log('✅ 过期缓存清理完成');
    } catch (err) {
      console.error('过期缓存清理失败：', err);
    }
  }

  // 一键清空所有缓存
  async clearAllCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        await fs.unlink(path.join(this.cacheDir, file));
      }
      console.log('✅ 所有缓存已清空');
      return true;
    } catch (err) {
      console.error('清空缓存失败：', err);
      return false;
    }
  }
}

// 导出单例，全局只用一个缓存工具
module.exports = new ElectronCacheManager();
```

### 2. 第二步：主进程入口 `main.js`

在你的主进程文件（一般叫 `main.js`）里，加入下面的代码，用来注册接口，让前端能调用缓存功能：

```javascript

const { app, BrowserWindow, ipcMain } = require('electron');
// 引入我们的缓存工具
const cacheManager = require('./cacheManager');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true, // 开启安全模式
      preload: path.join(__dirname, 'preload.js') // 如果你用preload的话
    }
  });

  mainWindow.loadFile('index.html');
}

// 软件启动完成后，自动执行启动清理
app.whenReady().then(() => {
  createWindow();

  // 1. 启动时自动清理过期缓存
  cacheManager.clearExpiredCache();

  // 2. 定时清理：每1小时清理一次过期缓存
  setInterval(() => {
    cacheManager.clearExpiredCache();
  }, 3600 * 1000);

  // 注册IPC接口，让前端能调用缓存功能
  // 存缓存
  ipcMain.handle('cache:set', async (_, key, data, expire) => {
    return await cacheManager.set(key, data, expire);
  });
  // 读缓存
  ipcMain.handle('cache:get', async (_, key) => {
    return await cacheManager.get(key);
  });
  // 清空所有缓存
  ipcMain.handle('cache:clearAll', async () => {
    return await cacheManager.clearAllCache();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### 3. 第三步：前端（渲染进程）调用

在你的前端页面（比如 Vue/React/ 原生 JS），直接用下面的代码调用缓存：

```javascript

// 1. 存缓存
// 比如存接口数据，有效期5分钟
async function saveCache() {
  const apiData = { name: '张三', age: 20 };
  await window.electron.ipcRenderer.invoke('cache:set', 'userInfo', apiData, 300);
}

// 2. 读缓存
async function loadCache() {
  const cacheData = await window.electron.ipcRenderer.invoke('cache:get', 'userInfo');
  if (cacheData) {
    // 有缓存，直接用
    console.log('用缓存数据：', cacheData);
  } else {
    // 没有缓存，重新请求接口
    const newData = await fetchApi();
    // 存到缓存里
    await window.electron.ipcRenderer.invoke('cache:set', 'userInfo', newData, 300);
  }
}

// 3. 一键清空所有缓存（给用户的按钮用）
async function clearAllCache() {
  const res = await window.electron.ipcRenderer.invoke('cache:clearAll');
  if (res) alert('缓存已清空');
}
```

---

## 五、快速上手步骤

1. 把上面的 `cacheManager.js` 放到你的项目根目录

2. 把主进程的代码加到你的 `main.js` 里

3. 前端直接调用上面的接口就行，不用改其他东西

---

## 六、小白常见问题

### 1. 我找不到缓存文件夹怎么办？

Windows 系统：打开资源管理器，把上面的路径复制到地址栏回车就行，`AppData` 是隐藏文件夹，你要先开启「显示隐藏文件」。
Mac 系统：打开访达，按 `Command+Shift+G`，把路径粘进去回车就能找到。

### 2. 为什么文件操作要在主进程？

Electron 的安全规则，渲染进程不能直接操作本地文件，防止恶意代码，所以我们通过主进程中转，既安全又符合规范。

### 3. 我能存图片 / 大文件吗？

可以，这个方案支持存任何能转成 JSON 的数据，包括 Base64 格式的图片，大文件也能存，只要你的硬盘够大。

### 4. 过期了的缓存会自动删吗？

会的，不管是读缓存的时候，还是启动 / 定时清理的时候，过期的缓存都会自动删掉，不会占你电脑的空间。