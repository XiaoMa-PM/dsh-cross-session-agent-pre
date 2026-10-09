# Runtime modules

- 地位：发行插件的 DSH Host / Client 与通信权限边界。
- 逻辑：index.js 挂载原跨会话工具；默认关闭的 Claude 桥接由原生 settings 开关挂载/卸载。
- 约束：Harness 持有会话与消息；不建立 transcript 副本，peer 不代表用户授权。Claude wire 只限当前验证版本；一名 OS 用户仅启用一个桥接 Host。
- 业务域清单：index.js（主入口与 Config）；claude-bridge-settings.js（opt-in 生命周期）；claude-bridge.js（本机桥接）；client.js（消息 UI、公开 configForms/插件详情 slot 的持久开关）；peer-context.js（受限上下文）。

- 桥接 socket 入站使用 UTF-8 流解码；中文/emoji 可跨 chunk，来源和审批边界不变。
- 用户批准的异常退出恢复：仅 sameUID socket 连接明确 ECONNREFUSED 且 inode/dev 未变时清理并重试一次；在线、文件、超时或未知错误均拒绝。

- Claude 来信使用结构化来源/回复地址头部与原样正文，Client 显示独立来源卡片；外部 UUID 不跳转 DSH 本地会话。
