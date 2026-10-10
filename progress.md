# Progress

## 2026-10-10 — rc.2.7 发行授权与准备

- Anatole选择先公开已验收rc.2.7，再提交社区收录；Claude配套0.1.3，两侧文档明确必填instanceId、独立开关和旧实验监听迁移。
- 公开发行提交排除本机截图、合成验收进程控制脚本、机器配置和同步调研的本地资料。新增脱敏验收摘要，保留88/88与8条真实路径证据范围。
- GitHub公开main与本地HEAD基线一致；npm登录失效，需要官方重新登录及发布授权。社区YAML已准备但尚未创建PR。

## 2026-10-10 — 桌面/Web同步关系调研与工作沉淀

- 用户指定Luna只读调研，因额度限制失败；主循环补查当前官方主线文档、社区原帖及本机profile manifest。
- 本机官方桌面home为~/.dsh，3085 Web为独立test-home。官方共享Web界面不等于全量同步；同home支持的产品数据与分别拥有的插件依赖/激活要分开讨论。当前桥接只做消息互通，不同步历史和配置。
- 社区#1485是旧版/第三方桌面壳共享存储个案，#8904是官方Windows rc.2插件加载个案；没有把它们当全部用户或当前Mac必现问题。第三方同步插件涉及凭据复制和覆盖，未安装/验证。
- 沉淀docs/2026-10-10-bridge-retrospective.md与docs/2026-10-10-desktop-web-sync-research.md，包含权限边界、真实8条往返、88/88回归、17/17独立复核与未完成事项。
- 定时社区任务已核验XiaoMa-PM、仓库满一天、rc.2.6 GitHub/npm实际下载、topic及规则；无同目标条目/开放PR。独立fork分支只准备指定YAML，未提交/创建PR。公开rc.2.6客户端加载问题尚未公开修复，已请求“先发rc.2.7再收录”或“rc.2.6草稿注明问题”的决策；不擅自发布新版。

## 2026-10-10 — 日常双实例模型验收完成

- 经明确批准移除Web唯一claude-bridge-experimental并重载3085，恢复Claude登录。两端插件rc.2.7独立监听，配套Claude0.1.3已安装。
- CLI/App Code × Web/桌面双方主动共8条路径真实回传通过，Haiku4.5/GLM-5.3-Flash；App原生Inbox头部来源/reply与userApproval=false核验，模型均走原生桥接工具。
- 关闭Web后桌面继续在线，指定已注销Web返回UNKNOWN_INSTANCE且不改投；恢复Web。完整88/88，独立最终17/17无重要缺陷。
- CLI专用验收进程结束，用户App测试会话保留，两端开关恢复开启。报告outputs/rc27-local-acceptance.md及本地截图。未公开发布，Claude仍是固定本地候选源，发布时需恢复GitHub。

## 本轮 — 日常候选更新（模型验收待登录与旧配置迁移）

- Anatole明确批准更新三端并重载；桌面通过原生管理器本地固定目录安装rc.2.7，Claude桥接开关与实例身份可见，监听true。官方卸载首次受旧版发布年龄校验影响并回滚不完整，重载后通过原生流程清理异常登记并安装成功；未放宽年龄策略。
- Web test-home旧别名包已换成rc.2.7；经Anatole明确批准该数据目录及原凭据引用恢复3085。新开关已开启，但旧claude-bridge-experimental插入仍抢先监听，新开关状态因此不一致。自动审批拒绝移除旧条目，尚未修改；已提出唯一旧条目移除+重载的具体确认。
- 经Anatole具体批准，Claude同名市场临时改为固定本地候选目录，官方CLI安装0.1.3-experimental并enabled；其他插件不动。公开发布后需恢复GitHub市场来源。
- 两个实例登记在线，ID分别为desktop <instance-id>、web <instance-id>。这仅是登记与监听证据，不代表模型往返完成。
- 官方Claude auth status当前loggedIn=false，已请求本机claude auth login。真实模型双向验收待登录和Web旧条目迁移；没有公开发布。~/.Codex/setup.md已同步候选来源和状态。

## 2026-10-09 — 已批准状态入口修复及真实启停验证

