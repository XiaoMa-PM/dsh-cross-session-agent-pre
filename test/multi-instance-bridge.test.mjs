// INPUT: Isolated profiles and real local sockets.
// OUTPUT: Stable instance and exact routing contract checks.
// POS: Multi-instance bridge regression tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply } from '../lib/claude-bridge.js';
import { localRequest, saveRoute, processInfo } from '../claude-plugin/lib/local.mjs';
async function mountHost(ctx, config) {
 await apply(ctx, config);
 const identity = instanceIdentity(ctx.get?.('profileContext') ?? ctx.profileContext);
 return { ...identity, socket: instancePaths(config.directory, identity.instanceId).socket };
}
const from = '11111111-1111-4111-8111-111111111111';
const to = 'session-22222222-2222-4222-8222-222222222222';
test('two profiles with identical session IDs route independently and reject wrong targets', async () => {
 const dir = mkdtempSync(join('/tmp', 'dsh-multi-'));
 const hosts = [];
 try {
  for (const name of ['web','desktop']) {
   const profileDir=join(dir,name); mkdirSync(profileDir);
   const inbox=[]; const listening=[]; let cleanup;
   const agent={id:to,status:'idle',session:{header:{cwd:'/synthetic'}},followup:m=>inbox.push(m)};
   const profileContext={name,dir:profileDir};
   const ctx={profileContext,agents:{get:id=>id===to?agent:undefined,list:()=>[agent]},get:key=>key==='profileContext'?profileContext:key==='sessionTitle'?{get:()=>({title:'原标题'})}:{},tools:{register(){}},effect:fn=>{cleanup=fn();}};
   const result=await mountHost(ctx,{directory:dir,onListening:value=>listening.push(value)}); hosts.push({result,inbox,cleanup,listening});
   assert.deepEqual(listening,[true]);
  }
  assert.notEqual(hosts[0].result.instanceId, hosts[1].result.instanceId);
  const owner=processInfo(process.pid); saveRoute(dir,{sessionId:from,socket:hosts[0].result.socket,ownerPid:owner.pid,ownerStart:owner.start});
  const request={op:'send',from,to,content:'  中文 😀\n  ',messageId:'33333333-3333-4333-8333-333333333333',instanceId:hosts[1].result.instanceId};
  const aggregate = await requestInstances(dir, { op: 'status', from });
  assert.equal(aggregate.instances.length, 2);
  assert.ok(aggregate.instances.every(value => value.connected));
  await localRequest(dir,request);
  assert.equal(hosts[0].inbox.length,0); assert.equal(hosts[1].inbox.length,1);
  assert.equal(hosts[1].inbox[0].source.targetInstanceId,request.instanceId);
  const status=await localRequest(dir,{op:'status',from,instanceId:request.instanceId});
  assert.equal(status.dshSessions[0].title,'原标题'); assert.equal(status.dshSessions[0].cwd,'/synthetic');
  await assert.rejects(localRequest(dir,{...request,instanceId:undefined}),{code:'INVALID_INSTANCE'});
  await hosts[1].cleanup(); hosts[1].cleanup=null; assert.deepEqual(hosts[1].listening,[true,false]);
  await assert.rejects(requestInstances(dir,request), { code: 'UNKNOWN_INSTANCE' }); assert.equal(hosts[0].inbox.length,0);
  assert.equal((await requestInstances(dir,{op:'status',from})).instances[0].connected,true);
  const first=hosts[0].result.instanceId; await hosts[0].cleanup(); hosts[0].cleanup=null;
  const profileContext={name:'web',dir:join(dir,'web')}; let cleanup;
  const restarted=await mountHost({profileContext,get:key=>key==='profileContext'?profileContext:{},agents:{list:()=>[]},tools:{register(){}},effect:fn=>{cleanup=fn();}},{directory:dir});
  assert.equal(restarted.instanceId,first); await cleanup();
 } finally {for(const host of hosts) if(host.cleanup) await host.cleanup(); rmSync(dir,{recursive:true,force:true});}
});

