# 多实例 Claude 桥接实施计划

> 按已批准的同日设计逐项执行，主循环负责真实桌面验收，路由实现使用子智能体开发与独立审阅。

**Goal:** Web 与桌面同时双向通信，用户在插件控制开启，明确实例路由，无跨实例兜底。

**Architecture:** 同 UID 私有登记目录中每个 profile 独立 socket；稳定实例 ID 来自公开 profileContext。Claude 查询聚合，发送必须指定 instanceId。保留原生 Inbox/MCP 与既有权限。

**Tech Stack:** Node 24、Cordis 4.0.4、DSH 0.2.0-rc.2、Claude 配套 stdio MCP、node:test。

## Task 1 — 实例登记与 Host

- [x] 在 test/multi-instance-bridge.test.mjs 写两 profile stable ID、sameUID 私有登记、独立监听、重复活动实例拒绝和重启恢复测试；`node --test test/multi-instance-bridge.test.mjs` 先失败。
- [x] 新建 claude-plugin/lib/instances.mjs：instanceIdentity(profileContext)、instancePaths(dir,instanceId)、saveInstance/readInstances/removeInstance；以公开 profile.name、realpath(profile.dir) 构造 SHA256 ID。登记只含实例/进程/socket元信息，打开文件 O_NOFOLLOW 并验证属主权限，socket 路径从 instanceId 派生。
- [x] 修改 lib/claude-bridge.js：inject profileContext、独立 bind、监听成功再登记、关闭本实例资源；请求必须携带匹配的 instanceId。保留边界、限流和安全陈旧 socket 恢复。
- [x] 修改 local.mjs transport 选择目标 instance socket；不读旧 bridge.sock，不引入兼容分支。
- [x] 对旧实验测试适配新合同（实验 Host reexport 正式实现，不保留两份 runtime），执行定向 tests GREEN。

## Task 2 — Claude 聚合与精确回复

- [x] 写 MCP 缺失 instanceId 拒绝、两Host同SessionID只向指定目标投递、一端离线不改投、Unicode 保真和身份不可伪造测试 RED。
- [x] server.mjs send_dsh_message schema 增加必填 instanceId；bridge_status 返回实例与所属会话。实际请求层汇总读登记，按唯一实例连接；局部失败保留另一实例状态，给出确定错误代码。
- [x] DSH→Claude peerContent 加 senderInstanceId/profileName 和 reply.instanceId；Claude→DSH source.targetInstanceId；不变更 userApproval=false 与正文。
- [x] 运行新测试及原 Host/MCP/transport 合约测试，审阅规格符合性及代码质量。

## Task 3 — 桌面配置缺失根因与 UI

- [x] 只通过公开服务源码、原生页面、配置状态与新 profile 复现取证；不臆测 Web 平台声明错误。
- [x] 写针对根因的 Client 回归 RED；仅修改必要 Client/settings 入口。消息展示依赖缺失不得阻止开关加载。
- [x] 通过公开 configForms 持久写 claudeBridge，运行状态单独验证；配置区显示当前实例信息、桥接开启状态。不得由保存布尔值伪造已连接。
- [x] 真实桌面详情页确认可见开关，实际启停工具/监听，截图作为证据。

## Task 4 — 安装与实际验收

- [x] 本地候选版本 DSH rc.2.7 / Claude 0.1.3-experimental，安装包包含 instances.mjs，配套同时更新；不自动发布。
- [x] 隔离真实 profile 原生 installBundle 安装，公开 settings 启动、停用及重启，检查稳定 ID。
- [x] 真实双Host transport 强度测试：同ID、单端故障、错误目标、关闭互不影响、Unicode、去重/限流、来源与权限。
- [x] 廉价模型 Haiku 4.5/GLM Flash Default 合成任务（实际 UI 选项），CLI/App Code × Web/桌面双方主动消息与回传；核验目标唯一、工具选择无导入或脚本替代。
- [x] 当前机器真实桌面插件详情/原生工具加载验收；若需重启或机器无法进行，记录具体缺口而不能宣称完成。

## Task 5 — 文档与收尾

- [x] 同步中英文 README、architecture、AGENTS、INPUT/OUTPUT/POS、版本/变更日志、progress 与设计实际偏差；不加设计外功能。
- [x] `node --test` 完整通过；`pnpm pack --dry-run --json` 对应 allowlist 通过；`git diff --check` 与静态敏感字段扫描；独立最终审阅无未解决重要问题。
- [x] outputs 生成脱敏验收报告，不存 raw session/transcript/auth。
- [x] 不推送 npm/GitHub、不自动重启用户工作服务、不删除用户导入会话。需要具体环境操作时在成品可审阅后处理权限。

## 历史验证记录（下方完成记录为当前状态）

- 完整 87/87；候选 tarball 包含 instances.mjs，官方 CLI 隔离 profile 安装完成。
- Client timer 缺失真实 Cordis RED→GREEN；配置状态与监听状态分开，公开 Connection RPC 显示身份，组件卸载清理刷新。
- 真实3103测试 Host settings/describe 包含插件，但新的状态 channel 返回405，正在核查公开服务注册链路，不能以 stub 成功视为实际成功。桌面/Web双端实际验收尚未完成。

- 2026-10-09实际状态入口与启停闭环：采用已批准的官方认证/api扩展；匿名401、认证成功，重启保持开启，启停真实监听对应，稳定实例ID。真实Cordis初始化拒绝普通对象返回的缺陷已TDD修复。完整88/88。日常双端模型往返尚未验证。

## 2026-10-10 实際验收完成

- 日常桌面官方本地目录安装与开关展示通过；Web旧实验监听经明确批准移除，两个实例同时独立监听。
- CLI/App Code × Web/桌面，双方主动共8条路径回传通过，Haiku4.5/GLM-5.3-Flash；关闭Web时桌面保留在线，指定离线目标拒绝且不改投，随后恢复。
- 完整88/88、独立最终17/17；验收报告outputs/rc27-local-acceptance.md。未提交/公开发布；Claude固定本地候选市场需公开发行后恢复GitHub源。
