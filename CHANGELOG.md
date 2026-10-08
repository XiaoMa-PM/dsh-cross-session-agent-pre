# Changelog

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
