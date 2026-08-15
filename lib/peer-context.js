import { createHash } from 'node:crypto'

export const CONTEXT_MESSAGE_BYTES_MAX = 4_096
export const CONTEXT_TOTAL_BYTES_MAX = 16_384
export const CONTEXT_TOOL_LIMIT = 8

function utf8Bytes(value) {
  return Buffer.byteLength(value, 'utf8')
}

function truncateUtf8(value, maxBytes) {
  if (utf8Bytes(value) <= maxBytes) return value
  let prefix = ''
  let usedBytes = 0
  for (let offset = 0; offset < value.length;) {
    const codePoint = value.codePointAt(offset)
    // A lone surrogate is not a Unicode code point and would encode as U+FFFD.
    if (codePoint === undefined || (codePoint >= 0xd800 && codePoint <= 0xdfff)) break
    const character = String.fromCodePoint(codePoint)
    const characterBytes = utf8Bytes(character)
    if (usedBytes + characterBytes > maxBytes) break
    prefix += character
    usedBytes += characterBytes
    offset += character.length
  }
  return prefix
}

function textBlocks(content) {
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
}

function isDirectUser(event) {
  return event?.type === 'user/message' && event.data?.source?.kind === 'user'
}

function isCompactCheckpoint(event) {
  const source = event?.data?.source
  return event?.type === 'user/message' && source?.kind === 'plugin' && source.plugin === 'compact'
}

function conversationEntry(event) {
  let role
  let checkpoint = false
  let value

  if (isDirectUser(event)) {
    role = 'user'
    value = textBlocks(event.data.content)
  } else if (isCompactCheckpoint(event)) {
    role = 'user'
    checkpoint = true
    value = textBlocks(event.data.content)
  } else if (event?.type === 'assistant/message') {
    role = 'assistant'
    value = textBlocks(event.data?.message?.content)
  } else {
    return undefined
  }

  if (typeof event.seq !== 'number' || typeof event.time !== 'number' || value.length === 0) return undefined
  return { seq: event.seq, time: event.time, role, checkpoint, text: value, bytes: utf8Bytes(value) }
}

export function projectConversation(events, maxMessages) {
  const eligible = []
  for (const event of Array.isArray(events) ? events : []) {
    const entry = conversationEntry(event)
    if (entry !== undefined) eligible.push(entry)
  }

  const retained = []
  let retainedBytes = 0
  for (let index = eligible.length - 1; index >= 0 && retained.length < maxMessages; index--) {
    const entry = eligible[index]
    const available = Math.min(CONTEXT_MESSAGE_BYTES_MAX, CONTEXT_TOTAL_BYTES_MAX - retainedBytes)
    if (available <= 0) break
    const text = truncateUtf8(entry.text, available)
    const bytes = utf8Bytes(text)
    if (bytes === 0) break
    retained.push({ ...entry, text, bytes })
    retainedBytes += bytes
  }
  retained.reverse()

  const eligibleBytes = eligible.reduce((sum, entry) => sum + entry.bytes, 0)
  const messages = retained.map(({ seq, time, role, checkpoint, text }) => ({ seq, time, role, checkpoint, text }))
  return {
    messages,
    retention: {
      eligibleMessages: eligible.length,
      returnedMessages: messages.length,
      omittedMessages: eligible.length - messages.length,
      eligibleBytes,
      returnedBytes: retainedBytes,
      omittedBytes: eligibleBytes - retainedBytes,
    },
  }
}

function callFingerprint(callId) {
  return createHash('sha256').update(callId).digest('hex').slice(0, 12)
}

function toolResultCallId(data) {
  const sourceId = data?.message?.source?.callId
  if (typeof sourceId === 'string') return sourceId
  const blockId = data?.message?.content?.[0]?.toolCallId
  return typeof blockId === 'string' ? blockId : undefined
}

export function projectActivity(events) {
  const calls = new Map()
  const ordered = []
  let turn = { state: 'unknown' }
  let step = { state: 'unknown' }

  for (const event of Array.isArray(events) ? events : []) {
    const data = event?.data
    if (!data || typeof event.time !== 'number') continue
    if (event.type === 'turn/start' && Number.isInteger(data.turn)) {
      turn = { state: 'running', turn: data.turn }
      step = { state: 'unknown' }
      continue
    }
    if (event.type === 'turn/end' && Number.isInteger(data.turn) && typeof data.reason?.kind === 'string') {
      turn = { state: 'ended', turn: data.turn, lastEndReason: data.reason.kind }
      continue
    }
    if (event.type === 'step/start' && Number.isInteger(data.turn) && Number.isInteger(data.step)) {
      step = { state: 'running', turn: data.turn, step: data.step }
      continue
    }
    if (event.type === 'step/end' && Number.isInteger(data.turn) && Number.isInteger(data.step)) {
      step = { state: 'ended', turn: data.turn, step: data.step }
      continue
    }
    if (event.type === 'tool/call' && typeof data.callId === 'string' && typeof data.name === 'string') {
      const activity = { name: data.name, status: 'running', time: event.time, callId: callFingerprint(data.callId) }
      calls.set(data.callId, activity)
      ordered.push(activity)
      continue
    }
    if (event.type === 'tool/result') {
      const callId = toolResultCallId(data)
      const activity = callId === undefined ? undefined : calls.get(callId)
      if (activity === undefined) continue
      activity.time = event.time
      if (typeof data.error?.code === 'string') {
        activity.status = 'error'
        activity.errorCode = data.error.code
      } else {
        activity.status = 'completed'
      }
    }
  }

  return { turn, step, tools: ordered.slice(-CONTEXT_TOOL_LIMIT).map((activity) => ({ ...activity })) }
}
