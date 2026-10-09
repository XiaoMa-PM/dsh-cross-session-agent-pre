# Claude plugin

- 地位：Claude 用户级实验插件入口。
- 逻辑：SessionStart 登记路由，stdio MCP 只提供发送与状态。
- 约束：模型不能传入 sender；路由只保存 ID、socket、PID、进程启动时间；用户原生权限保持。
- 业务域清单：hooks（注册）；lib（本地边界）；server.mjs（MCP）；.claude-plugin（manifest）；.mcp.json（工具加载）。
