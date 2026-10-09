// INPUT: MCP JSON-RPC requests with synthetic source binding.
// OUTPUT: Protocol, sender identity and argument boundary assertions.
// POS: Claude reply tool contract tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpHandler } from '../../../claude-plugin/server.mjs';
import { readFileSync } from 'node:fs';
const id = '11111111-1111-4111-8111-111111111111';

test('small bridge server is available without ToolSearch', () => {
  const config = JSON.parse(readFileSync(new URL('../../../claude-plugin/.mcp.json', import.meta.url)));
  assert.equal(config.mcpServers['dsh-bridge'].alwaysLoad, true);
});

test('MCP sender comes from bound session, not model arguments', async () => {
  const calls = [];
  const handler = createMcpHandler({ identity: () => ({ sessionId: id }), request: async value => { calls.push(value); return { state: 'accepted' }; } });
  const result = await handler({ id: 1, method: 'tools/call', params: { name: 'send_dsh_message', arguments: { to: id, content: '中文 😀', sender: 'forged' } } });
  assert.equal(result.result.isError, undefined);
  assert.equal(calls[0].from, id);
  assert.equal(calls[0].content, '中文 😀');
  assert.equal(JSON.stringify(calls).includes('forged'), false);
});

test('MCP exposes no sender field and rejects invalid target', async () => {
  const handler = createMcpHandler({ identity: () => ({ sessionId: id }), request: async () => { throw new Error('should not send'); } });
  const list = await handler({ id: 1, method: 'tools/list' });
  assert.equal(list.result.tools[0].inputSchema.properties.sender, undefined);
  const invalid = await handler({ id: 2, method: 'tools/call', params: { name: 'send_dsh_message', arguments: { to: '../x', content: 'text' } } });
  assert.equal(invalid.result.isError, true);
  const init = await handler({ id: 3, method: 'initialize' });
  assert.equal(init.result.capabilities.tools.listChanged, false);
  assert.equal(await handler({ method: 'notifications/initialized' }), null);
});
