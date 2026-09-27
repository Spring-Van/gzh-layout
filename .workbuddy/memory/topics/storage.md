# 专题：本地存储分区与性能

> 背景与实测数据：`docs/本地存储性能诊断与根治方案.md`

## 文件布局（Electron 主进程，userData）

| 文件 | 内容 | 体积量级 | 写频率 |
| --- | --- | --- | --- |
| `comic-gen.json` | projects / projectAssets / materials / generationTasks | 可达数百 MB（内联 base64 图片占 99.9%） | 项目类操作 |
| `comic-settings.json` | modelConfigs / promptTemplates / appSettings（**含全部密钥**） | 几 KB | 系统设置页高频 |
| `gzh-layout.json` | 公众号 / 素材等旧模块（DatabaseService） | 几十 KB | 低 |

## 红线

- **设置类写入只能碰 `comic-settings.json`**。写错分区会把整份项目主库重写一遍（2026-09-27 实测 494MB：序列化 2.3s + 写盘 0.5s + 回读校验 1.5s ≈ 4.5s 同步阻塞主进程，界面直接冻结）。
- 密钥（`apiKey` / `picgoApiKey` / `appSecret` / `accessToken`）只存在于设置分区，主库不带任何密钥 → `protectCredentials` / `revealCredentials` 只作用于 `ComicSettingsData`。
- `JsonFileStore.verifyMaxBytes`（默认 8MB）决定写入后是否回读校验：大文件跳过（省 1.5s + 1.5GB 解析峰值），靠「写 .tmp → 原子替换」+ `.bak` 兜底。动这里等于动所有库的写盘语义。
- 旧单文件库迁移只发生在 `ComicDatabaseService` 构造函数 + `init()`：`comic-settings.json` 不存在时从主库 legacy 分区迁出，主库下次写盘自然去掉这些字段。不要在别处再补迁移逻辑。

## 写库失败的可见性

渲染层写库必须经统一出口捕获错误并提示（范式：`SettingsView.runSave()`）。主进程写盘失败（磁盘满 / safeStorage 不可用）会让 IPC reject，未捕获时界面毫无反应 —— 用户只会说「点了保存却没保存上」。

## 待办（未根治）

- 主库仍 494MB，写一次仍 ≈2.8s，根因是 173 张内联 base64 图片。根治可复用 `ImageHistoryService.persistDataUrl()` + `app-image://` 协议（`electron/main.ts:39`）。
- `comicDb.getAllProjects()` 会把含 base64 的全量项目经 IPC 结构克隆给渲染层（项目首页 / 素材库 / 长资产库都调），列表其实只需要摘要。
