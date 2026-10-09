# Changelog

## 0.2.0-rc.2.5 - 2026-10-09

- Bundle opt-in local Claude Code messaging with the existing DSH plugin.
- Native persistent settings switch; companion Claude plugin and marketplace included.
- Preserve existing peer boundaries and tested-version Inbox controls.
- Safely recover a crashed Host socket only after a refused connection and unchanged owned socket identity.
- Preserve fragmented UTF-8 on both socket directions; companion Claude plugin 0.1.1-experimental.

## 0.2.0-rc.2.4 - 2026-10-08

- Increment version for npm publication after 0.2.0-rc.2.3 was reserved by staged publishing. No runtime changes.

## 0.2.0-rc.2.3 - 2026-10-08

- Rename the maintained adaptation to dsh-cross-session-agent-pre, including bundle and Web module identities.
- Preserve upstream attribution and the existing message protocol; no new historical compatibility layer.

## 0.2.0-rc.2.2 - 2026-10-08

- Render peer context and turn-trigger nodes through the public Chat node slot.
- Show sender and body without the protocol header; preserve shipped rendering for other sources.
- Use the current public icon export and uiWorkspace.openSession navigation.
- Validate sender-card rendering and bidirectional workspace navigation in the actual Web UI.


## 0.2.0-rc.2.1 - 2026-10-08

- Target Harness 0.2.0-rc.2 public contracts explicitly.
- Read live delivery receipts through sessionQuery instead of removed Session.events.
- Use snapshot inheritedEventCount for native fork boundaries.
- Validate cross-workspace round-trip messages and denial of cross-workspace context reads in an isolated profile.
- Validate host restart recovery, persisted receipts, idle wakeup and running-target followup queueing.
- Daily profile migration remains separate from this GitHub prerelease.

## 0.1.0 - 2026-08-15

- Renamed the independently maintained package to
  `dsh-cross-session-agent`.
- Added the bounded, read-only `get_peer_context` public tool contract.
- Added explicit security, privacy, provenance, and unofficial-project notices.
- Kept legacy `dsh-agent-message` relay rendering for existing Harness history.
