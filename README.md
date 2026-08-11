# 图文助手

图文助手是一款基于 Electron、Vue 3 和 TypeScript 的桌面内容生产工具，主要服务于微信公众号图文排版、跨平台图片提取和 AI 漫画/图片创作。

## 主要功能

- 公众号矩阵：扫描图片目录、去重、备份、分组、生成封面、批量排版并同步到微信公众号草稿箱。
- 图片提取：从微信公众号、小红书、抖音和微博链接解析、过滤并下载图片，可直接进入批量排版。
- 生图工作台：配置多个图片模型，使用提示词和参考图生成图片，并通过画夹管理历史结果。
- 漫画工作台：解析故事数据、管理人物/场景/物品资产、编辑分镜、批量生图、导出并同步公众号。
- 模板管理：维护正文模板、封面模板、样式模板和 AI 提示词模板。

## 技术栈

- Vue 3、TypeScript、Vite、Pinia、Vue Router
- Electron 30、electron-builder
- Tailwind CSS、Monaco Editor、html2canvas
- Sharp、Axios、Cheerio、Archiver

## 开发环境

- Node.js 22 或更高版本
- pnpm 11 或更高版本

安装依赖并启动开发环境：

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm typecheck       # TypeScript/Vue 类型检查
pnpm build:renderer  # 检查并构建渲染进程
pnpm build           # 构建并打包桌面应用
pnpm preview         # 预览渲染进程产物
```

## 项目结构

```text
src/
├─ pages/              页面入口
├─ components/         通用、排版和布局组件
├─ composables/        排版、封面和微信同步流程
├─ stores/             公众号矩阵与生图工作台状态
├─ modules/comic/      漫画工作台独立业务模块
├─ api/                渲染进程业务 API
└─ router/             路由配置

electron/
├─ main.ts             Electron 主进程入口
├─ preload.ts          白名单桌面 API
├─ ipc/                IPC 处理器
└─ services/           文件、图片、数据库、微信和漫画服务
```

## 核心业务流程

公众号矩阵：

```text
选择图片目录 → 扫描/去重/备份/分组 → 批量排版 → 生成封面
→ 上传正文图片 → 替换 HTML 图片地址 → 创建公众号草稿 → 可选发布
```

漫画工作台：

```text
创建项目 → 解析故事数据 → 管理资产 → 编辑分镜
→ 单页或批量生图 → ZIP/长图导出 → 同步公众号
```

## 本地数据

应用数据保存在 Electron 的 `userData` 目录：

- `gzh-layout.json`：公众号项目、模板、账号和草稿记录。
- `comic-gen.json`：漫画项目、模型配置、素材和生成任务。
- 浏览器 `localStorage`：生图工作台历史、画夹和常用提示词。

这些文件可能包含微信公众号密钥和模型 API Key。备份或分享应用数据前，请先移除敏感信息。

## 微信公众号同步要求

- 在系统设置中配置公众号 AppID 和 AppSecret。
- 调用机器的公网 IP 需要加入公众号后台 IP 白名单。
- 正文图片上传后必须替换为微信返回的 CDN 地址。
- WebP 图片会在同步前转换为微信支持的格式。

详细实现说明参见 [公众号设置与草稿箱同步开发文档](docs/公众号设置与草稿箱同步开发文档.md)。

## 打包

打包配置位于 `electron-builder.json5`。默认构建 Windows NSIS 安装包，同时保留 macOS DMG 和 Linux AppImage 配置。输出目录为：

```text
release/<version>/
```
