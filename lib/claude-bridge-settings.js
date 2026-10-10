// INPUT: Native settings, public Connection/profileContext and volatile opt-in reference.
// OUTPUT: One optional bridge child and public identity/listening status with serialized lifecycle.
// POS: Packaged bridge activation boundary; default is closed.
import { instanceIdentity } from '../claude-plugin/lib/instances.mjs'
import * as bridge from './claude-bridge.js'

export function configureClaudeBridge(ctx, enabled) {
  let listening = false
  ctx.inject(['connection', 'profileContext'], scoped => {
    const identity = instanceIdentity(scoped.get('profileContext'))
    scoped.connection.fetch.register({
      path: '/api/dsh-cross-session-agent-pre/status', methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        let body
        try { body = await request.json() } catch { return new Response('Invalid request', { status: 400 }) }
        if (body?.type !== 'client-request' || typeof body.rpcId !== 'string' || body.rpcId.length > 128
          || body.method !== 'dsh-cross-session-agent-pre/status') return new Response('Invalid request', { status: 400 })
        return Response.json({ type: 'server-response', rpcId: body.rpcId,
          result: { ok: true, value: { ...identity, enabled: enabled.get() === true, listening } } })
      },
    })
  })
  let fork
  let closed = false
  let pending = Promise.resolve()
  const sync = () => {
    pending = pending.then(async () => {
      if (closed) return
      if (enabled.get() && !fork) fork = ctx.plugin(bridge, { onListening: value => { listening = value } })
      if (!enabled.get() && fork) {
        await fork.dispose()
        fork = undefined
      }
    })
    return pending
  }
  ctx.on('settings/document-updated', ns => {
    if (ns === ctx.fiber.entry?.options.id) return sync()
  })
  ctx.effect(() => async () => {
    closed = true
    await pending
    await fork?.dispose()
    fork = undefined
  })
  return sync()
}
