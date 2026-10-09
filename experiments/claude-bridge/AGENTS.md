# Claude bridge

- 地位：当前版本的本机实验桥接 Host。
- 逻辑：Host 按在线 UUID 写原生 Inbox；Claude MCP 按祖先进程绑定来源，Host 用公开 followup 投递。
- 约束：仅同 OS 用户；不读历史/文件、不传 token、不模拟 own-child、不自动确认循环。外部 wire 只限用户批准的实验版本；包 allowlist 不包含本目录。
- 业务域清单：host.mjs；claude-plugin（注册、MCP、传输）；test（边界与合同）；.claude-plugin（本地市场）。
