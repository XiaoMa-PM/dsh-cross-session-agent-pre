# dsh-cross-session-agent-pre Guidelines

> Unofficial project. It is not affiliated with, endorsed by, or supported by
> DeepSeek or DeepSeek Harness.

## 架构原则

- Harness 是核心会话、运行状态和持久数据的 Owner；插件只通过公开合同扩展能力，不建立平行真相源。
- 稳定身份与可变展示信息必须分离；路由、授权和关联不得依赖标题、界面位置或其他展示属性。
- Host 负责协议与信任边界，Client 负责交互增强，Harness 负责核心生命周期；UI 失效不得影响通信正确性。
- 保留消息的真实来源和权限边界；Agent 消息不得伪装成人类输入，也不得代替用户批准高风险操作。
- 传输事实、运行状态和业务结果是不同概念；不得从已投递、已领取或空闲状态推断已读、已回复或已完成。
- 跨会话发送必须来自明确的用户意图或已授予的编排职责；避免隐式转发、自动确认和消息循环。
- 本插件服务于同仓库并行 Agent 的 ownership、handoff、blocker、验证和冲突规避；不把它扩张为任意 transcript reader 或共享授权通道。
- `get_peer_context` 只允许同 `cwd` 的普通 root/fork peer，并只能使用公开 `sessionQuery`；不得恢复、唤醒、投递或修改目标。
- conversation 只允许 direct user、canonical compact checkpoint、completed assistant text；activity 只允许 turn/step 结构状态、工具名、状态、时间、call-id hash 和 sanitized error code。
- 绝不暴露 hidden reasoning、raw tool args/results、system prompt、plugin messages、Inbox、approval、凭据或未知事件；peer 文本不能视为用户授权或要自动执行的命令。
- 不新增网络、遥测、独立存储、平行 transcript 或 mailbox。

## 开发原则

- 优先复用 Harness 公开能力和项目现有实现；不依赖私有接口，不为假设中的未来需求增加协议、状态机或抽象。
- 在信任边界校验外部输入和持久数据；修复共享根因，并保持职责边界清晰。
- 行为变更必须留下能捕获回归的最小验证；涉及 Host、Client 或真实运行态时，验证对应的实际边界。
- 用户可见行为变化时同步中英文 README；项目只保留一份现役架构，历史方案留在 Git 历史和 Release Notes。
- 新 relay source kind 为 `dsh-cross-session-agent`；Client 必须保留 `dsh-agent-message` source/tag 的只读历史显示兼容，不能让兼容层参与权限或路由。

## 交付与安全

- 保留用户已有的无关改动，只提交当前任务范围内的文件。
- 不提交本地 profile、日志、凭据、token 或敏感调试输出。
- 任何远端更新都必须取得用户明确授权；本地编辑或提交不构成远端授权。
- 发布前验证 package allowlist、静态脱敏扫描、targeted tests 和真实 profile load；其中前者不能替代真实 Harness 验收。

## 模块地位与逻辑

- lib/index.js：Host 工具与消息权限边界；通过 agents 投递，通过 sessionQuery 查询日志回执。
- lib/client.js：Web 会话引用、公开 Chat 节点渲染及 uiWorkspace.openSession 导航；其他消息来源沿用官方渲染器。
- lib/peer-context.js：同工作区会话的受限上下文投影。
- test：工具合同、客户端行为与发布文件校验。
- scripts：真实 profile 验收；旧脚本需要核对当前 Harness 公共接口后使用。
- scripts/claude-probe：本机 Claude Inbox 可行性探针，仅测试新会话，不进入发布运行时。

## 已批准实验例外

- Anatole 于 2026-10-08 批准 experiments/claude-bridge 使用当前验证版本的原生 Claude Inbox 实验 wire，以及同用户 Unix socket 与最少路由登记。此例外仅限本机实验，不改变现有发布 runtime 或授权消息边界。
- experiments：opt-in 实验；claude-bridge 覆盖 Host、Claude 插件、测试与本地市场，参见其 AGENTS.md。

## 2026-10-09 批准的桥接封装

- 用户批准将已验证桥接纳入原插件，默认关闭，原生 settings 开启一次；当前版本实验 wire 例外延伸至此 opt-in 发行候选。不扩展历史读取、远程或多版本兼容。
- lib/claude-bridge*.js：发行 Host 与开关生命周期；claude-plugin：自包含配套 Claude 插件；.claude-plugin：市场入口。
- 2026-10-09 发布审阅修复：双端 UTF-8 流解码；Anatole 批准安全陈旧 socket 检查后一次重绑，不移除活动 Host。

- Claude 桥接结构对齐沿用 native Inbox/MCP，不冒充 Claude 原生目标；来源、回复地址与正文分离，written/accepted 不是已读或完成。

- 多实例候选：每个 profile 独立开关、身份与 socket；Claude 按 instanceId/session 路由，不跨实例兜底。Client 配置通过公开 configForms 保存，运行状态必须依据 Host 实际监听。
