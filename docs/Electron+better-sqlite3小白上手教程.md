# Electron+better-sqlite3小白上手教程

> 零基础教程！手把手教你在 Electron 桌面应用中集成轻量本地数据库，全程复制粘贴即可运行，无需复杂配置
>
>

---

## 一、前置知识 & 环境

### 1. 这俩是什么？

- **Electron**：用 HTML/CSS/JS 开发桌面软件的框架（写网页就能做桌面 App，不用学 C++/Java）

- **better-sqlite3**：轻量本地数据库（无需安装服务，直接生成一个`.db`文件存数据，**同步 API**超适合小白，不用搞异步回调）

### 2. 必备环境

先安装 [Node.js](https://nodejs.org/)（官网下载 LTS 版本，一路下一步即可），安装后打开**命令提示符 (CMD)/ 终端**，验证：

```bash

node -v
npm -v
```

出现版本号就说明环境 ready ✅

---

## 二、从零创建项目

### 1. 新建项目文件夹

随便新建一个文件夹，比如 `electron-sqlite-demo`，用编辑器 / CMD 打开这个文件夹

### 2. 初始化项目

在终端执行以下命令，一路回车默认即可：

```bash

npm init -y
```

### 3. 安装核心依赖（关键！）

`better-sqlite3` 是**原生 C++ 模块**，必须配合 Electron 版本安装，小白直接复制命令：

```bash

# 安装 Electron 框架
npm install electron --save-dev
# 安装 better-sqlite3 数据库（自动适配Electron，小白必用这个命令）
npm install better-sqlite3 --save-dev
```

---

## 三、极简项目结构

最终只有 4 个核心文件，小白不用搞复杂的目录：

```Plain Text

electron-sqlite-demo/
├─ main.js       # Electron 主进程（数据库只能写在这里！）
├─ preload.js    # 预加载脚本（安全通信用，不用改）
├─ index.html    # 你的页面（渲染进程，写界面）
└─ package.json  # 项目配置
```

---

## 四、编写核心代码

### 1. 配置 package.json

打开 `package.json`，**全部替换**成以下内容（重点：修改入口文件 + 启动命令）：

```json

{
  "name": "electron-sqlite-demo",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "better-sqlite3": "^9.0.0",
    "electron": "^28.0.0"
  }
}
```

### 2. 编写预加载脚本 preload.js

这个文件是 Electron 的安全要求，用来打通页面和主进程的通信，直接复制：

```javascript

const { contextBridge, ipcRenderer } = require('electron');

// 安全地把主进程的方法暴露给页面
contextBridge.exposeInMainWorld('electronAPI', {
  addUser: (name, age) => ipcRenderer.invoke('add-user', name, age),
  getUsers: () => ipcRenderer.invoke('get-users')
});
```

### 3. 编写主进程 main.js（数据库核心）

> 划重点：`better-sqlite3` **只能在 Electron 主进程使用**，这是小白唯一需要记住的规则！
> 直接复制以下代码：
>
>

```javascript

// 1. 引入Electron核心模块
const { app, BrowserWindow, ipcMain } = require('electron');
// 2. 引入better-sqlite3数据库
const Database = require('better-sqlite3');
const path = require('path');

// 窗口实例
let win;

// -------------------------- 数据库操作 --------------------------
// 1. 创建/连接数据库（会自动在项目根目录生成 test.db 文件，数据都存在这里）
const db = new Database('test.db');

// 2. 创建数据表（如果不存在则创建，这里我们建一个用户表）
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER
  )
`);

// 3. 封装数据库方法，给页面调用
// 插入用户
ipcMain.handle('add-user', (_, name, age) => {
  // 预编译SQL，?是占位符，防止注入
  const stmt = db.prepare('INSERT INTO users (name, age) VALUES (?, ?)');
  // 执行插入
  return stmt.run(name, age);
});

// 查询所有用户
ipcMain.handle('get-users', () => {
  const stmt = db.prepare('SELECT * FROM users');
  // 返回所有结果
  return stmt.all();
});

// -------------------------- Electron窗口创建 --------------------------
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true, // 保持Electron的安全默认
      preload: path.join(__dirname, 'preload.js') // 绑定我们的预加载脚本
    }
  });

  // 加载你的页面
  win.loadFile('index.html');
}

// 应用启动
app.whenReady().then(createWindow);

