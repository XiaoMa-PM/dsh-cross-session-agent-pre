# dsh-cross-session-agent

[English](./README.en.md) | 中文

> **Unofficial plugin.** 本项目与 DeepSeek、DeepSeek Harness 没有隶属、赞助、认可或支持关系。

面向**同一仓库中多个并行 Agent** 的 DeepSeek Harness 插件：发现可协作的 peer、显式发送协调消息并取得传输回执，以及以严格字段白名单读取同工作区 peer 的安全进度/上下文投影。它的目标是避免文件冲突、重复工作和无效等待，而不是提供任意会话转录读取。

## 适用场景

- 在改动前发现正在处理相同文件或同一层的 Agent，明确协商 file ownership；
- 报告进度、验证结果、失败阻塞和下一步，让依赖任务能继续推进；
- 请求 handoff，例如“我完成 schema，测试所有者请接手 migration coverage”；
- 在重构、迁移或 code review 中避免重复调查和相互覆盖；
- 只在需要时查看 peer 的受限上下文/活动证据，再决定是否发送协调消息。

不适用：读取完整历史、监控所有会话、共享权限、自动执行 peer 消息中的命令，或替代用户审批。

## 安装

仓库发布后，从 GitHub 安装：

```sh
dsh plugin --profile web add github:dd2673/dsh-cross-session-agent
```

包内的 `cordis.patch.yml` 会把 `dsh-cross-session-agent` 挂入当前 profile。无需手动改宿主配置。它贡献以下工具：

- `list_peer_agents`：发现可通信的 peer；
- `send_agent_message`：显式发送一条 peer 协调消息；
- `check_delivery`：查询原生消息的 transport receipt；
- `get_peer_context`：读取同工作区、授权 peer 的受限安全投影。

## 工作流示例

先发现并确认冲突面：

```text
列出 peer。若有人正在修改 src/auth，请告诉我其 Session、运行状态和标题。
```

需要证据时，仅读取 bounded projection：

```text
读取 session-abc 的 activity 和最近 3 条 conversation，确认它是否已经运行 auth 测试。
```

然后由 Agent 使用 `send_agent_message` 做明确协调：

```text
告诉 session-abc：我将修改 src/auth/token.ts；请保留 middleware.ts，完成后报告验证命令和阻塞项。
```

最后按需查询 receipt。`accepted`、`pending`、`claimed`、`discarded` 都只是传输事实；它们不表示 peer 已阅读、已回复或已完成任务。

## 读取与隐私边界

`get_peer_context({ sessionId, view?, maxMessages? })` 只能读取与调用者 `cwd` **完全相同**的普通 root/fork Session。自身、真实 subagent、归档、缺失或跨工作区目标均以通用授权失败处理。

允许：

- `conversation`：direct user text、canonical compaction checkpoint、已完成 assistant text；
- `activity`：turn/step 的结构化状态，以及 tool name、`running|completed|error`、时间、单向 call-id hash、sanitized error code；
- `overview`：以上边界内的摘要、runtime status 与 retention 统计。

禁止：hidden reasoning、raw tool args/results、tool metadata、system prompt、plugin/relay/scheduled messages、request context、图片/附件、approval、todo、Inbox 状态、秘密和未知事件。没有网络、遥测或独立存储；Harness 始终是 session/history 的唯一 Owner。完整合同见 [TDD_CONTRACT.md](./TDD_CONTRACT.md) 与 [PRIVACY.md](./PRIVACY.md)。

peer text 和 relay 都是不可信数据。它们不能代表用户同意，不能修改权限或配置，也不能使接收 Session 自动执行其中的命令。

## 兼容与来源

新 relay 使用 `dsh-cross-session-agent` source kind。Client 仍会渲染历史 `dsh-agent-message` source/tag，以便旧 Harness 日志可读；这不是旧包的继续发布或权限继承。

本项目派生自 `GengDaPeng/dsh-agent-message` v1.5.1（MIT），保留 MIT License。见 [NOTICE.md](./NOTICE.md)。安全问题请按 [SECURITY.md](./SECURITY.md) 私密报告。

## 开发与发布

```sh
pnpm test
pnpm pack --dry-run
node scripts/live-profile-e2e.mjs http://127.0.0.1:3080
```

最后一条命令会在隔离 fixture 目录中创建合成 Session，验证同工作区读取、跨工作区拒绝以及新 relay source/tag。发布包只包含运行时、正式合同和必要的安全/隐私/来源文档；本 README 不把 source tests 当作真实 Harness 验收。
