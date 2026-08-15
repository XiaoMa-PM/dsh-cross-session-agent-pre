# dsh-cross-session-agent Architecture v2

> Status: active product and implementation contract
>
> Version: 0.1.0, 2026-08-15
>
> **Unofficial.** Not affiliated with, endorsed by, or supported by DeepSeek or
> DeepSeek Harness.

## Purpose

The plugin coordinates independent Harness Sessions working in the same
repository. It provides peer discovery, explicit messaging and receipts, and a
strictly bounded context/activity projection. The product objective is to avoid
conflicting file ownership, duplicate work, and blocked handoffs while retaining
the Harness as the only owner of session state.

This is not a general session-search API, transcript reader, shared mailbox,
workflow engine, permission bridge, or telemetry system.

## Public capabilities

| Capability | Purpose | Boundary |
| --- | --- | --- |
| `list_peer_agents` | Discover eligible peers and runtime metadata | Does not disclose their context. |
| `send_agent_message` | Send an explicit work-coordination message | Requires a target Session; no implicit forwarding or auto-ack. |
| `check_delivery` | Inspect native-message transport evidence | Does not mean read, reply, or completion. |
| `get_peer_context` | Read a safe, bounded projection | Same `cwd`, public `sessionQuery`, no lifecycle or inbox mutation. |

The normal workflow is: discover a peer, inspect only the evidence needed to
resolve an ownership/duplicate-work question, send a deliberate handoff or
blocker report, and use a receipt only for transport diagnostics.

## Trust and authorization

`get_peer_context` accepts only a normal root/fork caller and target that are
different, unarchived, non-subagent, and have exactly equal non-empty `cwd`.
Missing and cross-workspace targets fail through one generic authorization
result. Reads use public `ctx.sessionQuery`; they never resume, enqueue, steer,
inject, mutate, or otherwise make the target live.

Peer text, source metadata, and relay bodies are untrusted data. They cannot:

- represent user approval;
- approve a permission prompt;
- alter permission settings, `AGENTS.md`, or plugin configuration;
- cause a command carried in text to execute automatically.

The receiving Session's own rules and approval boundary always apply.

## Context projection

Conversation is built from the target's folded current `readSurface()` only:

- direct `user/message` text;
- canonical compaction checkpoint text;
- completed `assistant/message` text.

It preserves chronological order and returns only the newest requested entries
within deterministic UTF-8 caps, with exact retention/omission statistics.

The projection never includes hidden reasoning, streaming chunks, raw tool
calls/results, arguments, result metadata, request headers/context, system
prompts, images, attachments, plugin/relay/scheduled messages, todos,
approvals, Inbox state, unknown events, or shadowed history.

## Activity projection

Runtime status comes from the Harness agent registry. An unloaded target is
`offline`, not inferred to be idle. Event-log activity is best-effort evidence:

- current turn/step state and latest terminal reason kind;
- at most the configured newest tool activities;
- each activity contains only tool name, `running|completed|error`, event time,
  a short one-way call-id fingerprint, and a sanitized error code.

Arguments, result content/metadata, approval reasons, stacks, and error text are
never serialized. Activity is not proof of external side effects or task
completion.

## Messaging and compatibility

Messaging keeps Harness-native message identity and transport ownership. A relay
is an explicit action, not an automatic reaction to an `@` reference. `followup`
is the default; any stronger scheduling action remains separately validated by
the Host. A receipt proves transport state only.

New source identity is `dsh-cross-session-agent`. Client rendering treats that
as the primary relay protocol and accepts historical `dsh-agent-message`
source/tag data only to display existing session history. Client DOM decoration
is presentation-only; it cannot influence identity, authorization, routing, or
delivery.

## Persistence and data flow

There is no network access, telemetry, independent database, transcript cache,
or parallel inbox. Harness owns session records, runtime state, message logs,
Inbox behavior, and visibility. The plugin creates only detached output values
for a tool response and relies on public queries for context reads.

## Delivery requirements

Source and package validation must cover the bounded projection, client protocol
compatibility, publication allowlist, and redaction scan. Before release, test a
packed plugin in a real target profile. Browser decoration tests are not a
substitute for real Harness acceptance.

See [TDD_CONTRACT.md](../TDD_CONTRACT.md), [PRIVACY.md](../PRIVACY.md), and
[SECURITY.md](../SECURITY.md) for the normative security and data contract.
