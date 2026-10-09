# Claude 会话定位与消息对齐计划

日期：2026-10-09。

## 已确认目标

在已发布桥接上最小改动，DSH 查询已登记的在线 Claude 会话时显示 Session ID、项目文件夹、当前工作目录、Git 工作树路径、模型、当前显示标题。标题包含自动标题，并随用户重命名更新；稳定 ID 继续作为路由地址。用户允许调用官方会话元信息接口；该接口内部读取会话文件片段，不保存或展示消息历史。官方显示标题可能回退到首条提示词，必须如实标识这一接口行为。

Codex 独立实验分支保存源码和安装包，不发布 npm、不合入 Claude 主线。本计划不改变现有通信行为；第二项消息对齐需先审阅比较再决定实现范围。

## 第一项：元信息最小实现

Architecture：沿用 SessionStart 登记和现有私有路由。Hook 提供项目目录、当前目录和观察到的模型；Git 元信息确定工作树。查询时仅对已登记在线 ID 调用官方 Agent SDK getSessionInfo，按白名单返回当前 summary/customTitle。没有查到的字段为未知，不扫描所有会话或调用 getSessionMessages。

Tech Stack：现有 Node.js / DSH 插件与 Claude Hook；官方 @anthropic-ai/claude-agent-sdk。版本与发行包依赖可用性在实施时验证。

- [ ] 在 `experiments/claude-bridge/test/local.test.mjs` 添加登记字段白名单、恢复更新、旧四字段路由仍可读取的现有行为回归；先验证失败，再扩展 `claude-plugin/lib/local.mjs` 的登记对象与合理文件长度边界。不加入多版本协议兼容层。
- [ ] 在 `claude-plugin/hooks/register.mjs` 登记项目目录、cwd、模型；通过 Git 命令确认工作树路径。新增隔离普通目录与 linked worktree 测试，不能把任意 cwd 当作工作树根。
- [ ] 在独立小模块 `claude-plugin/lib/session-metadata.mjs` 封装 getSessionInfo；只向调用者返回标题白名单，禁止转发 firstPrompt、历史、socket、PID。使用合成会话验证自动标题、自定义标题优先及重命名刷新、缺失元信息，不访问日常会话。
- [ ] 修改 `lib/claude-bridge.js` 的 list_claude_sessions 结果，合并登记字段和即时标题；工具描述如实说明元信息读取。测试同名不同 ID、中文/emoji、标题更新后仍路由同一 ID。
- [ ] 更新受影响源码 INPUT/OUTPUT/POS、模块 AGENTS、PRIVACY、README 中对应说明及 progress。执行 `node --test test/*.test.js experiments/claude-bridge/test/*.test.mjs`；再在专用隔离 CLI 和桌面 Code 会话验收，不动日常 DSH 3085。
- [ ] 验收自动标题出现、手动重命名后下一次查询变化、环境字段真实、双向发送不回归。提交前同步文档；版本升级和对外发布单独执行，不由本计划自动触发。

## 第二项：消息结构综合比较

证据：当前 `lib/claude-bridge.js`、`claude-plugin/lib/local.mjs`、`claude-plugin/server.mjs`；官方 https://code.claude.com/docs/en/cross-session-messaging 。现有实测已证明 Inbox 唤醒及双向通信，但不等于完整原生发送工具集成。

