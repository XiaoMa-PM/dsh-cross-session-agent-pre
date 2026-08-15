import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CONTEXT_TOTAL_BYTES_MAX,
  projectActivity,
  projectConversation,
} from '../lib/peer-context.js'
import { apply } from '../lib/index.js'

function text(text) {
  return { type: 'text', text }
}

function agent(id, cwd = '/repo') {
  return {
    id,
    status: 'idle',
    session: { header: { id, cwd }, events: [] },
    followup() { throw new Error('must not follow up') },
    steer() { throw new Error('must not steer') },
    inject() { throw new Error('must not inject') },
  }
}

function setupContextTool({ caller = agent('session-caller'), target, records, services = {} } = {}) {
  const agents = new Map([[String(caller.id), caller]])
  if (target !== undefined) agents.set(String(target.id), target)
  const tools = new Map()
  const query = {
    listSessions: async () => records ?? [],
    readTitle: async () => ({ title: 'Cold peer' }),
    readSurface: async () => { throw new Error('unexpected surface read') },
    readSession: async () => { throw new Error('unexpected raw read') },
    ...services.sessionQuery,
  }
  apply({
    agents: { get: (id) => agents.get(String(id)), list: () => [...agents.values()] },
    tools: { register: (tool) => tools.set(tool.name, tool) },
    get(name) {
      if (name === 'sessionQuery') return query
      if (name === 'workspaceRegistry') return services.workspaceRegistry ?? { archivedSessionIds: [] }
      if (name === 'sessionTitle') return { get: (session) => ({ title: session.title ?? '' }) }
      return undefined
    },
    effect(factory) { return factory() },
    on() {},
  })
  return { tool: tools.get('get_peer_context'), query }
}

test('conversation only projects allowlisted current-surface text in chronological order', () => {
  const result = projectConversation([
    { seq: 1, time: 10, type: 'user/message', data: { source: { kind: 'user' }, content: [text('human')] } },
    { seq: 2, time: 20, type: 'user/message', data: { source: { kind: 'plugin', plugin: 'compact' }, content: [text('checkpoint')] } },
    { seq: 3, time: 30, type: 'user/message', data: { source: { kind: 'plugin', plugin: 'dsh-agent-message' }, content: [text('relay')] } },
    { seq: 4, time: 40, type: 'assistant/message', data: { message: { content: [text('answer'), { type: 'reasoning', text: 'secret reasoning' }, { type: 'tool-call', name: 'shell', arguments: '{"secret":true}' }] } } },
    { seq: 5, time: 50, type: 'tool/result', data: { message: { content: [text('result secret')] } } },
    { seq: 6, time: 60, type: 'user/message', data: { source: { kind: 'plugin', plugin: 'scheduler' }, content: [text('scheduled')] } },
  ], 8)

  assert.deepEqual(result.messages, [
    { seq: 1, time: 10, role: 'user', checkpoint: false, text: 'human' },
    { seq: 2, time: 20, role: 'user', checkpoint: true, text: 'checkpoint' },
    { seq: 4, time: 40, role: 'assistant', checkpoint: false, text: 'answer' },
  ])
  assert.deepEqual(result.retention, { eligibleMessages: 3, returnedMessages: 3, omittedMessages: 0, eligibleBytes: 21, returnedBytes: 21, omittedBytes: 0 })
  assert.doesNotMatch(JSON.stringify(result), /relay|reasoning|secret|scheduled/)
})

test('conversation retention keeps newest messages and exact UTF-8 omission statistics', () => {
  const oversized = 'a'.repeat(5_000)
  const result = projectConversation([
    { seq: 1, time: 1, type: 'assistant/message', data: { message: { content: [text('甲')] } } },
    { seq: 2, time: 2, type: 'assistant/message', data: { message: { content: [text(oversized)] } } },
    { seq: 3, time: 3, type: 'assistant/message', data: { message: { content: [text('乙')] } } },
  ], 2)

  assert.equal(result.messages.length, 2)
  assert.deepEqual(result.messages.map((message) => message.seq), [2, 3])
  assert.equal(Buffer.byteLength(result.messages[0].text), 4096)
  assert.equal(result.retention.eligibleMessages, 3)
  assert.equal(result.retention.returnedMessages, 2)
  assert.equal(result.retention.omittedMessages, 1)
  assert.equal(result.retention.eligibleBytes, 5_006)
  assert.equal(result.retention.returnedBytes, 4_099)
  assert.equal(result.retention.omittedBytes, 907)
  assert.ok(result.retention.returnedBytes <= CONTEXT_TOTAL_BYTES_MAX)
})

