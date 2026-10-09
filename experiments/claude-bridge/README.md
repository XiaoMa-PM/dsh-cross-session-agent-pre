> 历史实验目录。现役发行代码为根目录 lib/claude-bridge.js 和 claude-plugin；安装请按根 README。以下仅记录原实验配置。

# Claude Code / DSH 本机桥接（实验）

`dsh-cross-session-agent-pre-bridge` 是本项目的实验子插件。现有项目的上游来源与 MIT 归属见仓库 NOTICE.md；本目录没有独立公开发布。

支持同一台 Mac 上指定在线 Claude Code CLI / Claude App Code 与 DSH 会话双向消息。只传消息，不读取另一工作区的历史或文件。跨电脑未实现。

## 一次安装

从本目录注册本地市场，然后安装用户级插件：

```sh
claude plugin marketplace add /absolute/path/to/experiments/claude-bridge
claude plugin install dsh-cross-session-agent-pre-bridge@dsh-pre-local-experimental --scope user
```

DSH Host 的 Cordis patch 挂载本目录 `host.mjs`，只运行一个桥接 Host。当前配置已用于隔离 test-home；日常 DSH profile 未迁移。运行环境需要 Node 24，Claude 启动环境能找到 node。

新建或正常恢复 Claude 会话后自动登记，不需要每次输入 socket、token 或端口。旧的已运行会话需重新加载插件；不会自动重启工作会话。Claude 原生工具权限审批保留，首次使用可能需要允许桥接工具。

## 每次使用

- DSH：粘贴 Claude Code 的会话 UUID，说明发给哪个会话、什么内容；调用 `send_claude_message`。桌面 `local_...` ID 不能作为目标。
- Claude Code：调用 `bridge_status` 取得自己的 UUID 和可用 DSH 会话 ID；指定 `session-UUID` 并调用 `send_dsh_message`。
- 请求结果时明确说“回传结果”；两边不自动发送确认消息，避免循环。
- `list_claude_sessions` 仅显示登记且在线的 Claude 会话；离线/未知 ID 不会启动新 runner，也不修改 transcript。

## 边界与状态

当前验证 CLI 2.1.294 与本机 Claude App Code，DSH 0.2.0-rc.2。官方没有公开完整 Inbox wire schema，因此当前仅是用户批准的版本实验，不承诺其他版本。实际来源仍显示为原生 peer，遵守 accept/hold/refuse，不发送 own-child token。

注册目录默认 `/tmp/dsh-claude-<uid>`，模式 0700；最少路由 JSON 为 0600。所有同 UID 本地进程都属于信任边界；这不是对恶意同用户进程的隔离系统。没有 TCP 监听、遥测、历史副本或远程认证。

Claude 方向返回 `written` 只表示写入 Inbox，不表示已读；DSH 方向 `accepted` 表示 followup 接受，也不表示任务完成。正文最大 16 KiB；Claude→DSH 同会话对最多 10 条/60 秒，单次 Host 生命周期去重最近 1000 条。DSH 目标必须已加载、普通且未归档，不冷启动离线会话。

## 验证

仓库 `node --test` 覆盖现有及实验合同；真实模型验收使用新建 GLM Flash 与 Haiku 4.5 会话。完整结果见 workspace `outputs/claude-dsh-bridge-acceptance.md`。实验目录不在 npm 包 allowlist；没有升级已发布版本。
