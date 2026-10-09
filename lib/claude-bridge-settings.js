// INPUT: Native settings event and volatile opt-in reference.
// OUTPUT: One optional bridge child with serialized lifecycle.
// POS: Packaged bridge activation boundary; default is closed.
import * as bridge from './claude-bridge.js'

export function configureClaudeBridge(ctx, enabled) {
  let fork
  let closed = false
  let pending = Promise.resolve()
  const sync = () => {
    pending = pending.then(async () => {
      if (closed) return
      if (enabled.get() && !fork) fork = ctx.plugin(bridge)
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
