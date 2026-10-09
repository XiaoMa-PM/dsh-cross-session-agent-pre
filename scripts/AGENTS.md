# 本地验收脚本

- 地位：开发与真实运行态验收，非插件运行时。
- 逻辑：通过测试环境核验投递与原生接收状态。
- 约束：不上传 profile、凭据、原始会话日志；静态协议线索不视为公开稳定接口。
- 业务域清单：live-profile-e2e.mjs 为 DSH 验收；claude-probe 为 Claude SessionStart 和 Inbox 探针。
