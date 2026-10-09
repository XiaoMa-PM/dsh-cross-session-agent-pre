// INPUT: SessionStart payload, documented Inbox environment and Claude ancestor.
// OUTPUT: Private online route without auth token or transcript.
// POS: One-time plugin session registration hook.
import { bridgeDirectory, claudeOwner, saveRoute } from '../lib/local.mjs';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const payload = JSON.parse(input);
const owner = claudeOwner();
saveRoute(bridgeDirectory(), { sessionId: payload.session_id, socket: process.env.CLAUDE_CODE_MESSAGING_SOCKET, ownerPid: owner.pid, ownerStart: owner.start });
