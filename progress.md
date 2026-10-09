# Progress

## 2026-10-09 — 同仓库双端发布与快捷安装准备

- Anatole 批准将 DSH 裸包名安装与 Claude 自建 GitHub 市场安装放在同仓库，并授权发布。DSH 桥接默认关闭，用户在插件详情开启一次。
- 更新中英文快捷安装说明：Claude 2.1.292+ 原生 `plugin install --marketplace` 一次添加市场并安装用户级插件；源码 ZIP 需解压并提供本机路径，不把普通 Chat 上传当成本机安装。
- 全部 74 测试通过（原71加3项发布回归）；根市场与 Claude 插件原生 validate 均无错误或警告。npm 包29项精确 allowlist；实验 ZIP 不进入源码提交或发行包。
- 初次 npm whoami 返回401，用户已恢复登录，待发布复核。独立审阅复现跨 chunk UTF-8 损坏；先分别验证请求/响应 RED，再双端 setEncoding 修复。Claude 配套版本递增为0.1.1-experimental，避免旧版本缓存。Anatole 明确批准 sameUID、ECONNREFUSED、二次inode/dev一致后一次重绑；先SIGKILL复现RED，修复后验证恢复且活动Host/普通文件不删除。

## 2026-10-09 — Claude 桥接封装候选验收通过

- 0.2.0-rc.2.5 候选将 Host、Claude 配套插件、marketplace 纳入发行包；DSH 默认关闭，在原生插件详情页开启一次，持久保存，无手写桥接 patch 或源码路径。
- 71 项测试通过；全新隔离 profile 官方安装、开关启停与重启恢复通过；安装包 Claude 插件原生 validate 通过。Haiku 4.5 / GLM-5.3-Flash 双方分别主动发起并回传，Unicode 标记、来源目标和唯一投递核验通过。
- 踩坑：Config schema 不会自动生成插件详情 UI，需公开 configForms + plugins.bundle.config；重复同名 tar 路径触发包缓存，改用新文件名核验实际内容；默认沙盒禁止 Unix sockets，原生测试采用授权执行环境。
- 本轮未重新测桌面端；此前桌面 Code 双向验收仍是原实验版证据。当前候选未提交、未公开发布，日常环境未迁移。
- 设计 docs/plans/2026-10-09-claude-bridge-packaged.md；报告 outputs/claude-bridge-packaged-acceptance.md。


## 2026-10-08 — Claude / DSH 本机实验双向桥接与一次配置通过

- Anatole 批准当前验证版本实验 wire；在既有隔离 worktree 的 experiments/claude-bridge 实现 DSH Host、Claude SessionStart 注册、进程绑定 MCP。无 token/history，原生 peer 入站控制保留。
- 67 项测试通过；CLI / 桌面 Haiku 4.5 各三轮真实往返；额外分别 Claude 主动请求、DSH 回传；准确 source/target 与唯一 Unicode 标记核验，无隐式确认循环。
- Claude 用户级本地插件安装完成；CLI 不带临时插件配置、桌面空目录无项目 hook/MCP 均实测往返。停止 CLI 后旧 route offline，恢复同一 UUID 自动登记；未创建另一工作 runner。
- 隔离 DSH profile 用 insert 持久挂载实验 Host，重启后额外往返通过。日常 DSH 未迁移，127.0.0.1:3085 保留。~/.Codex/setup.md 已同步。
- 踩坑：DSH session-UUID、SDK output.render、工具加载/插件命名空间、Cordis 新插件 insert 各有真实失败证据并已修正。模型自然语言缩短 payload 的失败首轮不计入成功。
- 限制：本机同 UID 信任边界，DSH 仅已加载普通未归档会话，旧工作会话须正常重新加载插件。原生工具审批保留，wire 未公开，当前版本实验不发布/不做多版本兼容或远程。
- 报告 outputs/claude-dsh-bridge-acceptance.md；设计 docs/plans/2026-10-08-claude-dsh-*.md。实验改动未提交、未发布；现有包 allowlist 不包含 experiments。


## 2026-10-08 — Claude Inbox 入站探针通过，生产接口决策待定

- 用户批准执行设计；复用 linked plugin-worktree，52 项基线通过。登记 hook 先 RED，再 GREEN 2/2；不保存 token/transcript。
- CLI 2.1.294 与桌面 Code 的专用新测试会话均自动登记 socket；Haiku 4.5 入站三轮唤醒并回复标记。桌面首轮因既有规则要求确认，限定测试授权后回复；后两轮直接回复。
- 全部投递来自外部 Node、不发送 auth、不模拟 own-child；原生 peer 权限说明保持。hold 明确暂存未交给模型，refuse 没有触发模型。
- CLI 退出后恢复同一测试 ID，SessionStart 自动登记新 socket，旧 socket 消失，新地址回复 CLI_RESTART_OK。模型测试已结束；桌面测试会话空闲保留。
- CLI 登录曾过期；用户重新登录后真实模型测试通过。初次沙盒禁止 ~/.claude/session-env，批准提权后仅原生测试会话写入正常。
- 关键限制：官方未公开完整 payload schema，探针用本机静态实现线索核验。原项目禁止私有接口，继续运行时桥接前需用户决定是否允许当前版本实验 wire，不默认新增兼容代码。
- 尚无 DSH→Claude 工具或 Claude→DSH MCP 回传、全局安装、发布；报告 outputs/claude-local-inbox-probe.md。

## 2026-10-08 — npm accepted publication

- npm 11.15.0 accepted dsh-cross-session-agent-pre@0.2.0-rc.2.4 under latest/public; registry processing and mirror availability checked separately.
- No runtime changes; GitHub documentation now includes bare-name installation.

## 2026-10-08 — npm version reservation

- Registry rejects both direct and staged publication of 0.2.0-rc.2.3 as previously staged, while the public endpoint only exposes 0.0.0-stage.
- Increment to 0.2.0-rc.2.4 without runtime changes, preserving package identity and upstream attribution.

## 2026-10-08 — Preview adaptation naming

- User chose dsh-cross-session-agent-pre; package, bundle and Web module identities renamed.
- Upstream links and source protocol remain unchanged; no external Claude Code support added in this release.
- GitHub repository and community automation use the new name; version 0.2.0-rc.2.3.

## 2026-10-08 — DSH 0.2.0-rc.2 adaptation prepared for public release

- Adapted public Session queries, inherited fork receipt boundaries and Web sender cards/navigation.
- 52 automated cases passed 20 repeated runs; real-model six-direction messaging has successful evidence, with fresh-session retests.
- Codex subscription rate limits and stale instructions after canceled turns remain continuity limitations. External Claude Code and cross-machine routing are not supported.
- Preserved dd2673 and GengDaPeng upstream attribution and MIT license. Target GitHub owner: XiaoMa-PM.
- GitHub Release publication must not automatically publish the upstream npm package; inherited npm release workflow removed.
- Authenticated as XiaoMa-PM; public upstream fork created on 2026-10-08 at 13:49:43 UTC. GitHub release prepared; community listing must wait until the repository is one day old.
