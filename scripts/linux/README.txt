Kafka Tool — Linux ARM64 / 麒麟桌面版

1. 解压到普通用户可写的目录。在桌面会话的终端运行：
   bash launch.sh
   不需要 Go、Node.js 或单独启动后端。不需要 root。

2. 仅检查环境：
   bash check-env.sh
   检查 Linux/ARM64、glibc、动态库、WebKit 辅助进程及图形会话。
   检查通过不代表所有界面和 Kafka 功能已完成验证。
   build-info.txt 记录构建系统和链接库；min-glibc.txt 仅表示主程序
   的 GLIBC 符号下限，系统中的依赖也必须相互兼容。

3. 本包使用系统的 GTK3 和 WebKit2GTK 4.0，未私自替换系统库，
   未禁用 WebKit 沙箱。它不是对所有麒麟版本都通用的无依赖包。
   若带有 runtime-debs/，这些是人工准备的离线安装包，不会自动安装。
   请由管理员确认发行版、版本、架构及完整依赖匹配后再安装。
   .deb 只适用于兼容的 Debian 系麒麟；RPM 系统不能直接使用。
   不要为了运行程序升级/替换系统 glibc，也不要混用不同发行版的软件包。
   准备离线包时应包括匹配的 GTK3、WebKit2GTK 4.0、JavaScriptCore
   及其完整依赖；仅复制几个 .so 文件会遗漏辅助进程和资源。

4. 日志：${XDG_STATE_HOME:-$HOME/.local/state}/kafka-tool/
   无法双击启动时，请在终端使用 bash launch.sh 查看错误。
   包目录中的 SHA256SUMS 可用 sha256sum -c SHA256SUMS 验证完整性。

5. 验收：检查所有页面、中文输入、复制、搜索、消息显示，
   连接测试 Kafka 并验证查询和消费；创建 Topic、发消息、删除、重建
   及删除消费组只能在获准的测试资源上验证。现场还需验证各 Broker
   地址可达、账号权限、TLS 证书和 SASL 配置。检查脚本不会连接 Kafka
   或执行任何写入/删除操作。
