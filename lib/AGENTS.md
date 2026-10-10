# Runtime modules

- 地位：发行插件的 DSH Host / Client 与通信权限边界。
- 逻辑：index.js 挂载原跨会话工具；默认关闭的 Claude 桥接由原生 settings 开关挂载/卸载。
- 约束：Harness 持有会话与消息；不建立 transcript 副本，peer 不代表用户授权。Claude wire 只限当前验证版本；同 UID 多 profile 分别绑定稳定 instanceId；目标实例离线不得转发。
- 业务域清单：index.js（主入口与 Config）；claude-bridge-settings.js（opt-in 生命周期）；claude-bridge.js（本机桥接）；client.js（消息 UI、公开 configForms/插件详情 slot 的持久开关及公开 Connection RPC 实例监听状态）；peer-context.js（受限上下文）。

- 桥接 socket 入站使用 UTF-8 流解码；中文/emoji 可跨 chunk，来源和审批边界不变。
- 用户批准的异常退出恢复：仅 sameUID socket 连接明确 ECONNREFUSED 且 inode/dev 未变时清理并重试一次；在线、文件、超时或未知错误均拒绝。

- Claude 来信使用结构化来源/回复地址头部与原样正文，Client 显示独立来源卡片；外部 UUID 不跳转 DSH 本地会话。

- 多实例桥接：公开 profileContext 的 realpath/name SHA-256 身份，实例独立 socket/0600 登记；Claude 状态汇总 instanceId、profileName、原标题与 cwd；发送必填 instanceId，Host 核验并写入 immutable targetInstanceId，回复头部携实例地址。旧 bridge.sock 不参与路由。

- 配置页运行态通过公开 Connection RPC `/dsh-cross-session-agent-pre` 的 `claude-bridge/status` 查询；返回 profileName/instanceId、配置 enabled 与真实 listening，监听成功登记后才报告 listening，不发送 profile 路径。

- Client 不依赖官方前端未提供的 timer；复制提示和实例状态刷新使用 React effect 清理原生计时器。状态显示区分配置开启与真实监听。

- 实例状态只读接口使用官方认证 Connection.fetch /api 扩展；桥接 apply 返回 void，避免 Cordis 将普通对象判为 Invalid effect 并卸载监听。
