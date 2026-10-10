# Claude plugin

- 地位：Claude 用户级实验插件入口。
- 逻辑：SessionStart 登记路由，stdio MCP 只提供发送与状态。
- 约束：模型不能传入 sender；路由只保存 ID、socket、PID、进程启动时间；用户原生权限保持。
- 业务域清单：hooks（注册）；lib（本地边界）；server.mjs（MCP）；.claude-plugin（manifest）；.mcp.json（工具加载）。

- 双向正文前使用简短的 peer 元信息头部；reply 指向桥接工具，userApproval=false；不冒充原生 SendMessage 目标。

- 多实例桥接：公开 profileContext 的 realpath/name SHA-256 身份，实例独立 socket/0600 登记；Claude 状态汇总 instanceId、profileName、原标题与 cwd；发送必填 instanceId，Host 核验并写入 immutable targetInstanceId，回复头部携实例地址。旧 bridge.sock 不参与路由。
