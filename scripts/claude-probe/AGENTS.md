# Claude 可行性探针

- 地位：仅本地验证工具，不属于已发布运行时或 npm allowlist。
- 逻辑：SessionStart 投影最少在线地址信息，用新测试会话验证原生通信。
- 约束：不记录 token、transcript_path 或真实工作会话内容；不使用认证 token 将外部消息伪装成自身子进程。未公开 wire 格式只用于探针，未经决策不得进入生产代码。
- 业务域清单：register.mjs 注册投影；register.test.mjs 边界与脱敏测试。
