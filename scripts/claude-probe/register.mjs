// INPUT: SessionStart JSON and documented messaging environment.
// OUTPUT: Private minimal route file without credentials or history.
// POS: Local feasibility hook, outside published runtime.
import { writeFileSync } from 'node:fs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const payload = JSON.parse(input);
if (typeof payload.session_id !== 'string' || !payload.session_id) {
  throw new Error('Missing session_id');
}
const route = {
  sessionId: payload.session_id,
  socket: process.env.CLAUDE_CODE_MESSAGING_SOCKET || null,
  tokenPresent: Boolean(process.env.CLAUDE_CODE_MESSAGING_TOKEN),
  registeredAt: new Date().toISOString(),
};
writeFileSync(process.argv[2], JSON.stringify(route), { mode: 0o600 });