import { createMcpHandler } from '../claude-plugin/server.mjs';
test('MCP requires instanceId and binds the exact target instance without trusting a sender argument', async () => {
 const calls=[]; const instanceId='a'.repeat(64);
 const handler=createMcpHandler({identity:()=>({sessionId:from}),request:async value=>{calls.push(value);return {};}});
 const list=await handler({id:1,method:'tools/list'});
 assert.ok(list.result.tools[0].inputSchema.required.includes('instanceId'));
 const missing=await handler({id:2,method:'tools/call',params:{name:'send_dsh_message',arguments:{to,content:'text'}}});
 assert.equal(missing.result.isError,true); assert.equal(calls.length,0);
 await handler({id:3,method:'tools/call',params:{name:'send_dsh_message',arguments:{instanceId,to,content:'中文 😀',from:'forged'}}});
 assert.equal(calls[0].instanceId,instanceId); assert.equal(calls[0].from,from);
});

import { instanceIdentity, instancePaths, saveInstance, readInstances } from '../claude-plugin/lib/instances.mjs';
import { requestInstances } from '../claude-plugin/server.mjs';
import { lstatSync, writeFileSync, symlinkSync } from 'node:fs';
test('registry constrains paths, file permissions and process identity; status retains an offline instance', async () => {
 const dir=mkdtempSync(join('/tmp','dsh-reg-')); const profile={name:'desktop',dir};
 const instance=instanceIdentity(profile); const owner=processInfo(process.pid);
 try {
  saveInstance(dir,{...instance,ownerPid:owner.pid,ownerStart:owner.start});
  const paths=instancePaths(dir,instance.instanceId);
  assert.equal(lstatSync(paths.registry).mode & 0o777,0o600);
  assert.equal(lstatSync(dir).mode & 0o777,0o700);
  const status=await requestInstances(dir,{op:'status',from});
  assert.equal(status.instances[0].connected,false);
  await assert.rejects(requestInstances(dir,{op:'send',instanceId:instance.instanceId,from,to,content:'text'}),{code:'INSTANCE_OFFLINE'});
  await assert.rejects(requestInstances(dir,{op:'send',instanceId:'b'.repeat(64)}),{code:'UNKNOWN_INSTANCE'});
  writeFileSync(paths.registry,JSON.stringify({...instance,socket:'/tmp/arbitrary.sock',ownerPid:owner.pid,ownerStart:owner.start}));
  assert.equal(readInstances(dir).length,0);
  rmSync(paths.registry); symlinkSync('/etc/passwd',paths.registry);
  assert.equal(readInstances(dir).length,0);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('Host rejects mismatched target instance and outgoing envelope supplies its bound reply address', async () => {
 const dir=mkdtempSync(join('/tmp','dsh-bound-')); const inbox=[]; const tools=[]; let cleanup;
 const agent={id:to,session:{header:{}},followup:message=>inbox.push(message)};
 const profileContext={name:'web',dir};
 const result=await mountHost({profileContext,get:key=>key==='profileContext'?profileContext:{},agents:{get:()=>agent,list:()=>[agent]},tools:{register:tool=>tools.push(tool)},effect:fn=>{cleanup=fn();}},{directory:dir});
 try {
  const owner=processInfo(process.pid); saveRoute(dir,{sessionId:from,socket:result.socket,ownerPid:owner.pid,ownerStart:owner.start});
  const response=await new Promise((resolve,reject)=>{const socket=net.createConnection(result.socket); socket.setEncoding('utf8');socket.on('error',reject);let text='';socket.on('data',chunk=>text+=chunk);socket.on('end',()=>resolve(JSON.parse(text)));socket.on('connect',()=>socket.end(JSON.stringify({op:'send',from,to,content:'text',messageId:'33333333-3333-4333-8333-333333333333',instanceId:'b'.repeat(64)})+'\n'));});
  assert.equal(response.code,'INVALID_INSTANCE'); assert.equal(inbox.length,0);
  const body=peerContent('  中文 😀  ',to,'dsh','send_dsh_message',result);
  const header=JSON.parse(body.split('</dsh-cross-session-agent>')[0].slice('<dsh-cross-session-agent>'.length));
  assert.equal(header.senderInstanceId,result.instanceId);assert.equal(header.senderProfileName,'web');assert.equal(header.reply.instanceId,result.instanceId);
 } finally {await cleanup();rmSync(dir,{recursive:true,force:true});}
});
import net from 'node:net';
import { peerContent } from '../claude-plugin/lib/local.mjs';

test('instance registration stores only routing fields', () => {
 const dir=mkdtempSync(join('/tmp','dsh-fields-')); const instance=instanceIdentity({name:'web',dir}); const owner=processInfo(process.pid);
 try {
  saveInstance(dir,{...instance,ownerPid:owner.pid,ownerStart:owner.start,token:'secret',transcript:'private'});
  assert.equal(JSON.stringify(readInstances(dir)).includes('secret'),false);
  assert.equal(JSON.stringify(readInstances(dir)).includes('private'),false);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('status rejects a missing or mismatched instance before exposing sessions', async () => {
  const dir = mkdtempSync(join('/tmp', 'dsh-status-bound-'));
  const profileContext = { name: 'web', dir };
  let cleanup;
  const host = await mountHost({ get: key => key === 'profileContext' ? profileContext : undefined, agents: { list: () => [{ id: to }] }, tools: { register() {} }, effect: fn => { cleanup = fn(); } }, { directory: dir });
  try {
    const owner = processInfo(process.pid);
    saveRoute(dir, { sessionId: from, socket: host.socket, ownerPid: owner.pid, ownerStart: owner.start });
    for (const instanceId of [undefined, 'b'.repeat(64)]) {
      const response = await new Promise((resolve, reject) => {
        const socket = net.createConnection(host.socket);
        socket.setEncoding('utf8');
        let text = '';
        socket.on('error', reject);
        socket.on('data', chunk => { text += chunk; });
        socket.on('end', () => resolve(JSON.parse(text)));
        socket.on('connect', () => socket.end(JSON.stringify({ op: 'status', from, instanceId }) + '\n'));
      });
      assert.equal(response.code, 'INVALID_INSTANCE');
      assert.equal(response.value, undefined);
    }
  } finally { await cleanup(); rmSync(dir, { recursive: true, force: true }); }
});

test('a nonresponsive instance times out with a structured offline status and send error', async () => {
  const dir = mkdtempSync(join('/tmp', 'dsh-timeout-'));
  const instance = instanceIdentity({ name: 'web', dir });
  const owner = processInfo(process.pid);
  const sockets = new Set();
  const server = net.createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('data', () => {}); });
  await new Promise(resolve => server.listen(instancePaths(dir, instance.instanceId).socket, resolve));
  saveInstance(dir, { ...instance, ownerPid: owner.pid, ownerStart: owner.start });
  try {
    await assert.rejects(localRequest(dir, { op: 'status', instanceId: instance.instanceId }, { timeoutMs: 20 }), { code: 'ETIMEDOUT' });
    const status = await requestInstances(dir, { op: 'status', from }, { timeoutMs: 20 });
    assert.equal(status.instances[0].connected, false);
    assert.equal(status.instances[0].code, 'INSTANCE_OFFLINE');
    await assert.rejects(requestInstances(dir, { op: 'send', instanceId: instance.instanceId, from, to, content: 'text' }, { timeoutMs: 20 }), { code: 'INSTANCE_OFFLINE' });
    const handler = createMcpHandler({ identity: () => ({ sessionId: from }), request: payload => requestInstances(dir, payload, { timeoutMs: 20 }) });
    const mcp = await handler({ id: 1, method: 'tools/call', params: { name: 'send_dsh_message', arguments: { instanceId: instance.instanceId, to, content: 'text' } } });
    assert.equal(JSON.parse(mcp.result.content[0].text).code, 'INSTANCE_OFFLINE');
    assert.equal(mcp.result.isError, true);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('real Cordis keeps the bridge active until the owning fiber is disposed', async () => {
 const { Context } = await import('@deepseek-ai/cordis');
 const bridge = await import('../lib/claude-bridge.js');
 const dir = mkdtempSync('/tmp/dsh-cordis-');
 const root = new Context();
 root.provide('profileContext', { name: 'probe', dir });
 root.provide('agents', { list: () => [] });
 root.provide('tools', { register: () => () => {} });
 let fiber;
 try {
  fiber = root.plugin(bridge, { directory: dir });
  await fiber;
  assert.equal(readInstances(dir).length, 1);
  await fiber.dispose();
  assert.equal(readInstances(dir).length, 0);
 } finally { await root.fiber.dispose(); rmSync(dir, { recursive: true, force: true }); }
});