test('conversation truncation stops on complete Chinese and emoji code points without replacement characters', () => {
  const chineseBoundary = 'a'.repeat(4_094) + '你后续'
  const emojiBoundary = 'b'.repeat(4_095) + '😀后续'
  const result = projectConversation([
    { seq: 1, time: 1, type: 'assistant/message', data: { message: { content: [text(chineseBoundary)] } } },
    { seq: 2, time: 2, type: 'assistant/message', data: { message: { content: [text(emojiBoundary)] } } },
  ], 8)

  assert.equal(result.messages[0].text, 'a'.repeat(4_094))
  assert.equal(result.messages[1].text, 'b'.repeat(4_095))
  for (const message of result.messages) {
    assert.ok(Buffer.byteLength(message.text, 'utf8') <= 4_096)
    assert.doesNotMatch(message.text, /\uFFFD/)
  }
})

test('activity only projects paired tool state and never serializes sensitive payloads', () => {
  const result = projectActivity([
    { seq: 1, time: 1, type: 'turn/start', data: { turn: 7 } },
    { seq: 2, time: 2, type: 'step/start', data: { turn: 7, step: 1 } },
    { seq: 3, time: 3, type: 'tool/call', data: { turn: 7, step: 1, callId: 'call-alpha', name: 'shell', arguments: '{"token":"secret"}' } },
    { seq: 4, time: 4, type: 'tool/call', data: { turn: 7, step: 1, callId: 'call-beta', name: 'read', arguments: '{"path":"secret"}' } },
    { seq: 5, time: 5, type: 'tool/result', data: { turn: 7, step: 1, message: { source: { callId: 'call-alpha' }, content: [text('private output')] }, error: { name: 'InternalError', code: 'E_DENIED' }, meta: { secret: true } } },
    { seq: 6, time: 6, type: 'step/end', data: { turn: 7, step: 1 } },
    { seq: 7, time: 7, type: 'turn/end', data: { turn: 7, reason: { kind: 'completed' } } },
    { seq: 8, time: 8, type: 'unknown/plugin', data: { secret: 'ignore' } },
  ])

  assert.deepEqual(result, {
    turn: { state: 'ended', turn: 7, lastEndReason: 'completed' },
    step: { state: 'ended', turn: 7, step: 1 },
    tools: [
      { name: 'shell', status: 'error', time: 5, callId: '80db97f9e7bc', errorCode: 'E_DENIED' },
      { name: 'read', status: 'running', time: 4, callId: '42a440845304' },
    ],
  })
  assert.doesNotMatch(JSON.stringify(result), /secret|private|InternalError|arguments|meta/)
})

test('activity distinguishes an open turn from terminal evidence and bounds newest tools', () => {
  const events = [{ seq: 1, time: 1, type: 'turn/start', data: { turn: 1 } }]
  for (let i = 0; i < 10; i++) {
    events.push({ seq: i + 2, time: i + 2, type: 'tool/call', data: { callId: 'id-' + i, name: 'tool-' + i, arguments: '{}' } })
  }

  const result = projectActivity(events)
  assert.equal(result.turn.state, 'running')
  assert.equal(result.turn.turn, 1)
  assert.equal(result.turn.lastEndReason, undefined)
  assert.deepEqual(result.step, { state: 'unknown' })
  assert.equal(result.tools.length, 8)
  assert.deepEqual(result.tools.map((tool) => tool.name), ['tool-2', 'tool-3', 'tool-4', 'tool-5', 'tool-6', 'tool-7', 'tool-8', 'tool-9'])
})

test('peer context authorizes same-cwd cold peers and conversation never reads raw logs or mutates agents', async () => {
  let surfaceReads = 0
  let rawReads = 0
  const { tool } = setupContextTool({
    records: [{ header: { id: 'session-peer', cwd: '/repo' } }],
    services: {
      sessionQuery: {
        readSurface: async () => {
          surfaceReads += 1
          return { session: { id: 'session-peer', cwd: '/repo' }, capturedThroughSeq: 3, events: [{ seq: 3, time: 9, type: 'assistant/message', data: { message: { content: [text('<peer-data>') ] } } }] }
        },
        readSession: async () => { rawReads += 1; throw new Error('conversation must not read raw logs') },
      },
    },
  })

  const result = await tool.execute({ sessionId: 'session-peer', view: 'conversation', maxMessages: 1 }, { agent: agent('session-caller') })
  assert.equal(result.runtimeStatus, 'offline')
  assert.equal(result.capturedThroughSeq, 3)
  assert.equal(surfaceReads, 1)
  assert.equal(rawReads, 0)
  assert.match(result.trustWarning, /untrusted|not a user instruction/i)
  assert.doesNotMatch(tool.output.render({}, result)[0].text, /<peer-data>/)
  assert.match(tool.output.render({}, result)[0].text, /\\u003cpeer-data\\u003e/)
})