- Anatole批准只读状态改用官方认证/api扩展。正式入口/api/dsh-cross-session-agent-pre/status，Client继续用公开Connection RPC；未登录401，认证后返回实例身份、配置开启与实际监听，无路径或对话。
- 真实Host开关开启后监听仍退出，临时诊断捕获子插件TypeError Invalid effect。根因是桥接apply返回普通身份对象，违反真实Cordis初始化返回值合同，宿主随即卸载监听。移除返回对象，测试地址改由测试fixture推导；新增真实Cordis生命周期RED→GREEN。
- 修复后隔离3103官方包安装、开启持久化重启、关闭→开启→关闭均通过，enabled/listening对应变化，instanceId稳定。完整88/88、差异检查通过。
- 日常桌面/Web/Claude未升级；跨两端实际模型往返尚待候选安装与重载后验收，未发布。临时诊断日志仅副本，正式包无诊断代码。

## 2026-10-09 — 重试真实状态接口（未闭环）

- 临时诊断副本在隔离3103实际 Host 证实 configure 与子作用域均进入；scoped.webServer 可访问，但官方 Connection rpc.handle 注册仍报 cannot get property "webServer" without inject，HTTP405。补依赖/移除重复effect均未消除实际错误，不能把时序单测当根因已修复。
- 正式源码无诊断日志；路由/状态/Client 回归88项已通过。临时包仅安装rc26-bare-home测试profile，日常3085、桌面与用户Claude未更新。
- 已请求状态展示入口的小范围决策：改用官方认证 /api 的只读状态扩展，或继续调查原通道；消息传输与权限不变。真实桌面/Web双向验收尚未完成，未发布。

## 2026-10-09 — 多实例核心与桌面配置根因（验收中）

- 已实现稳定 profile 实例 ID、独立登记与 socket、Claude 聚合发现及精确实例投递；不使用旧全局 bridge.sock。实例不响应时返回 INSTANCE_OFFLINE，不改投其他实例。
- 独立审阅发现 status 请求未统一验证实例、超时未分类两项问题，均已修复并回归。
- 桌面配置缺失复现为 Client 强依赖官方前端未提供的 timer 服务；真实 Cordis 注入测试先失败，移除依赖并使用 React effect/native timer 后通过。并非 platform:web 声明错误。
- 当前完整回归 85/85，独立定向 25/25。配置实例信息/运行状态展示与真实双端模型验收仍待完成；未更新日常环境、未发布。

## 2026-10-09 — 多实例桥接设计确认

- Anatole 确认 Web/桌面同时接入、按实例与会话路由，在各端插件控制开启；不再转移唯一桥接归属。
- 复用 adapt-dsh-020 隔离 worktree；公开 profileContext 提供稳定 profile 身份资料，桌面官方复用 Web Client，不能据 platform=web 下结论。
- 授权本机 socket 的完整基线为 77/77。设计已保存 docs/plans/2026-10-09-multi-instance-claude-bridge-design.md；实现尚未开始，按 brainstorming 的书面设计复核阶段等待用户审阅。

## 2026-10-09 — 用户桌面实测失败排查（未闭环）

- 用户桌面 DSH 已安装并启用 rc.2.6，但插件详情未显示 Claude opt-in 配置区；尚未确认 Client 配置组件缺失原因。
- 当前 /tmp/dsh-claude-501/bridge.sock 监听属于 PID86934 的 3085 Web Host，而用户发送方在 DSH 桌面 Host。Claude connected=true 仅代表接上该 Web Host；发送方不在列表不能据此推断用户会话已结束或 ID 变化。
- 截图显示 DSH 先误用导入，纠正后通过脚本 writeClaudeInbox 发出；原生 send_claude_message 工具是否加载需核实。直接写入成功不能证明反向路由可用。
- 已向 Anatole 请求唯一桥接归属决策：建议 Web 保持运行，仅关闭其 Claude 桥接，切换桌面后双向验收。未关闭服务、未修改开关、未删除导入会话；尚未修复或发布。

## 2026-10-09 — rc.2.6 公开发布与安装验证完成

