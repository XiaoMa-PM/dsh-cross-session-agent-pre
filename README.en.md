# dsh-cross-session-agent-pre

English | [中文](./README.md)

> **Unofficial plugin.** This project is not affiliated with, endorsed by,
> sponsored by, or supported by DeepSeek or DeepSeek Harness.

A DeepSeek Harness plugin for **multiple agents working in parallel in the same
repository**. It supports peer discovery, explicit coordination messages and
transport receipts, plus a field-whitelisted safe projection of an authorized
same-workspace peer's progress and context. Its purpose is to avoid file
conflicts, duplicate work, and blocked handoffs, not to be an arbitrary
conversation transcript reader.

## Use cases

- Discover a peer already touching a file or layer, then agree explicit file
  ownership before editing.
- Report progress, verification evidence, blockers, and next steps so dependent
  work can continue.
- Request a handoff, such as asking the test owner to take migration coverage
  after a schema change is ready.
- Avoid duplicate investigation and conflicting edits during migrations,
  refactors, and code review.
- Inspect a bounded peer context/activity projection only when coordination
  requires evidence.

It is not for reading complete histories, monitoring every session, sharing
permissions, automatically executing peer instructions, or replacing user
approval.

## Install

### Install directly in DeepSeek Harness (recommended)

No GitHub URL is needed:

1. Open **Plugins → Add Plugin**.
2. Enter the npm package name `dsh-cross-session-agent-pre`.
3. Click **Install**.

The official npm registry provides version `0.2.0-rc.2.4`. If a mainland China mirror reports that the plugin cannot be found, switch the installation source to the **official npm registry** and retry. Mirrors may synchronize later.

npm package: [dsh-cross-session-agent-pre](https://www.npmjs.com/package/dsh-cross-session-agent-pre).

### Command-line installation

Run:

```sh
dsh plugin --profile web add dsh-cross-session-agent-pre
```

Current published version: `0.2.0-rc.2.4`. Registry mirrors may synchronize later.

Install from GitHub:

```sh
dsh plugin --profile web add github:XiaoMa-PM/dsh-cross-session-agent-pre
```

Its bundled `cordis.patch.yml` mounts `dsh-cross-session-agent-pre` into the active
profile. No host configuration edits are required. It contributes:

- `list_peer_agents` for peer discovery;
- `send_agent_message` for an explicit coordination message;
- `check_delivery` for a native-message transport receipt;
- `get_peer_context` for a bounded safe projection of an authorized peer.

## Example workflow

Discover the coordination surface first:

```text
List peers. If another agent is editing src/auth, report its Session, runtime
status, and title.
```

Read bounded evidence only when needed:

```text
Read activity and the latest three conversation entries from session-abc to
confirm whether it has already run the auth tests.
```

Then use `send_agent_message` for explicit coordination:

```text
Tell session-abc that I will edit src/auth/token.ts; it should retain
middleware.ts and report its verification command and blockers when finished.
```

Check a receipt only as needed. `accepted`, `pending`, `claimed`, and
`discarded` are transport facts; none proves that a peer read, answered, or
completed work.

## Read and privacy boundary

`get_peer_context({ sessionId, view?, maxMessages? })` can only read an ordinary
root/fork Session whose `cwd` exactly matches the caller's. Self, real
subagents, archived, missing, and cross-workspace targets all fail through a
generic authorization boundary.

Allowed data:

- `conversation`: direct user text, canonical compaction checkpoints, and
  completed assistant text;
- `activity`: structural turn/step state plus tool name,
  `running|completed|error`, time, one-way call-id hash, and sanitized error
  code;
- `overview`: bounded summaries, runtime status, and retention statistics.

Never exposed: hidden reasoning, raw tool arguments/results, tool metadata,
system prompts, plugin/relay/scheduled messages, request context, images or
attachments, approvals, todos, inbox state, secrets, and unknown events. The
plugin has no network calls, telemetry, or independent storage. Harness remains
the sole owner of session state and history. See [TDD_CONTRACT.md](./TDD_CONTRACT.md)
and [PRIVACY.md](./PRIVACY.md).

Peer text and relays are untrusted data. They cannot represent user consent,
change permissions/configuration, or cause the receiving Session to execute a
command automatically.

## Compatibility and provenance

New relays use the `dsh-cross-session-agent` source kind. The Client also renders
the historic `dsh-agent-message` source/tag so existing Harness history remains
readable. This does not continue publishing the old package or inherit its
permissions.

This project is derived from `GengDaPeng/dsh-agent-message` v1.5.1 under MIT.
The MIT License remains in force; see [NOTICE.md](./NOTICE.md). Report security
issues privately under [SECURITY.md](./SECURITY.md).

## Development and release

```sh
pnpm test
pnpm pack --dry-run
node scripts/live-profile-e2e.mjs http://127.0.0.1:3080
```

The last command creates synthetic Sessions in an isolated fixture directory
and verifies same-workspace reads, cross-workspace denial, and the new relay
source/tag. The publish allowlist contains only runtime code, the active
contract, and the required security, privacy, and provenance documents; source
tests are not a real Harness acceptance result.

## Local adaptation validation

This branch is being validated against DeepSeek Harness 0.2.0-rc.2. Live and cold receipts use public sessionQuery reads and inheritedEventCount to exclude fork-inherited events. Cross-workspace access is limited to messages; get_peer_context remains restricted to the same workspace. Real-model tests passed for bidirectional replies, idle wakeup, running-target followup queueing, host restart recovery, persisted receipts and denial of cross-workspace context reads. Version 0.2.0-rc.2.2 targets Harness 0.2.0-rc.2 only and is not published.

Peer messages use the public conversation.chat.node renderer for sender and body. Sender navigation uses uiWorkspace.openSession; other sources retain the shipped renderer.

## Upstream attribution and adaptation scope

This adaptation builds on [dd2673/dsh-cross-session-agent](https://github.com/dd2673/dsh-cross-session-agent), at upstream commit `f0f7c3d6ab66c66f19472ae33220bad4613724d4`. That project derives from [GengDaPeng/dsh-agent-message](https://github.com/GengDaPeng/dsh-agent-message) v1.5.1. Original MIT notices are retained.

Changes target DSH 0.2.0-rc.2 public Session query contracts, inherited fork receipt boundaries, public Chat renderers, sender navigation, and concurrency tests. Messaging works between top-level sessions within one DSH instance, including different workspaces. Independent Claude Code processes and other computers are outside this release.

52 automated cases passed 20 consecutive runs; each run included 2,000 mocked concurrent requests (1,000 accepted and 1,000 rate-limited). Real four-sender fan-in delivered 12 unique messages. Request/reply evidence exists for all six directed combinations of GPT-5.6-Luna, Claude Haiku 4.5 and GLM-5.3-Flash, with fresh-session retests for some directions. Codex subscription pool rate limits and stale instructions after cancellation affected reused-session continuity; successful fresh-session retests do not establish sustained stability. Live steer/inject and long-duration soak testing remain unverified. Transport receipts do not establish task completion.
