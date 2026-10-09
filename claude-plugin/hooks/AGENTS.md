# Registration hooks

- 地位：原生会话启动事件入口。
- 逻辑：register.mjs 从 hook session_id 和环境 socket 登记祖先进程身份。
- 约束：不保存 token/transcript；不注册其他 runner。
- 业务域清单：register.mjs、hooks.json。
