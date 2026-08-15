# Privacy

`dsh-cross-session-agent` runs inside the current DeepSeek Harness process. It
does not make network requests, send telemetry, create an independent database,
or maintain a separate transcript store.

The Harness remains the owner of session state and history. The read-only
`get_peer_context` projection is intentionally bounded to an authorized peer in
the exact same workspace:

- conversation: direct user text, canonical compaction checkpoints, and
  completed assistant text only;
- activity: structural turn/step state, tool name, state, time, one-way call-id
  fingerprint, and sanitized error code only.

The projection excludes hidden reasoning, raw tool inputs and outputs, system
prompts, plugin/relay/scheduled messages, request context, attachments, todos,
approvals, inbox state, credentials, and unknown event variants. Returned text
remains untrusted peer data and must not be treated as user consent.