// 关闭窗口时清理
app.on('window-all-closed', () => {
  // 关闭数据库连接，防止数据丢失
  db.close();
  if (process.platform !== 'darwin') app.quit();
});
```

### 4. 编写页面 index.html（可视化操作）

直接复制，实现**添加用户、刷新列表**的功能，小白可以直接改界面：

```html

<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  Electron+Sqlite3 Demo
  <style>
    body { padding: 20px; font-size: 16px; }
    button { padding: 8px 16px; margin: 10px 0; cursor: pointer; }
    #result { margin-top: 20px; padding: 10px; border: 1px solid #ccc; }
    input { padding: 6px; margin: 5px; width: 150px; }
  </style>
</head>
<body>
  <h3>本地用户管理</h3>
  <div>
    姓名：<input type="text" id="nameInput" placeholder="输入姓名">
    年龄：<input type="number" id="ageInput" placeholder="输入年龄">
    <button onclick="addUser()">添加用户</button>
    <button onclick="loadUsers()">刷新列表</button>
  </div>
  <div id="result">数据加载中...</div>

  <script>
    // 调用预加载暴露的API，操作数据库
    async function addUser() {
      const name = document.getElementById('nameInput').value;
      const age = document.getElementById('ageInput').value;
      if (!name) return alert('请输入姓名');

      // 调用主进程的添加方法
      await window.electronAPI.addUser(name, Number(age));
      alert('添加成功！');
      loadUsers(); // 刷新列表
    }

    async function loadUsers() {
      // 调用主进程的查询方法
      const users = await window.electronAPI.getUsers();
      const result = document.getElementById('result');
      if (users.length === 0) {
        result.innerHTML = '暂无数据';
        return;
      }
      // 渲染数据列表
      result.innerHTML = users.map(u => `
        <div>ID: ${u.id} | 姓名: ${u.name} | 年龄: ${u.age}</div>
      `).join('');
    }

    // 页面加载时自动加载数据
    window.onload = loadUsers;
  </script>
</body>
</html>
```

---

## 五、运行测试

所有文件都写完后，回到终端，执行启动命令：

```bash

npm start
```

如果一切正常，会弹出一个桌面窗口，你可以：

1. 输入姓名和年龄，点击添加

2. 点击刷新，就能看到你添加的数据

3. 关闭窗口再重新打开，数据不会丢！因为已经存在`test.db`文件里了

---

## 六、常用数据库操作（增删改查）

小白直接复制改就行，都是同步 API，不用等回调：

### 1. 插入数据

```javascript

const stmt = db.prepare('INSERT INTO users (name, age) VALUES (?, ?)');
const result = stmt.run('张三', 20);
console.log('插入的ID：', result.lastInsertRowid); // 拿到新数据的ID
```

### 2. 查询所有数据

```javascript

const stmt = db.prepare('SELECT * FROM users');
const allUsers = stmt.all(); // 返回数组，所有数据
```

### 3. 查询单个数据

```javascript

const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(1); // 拿到ID为1的用户，返回对象
```

### 4. 更新数据

```javascript

const stmt = db.prepare('UPDATE users SET age = ? WHERE id = ?');
stmt.run(25, 1); // 把ID为1的用户年龄改成25
```

### 5. 删除数据

```javascript

const stmt = db.prepare('DELETE FROM users WHERE id = ?');
stmt.run(1); // 删除ID为1的用户
```

---

## 七、小白常见踩坑

### 1. 安装 better-sqlite3 失败

- 大概率是网络问题，换国内源：

    ```bash

    npm config set registry https://registry.npmmirror.com
    ```

- Windows 用户如果提示编译错误，安装编译工具：

    ```bash

    npm install --global --production windows-build-tools
    ```

### 2. 页面里直接用 better-sqlite3 报错

- 不行！`better-sqlite3` 是原生模块，只能在主进程用，页面（渲染进程）必须通过 IPC 通信调用主进程的方法，就像我们教程里写的那样。

### 3. 打包后数据库找不到了

- 不要用相对路径！打包后路径会变，用绝对路径：

    ```javascript

    // 把数据存在用户目录，打包后也不会丢
    const dbPath = path.join(app.getPath('userData'), 'test.db');
    const db = new Database(dbPath);
    ```

### 4. 打包后找不到 better-sqlite3 模块

- 用`electron-builder`打包时，把`asar`设为`false`，或者把原生模块排除，具体看 electron-builder 的文档。