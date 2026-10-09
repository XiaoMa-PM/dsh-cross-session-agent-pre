// INPUT: Synthetic Claude identity and native DSH agents.
// OUTPUT: Source, target and idempotence assertions.
// POS: Experimental DSH inbound boundary tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeInboundDelivery, apply } from '../host.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const from = '11111111-1111-4111-8111-111111111111';
const to = 'session-22222222-2222-4222-8222-222222222222';
const messageId = '33333333-3333-4333-8333-333333333333';

function fixture(header = {}, archived = []) {
  const inbox = [];
  const agent = { id: to, session: { header }, followup: value => inbox.push(value) };
  const ctx = { agents: { get: id => id === to ? agent : undefined }, get: () => ({ archivedSessionIds: archived }) };
  return { deliver: makeInboundDelivery(ctx), inbox };
}

test('registered tools satisfy the real DSH output rendering contract', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-host-'));
  const tools = [];
  let cleanup;
  await apply({ agents: { list: () => [] }, tools: { register: tool => tools.push(tool) }, effect: fn => { cleanup = fn(); } }, { directory: dir });
  try {
    for (const tool of tools) assert.deepEqual(tool.output.render({}, { state: 'written' }), [{ type: 'text', text: '{"state":"written"}' }]);
  } finally { await cleanup(); rmSync(dir, { recursive: true }); }
});

test('native DSH message records immutable external agent source', () => {
  const { deliver, inbox } = fixture();
  const result = deliver({ from, to, content: '中文 😀', messageId });
  assert.equal(result.state, 'accepted');
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].source.kind, 'dsh-claude-bridge');
  assert.equal(inbox[0].source.senderSessionId, from);
  assert.equal(inbox[0].source.targetSessionId, to);
  assert.equal(inbox[0].source.form, 'relay');
  assert.equal(Object.isFrozen(inbox[0].source), true);
  assert.equal(inbox[0].content[0].text.includes('中文 😀'), true);
  deliver({ from, to, content: '中文 😀', messageId });
  assert.equal(inbox.length, 1);
  assert.throws(() => deliver({ from, to, content: 'mutated', messageId }));
});

test('peer envelope separates reply identity from the unchanged body', () => {
  const { deliver, inbox } = fixture();
  const content = '  中文 😀\n\nReply exactly as requested.  ';
  deliver({ from, to, content, messageId });
  const [header, body] = inbox[0].content[0].text.split('</dsh-cross-session-agent>\n\n');
  const metadata = JSON.parse(header.slice('<dsh-cross-session-agent>'.length));
  assert.equal(body, content);
  assert.equal(metadata.senderSessionId, from);
  assert.deepEqual(metadata.reply, { tool: 'send_claude_message', to: from });
  assert.equal(metadata.userApproval, false);
  assert.equal(inbox[0].source.replyTo, from);
});

test('same session pair refuses the eleventh message without delivery', () => {
  const { deliver, inbox } = fixture();
  for (let n = 0; n < 10; n += 1) deliver({ from, to, content: 'test', messageId: `33333333-3333-4333-8333-${String(n).padStart(12, '0')}` });
  assert.throws(() => deliver({ from, to, content: 'test', messageId: '33333333-3333-4333-8333-999999999999' }));
  assert.equal(inbox.length, 10);
});

test('inbound refuses archived, missing and child targets', () => {
  assert.throws(() => fixture({}, [to]).deliver({ from, to, content: 'text', messageId }));
  assert.throws(() => fixture({ origin: 'subagent' }).deliver({ from, to, content: 'text', messageId }));
  assert.throws(() => fixture().deliver({ from, to: from, content: 'text', messageId }));
});


test('outgoing refuses unregistered Claude IDs and non-root senders', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-host-'));
  const tools = [];
  let cleanup;
  await apply({ agents: { list: () => [] }, get: () => ({}), tools: { register: tool => tools.push(tool) }, effect: fn => { cleanup = fn(); } }, { directory: dir });
  try {
    const send = tools.find(tool => tool.name === 'send_claude_message');
    await assert.rejects(() => send.execute({ to: from, content: 'test' }, { agent: { id: to, session: { header: {} } } }), /Claude target unavailable/);
    await assert.rejects(() => send.execute({ to: from, content: 'test' }, { agent: { id: to, session: { header: { origin: 'subagent' } } } }), /Only active root/);
  } finally { await cleanup(); rmSync(dir, { recursive: true }); }
});
