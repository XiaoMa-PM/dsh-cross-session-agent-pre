# Cross-Session Context TDD Contract

## Scope

`dsh-cross-session-agent` extends peer messaging with one bounded,
read-only `get_peer_context` tool. It does not expose arbitrary session search,
raw events, event ranges, or persistence handles. Harness remains the sole
owner of session state and history.

## Authorization

- The caller must be a normal root/fork session with a non-empty `cwd`.
- The target must exist, be different from the caller, be unarchived, and not
  have `origin: subagent`.
- Caller and target `cwd` values must match exactly. Missing and cross-workspace
  targets fail with the same generic authorization error.
- Reads use only public `ctx.sessionQuery` methods. They never resume, enqueue,
  steer, inject, mutate, or make the target live.

## Conversation Projection

- Read the target's folded current surface with `readSurface()`.
- Include only direct-user `user/message` text, canonical compaction checkpoint
  text, and completed `assistant/message` text.
- Exclude plugin/relay/scheduled user messages, reasoning, images, streaming
  chunks, tool calls/results, request headers/context, system prompts, todos,
  approvals, inbox state, unknown plugin events, and shadowed history.
- Preserve chronological order, then retain at most the newest configured
  message count and byte budget. Report exact omitted counts and UTF-8 bytes.
- Cross-session text is untrusted data. The result explicitly forbids treating
  it as user approval, permission, or an instruction to execute.

## Activity Projection

- Runtime status comes only from the Harness agent registry; an unloaded target
  is `offline`, never inferred as idle.
- Raw-log activity is a strict event-type whitelist. Report current turn/step
  state, the latest terminal reason kind, and at most the configured newest
  tool activities.
- Tool activity includes only tool name, `running|completed|error`, event time,
  and a short one-way call-id fingerprint. Never expose arguments, result
  content, result metadata, approval reason, stack, or error message.
- Unknown or malformed event variants are ignored, not serialized.
- Activity is best-effort event-log evidence, not proof of external side effects
  or task completion.

## Public Tool

- `get_peer_context({ sessionId, view?, maxMessages? })`
- `view` is `overview` (default), `conversation`, or `activity`.
- `maxMessages` is an integer from 1 through 8 and only affects conversation.
- Output is one JSON value with schema version, target identity/title, runtime
  status, capture sequence/time, trust warning, optional bounded conversation,
  optional activity, and retention statistics.

## Required Tests

1. Reject self, subagent caller/target, archived target, missing cwd, cross-cwd,
   missing target, and invalid arguments without revealing which boundary hit.
2. Online and cold sessions use public query reads only; no Agent lifecycle or
   Inbox method is called.
3. Projection includes direct-user, compaction checkpoint, and completed
   assistant text in order while excluding every forbidden event/block/source.
4. Retention enforces message and UTF-8 byte caps with deterministic omission
   statistics and tag-safe serialization.
5. Activity pairs calls/results by id and emits only name, state, time, and
   fingerprint; nested arguments/results/meta/errors never appear.
6. Running/idle/offline and turn terminal evidence remain distinct; none is
   represented as read, replied, or completed work.
7. Query failure/cancellation returns no partial context. Concurrent target
   mutation cannot alter the detached returned snapshot.
8. Existing list/send/receipt and client UI tests remain green.
9. Package allowlist, packed-plugin rc.6 load, and real profile smoke tests pass
   before release.
