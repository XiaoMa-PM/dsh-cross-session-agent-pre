import assert from 'node:assert/strict'
import test from 'node:test'

test('会话状态变化只刷新已识别的会话链接，不重新扫描整个页面', async (t) => {
  const original = {
    document: globalThis.document,
    Element: globalThis.Element,
    MutationObserver: globalThis.MutationObserver,
    window: globalThis.window,
  }
  const queries = []
  const registrations = []
  const opened = []
  const stock = () => null
  const originalEntries = [
    { options: { key: 'turn-trigger' }, component: stock },
    { options: { key: 'context' }, component: stock },
  ]

  class FakeElement {
    constructor(tagName = 'div') {
      this.tagName = tagName
      this.dataset = {}
      this.style = {}
      this.textContent = ''
      this.isConnected = true
      this.parentElement = null
      this.previousElementSibling = null
      this.nextElementSibling = null
      const classes = new Set()
      this.classList = {
        add: (...names) => names.forEach((name) => classes.add(name)),
        contains: (name) => classes.has(name),
      }
      this.attributes = new Map()
    }

    matches() { return false }
    closest() { return null }
    contains() { return false }
    querySelectorAll(selector) { queries.push({ root: this, selector }); return [] }
    querySelector(selector) { queries.push({ root: this, selector }); return null }
    appendChild(child) { child.parentElement = this; return child }
    setAttribute(name, value) { this.attributes.set(name, String(value)) }
    getAttribute(name) { return this.attributes.get(name) ?? null }
    hasAttribute(name) { return this.attributes.has(name) }
    remove() { this.isConnected = false }
  }

  const body = new FakeElement('body')
  const head = new FakeElement('head')
  const document = {
    body,
    head,
    documentElement: { lang: 'zh-CN' },
    createElement: (tagName) => new FakeElement(tagName),
    addEventListener() {},
    removeEventListener() {},
  }
  let loaded
  const sessionSubscribers = []
  const workspaceSubscribers = []
  const cleanups = []

  try {
    globalThis.document = document
    globalThis.Element = FakeElement
    globalThis.MutationObserver = class {
      observe() {}
      disconnect() {}
    }
    globalThis.window = { __ModuleLoader__: { load: (definition) => { loaded = definition } } }
    await import('../lib/client.js?runtime-test')

    assert.equal(loaded.id, 'dsh-cross-session-agent-pre')

    const React = {
      createElement: (type, props, ...children) => {
        assert.notEqual(type, undefined, 'React component is undefined')
        return { type, props: { ...props, children } }
      },
      useState: (value) => [value, () => {}],
      useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    }
    const client = loaded.factory((id) => {
      if (id === 'react') return React
      if (id === 'react-dom/client') return { createRoot: () => ({ render() {}, unmount() {} }) }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { IconQueueOutlineRegular() {}, StateDot() {} }
      }
      throw new Error('unexpected client dependency: ' + id)
    })
    assert.equal(client.name, 'dsh-cross-session-agent-pre-client')
    const workspaces = {
      list: {
        getSnapshot: () => ({ archivedSessionIds: [] }),
        subscribe: (callback) => { workspaceSubscribers.push(callback); return () => {} },
      },
    }
    const ctx = {
      uiWorkspace: { openSession(id) { opened.push(id) } },
      sessions: {
        list: {
          getSnapshot: () => ({ ids: ['session-peer'], byId: { 'session-peer': { id: 'session-peer', displayTitle: '后端会话' } } }),
          subscribe: (callback) => { sessionSubscribers.push(callback); return () => {} },
        },
        binding: () => undefined,

      },
      slots: {
        inject(_name, register) { register() },
        register(options, component) { registrations.push({ options, component }); return () => {} },
        entries() { return [...originalEntries, ...registrations] },
      },
      get(name) {
        if (name === 'workspaces') return workspaces
        if (name === 'inputTriggers') return { registerSource: () => () => {} }
      },
      effect(factory) {
        const cleanup = factory()
        if (typeof cleanup === 'function') cleanups.push(cleanup)
      },
      timeout(callback) { callback() },
    }

    client.apply(ctx)
    await t.test('新版插件来信使用公开节点渲染并保留发送方跳转', () => {
      for (const key of ['turn-trigger', 'context']) {
        const entry = registrations.find((entry) => entry.options.key === key)
        assert.ok(entry, '缺少公开消息节点渲染器：' + key)
        assert.equal(entry.options.priority, -1)
        const source = { kind: 'dsh-cross-session-agent', form: 'relay', senderSessionId: 'session-peer' }
        const node = { data: { source, content: [{ type: 'text', text: '<dsh-cross-session-agent>{"senderSessionId":"session-peer"}</dsh-cross-session-agent>\n\n测试正文' }] } }
        const tree = entry.component({ node })
        const button = tree.props.children[0]
        button.props.children[0].type(button.props.children[0].props)
        assert.match(button.props['aria-label'], /后端会话/)
        button.props.onClick()
        assert.equal(opened.at(-1), 'session-peer')
        assert.equal(tree.props.children[1].props.children[0], '测试正文')
        const otherNode = { data: { source: { kind: 'team-message' }, content: [] } }
        assert.equal(entry.component({ node: otherNode }).type, stock)
      }
    })
    queries.length = 0
    sessionSubscribers[0]()
    workspaceSubscribers[0]()

    assert.deepEqual(queries.filter(({ root }) => root === body), [])
  } finally {
    for (const cleanup of cleanups.reverse()) await cleanup()
    globalThis.document = original.document
    globalThis.Element = original.Element
    globalThis.MutationObserver = original.MutationObserver
    globalThis.window = original.window
  }
})
