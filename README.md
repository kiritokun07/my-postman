# My Postman

轻量级 HTTP 客户端，类似 Postman。支持单次请求、CSV 批量测试、cURL 导入导出，可打包为 Windows / macOS 桌面应用，双击即用，无需常驻开发服务器。

## 功能

- HTTP 请求：GET / POST / PUT / DELETE / PATCH / HEAD / OPTIONS
- Headers、Body（JSON / raw / x-www-form-urlencoded / form-data）
- 响应展示：状态码、Headers、Body（JSON 高亮、Raw / Pretty 切换、一键复制；含二进制 base64）
- 请求历史（localStorage，最多 200 条）：搜索、按方法筛选、单条删除、导出 JSON
- cURL 导入 / 复制 / 预览当前请求
- CSV Batch：按 CSV 行批量发请求，URL / Body 支持 `{{列名}}` 模板
- 一键清除 Headers 与 Body
- 主题切换：日间 / 夜间 / 跟随系统（localStorage 持久化）
- 可拖拽调整请求区高度；历史侧边栏可折叠
- 桌面版（Tauri 2）：内置 Rust 代理，绕过浏览器 CORS

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite 5 |
| 浏览器开发代理 | Express + axios（`server.js`） |
| 桌面版代理 | Tauri 2 + Rust（reqwest） |
| CSV 解析 | PapaParse |

## 环境要求

- Node.js 18+
- pnpm

**Windows 桌面版打包额外需要：**

- Rust 工具链（[rustup.rs](https://rustup.rs)）
- Visual Studio Build Tools 2022（勾选「使用 C++ 的桌面开发」）
- WebView2（Windows 10/11 通常已内置）

**macOS 桌面版打包额外需要：**

- Rust 工具链（[rustup.rs](https://rustup.rs)）
- Xcode Command Line Tools（`xcode-select --install`）

## 安装

```bash
pnpm install
```

## 使用

### 浏览器开发模式

同时启动 Vite 开发服务器与 Express 代理：

```bash
pnpm dev
```

浏览器打开 [http://localhost:5173](http://localhost:5173)。代理服务运行在 `http://localhost:3001`。

### 生产模式（Web）

```bash
pnpm build
set NODE_ENV=production && node server.js   # Windows CMD
# 或
$env:NODE_ENV="production"; node server.js  # PowerShell
```

访问 [http://localhost:3001](http://localhost:3001)。

### 桌面版开发

```bash
pnpm tauri:dev
```

仅需 Vite，代理由 Tauri Rust 后端处理。

### 桌面版打包

**Windows**

```bash
pnpm tauri:build:win
```

产物路径：

```
src-tauri/target/release/app.exe
```

双击 `app.exe` 即可运行，无需 Node.js。也可直接运行根目录 `build.bat` 一键打包。

生成 NSIS 安装包（需能访问 GitHub 下载打包工具）：

```bash
pnpm tauri:build:installer
# 或
pnpm tauri:build:win -- --installer
```

**macOS**

```bash
pnpm tauri:build:mac
```

产物路径：

```
src-tauri/target/release/bundle/macos/My Postman.app
```

也可仅生成可执行文件、不打包 `.app`：`pnpm tauri:build:mac -- --no-bundle`

也可直接运行根目录 `build.sh` 一键打包。

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 发送请求 | `Ctrl + Enter`（macOS：`Cmd + Enter`） |

## CSV Batch 用法

1. 在顶部 **URL 栏** 填写带占位符的地址，例如：`https://api.example.com/users/{{id}}`
2. 在 **Body** 标签页填写模板，例如：`{"name": "{{name}}"}`
3. 切换到 **CSV Batch**，上传 CSV（首行为列名）
4. 先聚焦 URL 栏或 Body 编辑器，再点击参数 chip 可插入 `{{列名}}`
5. 点击 **Run Batch** 执行批量请求

切换到 CSV Batch 时会隐藏下方 Response 面板，以便查看批量结果表格。

## 项目结构

```
├── server.js              # Express 代理（浏览器 / Web 部署）
├── build.bat / build.sh   # 桌面版一键打包（Windows / macOS）
├── src/
│   ├── App.jsx            # 主界面
│   ├── components/        # Headers、Body、Response、CSV Batch、History、ThemeToggle 等
│   └── utils/             # 代理封装、cURL 解析、历史记录、主题
├── src-tauri/             # Tauri 桌面版（Rust 代理）
└── scripts/
    ├── tauri-build.ps1    # Windows 打包脚本（自动加载 MSVC 环境）
    └── tauri-build.sh     # macOS 打包脚本
```

## 常见问题

**浏览器里报 `Unexpected token '<'`**

说明 `/api/proxy` 返回了 HTML 而非 JSON。请使用 `pnpm dev` 启动完整开发环境，或使用桌面版。

**`pnpm tauri:build` 报 `link.exe not found`（Windows）**

未安装或未配置 MSVC。安装 Visual Studio Build Tools 后，使用 `pnpm tauri:build:win` 或 `build.bat` 打包。

**macOS 打包报 Xcode 相关错误**

运行 `xcode-select --install` 安装 Command Line Tools，再执行 `pnpm tauri:build:mac` 或 `build.sh`。

**纯静态部署为何不可用**

前端依赖服务端代理转发请求以绕过 CORS。纯 `dist/` 静态托管没有 `/api/proxy` 接口。可选方案：配合 `server.js` 部署，或使用 Tauri 桌面版。

## License

Private
