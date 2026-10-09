# Local boundary

- 地位：同用户路由和 Unix 传输边界。
- 逻辑：local.mjs 校验私有目录、在线进程、目标和正文。
- 约束：目录 0700，路由 0600；仅当前验证版本；同 UID 进程属于信任边界。
- 业务域清单：local.mjs。

- 传输按 UTF-8 流解码，保留跨 socket chunk 的中文/emoji；不逐 Buffer 独立转字符串。
