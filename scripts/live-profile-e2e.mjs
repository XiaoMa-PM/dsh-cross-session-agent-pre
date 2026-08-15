import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:3080').replace(/\/$/, '')
const fixtureBase = resolve(process.argv[3] ?? join(tmpdir(), 'dsh-cross-session-agent-e2e'))
const fixtureRoot = resolve(fixtureBase, `run-${randomUUID()}`)
const sameCwd = resolve(fixtureRoot, 'same-workspace')
const otherCwd = resolve(fixtureRoot, 'other-workspace')
const marker = `PEER_CONTEXT_TARGET_${randomUUID()}`
const relayMarker = `PEER_COORDINATION_RELAY_${randomUUID()}`

await Promise.all([mkdir(sameCwd, { recursive: true }), mkdir(otherCwd, { recursive: true })])

async function rpc(method, payload) {
  const rpcId = `cross-session-e2e-${randomUUID()}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
  })
  assert.equal(response.status, 200, `${method} HTTP ${response.status}`)
  const envelope = await response.json()
  assert.equal(envelope.type, 'server-response')
  assert.equal(envelope.rpcId, rpcId)
  if (envelope.result?.ok !== true) {
    throw new Error(`${method} failed: ${JSON.stringify(envelope.result?.error)}`)
  }
  return envelope.result.value
}

async function createSession(cwd) {
  return (await rpc('session.create', { cwd })).sessionId
}

async function prompt(sessionId, text) {
  const result = await rpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text }],
  })
  assert.equal(result.accepted, true)
}

async function history(sessionId) {
  const value = await rpc('session.history', { sessionId, maxMessages: 200 })
  return value.events.map((entry) => entry.event)
}

async function waitForTurnEnd(sessionId, previousEnds = 0, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const events = await history(sessionId)
    if (events.filter((event) => event.type === 'turn/end').length > previousEnds) return events
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500))
  }
  throw new Error(`timed out waiting for ${sessionId}`)
}

function toolDispatches(events, name) {
  return events.filter((event) => event.type === 'tool/code-dispatch' && event.data?.name === name)
}

const targetId = await createSession(sameCwd)
const callerId = await createSession(sameCwd)
const crossWorkspaceId = await createSession(otherCwd)

await prompt(targetId, `Isolated acceptance fixture. Do not call tools or modify files. Reply with exactly this marker and nothing else: ${marker}`)
const targetEvents = await waitForTurnEnd(targetId)
assert.match(JSON.stringify(targetEvents), new RegExp(marker))

await prompt(callerId, [
  'Isolated acceptance fixture. Do not call any tool except get_peer_context.',
  `Call get_peer_context exactly once with sessionId ${targetId}, view overview, maxMessages 3.`,
  `Then state whether its returned conversation contains ${marker}.`,
].join(' '))
let callerEvents = await waitForTurnEnd(callerId)
const allowedResults = toolDispatches(callerEvents, 'get_peer_context')
assert.equal(allowedResults.length, 1, 'expected one successful get_peer_context call')
assert.equal(allowedResults[0].data.isError, false)
const projected = JSON.parse(allowedResults[0].data.content[0].text)
const allowedJson = JSON.stringify(projected)
assert.match(allowedJson, new RegExp(marker))
assert.match(allowedJson, /untrusted data/i)
assert.doesNotMatch(allowedJson, /tool\/call|tool\/result|request\/header|reasoning/)
assert.equal(projected.activity.turn.state, 'ended')
assert.equal(projected.activity.step.state, 'ended')

await prompt(callerId, [
  'Isolated negative acceptance fixture. Do not call any tool except get_peer_context.',
  `Call get_peer_context exactly once with sessionId ${crossWorkspaceId}, view conversation, maxMessages 1.`,
  'Report the tool error without retrying.',
].join(' '))
callerEvents = await waitForTurnEnd(callerId, 1)
const allContextCalls = callerEvents.filter((event) => event.type === 'tool/code-dispatch-start' && event.data?.name === 'get_peer_context')
assert.equal(allContextCalls.length, 2, 'expected one allowed and one denied context call')
const deniedResults = toolDispatches(callerEvents, 'get_peer_context').slice(1)
assert.equal(deniedResults.length, 1)
assert.equal(deniedResults[0].data.isError, true)
assert.match(JSON.stringify(deniedResults[0].data.content), /无权读取该协作会话上下文/)

await prompt(callerId, [
  'Isolated relay acceptance fixture. Do not call any tool except send_agent_message.',
  `Call send_agent_message exactly once with to ${targetId}, mode followup, and content "${relayMarker}. No reply is needed."`,
  'Do not retry.',
].join(' '))
callerEvents = await waitForTurnEnd(callerId, 2)
const relayDispatches = toolDispatches(callerEvents, 'send_agent_message')
assert.equal(relayDispatches.length, 1)
assert.equal(relayDispatches[0].data.isError, false)

const relayedTargetEvents = await waitForTurnEnd(targetId, 1)
const relayedMessage = relayedTargetEvents.find((event) =>
  event.type === 'user/message'
  && event.data?.source?.kind === 'dsh-cross-session-agent'
  && event.data?.source?.senderSessionId === callerId
  && JSON.stringify(event.data?.content).includes(relayMarker))
assert.ok(relayedMessage, 'target must receive the new relay source kind')
const relayedText = JSON.stringify(relayedMessage.data.content)
assert.match(relayedText, /<dsh-cross-session-agent>/)
assert.doesNotMatch(relayedText, /<dsh-agent-message>/)

await rm(fixtureRoot, { recursive: true, force: true })

process.stdout.write(JSON.stringify({
  ok: true,
  targetId,
  callerId,
  crossWorkspaceId,
  marker,
  assertions: [
    'packed plugin loaded by rc.6 profile',
    'same-workspace context read returned bounded conversation and structural activity',
    'cross-workspace context read failed closed',
    'new relay source and tag were persisted by Harness',
  ],
}, null, 2) + '\n')
