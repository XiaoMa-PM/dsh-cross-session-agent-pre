// INPUT: Synthetic routes and private temporary directories.
// OUTPUT: Route ownership, liveness and source binding assertions.
// POS: Experimental bridge boundary tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensurePrivateDirectory, saveRoute, routesForOwner, validateMessage } from '../../../claude-plugin/lib/local.mjs';
const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';

test('routes contain no credentials and are private', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-route-'));
  try {
    ensurePrivateDirectory(dir);
    saveRoute(dir, { sessionId: id, socket: '/tmp/fixture.sock', ownerPid: 123, ownerStart: 'start', token: 'secret', transcript: 'private' });
    const file = join(dir, `${id}.json`);
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes('secret'), false);
    assert.equal(text.includes('private'), false);
    assert.equal(statSync(file).mode & 0o777, 0o600);
  } finally { rmSync(dir, { recursive: true }); }
});

test('MCP can bind only the route for its own live Claude process', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-route-'));
  try {
    saveRoute(dir, { sessionId: id, socket: '/tmp/a.sock', ownerPid: 123, ownerStart: 'a' });
    saveRoute(dir, { sessionId: otherId, socket: '/tmp/b.sock', ownerPid: 456, ownerStart: 'b' });
    assert.deepEqual(routesForOwner(dir, { pid: 123, start: 'a' }).map(r => r.sessionId), [id]);
    assert.deepEqual(routesForOwner(dir, { pid: 123, start: 'reused' }), []);
  } finally { rmSync(dir, { recursive: true }); }
});

test('reject shared-writable route directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-route-'));
  try { chmodSync(dir, 0o777); assert.throws(() => ensurePrivateDirectory(dir)); }
  finally { rmSync(dir, { recursive: true }); }
});

test('message boundary rejects malformed targets and large or empty bodies', () => {
  assert.throws(() => validateMessage({ to: '../outside', content: 'text' }));
  assert.throws(() => validateMessage({ to: id, content: '' }));
  assert.throws(() => validateMessage({ to: id, content: '😀'.repeat(5000) }));
  assert.deepEqual(validateMessage({ to: id, content: '中文 😀' }), { to: id, content: '中文 😀' });
  assert.deepEqual(validateMessage({ to: `session-${id}`, content: 'DSH native ID' }), { to: `session-${id}`, content: 'DSH native ID' });
});
