# Claude bridge 插件封装设计与执行计划

Anatole 已选择并批准：原 dsh-cross-session-agent-pre 集成桥接，默认关闭，首次设置开启一次。复用现有隔离 worktree；保留 Claude 原生审批与当前版本实验 wire；不扩展跨电脑或未来版本兼容。

**Goal:** 全新 DSH 0.2.0-rc.2 profile 只安装一个包、原生设置开启一次即可与配套 Claude 用户级插件双向通信，无源码绝对路径或手写 patch。

**Architecture:** 将已验证实验 Host 移入 lib；Claude 插件与本地传输 helper 随同包发行，根目录提供 Claude marketplace。DSH 主入口声明 boolean volatile Config，通过公开 plugins.bundle.config slot 和 configForms API 渲染开关。开关通过 settings/document-updated 触发串行子插件 mount/dispose；默认不监听、不注册 Claude 工具。包安装仍由既有 dsh.bundle.patch 自动挂载主入口。

**Tech Stack:** DSH 公共 Config/settings/Cordis plugin 生命周期；@deepseek-ai/schemastery 3.18.4；Node 24 Unix sockets；原生 Claude hooks/MCP。

## 文件与职责

- lib/claude-bridge.js：原实验 Host，导入随包 Claude 插件的 lib/local.mjs。
- lib/claude-bridge-settings.js：默认关闭与 settings 开关的子插件生命周期。
- lib/index.js：Config schema、接入 lifecycle，保留原跨会话实现。
- claude-plugin/：原实验 Claude 插件完整自包含副本。
- .claude-plugin/marketplace.json：发布仓库 Claude 插件入口，source ./claude-plugin。
- package.json：3.18.4 schema 依赖、Claude 插件/marketplace allowlist，版本候选 0.2.0-rc.2.5。
- test/claude-bridge-settings.test.js：默认不挂载、只响应自己的 settings namespace、开关卸载与重新开启。
- 现有实验 tests：导入发行 Host，避免分别测试两份逻辑。

## 执行顺序

- [x] RED：新增 lifecycle 测试；import 不存在时失败；Config 单测预期默认 false 的 volatile ref。
- [x] GREEN：实现 configureClaudeBridge(ctx, enabled)。串行 Promise 队列中按 enabled.get() mount/dispose，ctx.effect cleanup 等待队列后关闭 fork；只响应 ctx.fiber.entry.options.id。
- [x] 原 Host 用 cp 移入 lib，import 改为 ../claude-plugin/lib/local.mjs；复制 Claude 插件到包根。原实验 Host 改为 re-export，避免双份逻辑。
- [x] 主入口：export Config = z.object({claudeBridge: z.boolean().default(false).description('开启 Claude Code 本机通信（实验）').volatile()}); apply 默认 Config({})，调用 lifecycle。测试 fixture 用 Config(config) 模拟 native resolved Config。
- [x] package allowlist 增加 claude-plugin 与 .claude-plugin/marketplace.json；本机路径不进入发行文件。pnpm install --offline；node --test 全部通过。
- [x] pack tgz，在全新隔离 DSH_HOME 以官方 plugin add 安装；确认包自动加载、settings 描述含 false 开关；通过原生 UI 开启、关闭、再次开启。
- [x] 专用测试端口与 DSH_CLAUDE_BRIDGE_DIR 环境隔离现有用户 3085 会话；CLI 测试环境同目录，不要求用户配置这个隔离变量。做一次真实低成本双向及重启持久性。
- [x] 同步 README 中英文、AGENTS、progress、验收记录；准备可审阅发行候选。公开发布在验收完成后作为最终步骤处理，不自动迁移日常 DSH。

## 自审

目标与接口来自已验证代码；settings 仅生成 volatile 字段，故必须使用 volatile boolean。配置改变后 event 来自官方 settings.describe，值已由 Cordis 更新。只增加本功能生命周期，不重构原业务。默认关闭不建立 socket。单 OS 用户目前仅支持一个启用的桥接 Host；多个 profiles 不自动竞选或并行监听。

## 验收结果（2026-10-09）

71 项自动化测试通过。全新隔离 profile 官方 plugin add 安装；原生插件详情页默认关闭，开启/关闭/再次开启与重启恢复核验通过。安装包的 Claude 配套插件通过原生 validate；Claude Haiku 4.5 与 DSH GLM-5.3-Flash 分别主动发起并回传 Unicode 标记，来源/目标与唯一投递匹配。模型账户配置独立于桥接；未发布或迁移日常环境。Config schema 本身不会生成详情 UI，因此补充了公开 configForms 与 slot 渲染。

## 发布审阅修复（2026-10-09）

独立审阅复现跨 chunk UTF-8 损坏，双端使用 socket.setEncoding 流解码。Claude 配套版本0.1.1-experimental。

Anatole 另明确批准异常退出恢复：只有 bind EADDRINUSE、现有 sameUID socket、connect 返回 ECONNREFUSED，且再次 lstat inode/dev 一致时删除陈旧 path并重试绑定一次。连接成功/超时/其他错误、普通文件或变化中的 path 均拒绝；不扩展多Host设计。