test('peer context rejects every unauthorized boundary with one generic error', async () => {
  const cases = [
    { label: 'self', args: { sessionId: 'session-caller' } },
    { label: 'missing', args: { sessionId: 'session-missing' } },
    { label: 'cross cwd', args: { sessionId: 'session-peer' }, records: [{ header: { id: 'session-peer', cwd: '/other' } }] },
    { label: 'target subagent', args: { sessionId: 'session-peer' }, records: [{ header: { id: 'session-peer', cwd: '/repo', origin: 'subagent' } }] },
    { label: 'missing target cwd', args: { sessionId: 'session-peer' }, records: [{ header: { id: 'session-peer' } }] },
    { label: 'invalid view', args: { sessionId: 'session-peer', view: 'all' }, records: [{ header: { id: 'session-peer', cwd: '/repo' } }] },
    { label: 'invalid max', args: { sessionId: 'session-peer', maxMessages: 9 }, records: [{ header: { id: 'session-peer', cwd: '/repo' } }] },
    { label: 'subagent caller', caller: Object.assign(agent('session-caller'), { session: { header: { cwd: '/repo', origin: 'subagent' } } }), args: { sessionId: 'session-peer' }, records: [{ header: { id: 'session-peer', cwd: '/repo' } }] },
    { label: 'missing caller cwd', caller: agent('session-caller', ''), args: { sessionId: 'session-peer' }, records: [{ header: { id: 'session-peer', cwd: '/repo' } }] },
    { label: 'archived', args: { sessionId: 'session-peer' }, records: [{ header: { id: 'session-peer', cwd: '/repo' } }], workspaceRegistry: { archivedSessionIds: ['session-peer'] } },
  ]

  for (const item of cases) {
    const { tool } = setupContextTool({ caller: item.caller, records: item.records, services: { workspaceRegistry: item.workspaceRegistry } })
    await assert.rejects(tool.execute(item.args, { agent: item.caller ?? agent('session-caller') }), (error) => error?.message === '无权读取该协作会话上下文', item.label)
  }
})

test('activity view reads the raw log once and returns no partial result on query failure', async () => {
  let surfaceReads = 0
  let rawReads = 0
  const { tool } = setupContextTool({
    records: [{ header: { id: 'session-peer', cwd: '/repo' } }],
    services: {
      sessionQuery: {
        readSurface: async () => { surfaceReads += 1 },
        readSession: async () => {
          rawReads += 1
          throw new Error('storage unavailable')
        },
      },
    },
  })
  await assert.rejects(tool.execute({ sessionId: 'session-peer', view: 'activity' }, { agent: agent('session-caller') }), /storage unavailable/)
  assert.equal(surfaceReads, 0)
  assert.equal(rawReads, 1)
})

test('peer context revalidates the atomic snapshot header after directory authorization', async () => {
  const { tool } = setupContextTool({
    records: [{ header: { id: 'session-peer', cwd: '/repo' } }],
    services: {
      sessionQuery: {
        readSurface: async () => ({ session: { id: 'session-peer', cwd: '/other' }, capturedThroughSeq: null, events: [] }),
      },
    },
  })
  await assert.rejects(
    tool.execute({ sessionId: 'session-peer', view: 'conversation' }, { agent: agent('session-caller') }),
    (error) => error?.message === '无权读取该协作会话上下文',
  )
})

test('peer context exposes only rc.6 running, idle, or offline runtime states', async () => {
  for (const status of ['running', 'idle']) {
    const target = agent('session-peer')
    target.status = status
    target.session.title = 'Live peer'
    const { tool } = setupContextTool({
      target,
      records: [{ header: { id: 'session-peer', cwd: '/repo' } }],
      services: { sessionQuery: { readSurface: async () => ({ session: { id: 'session-peer', cwd: '/repo' }, capturedThroughSeq: null, events: [] }) } },
    })
    const result = await tool.execute({ sessionId: 'session-peer', view: 'conversation' }, { agent: agent('session-caller') })
    assert.equal(result.runtimeStatus, status)
  }

  const invalid = agent('session-peer')
  invalid.status = 'paused'
  const { tool } = setupContextTool({
    target: invalid,
    records: [{ header: { id: 'session-peer', cwd: '/repo' } }],
  })
  await assert.rejects(tool.execute({ sessionId: 'session-peer', view: 'conversation' }, { agent: agent('session-caller') }), (error) => error?.message === '无权读取该协作会话上下文')
})
