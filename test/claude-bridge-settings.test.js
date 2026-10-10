// INPUT: Native-like volatile flag and plugin lifecycle fixture.
// OUTPUT: Opt-in, namespace, disposal and re-enable assertions.
// POS: Packaged Claude bridge configuration boundary tests.
import test from 'node:test'
import assert from 'node:assert/strict'
import { configureClaudeBridge } from '../lib/claude-bridge-settings.js'

function fixture(initial = false) {
  let value = initial
  const mounted = []
  const disposed = []
  const listeners = new Map()
  let cleanup
  const ctx = {
    inject() {},
    fiber: { entry: { options: { id: 'cross-session-agent-pre' } } },
    plugin(module) {
      const id = mounted.length
      mounted.push(module)
      return { dispose: async () => { disposed.push(id) } }
    },
    on: (name, fn) => listeners.set(name, fn),
    effect: fn => { cleanup = fn() },
  }
  const ready = configureClaudeBridge(ctx, { get: () => value })
  return {
    ready, mounted, disposed,
    set: async (next, ns = 'cross-session-agent-pre') => {
      value = next
      await listeners.get('settings/document-updated')(ns)
    },
    dispose: () => cleanup(),
  }
}

test('default off mounts nothing; own setting enables exactly one child', async () => {
  const f = fixture()
  await f.ready
  assert.equal(f.mounted.length, 0)
  await f.set(true, 'another-plugin')
  assert.equal(f.mounted.length, 0)
  await f.set(true)
  assert.equal(f.mounted.length, 1)
  await f.set(true)
  assert.equal(f.mounted.length, 1)
  await f.dispose()
  assert.deepEqual(f.disposed, [0])
})

test('disable closes the child; re-enable mounts a new one; owner cleanup closes it', async () => {
  const f = fixture(true)
  await f.ready
  await f.set(false)
  assert.deepEqual(f.disposed, [0])
  await f.set(true)
  assert.equal(f.mounted.length, 2)
  await f.dispose()
  assert.deepEqual(f.disposed, [0, 1])
  await f.set(true)
  assert.equal(f.mounted.length, 2)
})

test('authenticated API status route reports identity and actual listening, rejects malformed requests', async () => {
  let route
  let enabled = false
  let childConfig
  let update
  const ctx = {
    fiber: { entry: { options: { id: 'cross-session-agent-pre' } } },
    inject(deps, fn) {
      assert.deepEqual(deps, ['connection', 'profileContext'])
      fn({ get: () => ({ name: 'web', dir: '/tmp' }), connection: { fetch: { register: value => { route = value; return () => {} } } } })
    },
    plugin(_module, config) { childConfig = config; return { dispose: async () => config.onListening(false) } },
    on(_event, callback) { update = callback },
    effect() {},
  }
  await configureClaudeBridge(ctx, { get: () => enabled })
  assert.equal(route.path, '/api/dsh-cross-session-agent-pre/status')
  assert.deepEqual(route.methods, ['POST'])
  const request = () => new Request('http://localhost' + route.path, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'probe', method: 'dsh-cross-session-agent-pre/status', payload: {} }),
  })
  const status = async () => (await (await route.fetch(request())).json()).result.value
  assert.equal((await status()).listening, false)
  assert.equal((await status()).profileName, 'web')
  enabled = true
  await update('cross-session-agent-pre')
  assert.equal((await status()).enabled, true)
  assert.equal((await status()).listening, false)
  childConfig.onListening(true)
  assert.equal((await status()).listening, true)
  enabled = false
  await update('cross-session-agent-pre')
  assert.equal((await status()).listening, false)
  const bad = new Request('http://localhost' + route.path, { method: 'POST', body: '{}' })
  assert.equal((await route.fetch(bad)).status, 400)
})
