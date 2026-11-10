# Kafka Tool

跨平台 Kafka 只读桌面监控工具，前端使用 Vue，后端使用 Go，桌面外壳使用 Wails。

## 本地运行

```bash
cd backend
go run ./cmd/server
```

另开一个终端：

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。

也可以在项目根目录使用开发管理脚本，一键启动或重启前后端：

```bash
./scripts/dev.sh restart
```

其他命令：

```bash
./scripts/dev.sh start
./scripts/dev.sh stop
./scripts/dev.sh status
./scripts/dev.sh logs
```

支持单 Broker、多 Broker、PLAINTEXT、SSL、SASL/PLAIN、SCRAM-SHA-256 和 SCRAM-SHA-512。
密码仅用于连接请求，不保存到浏览器本地存储。

## 生成桌面应用

在 macOS 上安装 Go、Node.js 和 Wails v2 后，在项目根目录运行：

```bash
sh scripts/build-apps.sh mac     # 只生成 macOS ARM64
sh scripts/build-apps.sh window  # 只生成 Windows x64
sh scripts/build-apps.sh arm     # 只生成 Linux ARM64（需要启动 Docker）
sh scripts/build-apps.sh         # 依次生成上述三个版本
sh scripts/build-apps.sh --help  # 查看用法
```

日常打包统一使用 `scripts/build-apps.sh`；参数 `mac`、`window`、`arm` 分别只生成对应平台，`all` 或不带参数生成全部。Mac 为 Apple 芯片版本，Windows 为 x64，`arm` 指 Linux ARM64。Windows 首次需下载 WebView2，安装包压缩也会耗时；只验证 Mac 改动时使用 `mac` 即可。

打包依赖：Mac 需要 Go、Node.js、Wails v2 和 macOS 自带打包工具；Windows 还需 Python 3.11+、curl、NSIS；Linux ARM64 通过 Docker 构建，需要启动 Docker Desktop。

脚本会先构建 Vue 前端，再把前端和 Go 后端一起封装到应用中。成品位于：

- `release/KafkaTool-macOS-arm64.dmg`：Apple 芯片 Mac 安装磁盘映像
- `release/KafkaTool-Windows-x64-Setup.exe`：单文件离线安装包，Windows 10 / 11 x64，附带 WebView2 固定版本运行环境
- `release/KafkaTool-Linux-arm64.tar.gz`：Linux ARM64（麒麟）压缩包

三个版本都不需要单独启动 Go 服务。不带参数或使用 `all` 时构建全部版本，需具备三个平台的打包依赖并启动 Docker；任一构建失败会停止。指定平台时只构建该平台，不运行其他平台的打包步骤。Windows 跨平台构建使用
`-skipbindings`，因为本项目通过同源 HTTP Handler 调用 Go 后端，没有使用 Wails JS 绑定。
应用未使用开发者证书或商店签名，只适合本地使用；首次打开时，系统可能显示安全确认。
Mac 用户双击打开 DMG 后，把 `KafkaTool.app` 拖到 `Applications` 文件夹即可。

## 麒麟 Linux ARM64 打包

1. 在 Mac 上启动 Docker Desktop，在项目根目录执行：

   ```bash
   sh scripts/build-apps.sh arm
   ```

   首次需要下载依赖，耗时较长；后续会复用缓存。无需 UTM。

2. 将 `release/KafkaTool-Linux-arm64.tar.gz` 复制到 ARM64 麒麟机器上解压。
   同名 `.sha256` 是可选校验文件，不是程序。

3. 打开解压后的 `bin` 文件夹，双击 `KafkaTool` 启动（需文件管理器支持）。
   若提示没有执行权限，在文件属性中勾选“允许作为程序执行”。
   如果双击打不开，在解压后的文件夹打开终端运行，查看错误提示：

   ```bash
   bash launch.sh
   ```

目标系统需具备兼容的 GTK3 和 WebKit2GTK 4.0，详细说明见包内 `README.txt`。

## Kafka 操作范围

本工具支持查询、展示、搜索、创建 Topic、向指定 Topic 添加单条消息，以及显式确认后的 Topic 删除、按原分区和副本数重建、Consumer Group 删除。
删除 Topic 时，会一并删除只消费该 Topic 的消费组；同时消费其他 Topic 的组会保留并在确认前提示。

工具不支持提交或重置 Consumer Offset、创建 Consumer Group，也不支持修改 Topic、Broker、ACL 或分区配置。

## Windows 自带运行环境打包

仅构建 Windows 版本：

```bash
sh scripts/build-apps.sh window
```

需要 Go、Node.js、Wails v2、Python 3.11+、curl、NSIS（macOS：`brew install nsis`）和支持 CAB 的 tar（macOS 自带，Linux 安装 libarchive-tools）。首次打包从微软下载 x64 Fixed Version Runtime 156.0.4314.58，缓存到 `.cache/webview2/`，之后复用。更新版本时同时修改脚本中的 VERSION、官方 URL 和 SHA-256 校验值，重新打包并在 Windows 验证。

推荐交付 `release/KafkaTool-Windows-x64-Setup.exe` 和可选的 `.exe.sha256`。安装包包含程序和完整 WebView2，默认安装到当前用户的本地应用目录，创建桌面、开始菜单快捷方式，并支持卸载；现场无需联网或另外安装 WebView2。


固定版本不会自动更新，应定期随软件升级。打包脚本校验两个 exe 都为 x64，并生成安装包 SHA-256 校验文件；正式交付前需在未安装 WebView2 的 Windows 10 / 11 x64 上验证启动和 Kafka 连接。

## 按行导入消息

在 Topic 的“添加数据”中，将输入方式改为“文件导入（每行一条）”，选择 UTF-8 文本或 JSONL 文件，点击“导入并发送”并确认。每个非空白行按原文发送一条消息，支持 Windows CRLF 换行及最后一行无换行；单行最多 20 MiB。多行排版 JSON 应先转成一行一条。Key 对文件中所有消息生效，留空则发送无 Key 消息。

界面显示发送行号和成功条数，可以停止导入（等待当前请求结束）。遇到读取或发送错误会停止，不自动重试；已成功的消息不会回滚，失败请求可能已被 Kafka 接收，重试前应核实，避免重复导入。Kafka 服务端也必须允许对应大小的消息。

## 脚本说明

- `scripts/build-apps.sh`：统一打包入口，包含 Mac 打包逻辑。
- `scripts/build-windows.sh`、`scripts/windows/`：主入口使用的 Windows 构建、校验和安装包文件。
- `scripts/build-linux-arm64-docker.sh`、`scripts/build-linux-arm64.sh`、`scripts/linux/`：主入口使用的 ARM64 容器构建和运行检查文件。
- `scripts/dev.sh`：本地开发启停。
- `scripts/kafka-check-scripts/`：Kafka 生产和消费排查工具，使用前修改脚本中的连接配置。
- `desktop/scripts/sync-frontend.mjs`：前端构建时自动同步桌面资源。

上述辅助脚本仍由构建流程使用或提供独立开发、排查功能，应保留。
