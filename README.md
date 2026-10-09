# dsh-cross-session-agent-pre

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

### 在 DeepSeek Harness 中直接安装（推荐）

无需填写 GitHub 地址，直接使用 npm 包名：

1. 打开 **插件 → 添加插件**。
2. 在输入框填写 `dsh-cross-session-agent-pre`。
3. 点击 **安装**。

npm 官方源已提供 `0.2.0-rc.2.4`。如果使用 **中国大陆镜像源** 时提示找不到插件，请将「安装源」切换为 **npm 官方源** 后重试；镜像同步可能晚于官方源。

npm 包页面：[dsh-cross-session-agent-pre](https://www.npmjs.com/package/dsh-cross-session-agent-pre)。

### 命令行安装

也可通过命令安装：

```sh
dsh plugin --profile web add dsh-cross-session-agent-pre
```

从 GitHub 安装：

```sh
dsh plugin --profile web add github:XiaoMa-PM/dsh-cross-session-agent-pre
```

包内的 `cordis.patch.yml` 会把 `dsh-cross-session-agent-pre` 挂入当前 profile。无需手动改宿主配置。它贡献以下工具：

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

本次适配在 [dd2673/dsh-cross-session-agent](https://github.com/dd2673/dsh-cross-session-agent) 的基础上迭代，上游基线为 `f0f7c3d6ab66c66f19472ae33220bad4613724d4`。该上游进一步派生自 [GengDaPeng/dsh-agent-message](https://github.com/GengDaPeng/dsh-agent-message) v1.5.1。本项目保留原有 MIT 许可和署名。

本次增量包括 DSH **0.2.0-rc.2** 的公开 Session 查询适配、fork 回执边界修复、公开 Chat 节点渲染与发送方跳转，以及并发限流和多模型真实消息验收。目标是同一 DSH 实例内的顶层会话通信，允许跨工作区消息；本节描述既有 DSH 会话功能；Claude Code 本机连接见下方实验功能，其他电脑的 DSH 实例不在范围内。

新 relay 使用 `dsh-cross-session-agent` source kind。Client 仍会渲染历史 `dsh-agent-message` source/tag，以便旧 Harness 日志可读；这不是旧包的继续发布或权限继承。

本项目派生自 `GengDaPeng/dsh-agent-message` v1.5.1（MIT），保留 MIT License。见 [NOTICE.md](./NOTICE.md)。安全问题请按 [SECURITY.md](./SECURITY.md) 私密报告。

## 开发与发布

```sh
pnpm test
pnpm pack --dry-run
node scripts/live-profile-e2e.mjs http://127.0.0.1:3080
```

最后一条命令会在隔离 fixture 目录中创建合成 Session，验证同工作区读取、跨工作区拒绝以及新 relay source/tag。发布包只包含运行时、正式合同和必要的安全/隐私/来源文档；本 README 不把 source tests 当作真实 Harness 验收。

## 本地适配验证

当前版本针对 DeepSeek Harness 0.2.0-rc.2。在线与离线回执统一通过公开 sessionQuery 读取，使用 inheritedEventCount 排除 fork 继承事件。跨工作区仅传递消息；get_peer_context 仍限制同工作区。已在独立 test-home 中完成真实模型双向回复、空闲唤醒、运行中 followup 排队、宿主重启恢复、旧回执恢复和跨工作区上下文读取拒绝验收。当前版本 0.2.0-rc.2.4 仅针对 Harness 0.2.0-rc.2。

新版来信通过公开 conversation.chat.node 展示发送方与正文，点击使用 uiWorkspace.openSession 跳转。其他来源保留官方渲染。

## 验收与已知限制

52 项自动化用例连续执行 20 轮通过；每轮模拟 Inbox 压力测试 2,000 次并发请求，1,000 条接受、1,000 条按会话对限流。真实模型四方汇聚 12 条消息均唯一投递并认领。已验证 GPT-5.6-Luna、Claude Haiku 4.5、GLM-5.3-Flash 六个有向组合的请求和回传（部分方向使用全新会话复测）。

Codex 订阅池在测试中多次返回 RATE_LIMIT；复用经历限流/取消的会话时，曾出现旧指令干扰、请求原文转发及错误自发目标。全新会话复测成功，不等于连续多任务稳定性已通过。插件正确拒绝自身投递。steer/inject 目前仅自动化验证，尚未完成真实模型介入和长时间浸泡测试。传输回执不表示对方已读或任务完成。

## Claude Code 本机通信（实验，0.2.0-rc.2.5）

原插件同时包含 DSH 跨会话与 Claude 桥接；安装后默认关闭。支持当前验证的 DSH 0.2.0-rc.2、Claude CLI 2.1.294 / 本机 Claude App Code；Node 24、Cordis 4.0.4+。

1. 在 DSH 安装本插件，进入 **插件 → 已安装 → dsh-cross-session-agent-pre** 的详情页，开启 **开启 Claude Code 本机通信（实验）** 一次。配置由 DSH 持久保存；无需手写 YAML、源码绝对路径或启动另一桥接进程。
2. 在 Claude Code 2.1.292+ 安装配套插件一次。无需公共目录收录，一条命令同时添加此 GitHub 市场并安装用户级插件：

```sh
claude plugin install dsh-cross-session-agent-pre-bridge --marketplace XiaoMa-PM/dsh-cross-session-agent-pre --scope user
```

3. 新建或正常恢复 Claude 会话使插件加载；桌面 Code 与 CLI 使用相同用户级插件，首次工具审批保留。
4. DSH 调用 list_peer_agents，取 self: true 的完整 session-UUID，交给 Claude 调用 send_dsh_message。反向用 Claude bridge_status 的 claudeSessionId（不是桌面 local_ ID），交给 DSH 调用 send_claude_message。要回复时明确要求回传结果。

仅本机消息，不读其他工作区的历史或文件。DSH 目标必须已加载且未归档。written / accepted 不代表已读或任务完成。保留 Claude accept/hold/refuse，不发送 own-child token。官方未公开完整 Inbox wire，所以是当前版本实验，不承诺其他版本或跨电脑；同 OS 用户进程属于信任边界。同用户只启用一个 DSH profile 的 Claude 桥接，避免重复监听。

### 交给 Claude Code 代为安装

将下面这段话粘贴到 Claude App 的 **Code** 会话或 Claude Code CLI 会话；不是普通 Claude Chat：

```text
请为当前用户安装 DSH 本机通信插件，执行：
claude plugin install dsh-cross-session-agent-pre-bridge --marketplace XiaoMa-PM/dsh-cross-session-agent-pre --scope user
安装后检查插件是否启用，并告诉我是否需要重新打开会话。不要修改 DSH 模型或权限配置。
```

需要离线交付时，可下载 GitHub Release 的源码 ZIP 并解压，告诉 Claude Code 解压后的绝对路径，执行：

```sh
claude plugin marketplace add /absolute/path/to/dsh-cross-session-agent-pre --scope user
claude plugin install dsh-cross-session-agent-pre-bridge@dsh-pre-local-experimental --scope user
```

不需要把 ZIP 上传到聊天窗口；本机文件夹路径才是安装来源。这里是自建市场安装，尚未进入 Claude 公共目录。一个仓库同时提供 DSH npm 包、Claude 市场入口和配套插件。

0.2.0-rc.2.5 的 npm 发布状态以 [npm 包页面](https://www.npmjs.com/package/dsh-cross-session-agent-pre) 为准；GitHub 已提供配套市场入口。
