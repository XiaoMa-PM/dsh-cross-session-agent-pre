# Claude bridge validation — rc.2.7

Tested on Mac against DSH 0.2.0-rc.2, Node 24 and Cordis 4.0.4. Companion: 0.1.3-experimental. Models: Claude Haiku 4.5 and GLM-5.3-Flash.

| Claude surface | DSH surface | DSH-initiated round trip | Claude-initiated round trip |
|---|---|---|---|
| CLI | Web | Passed | Passed |
| CLI | Official desktop | Passed | Passed |
| App Code | Web | Passed | Passed |
| App Code | Official desktop | Passed | Passed |

Eight initiating paths returned actual peer replies, preserving Chinese text and emoji. DSH used its native send_claude_message tool; Claude used the companion send_dsh_message tool. No import or shell delivery fallback was used. Sender/reply instance and session identities were checked; peer messages retained userApproval=false.

Closing Web removed its listener while desktop stayed online. A send explicitly addressed to that closed instance returned UNKNOWN_INSTANCE and was not rerouted. Both switches were restored on afterward. Isolated real-Host validation covered authenticated status, switch disposal/re-enable and stable identity after restart.

The regression suite passed 88 tests. Independent final review passed 17 targeted tests and found no important defect. Unit fixtures are supplemented by a real Cordis lifecycle test: async apply must not return a plain metadata object, or Cordis rejects it as Invalid effect and unloads the listener.

These checks do not establish arbitrary-version, Windows, cross-computer or long-running reliability, nor full UI parity with native Claude SendMessage. written/accepted remain transport states. No credentials, private transcripts or machine-specific logs are published here.