- GitHub源码487f4f4、Release v0.2.0-rc.2.6与npm latest=0.2.0-rc.2.6已公开。SHA1 ae5a566382045dde19d8b24737c0dc6985dd4002，GitHub SHA256 d8c4b441dd01ea92e3a655328060efa550f4db814cc5943cecd27158645bbe3a；同一安装包。
- 空白Claude配置从GitHub安装0.1.2-experimental，enabled=true/MCP自动加载。DSH空白profile裸包名与指定版本安装均确认rc.2.6及peerContent新实现。没有升级日常3085或用户Claude配置。
- npm首次tarball路径缺./被当Git shorthand，未发布；使用本地路径、TTY Web二次认证后成功。registry processing期间首次DSH裸名安装解析旧版，传播后另一空白profile裸名安装rc.2.6；不把首次旧版当成功。
- 社区需仓库满24小时，已更新用户授权的今晚22:00提交自动化及YAML说明，尚未提交/收录；标题登记与Codex分支仍待后续。

## 2026-10-09 — rc.2.6 发布准备

- Anatole 授权同步 GitHub/npm/DSH 安装与社区说明。发行范围仅消息结构对齐；Claude 配套0.1.2-experimental，标题元信息和Codex不纳入。
- 社区仓库满24小时的门槛尚未满足，沿用已授权今晚22:00提交并更新任务描述，不能宣称已经收录。

## 2026-10-09 — SendMessage 并排与桥接双向验收通过

- 原生 Claude→Claude、DSH→Claude→DSH、Claude→DSH→Claude 三路径真实通过，Haiku 4.5 / GLM Flash low。独立核验唯一 MCP 调用、精确来源/目标/replyTo、中文 emoji 保真。
- 验收脚本初次误读公开 user/message 字段，并错误匹配完成文案；修正 probe 后依据实际消息验收，插件未因此改动。
- 新结构保留 Inbox/MCP；不声称原生 SendMessage 注册 DSH，或桌面 UI 完全复刻。模型进程与专用 3101 已停止，日常3085未改；未发布。报告 outputs/claude-sendmessage-comparison-acceptance.md。

## 2026-10-09 — SendMessage 风格桥接候选

- Anatole 批准最小结构对齐；双向长英文前缀改为来源/回复工具/非用户授权元信息头部，正文保真。DSH 复用消息卡片，Claude UUID 不跳转本地会话。
- TDD：新 envelope 和 Claude 卡片测试先失败，最小实现后完整 77 项通过；最终展示调整后 15 项定向复核及 git diff --check 通过。新隔离 Haiku 会话经原生 Inbox 识别回复地址并原样返回中文/emoji 标记。
- 最终复核曾因自动审批服务额度错误未执行；用户要求重试后成功。未发布、未替换日常环境；完整原生 SendMessage 并排和新结构真实 MCP 往返尚待验收，元信息标题需求与 Codex 独立分支封装仍待完成。

## 2026-10-09 — Claude 元信息与消息对齐计划

- Anatole 确认在原有桥接上最小改动，登记环境字段，使用官方会话元信息接口获取自动标题及重命名后的标题；不保存或展示正文。
- 已读取实际双端实现并对照官方跨会话文档：Claude 入站沿用 Inbox，回 DSH 为 MCP/followup；长正文前缀、非原生回复工具、written/accepted 回执是主要差异。
- 计划 docs/plans/2026-10-09-claude-session-metadata-and-message-alignment.md；第二项仅完成静态与文档比较，尚未实施或做本轮原生并排实测。原生 SendMessage 能否注册 DSH 目标仍未证实。

## 2026-10-09 — 双端公开发布完成

- GitHub源码4ba34cd与Release v0.2.0-rc.2.5公开；npm官方latest已指向0.2.0-rc.2.5，dist shasum与GitHub附件一致。保留dd2673/GengDaPeng来源与MIT归属。
- 从公开GitHub一条Claude安装命令成功，配套0.1.1-experimental且enabled；全新published-home官方CLI裸包名安装成功。另一空白profile原生pluginManager inspect/installBundle同样裸名成功，application=applied、bundle启用、claudeBridge=false且没有socket监听。
- 74项测试与主代理独立74项复核通过。发布审阅新增UTF-8分块保真和用户批准的安全陈旧socket恢复；不删除在线Host或普通文件。
- npm首次登录失效，用户恢复；发布Web二次认证曾超时，重新即时授权后npm接受并processing，等公开dist可读才宣布下载可用。
- 本轮Mac锁定，未重复UI点击，按主代理要求用公开native RPC验收；此前候选UI启停/重启证据独立保留。不迁移日常环境或重启工作会话；本轮专用3097测试Host已停止。

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
