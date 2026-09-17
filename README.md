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
chmod +x scripts/build-apps.sh
./scripts/build-apps.sh
```

脚本会先构建 Vue 前端，再把前端和 Go 后端一起封装到应用中。成品位于：

- `release/KafkaTool-macOS-arm64.dmg`：Apple 芯片 Mac 安装磁盘映像
- `release/KafkaTool-Windows-x64.exe`：64 位 Windows

两个版本都不需要单独启动 Go 服务。Windows 跨平台构建使用
`-skipbindings`，因为本项目通过同源 HTTP Handler 调用 Go 后端，没有使用 Wails JS 绑定。
应用未使用开发者证书或商店签名，只适合本地使用；首次打开时，系统可能显示安全确认。
Mac 用户双击打开 DMG 后，把 `KafkaTool.app` 拖到 `Applications` 文件夹即可。

## Kafka 操作范围

本工具支持查询、展示、搜索、创建 Topic、向指定 Topic 添加单条消息，以及显式确认后的 Topic 删除、按原分区和副本数重建、Consumer Group 删除。
删除 Topic 时，会一并删除只消费该 Topic 的消费组；同时消费其他 Topic 的组会保留并在确认前提示。

工具不支持提交或重置 Consumer Offset、创建 Consumer Group，也不支持修改 Topic、Broker、ACL 或分区配置。