| 层面 | Claude 原生独立会话通信 | 当前 DSH 桥接 | 判断 |
| --- | --- | --- | --- |
| 正文 | 普通文本，身份和回复地址由宿主附加 | 正文加英文来源、权限提示和指定回复工具 | 可最小精简；先验证权限提示由宿主保留，DSH 侧须保留 peer 来源 |
| 地址发现 | ListAgents、会话名称及消歧地址 | DSH list_claude_sessions 返回 UUID；Claude bridge_status 查询 DSH | 第一项补标题改善 DSH 定位；不等于原生 ListAgents 已收录 DSH |
| DSH→Claude | 原生会话之间经 Inbox | 已使用 Claude Inbox，带 from/from_plugin/msg_id/priority | 接收层接近原生；payload 完整 schema 未公开，保持已验证实验边界 |
| Claude→DSH | 原生 SendMessage 解析目标和回复地址 | send_dsh_message MCP → 私有 Host → DSH followup | 功能可用；不能仅改工具名称就宣称原生 SendMessage 支持 DSH |
| 展示 | 原生 CLI 简短 sender/首行预览，可展开全文 | Claude 宿主渲染入站；DSH 当前为带 source 的 user 消息及正文前缀 | Claude 外观受宿主控制；DSH 可评估复用现有发送者卡片，不承诺跨产品 UI 完全一致 |
| 发送结果 | 宿主对超限、拒发等有自身语义 | DSH→Claude 仅 written；Claude→DSH 为 accepted | written/accepted 不代表已读、处理完成或得到回复，不能改名字制造回执 |
| 执行时机 | 活跃时工具间接收，空闲时新回合 | Claude 侧沿用 Inbox；DSH 沿用 followup | DSH 忙时排队/打断策略仍需独立验收，不能从 Claude 行为推断 |
| 入站权限 | accept/hold/refuse，peer 不能代表用户审批 | Claude 侧沿用原生；DSH 源数据和提示声明 peer | 必须保留，不因结构对齐取消审批 |
| 空闲通知 | 原生 notify_when_idle | 当前无对应能力 | 不纳入本轮最小消息结构改动 |
| 去重/大小 | 原生宿主限制 | 16 KiB；DSH 按 messageId 去重及每对会话限速 | 现有限制保留；原生数值不直接复制 |

## 候选方案与建议

1. 推荐：保留 Inbox/MCP 双向链路，正文精简为实际内容，来源及回复信息放结构化元数据/宿主说明；DSH 复用其现有 peer 展示能力。先测试 Claude 原生收到的 sender、回复目标是否足够明确，再决定保留的最短回复指引。实现成本最小；MCP 回复工具仍存在。
2. 深度原生接入：让 DSH 成为 Claude ListAgents/SendMessage 可发现的外部目标。当前没有已确认的公开注册接口；需新探针证明发现、身份、回传与权限全部可用。尚不能承诺可实现，且超出最小修改。
3. 官方 Channels：作为外部事件通道重新接入。属于另一套通道及启用方式，不等价于原生跨会话结构；本轮不推荐迁移。

第二项验收：在同版本、专用隔离会话中并排记录一次原生 Claude→Claude 和两方向桥接；仅收集测试消息、公开 tool 参数和用户可见展示，不读取工作会话历史。比较实际正文、来源、回复地址、忙/闲投递、hold/refuse、重复投递和发送回执；确认最小方案后实施。此前证据用于初步可行性，不能冒充本轮并排实测。

## 2026-10-09 消息对齐决策与首轮实现

Anatole 批准尽量复刻 SendMessage 结构、保留最小桥接链路。实现选择原项目既有协议标签包裹白名单元信息（senderPlatform、senderSessionId、reply.tool/to、userApproval=false），正文原样拼接；Claude native Inbox 仍负责 peer 权限，DSH source 保持不可变。Client 复用现有卡片渲染，Claude 来源为无跳转标签；不添加新的发现服务或消息回执状态。77 项测试通过，含 3 项新增结构与展示回归。官方 native SendMessage 对 DSH 的发现/寻址未实现；本轮不声称完全复刻。

## 消息链路验收完成

2026-10-09：原生 SendMessage 并排及候选桥接两个方向真实模型往返均通过，独立核验唯一发送与来源/目标保真。报告位于 workspace outputs/claude-sendmessage-comparison-acceptance.md。仅传输与回复模式验收完成；自动标题元信息、桌面 UI 现场比较、原生 SendMessage 外部目标接入未据此宣称完成。

## 发布范围确认

Anatole 授权发布消息结构对齐为0.2.0-rc.2.6，配套Claude0.1.2-experimental。元信息标题任务仍未实施，不能写入发布能力。社区按原仓库24小时门槛沿用已授权今晚22:00自动提交。
