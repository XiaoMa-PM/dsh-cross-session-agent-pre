// INPUT: Real private Unix socket and JSON request frames.
// OUTPUT: Local request roundtrip and rejection verification.
// POS: Experimental bridge transport integration tests.
import test from 'node:test';
import net from 'node:net';
import { setTimeout } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, lstatSync, writeFileSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const instanceId = 'a'.repeat(64);
import { listenBridge } from '../host.mjs';
import { localRequest } from '../../../claude-plugin/lib/local.mjs';

test('real Unix transport preserves Unicode and refuses rejected requests', async () => {
  const dir = mkdtempSync(join('/tmp', 'dsh-rpc-'));
  const server = await listenBridge(dir, input => {
    if (input.op !== 'send') throw new Error('Reject');
    return { body: input.content };
  }, instanceId);
  try {
    assert.deepEqual(await localRequest(dir, { instanceId, op: 'send', content: '中文 😀\nsecond line' }), { body: '中文 😀\nsecond line' });
    await assert.rejects(localRequest(dir, { instanceId, op: 'unknown' }), /refused/);
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true }); }
});


test('fragmented multibyte request and response preserve Unicode', async () => {
  const dir = mkdtempSync(join('/tmp', 'dsh-fragments-'));
  const text = '中文 😀';
  const frame = value => Buffer.from(JSON.stringify(value) + '\n');
  const split = data => data.indexOf(Buffer.from('中')) + 1;
  let received;
  const server = await listenBridge(dir, value => { received = value.content; return {}; }, instanceId);
  try {
    const request = frame({ content: text });
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(join(dir, `${instanceId}.sock`));
      socket.on('error', reject);
      socket.on('data', () => {});
      socket.on('end', resolve);
      socket.on('connect', async () => {
        socket.write(request.subarray(0, split(request)));
        await setTimeout(50);
        socket.end(request.subarray(split(request)));
      });
    });
    assert.equal(received, text);
  } finally { await new Promise(resolve => server.close(resolve)); }
  const responder = net.createServer(socket => {
    socket.once('data', async () => {
      const response = frame({ ok: true, value: { body: text } });
      socket.write(response.subarray(0, split(response)));
      await setTimeout(50);
      socket.end(response.subarray(split(response)));
    });
  });
  await new Promise(resolve => responder.listen(join(dir, `${instanceId}.sock`), resolve));
  try { assert.deepEqual(await localRequest(dir, { instanceId,}), { body: text }); }
  finally { await new Promise(resolve => responder.close(resolve)); rmSync(dir, { recursive: true }); }
});


test('a crashed Host stale socket is recovered; an active Host is preserved', async () => {
  const dir = mkdtempSync(join('/tmp', 'dsh-stale-'));
  const path = join(dir, `${instanceId}.sock`);
  const child = spawn(process.execPath, ['-e',
    `require('node:net').createServer().listen(process.argv[1], () => process.stdout.write('ready\\n'))`, path],
    { stdio: ['ignore', 'pipe', 'ignore'] });
  await once(child.stdout, 'data');
  child.kill('SIGKILL');
  await once(child, 'exit');
  assert.equal(existsSync(path), true);
  let server;
  try {
    server = await listenBridge(dir, () => ({ live: true }), instanceId);
    const inode = lstatSync(path).ino;
    await assert.rejects(listenBridge(dir, () => ({}), instanceId), { code: 'EADDRINUSE' });
    assert.equal(lstatSync(path).ino, inode);
    assert.deepEqual(await localRequest(dir, { instanceId,}), { live: true });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    rmSync(dir, { recursive: true });
  }
});

test('a non-socket path is refused without deleting it', async () => {
  const dir = mkdtempSync(join('/tmp', 'dsh-path-'));
  const path = join(dir, `${instanceId}.sock`);
  writeFileSync(path, 'preserve');
  try {
    await assert.rejects(listenBridge(dir, () => ({}), instanceId), { code: 'EADDRINUSE' });
    assert.equal(readFileSync(path, 'utf8'), 'preserve');
  } finally { rmSync(dir, { recursive: true }); }
});
