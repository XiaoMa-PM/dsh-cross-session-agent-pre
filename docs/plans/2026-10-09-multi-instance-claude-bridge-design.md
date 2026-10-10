# Claude 本机多 DSH 实例桥接设计

## 目标与已确认决策

Anatole 于 2026-10-09 确认：Web 与桌面 DSH 可同时开启 Claude 桥接，用户在各自插件详情页控制开启状态；Claude 一次配置后查询全部已开启实例的会话，发送和回复精确路由。保留 native Inbox/MCP、原消息权限与正文结构。不存在默认桥接归属切换，也不要求用户手工编辑配置或终止另一个服务。

完成标准：实际桌面开关可用，Web/桌面同时双向通信，重启后配置与实例身份保持，重复 Session ID 不串线，目标离线不转发。未通过实际桌面验收前不发布。

## 排查证据与边界

- 桌面端已安装、启用 rc.2.6；其插件详情页未出现配置区，Client 加载/表单登记原因尚待定位。
- 全局 bridge.sock 当前由 3085 Web Host 监听，桌面发送方不属于该 Host。
- 用户截图显示先调用导入，后通过脚本直接 writeClaudeInbox；成功写入不能证明原生工具已加载或反向地址可用。
- 现有隔离 worktree adapt-dsh-020 可复用。授权执行环境下基线 node --test 为 77/77；默认沙盒不允许 socket，不作为产品失败。

## 实例身份与监听

复用公开 profileContext.name、profileContext.dir，规范化 profile 目录后计算 SHA-256 摘要作为 instanceId。界面展示 profile.name（web/desktop），路径不进入消息或 Claude 会话列表。身份绑定 profile，不依赖 PID、端口、标题；同 profile 重启保留 ID。两个同 profile 同时运行仍拒绝重复监听，不能抢占现有实例。

每个开启的实例在同 UID 私有目录中拥有独立 Unix socket 和登记文件，包含 instanceId、profileName、socket、ownerPid、ownerStart。登记不保存 Session 历史、消息正文或授权凭据。Claude 路由继续独立保存，不与 DSH 实例登记混用。

监听成功后登记；关闭只移除本实例登记/监听。沿用 sameUID、权限、进程启动时间与陈旧 socket 恢复检查，不能删除活动监听或普通文件。读登记验证文件与进程身份，不信任登记提供的任意路径。

不新增常驻路由守护进程：Claude 配套插件发现各实例并直接请求目标 socket。旧 bridge.sock 不参与新路由，不加入旧协议兼容分支；两端配套版本一起更新。

## 查询、发送与回复

bridge_status 汇总每个已开启实例，返回 instanceId、profileName、连接状态及本实例公开 agents 提供的在线普通、未归档会话。展示 Session ID、现有官方标题和 cwd；不读取历史补标题。某实例不可连接时仅标记该实例离线，不隐藏其他实例。

send_dsh_message 的模型参数增加 instanceId，与现有 to/content 一起形成目标地址。instanceId 为必填，源 Claude ID 仍由进程登记绑定。明确目标实例离线、会话不存在、重复身份等错误通过结构化错误代码返回；不能自动重试到另一实例，也不能自动迁移/恢复或导入会话。

DSH→Claude 元信息头部增加 senderInstanceId、senderProfileName；reply 包含 tool=send_dsh_message、instanceId、to。正文原样保留，userApproval=false。Claude→DSH immutable source 添加 targetInstanceId，Host 核验目标 instanceId 等于本实例后投递。written/accepted 不表示已读或完成。

## 插件配置与模型工具发现

保留每端独立的默认关闭 claudeBridge 开关，通过公开 configForms 写入。配置区与消息展示组件的依赖分别检查：消息 UI 依赖未满足时，不能拖住配置开关加载。只有实际取证确认依赖问题后才拆分必要组件，不做无关重构。

通过实际桌面页面和公开 Host/settings 状态确认 namespace、客户端模块声明、注入服务与现有缓存。准确根因未确认前，不把 platform=web 当作故障原因（官方桌面复用 Web Client）。配置区显示本实例名称/身份和开启状态；运行结果不能仅凭已保存布尔值宣称已连接。

DSH 原生 send_claude_message/list_claude_sessions 描述明确这是通信，不是导入；提供准确失败原因与操作指引。没有桥接工具时不通过脚本读路由、操作 socket 或迁移会话补救。不添加全局系统提示词。

## 范围

仅本机同 UID，多 profile 双向消息。保留 accept/hold/refuse、当前已验证 Claude wire、用户原生审批。自动标题登记迭代、远程电脑、Codex、历史读取、广播、自动确认不在本轮。

## 实施顺序与文件职责

1. 先写登记/独立监听及确定目标测试（RED），再实现 shared local transport 和 Host 实例化（GREEN）。主要文件：claude-plugin/lib/instances.mjs（新增，实例登记与发现）、claude-plugin/lib/local.mjs、lib/claude-bridge.js。
2. 先写双实例相同 Session ID/离线拒绝/MCP instanceId 测试，再实现 Claude 汇总与精确路由。主要文件：claude-plugin/server.mjs、test/multi-instance-bridge.test.mjs（新增）。
3. 复现桌面配置缺失，针对取证根因写回归测试；最小修复 lib/client.js/必要 Client 入口声明、lib/claude-bridge-settings.js。用原生 configForms 启停并验证运行态。
4. 同步中英文 README、模块 AGENTS、头部 INPUT/OUTPUT/POS、progress 和配套版本。提交前检查 docs/plans 是否与实现一致。
5. 实际 Web/桌面/Claude CLI/App Code 并排验收；明确区分直接传输测试与模型自主选工具测试。生成仅含合成测试内容和脱敏状态的验收报告。

## 验证矩阵

- 两个真实 Unix socket 同时监听；每个只投递一次到指定 Host，中文/emoji/前后空白保真。
- 两实例使用相同 Session ID，明确指定 instanceId 后只到目标；缺少/错误 instanceId 拒绝。
- Claude 源身份不能由模型覆盖；子代理、归档、离线和未知会话继续拒绝。
- 一端关闭或退出，另一端可用；目标离线不转发。
- Web/桌面分别重启，开关持久化、instanceId 不变，陈旧 socket 安全恢复。
- 实际插件详情显示开关，开启后原生 Claude 工具存在；关闭后移除桥接工具。
- Claude CLI/App Code × DSH Web/桌面各自主动发起及回复；使用 Haiku 4.5/GLM Flash low 合成任务，不更改用户工作会话模型。
- 自然语言“给这个 Claude Session 发消息”应选择 send_claude_message，不调用导入或 Bash socket 脚本；若不通过则记录模型选择失败，不把手工直写视为成功。
- 完整测试、打包文件边界、静态敏感信息扫描和实际安装加载通过；本轮不自动发布远端。

## 已批准实施调整（2026-10-09）

Anatole批准状态查询改用公开Connection.fetch在官方已认证/api上的只读扩展，Client仍调用公开Connection.rpc，路径/api/dsh-cross-session-agent-pre/status。不会改变消息传输或权限。真实Host验证未登录401、登录后身份/监听状态正确。桥接apply遵循Cordis返回void/清理函数合同，不返回普通元数据对象；真实Cordis生命周期回归覆盖监听保持与销毁。
