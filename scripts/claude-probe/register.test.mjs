// INPUT: Synthetic SessionStart payload and environment.
// OUTPUT: Registration boundary and secret omission assertions.
// POS: Local Claude probe tests, outside published runtime.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const socket of ['/tmp/synthetic.sock', '']) {
  test(`registers minimal route with socket ${Boolean(socket)}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'claude-probe-test-'));
    const output = join(dir, 'route.json');
    try {
      const result = spawnSync(process.execPath, [new URL('./register.mjs', import.meta.url).pathname, output], {
        input: JSON.stringify({ session_id: 'synthetic-session', transcript_path: '/secret/history' }),
        env: { ...process.env, CLAUDE_CODE_MESSAGING_SOCKET: socket, CLAUDE_CODE_MESSAGING_TOKEN: 'synthetic-secret' },
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const raw = readFileSync(output, 'utf8');
      const route = JSON.parse(raw);
      assert.equal(route.sessionId, 'synthetic-session');
      assert.equal(route.socket, socket || null);
      assert.equal(route.tokenPresent, true);
      assert.equal(typeof route.registeredAt, 'string');
      assert.equal(raw.includes('synthetic-secret'), false);
      assert.equal(raw.includes('/secret/history'), false);
      assert.equal(statSync(output).mode & 0o777, 0o600);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
}
