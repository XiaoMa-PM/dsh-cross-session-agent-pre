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

## Opt-in local Claude bridge (release candidate)

The packaged Claude bridge is disabled by default. A persistent boolean on the native installed-plugin detail page mounts or disposes the local Host. The companion Claude plugin registers minimal session UUID/socket/PID/process-start metadata in a private per-user local directory; no transcripts or credentials are stored there. Messages retain sender and target identities and are peer input, not user authorization. Claude native peer accept/hold/refuse remains in control. Only the tested local Inbox wire is supported experimentally; one enabled Host per OS user, with loaded, unarchived DSH targets. This is not cross-machine transport.
