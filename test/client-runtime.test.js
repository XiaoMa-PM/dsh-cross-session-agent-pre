import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'

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
  const configWrites = []
  const effects = []
  const stateWrites = []
  const rpcCalls = []

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
      useEffect: (effect) => { effects.push(effect) },
      useState: (value) => [value, (next) => { stateWrites.push(next) }],
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
    await t.test('官方客户端没有 timer 服务时仍激活插件配置', async () => {
      const actual = new Context()
      for (const service of ['connection', 'slots', 'sessions', 'inputTriggers', 'workspaces', 'uiWorkspace', 'configForms']) actual.provide(service, {})
      let activated = false
      await actual.plugin({ ...client, apply() { activated = true } })
      try { assert.equal(activated, true, '不应等待官方客户端未提供的 timer 服务') }
      finally { await actual.fiber.dispose() }
    })
    const workspaces = {
      list: {
        getSnapshot: () => ({ archivedSessionIds: [] }),
        subscribe: (callback) => { workspaceSubscribers.push(callback); return () => {} },
      },
    }
    const ctx = {
      connection: { rpc: { call: async (...args) => {
        rpcCalls.push(args);
        return { ok: true, value: { instanceId: 'a'.repeat(64), profileName: 'desktop', enabled: true, listening: false } }
      } } },
      configForms: {
        get: () => ({
          getSnapshot: () => ({ status: 'ready', writable: true, value: { claudeBridge: false } }),
          subscribe: () => () => {},
          set: async (key, value) => { configWrites.push({ key, value }); return true },
        }),
        whileServed: (_namespaces, register) => register(),
      },
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
    await t.test('插件详情页开关通过公共 configForms 写入，无文件编辑', async () => {
      const entry = registrations.find(row => row.options.name === 'plugins.bundle.config')
      assert.ok(entry, '缺少插件配置页')
      assert.equal(entry.options.key, 'dsh-cross-session-agent-pre')
      const tree = entry.component({})
      const input = tree.props.children[1].props.children[0]
      assert.equal(input.props.role, 'switch')
      assert.equal(input.props.checked, false)
      await input.props.onChange({ currentTarget: { checked: true } })
      assert.deepEqual(configWrites, [{ key: 'claudeBridge', value: true }])
    })
    await t.test('实例状态使用公开 RPC，组件卸载终止刷新', async () => {
      const originalInterval = globalThis.setInterval
      const originalClear = globalThis.clearInterval
      let cleared = false
      globalThis.setInterval = () => 123
      globalThis.clearInterval = (id) => { assert.equal(id, 123); cleared = true }
      try {
        const cleanup = effects[0]()
        await Promise.resolve()
        assert.equal(rpcCalls[0][0], '/api')
        assert.equal(rpcCalls[0][1], 'dsh-cross-session-agent-pre/status')
        assert.equal(stateWrites.at(-1).listening, false)
        cleanup()
        assert.equal(rpcCalls[0][3].aborted, true)
        assert.equal(cleared, true)
      } finally {
        globalThis.setInterval = originalInterval
        globalThis.clearInterval = originalClear
      }
    })
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
    await t.test('Claude 来信显示来源与原样正文，不跳转不存在的 DSH 会话', () => {
      const entry = registrations.find(row => row.options.key === 'turn-trigger')
      const source = { kind: 'dsh-claude-bridge', form: 'relay', senderPlatform: 'claude-code', senderSessionId: 'claude-peer' }
      const content = '  中文 😀\nsecond line  '
      const node = { data: { source, content: [{ type: 'text', text: '<dsh-cross-session-agent>{"senderSessionId":"claude-peer"}</dsh-cross-session-agent>\n\n' + content }] } }
      const tree = entry.component({ node })
      assert.equal(tree.type, 'section')
      assert.equal(tree.props.children[0].type, 'span')
      assert.equal(tree.props.children[0].props.onClick, undefined)
      assert.match(tree.props.children[0].props.children[0].props.title, /Claude Code/)
      assert.equal(tree.props.children[1].props.children[0], content)
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
