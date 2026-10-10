// INPUT: Harness Client 公开 slots、sessions、configForms、connection 与输入服务。
// OUTPUT: 会话引用、分离来源与正文的 peer 来信展示及 Claude 桥接开关与实例运行状态。
// POS: 跨会话插件的 Web 交互层。
window.__ModuleLoader__.load({
  id: "dsh-cross-session-agent-pre",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { createRoot } = require("react-dom/client");
    const { IconQueueOutlineRegular, StateDot } = require("@deepseek-ai/dsh-client-ui-primitives");

    const name = "dsh-cross-session-agent-pre-client";
    const inject = ["connection", "slots", "sessions", "inputTriggers", "workspaces", "uiWorkspace", "configForms"];

    function apply(ctx) {
      const senderSelector = '[data-ref-chip="subagent"], [data-context-relay-sender]';
      const referenceSource = "agent-message-session";
      const reactRootSelector = "[data-agent-msg-react-root]";
      const candidateRows = new WeakMap();
      const mountedRoots = new Map();
      const sessionLinks = new Set();
      const workspaces = ctx.get("workspaces");

      function uiText(zh, en) {
        const language = String(document.documentElement.lang || navigator.language || "zh").toLowerCase();
        return language.startsWith("zh") ? zh : en;
      }

      const bridgeForm = ctx.configForms.get("cross-session-agent-pre");
      function ClaudeBridgeSettings() {
        const snapshot = React.useSyncExternalStore(
          bridgeForm.subscribe.bind(bridgeForm), bridgeForm.getSnapshot.bind(bridgeForm),
        );
        const [runtime, setRuntime] = React.useState(null);
        React.useEffect(function () {
          let active = true;
          const controller = new AbortController();
          async function refresh() {
            try {
              const result = await ctx.connection.rpc.call(
                "/api", "dsh-cross-session-agent-pre/status", {}, controller.signal);
              if (active) setRuntime(result.ok ? result.value : null);
            } catch { if (active) setRuntime(null); }
          }
          refresh();
          const interval = setInterval(refresh, 3000);
          return function () { active = false; controller.abort(); clearInterval(interval); };
        }, []);
        const [saving, setSaving] = React.useState(false);
        const [error, setError] = React.useState("");
        async function change(event) {
          const enabled = event.currentTarget.checked;
          setSaving(true);
          setError("");
          try {
            if (!await bridgeForm.set("claudeBridge", enabled)) {
              setError(uiText("设置未保存，请重试。", "Setting was not saved. Please retry."));
            }
          } catch {
            setError(uiText("设置未保存，请检查连接后重试。", "Setting was not saved. Check the connection and retry."));
          } finally { setSaving(false); }
        }
        return React.createElement("section", null,
          React.createElement("h3", null, uiText("Claude Code 本机通信", "Local Claude Code messaging")),
          React.createElement("label", null,
            React.createElement("input", { type: "checkbox", role: "switch",
              "aria-label": uiText("开启 Claude Code 本机通信（实验）", "Enable local Claude Code messaging (experimental)"),
              checked: snapshot.value?.claudeBridge === true,
              disabled: saving || snapshot.status !== "ready" || !snapshot.writable,
              onChange: change }),
            uiText("开启 Claude Code 本机通信（实验）", "Enable local Claude Code messaging (experimental)")),
          React.createElement("p", null, uiText(
            "开启后自动保存，重启后继续生效。Claude 端需安装配套插件；Web 与桌面可分别开启，发送时指定实例和会话。",
            "Saved automatically and kept after restart. Install the companion Claude plugin; Web and desktop can each enable a bridge. Specify the instance and session when sending.")),
          React.createElement("p", null, runtime
            ? uiText("实例：", "Instance: ") + runtime.profileName + " · " + runtime.instanceId
            : uiText("实例状态暂不可用", "Instance status unavailable")),
          React.createElement("p", { role: "status" }, runtime
            ? (runtime.listening ? uiText("桥接正在监听", "Bridge is listening")
              : runtime.enabled ? uiText("已开启配置，桥接未在监听", "Configured on; bridge is not listening")
              : uiText("桥接已关闭", "Bridge is off"))
            : uiText("尚未确认运行状态", "Runtime status has not been confirmed")),
          error ? React.createElement("p", { role: "alert" }, error) : null);
      }
      ctx.effect(() => ctx.configForms.whileServed(["cross-session-agent-pre"], () =>
        ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
          name: "plugins.bundle.config", key: "dsh-cross-session-agent-pre",
        }, ClaudeBridgeSettings))), "cross-session-agent-pre: Claude bridge settings");

      function sessionRows(includeArchived) {
        const snapshot = ctx.sessions.list.getSnapshot();
        const archived = new Set(workspaces?.list.getSnapshot().archivedSessionIds || []);
        return snapshot.ids
          .map(function (id) { return snapshot.byId[id]; })
          .filter(function (row) {
            return row && !row.blank && row.origin !== "subagent"
              && (includeArchived || !archived.has(row.id));
          });
      }

      function sessionRow(id) {
        return ctx.sessions.list.getSnapshot().byId[id];
      }

      function sessionTitle(row) {
        return String(row?.displayTitle || row?.title || row?.id || "");
      }

      function compactSessionTitle(row) {
        const chars = Array.from(sessionTitle(row));
        return chars.length > 40 ? chars.slice(0, 39).join("") + "…" : chars.join("");
      }

      function renderInto(host, content) {
        let root = mountedRoots.get(host);
        if (!root) {
          root = createRoot(host);
          mountedRoots.set(host, root);
          host.setAttribute("data-agent-msg-react-root", "true");
        }
        root.render(content);
      }

      function cleanupRoots(node) {
        if (!(node instanceof Element)) return;
        const hosts = node.matches(reactRootSelector)
          ? [node].concat(Array.from(node.querySelectorAll(reactRootSelector)))
          : Array.from(node.querySelectorAll(reactRootSelector));
        hosts.forEach(function (host) {
          const root = mountedRoots.get(host);
          if (!root) return;
          root.unmount();
          mountedRoots.delete(host);
        });
        const links = node.matches(".agent-msg-session-link")
          ? [node].concat(Array.from(node.querySelectorAll(".agent-msg-session-link")))
          : Array.from(node.querySelectorAll(".agent-msg-session-link"));
        links.forEach(function (element) { sessionLinks.delete(element); });
      }

      function SessionActivity(props) {
        return props.running
          ? React.createElement(StateDot, { state: "done", size: 10, className: "agent-msg-status-dot" })
          : React.createElement("span", { className: "agent-msg-status-dot agent-msg-status-dot-idle", "aria-hidden": "true" });
      }

      function SessionReference(props) {
        return React.createElement("span", { className: "agent-msg-reference-content" },
          React.createElement(IconQueueOutlineRegular, { size: 14, className: "agent-msg-session-icon" }),
          React.createElement("span", { className: "agent-msg-reference-title" }, "@" + sessionTitle(props.row)));
      }

      function RelaySender(props) {
        return React.createElement("span", { className: "agent-msg-relay-sender-content" },
          React.createElement(IconQueueOutlineRegular, { size: 14, className: "agent-msg-session-icon" }),
          React.createElement("span", null, uiText("来自会话 · ", "From Session · ") + props.title + ":"));
      }

      function relayText(content, source) {
        return content.filter(function (block) { return block.type === "text"; }).map(function (block) {
          const tag = "<dsh-cross-session-agent>";
          const closing = "</dsh-cross-session-agent>";
          if (!block.text.startsWith(tag)) return block.text;
          const end = block.text.indexOf(closing);
          if (end < 0) return block.text;
          try {
            const header = JSON.parse(block.text.slice(tag.length, end));
            const body = block.text.slice(end + closing.length);
            return header.senderSessionId === source.senderSessionId
              ? source.kind === "dsh-claude-bridge" && body.startsWith("\n\n") ? body.slice(2) : body.trimStart() : block.text;
          } catch (_) { return block.text; }
        }).join("\n");
      }

      ["turn-trigger", "context"].forEach(function (key) {
        ctx.slots.inject("conversation.chat.node", function () {
          function PeerMessageNode(props) {
            const snapshot = React.useSyncExternalStore(ctx.sessions.list.subscribe, ctx.sessions.list.getSnapshot);
            const source = props.node.data.source;
            const external = source?.kind === "dsh-claude-bridge" && source.senderPlatform === "claude-code";
            if ((!external && source?.kind !== "dsh-cross-session-agent") || source.form !== "relay"
              || typeof source.senderSessionId !== "string" || source.senderSessionId === "") {
              const original = ctx.slots.entries("conversation.chat.node").find(function (entry) {
                return entry.options.key === key && (entry.options.priority ?? 0) === 0;
              });
              return original ? React.createElement(original.component, props) : null;
            }
            const title = external ? "Claude Code · " + (source.senderTitle || source.senderSessionId)
              : sessionTitle(snapshot.byId[source.senderSessionId]) || source.senderTitle || source.senderSessionId;
            return React.createElement("section", { className: "agent-msg-peer-card" },
              React.createElement(external ? "span" : "button", {
                type: "button", className: "agent-msg-peer-sender",
                "aria-label": external ? title : uiText("打开发送方会话：", "Open sender session: ") + title,
                style: external ? { cursor: "default" } : undefined,
                onClick: external ? undefined : function () { ctx.uiWorkspace.openSession(source.senderSessionId); }
              }, React.createElement(RelaySender, { title: title })),
              React.createElement("div", { className: "agent-msg-peer-body" }, relayText(props.node.data.content, source)));
          }
          return ctx.slots.register({ name: "conversation.chat.node", key: key, priority: -1, locale: "chat" }, PeerMessageNode);
        });
      });

      function enhanceReferenceHost(element, row) {
        let host = element.querySelector(":scope > .agent-msg-reference-host");
        if (!host) {
          element.textContent = "";
          host = document.createElement("span");
          host.className = "agent-msg-reference-host";
          element.appendChild(host);
        }
        renderInto(host, React.createElement(SessionReference, { row: row }));
      }

      const inputTriggers = ctx.get("inputTriggers");
      if (inputTriggers !== undefined) {
        ctx.effect(() => inputTriggers.registerSource({
          trigger: "@",
          name: referenceSource,
          order: 2,
          async candidates(session, request) {
            if (request.position !== "leading") return [];
            const query = String(request.query || "").toLowerCase();
            return sessionRows(false)
              .filter(function (row) {
                return String(row.id) !== String(session.sessionId)
                  && (query === "" || sessionTitle(row).toLowerCase().includes(query));
              })
              .sort(function (a, b) {
                if (a.running !== b.running) return a.running ? -1 : 1;
                return sessionTitle(a).localeCompare(sessionTitle(b));
              })
              .map(function (row) {
                const candidate = {
                  name: sessionTitle(row),
                  description: row.running ? uiText("运行中", "Running") : uiText("空闲", "Idle"),
                  icon: "",
                };
                candidateRows.set(candidate, row);
                return candidate;
              });
          },
          onPick({ candidate, session }) {
            const row = candidateRows.get(candidate);
            if (!row) return undefined;
            const label = "@" + compactSessionTitle(row);
            return {
              claim: {
                token: label + " ",
                hint: uiText("输入要处理的内容", "Describe what to do"),
                async submit(args) {
                  const content = String(args || "").trim();
                  if (content === "") return { kind: "error", text: uiText("请输入要处理的内容", "Describe what to do") };
                  const binding = ctx.sessions.binding(session.sessionId);
                  if (!binding) return { kind: "error", text: uiText("当前会话不可用", "Current session is unavailable") };
                  const result = await binding.session.prompt([{
                    type: "text",
                    text: "@" + String(row.id) + " " + content,
                  }], "queue");
                  return result.ok
                    ? { kind: "success" }
                    : { kind: "error", text: result.error.message };
                },
              },
            };
          },
        }), "dsh-cross-session-agent: @ session source");
      }

      function senderLink(target) {
        if (!(target instanceof Element)) return null;
        const element = target.closest(senderSelector);
        if (!element) return null;
        if (element.dataset.agentMsgSessionId) {
          return { element: element, sessionId: element.dataset.agentMsgSessionId };
        }
        const match = String(element.textContent || "").match(/session-[\w-]+/);
        return match ? { element: element, sessionId: match[0] } : null;
      }

      function titleFrom(text) {
        const line = String(text || "").split("\n", 1)[0].trim();
        const current = line.match(/^(?:From (?:Session|Agent)|来自会话)(?: ·)? (.+?):(?: @session-[\w-]+)?$/);
        const previous = line.match(/^来自 Agent · (.+)$/);
        const legacy = line.match(/^来自 Agent「(.+)」\s*[·：:]?$/);
        return (current || previous || legacy)?.[1]?.trim() || "";
      }

      function senderTitle(element) {
        if (element.dataset.agentMsgSenderTitle) return element.dataset.agentMsgSenderTitle;
        const label = element.previousElementSibling;
        const title = titleFrom(label?.textContent);
        if (title && label) {
          label.classList.add("agent-msg-sender-prefix");
        }
        return title;
      }

      function prepareSenderLinks(root) {
        if (!(root instanceof Element)) return;
        const elements = root.matches(senderSelector)
          ? [root].concat(Array.from(root.querySelectorAll(senderSelector)))
          : Array.from(root.querySelectorAll(senderSelector));
        elements.forEach(function (element) {
          const link = senderLink(element);
          if (!link) return;
          const relay = element.matches("[data-context-relay-sender]");
          const title = relay ? sessionTitle(sessionRow(link.sessionId)) || "@" + link.sessionId : senderTitle(element);
          if (!relay && !title) return;
          element.dataset.agentMsgSessionId = link.sessionId;
          if (title) element.dataset.agentMsgSenderTitle = title;
          if (relay) renderInto(element, React.createElement(RelaySender, { title: title }));
          else element.textContent = uiText("来自会话 · ", "From Session · ") + title + ":";
          element.classList.add("agent-msg-session-link", "agent-msg-sender-link");
          sessionLinks.add(element);
          element.setAttribute("role", "link");
          element.setAttribute("tabindex", "0");
          element.setAttribute("title", uiText("打开发送方会话", "Open sender session"));
          element.setAttribute("aria-label", uiText("打开发送方会话：", "Open sender session: ") + (title || link.sessionId));
        });
      }

      function prepareRelayCards(root) {
        if (!(root instanceof Element)) return;
        const disclosures = root.matches("[data-disclosure-row]")
          ? [root].concat(Array.from(root.querySelectorAll("[data-disclosure-row]")))
          : Array.from(root.querySelectorAll("[data-disclosure-row]"));
        disclosures.forEach(function (row) {
          if (!String(row.textContent || "").includes("dsh-cross-session-agent")
            && !String(row.textContent || "").includes("dsh-agent-message")) return;
          if (row.getAttribute("aria-expanded") !== "true") row.click();
        });

        const bodies = root.matches('[data-context-form="relay"]')
          ? [root].concat(Array.from(root.querySelectorAll('[data-context-form="relay"]')))
          : Array.from(root.querySelectorAll('[data-context-form="relay"]'));
        bodies.forEach(function (body) {
          const text = body.querySelector("[data-context-text]");
          const raw = String(text?.textContent || "");
          const protocol = raw.startsWith("<dsh-cross-session-agent>")
            ? "dsh-cross-session-agent"
            : raw.startsWith("<dsh-agent-message>")
              ? "dsh-agent-message"
              : "";
          const closingTag = protocol === "" ? "" : "</" + protocol + ">";
          const end = raw.indexOf(closingTag);
          if (end < 0) return;
          const card = body.closest('[data-chat-flow-kind="context"]') || body.parentElement;
          card?.setAttribute("data-agent-msg-relay-card", "true");
          if (text.dataset.agentMsgRelayBody !== "true") {
            text.textContent = raw.slice(end + closingTag.length).trimStart();
            text.dataset.agentMsgRelayBody = "true";
          }
        });
      }

      function prepareSessionReferences(root) {
        if (!(root instanceof Element)) return;
        const elements = root.matches('[data-ref-chip="subagent"]')
          ? [root].concat(Array.from(root.querySelectorAll('[data-ref-chip="subagent"]')))
          : Array.from(root.querySelectorAll('[data-ref-chip="subagent"]'));
        elements.forEach(function (element) {
          if (element.classList.contains("agent-msg-sender-link")) return;
          const id = element.dataset.agentMsgSessionId
            || String(element.textContent || "").trim().match(/^@(session-[\w-]+)$/)?.[1];
          const row = id ? sessionRow(id) : undefined;
          if (!id || !row) return;
          element.dataset.agentMsgSessionId = id;
          element.classList.add("agent-msg-session-link", "agent-msg-reference-link");
          sessionLinks.add(element);
          element.setAttribute("role", "link");
          element.setAttribute("tabindex", "0");
          element.setAttribute("title", uiText("打开引用会话", "Open referenced session"));
          element.setAttribute("aria-label", uiText("打开引用会话：", "Open referenced session: ") + sessionTitle(row));
          enhanceReferenceHost(element, row);
        });
      }

      function prepareSessionMenu(root) {
        if (!(root instanceof Element)) return;
        const menu = root.matches('[role="listbox"]') ? root : root.closest('[role="listbox"]') || root.querySelector('[role="listbox"]');
        if (!menu) return;
        const group = menu.querySelector('[data-source="' + referenceSource + '"]');
        if (!group) return;
        group.textContent = uiText("会话", "Sessions");
        let element = group.nextElementSibling;
        while (element && !element.hasAttribute("data-source")) {
          if (element.matches('button[role="option"]')) {
            element.classList.add("agent-msg-session-candidate");
            const spans = element.querySelectorAll(":scope > span");
            const icon = spans[0];
            const description = spans[2];
            if (icon) {
              icon.classList.add("agent-msg-candidate-icon");
              renderInto(icon, React.createElement(IconQueueOutlineRegular, { size: 14 }));
            }
            if (description) {
              const running = /^(运行中|Running)$/.test(String(description.textContent || "").trim())
                || element.dataset.agentMsgRunning === "true";
              element.dataset.agentMsgRunning = String(running);
              renderInto(description, React.createElement("span", { className: "agent-msg-status-label" },
                React.createElement(SessionActivity, { running: running }),
                React.createElement("span", null, running ? uiText("运行中", "Running") : uiText("空闲", "Idle"))));
            }
          }
          element = element.nextElementSibling;
        }
      }

      function prepare(root) {
        prepareRelayCards(root);
        prepareSenderLinks(root);
        prepareSessionReferences(root);
        prepareSessionMenu(root);
      }

      function refreshSessionLinks() {
        sessionLinks.forEach(function (element) {
          if (!element.isConnected) {
            sessionLinks.delete(element);
            return;
          }
          if (element.classList.contains("agent-msg-sender-link")) prepareSenderLinks(element);
          else prepareSessionReferences(element);
        });
      }

      function openSender(event) {
        const element = event.target instanceof Element
          ? event.target.closest(".agent-msg-session-link")
          : null;
        const sessionId = element?.dataset.agentMsgSessionId;
        if (!sessionId) return;
        event.preventDefault();
        event.stopPropagation();
        ctx.uiWorkspace.openSession(sessionId);
      }

      function onKeyDown(event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        openSender(event);
      }

      function legacyCopyText(text) {
        let ta;
        try {
          ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          return document.execCommand("copy");
        } catch (_) {
          return false;
        } finally {
          ta?.remove();
        }
      }

      async function copyText(text) {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
          }
        } catch (_) {}
        return legacyCopyText(text);
      }

      function CopyButton(props) {
        const [copyState, setCopyState] = React.useState("idle");
        React.useEffect(function () {
          if (copyState === "idle") return;
          const timeout = setTimeout(function () { setCopyState("idle"); }, 2000);
          return function () { clearTimeout(timeout); };
        }, [copyState]);
        async function onClick() {
          const text = String(props.sessionId || "");
          if (text === "") return;
          setCopyState(await copyText(text) ? "copied" : "failed");
        }
        function onMouseLeave() { setCopyState("idle"); }
        return React.createElement("button", {
          type: "button",
          onClick: onClick,
          onMouseLeave: onMouseLeave,
          title: uiText("复制会话 ID", "Copy session ID"),
          "aria-label": uiText("复制会话 ID", "Copy session ID"),
          className: "agent-msg-copy-id"
        }, copyState === "copied"
          ? uiText("已复制", "Copied")
          : copyState === "failed"
            ? uiText("复制失败", "Copy failed")
            : uiText("复制ID", "Copy ID"));
      }

      ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register(
        { name: "conversation.session.header.actions", id: "copy-session-id", order: 30, label: uiText("复制会话ID", "Copy session ID") },
        (props) => React.createElement(CopyButton, { sessionId: props.sessionId })
      ));

      const css =
        ".agent-msg-peer-card { margin: 8px 0; padding: 14px 16px; border: 1px solid rgba(127,127,127,.24); border-radius: 12px; background: var(--dsw-alias-markdown-code-block); } " +
        ".agent-msg-peer-sender { border: 0; padding: 0; background: transparent; color: var(--dsw-alias-state-business-primary); cursor: pointer; font: inherit; } " +
        ".agent-msg-peer-body { margin-top: 8px; white-space: pre-wrap; overflow-wrap: anywhere; } " +
        ".agent-msg-copy-id { cursor: pointer; font-size: 12px; line-height: 1; padding: 5px 10px; border: 1px solid rgba(127,127,127,.35); border-radius: 6px; background: transparent; color: inherit; opacity: .85; } " +
        ".agent-msg-copy-id:hover { opacity: 1; border-color: rgba(127,127,127,.7); } " +
        ".agent-msg-sender-prefix { display: none !important; } " +
        ".agent-msg-session-link { cursor: pointer; text-decoration: none; } " +
        ".agent-msg-sender-link[data-ref-chip=\"subagent\"] { display: block; width: fit-content; padding: 0; background: transparent; color: inherit; font-size: 13px; font-weight: 600; line-height: 1.5; } " +
        ".agent-msg-reference-link { display: inline-flex !important; align-items: center; color: var(--dsw-alias-state-business-primary) !important; } " +
        ".agent-msg-reference-host, .agent-msg-reference-content { display: inline-flex; min-width: 0; align-items: center; } " +
        ".agent-msg-reference-content { gap: 5px; max-width: 100%; } " +
        ".agent-msg-reference-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } " +
        ".agent-msg-session-icon, .agent-msg-candidate-icon { display: inline-flex; flex: none; color: var(--dsw-alias-state-business-primary); } " +
        ".agent-msg-relay-sender-content { display: inline-flex; align-items: center; gap: 5px; } " +
        "[data-agent-msg-relay-card] [data-disclosure-row] { display: none !important; } " +
        "[data-agent-msg-relay-card] [data-context-form=\"relay\"] { width: fit-content; max-width: min(78%, 760px); max-height: none; margin: 0; padding: 14px 16px; overflow: visible; border: 1px solid rgba(127,127,127,.24); border-radius: 16px 16px 16px 4px; background: var(--dsw-alias-markdown-code-block); color: var(--dsw-alias-label-primary); font: inherit; } " +
        "[data-agent-msg-relay-card] [data-context-relay-sender] { display: block; width: fit-content; margin: 0 0 8px; color: var(--dsw-alias-state-business-primary); font-size: 13px; font-weight: 600; line-height: 1.5; } " +
        "[data-agent-msg-relay-card] [data-context-text] { margin: 0; overflow: visible; white-space: pre-wrap; overflow-wrap: anywhere; color: inherit; font: inherit; } " +
        ".agent-msg-status-dot { flex: none; } " +
        ".agent-msg-status-dot-idle { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); opacity: .7; } " +
        ".agent-msg-status-label { display: inline-flex; align-items: center; gap: 6px; } " +
        ".agent-msg-session-candidate { border-radius: 0 !important; } " +
        ".agent-msg-session-candidate > span:nth-child(2) { flex: 1; min-width: 0; max-width: none; } " +
        ".agent-msg-session-candidate > span:nth-child(3) { display: flex; flex: none; justify-content: flex-end; margin-left: auto; } " +
        ".agent-msg-session-link:hover { text-decoration: underline; text-underline-offset: 3px; } " +
        ".agent-msg-session-link:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 2px; }";
      const tag = document.createElement("style");
      tag.setAttribute("data-plugin", name);
      tag.textContent = css;
      document.head.appendChild(tag);
      prepare(document.body);
      const observer = new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.removedNodes.forEach(cleanupRoots);
          record.addedNodes.forEach(prepare);
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const unsubscribeSessions = ctx.sessions.list.subscribe(refreshSessionLinks);
      const unsubscribeWorkspaces = workspaces?.list.subscribe(refreshSessionLinks);
      document.addEventListener("click", openSender);
      document.addEventListener("keydown", onKeyDown);
      ctx.effect(() => () => {
        observer.disconnect();
        unsubscribeSessions();
        unsubscribeWorkspaces?.();
        document.removeEventListener("click", openSender);
        document.removeEventListener("keydown", onKeyDown);
        mountedRoots.forEach(function (root) { root.unmount(); });
        mountedRoots.clear();
        sessionLinks.clear();
        tag.remove();
      });
    }

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  }
});
