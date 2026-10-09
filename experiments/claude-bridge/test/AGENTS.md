# Bridge tests

- 地位：本机实验合同验证。
- 逻辑：覆盖 source 绑定、工具输出 render、目标限制、去重限流、MCP 与真实 Unix 请求。
- 约束：临时目录与合成数据，不调用真实模型或用户工作会话。
- 业务域清单：local、mcp、host、transport 测试。
