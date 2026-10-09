// INPUT: Packaged main entry configuration schema.
// OUTPUT: Default-off and native-editable flag assertions.
// POS: User-facing bridge opt-in contract.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Config } from '../lib/index.js'

test('Claude bridge defaults off and is exposed as a live native setting', () => {
  assert.equal(Config({}).claudeBridge.get(), false)
  assert.equal(Config({ claudeBridge: true }).claudeBridge.get(), true)
  const field = Config.dict.claudeBridge
  assert.equal(field.type, 'boolean')
  assert.equal(field.meta.volatile, true)
  assert.equal(field.meta.description.includes('Claude Code'), true)
  assert.throws(() => Config({ claudeBridge: 'yes' }))
})
