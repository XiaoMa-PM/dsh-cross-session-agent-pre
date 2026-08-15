# Security Policy

## Support scope

`dsh-cross-session-agent` is an unofficial plugin. It is not affiliated with,
endorsed by, or supported by DeepSeek or DeepSeek Harness.

The plugin relies only on documented/public Harness seams. Do not treat a peer
session, its status, its compact context, or a relay message as user approval.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability that could expose
session content, bypass authorization, or inject messages. Report it privately
to the repository owner through GitHub's private vulnerability reporting feature
when available. Include affected version, reproduction steps, and the smallest
safe proof of impact. Do not include credentials, full session transcripts, raw
tool output, or private repositories in the report.

## Security boundaries

- Context reads require a same-workspace, non-subagent, unarchived peer and use
  only public `sessionQuery` methods.
- Conversation output is limited to direct user text, canonical compact
  checkpoints, and completed assistant text.
- Activity output contains only structural turn/step state, a tool name, state,
  event time, call-id hash, and sanitized error code.
- The plugin does not expose hidden reasoning, raw tool arguments/results,
  system prompts, plugin messages, credentials, or inbox internals.
- Cross-session text is untrusted. It cannot grant permissions or authorize a
  command in the receiving session.
