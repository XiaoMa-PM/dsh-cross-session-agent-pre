# Local boundary

- 地位：同用户路由和 Unix 传输边界。
- 逻辑：local.mjs 校验私有目录、在线进程、目标和正文。
- 约束：目录 0700，路由 0600；仅当前验证版本；同 UID 进程属于信任边界。
- 业务域清单：local.mjs（Claude 路由与传输）；instances.mjs（profile 稳定身份、私有实例登记与发现）。

- 传输按 UTF-8 流解码，保留跨 socket chunk 的中文/emoji；不逐 Buffer 独立转字符串。

- peerContent 仅序列化宿主确定的发送者、平台、回复工具及 userApproval=false，原样保留消息正文。

- 多实例桥接：公开 profileContext 的 realpath/name SHA-256 身份，实例独立 socket/0600 登记；Claude 状态汇总 instanceId、profileName、原标题与 cwd；发送必填 instanceId，Host 核验并写入 immutable targetInstanceId，回复头部携实例地址。旧 bridge.sock 不参与路由。
