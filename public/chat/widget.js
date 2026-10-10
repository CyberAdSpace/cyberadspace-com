/*! Cyber Ad Space brand chat widget. No dependencies.
 * Usage: <script src="https://cyberadspace.com/chat/widget.js" data-brand="<slug>" defer></script>
 * Optional: data-color="#hex" (accent), data-position="left".
 * Everything renders inside a Shadow DOM; the only global is window.CASChat.
 * Conversations live only in this page's memory and are not stored.
 */
(function () {
  "use strict";
  if (window.CASChat) return;

  var script = document.currentScript || document.querySelector('script[src*="/chat/widget.js"][data-brand]');
  if (!script) return;
  var brand = (script.getAttribute("data-brand") || "").trim();
  if (!brand) return;
  var api;
  try { api = new URL(script.src).origin + "/api/chat"; } catch (e) { return; }
  var accent = /^#[0-9a-f]{3,8}$/i.test(script.getAttribute("data-color") || "") ? script.getAttribute("data-color") : "#ffb84d";
  var left = script.getAttribute("data-position") === "left";

  var MAX_PRIOR = 6, MAX_CHARS = 600;
  var cfg = { name: "", greeting: "", contact: "", url: "" };
  var history = []; // { role, content } kept in memory only
  var busy = false, opened = false, ready = false;

  function lum(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var rgb = [0, 2, 4].map(function (i) {
      var v = parseInt(h.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function onAccent(hex) { try { return lum(hex) > 0.18 ? "#0b0d12" : "#ffffff"; } catch (e) { return "#0b0d12"; } }

  var css = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".w{--a:" + accent + ";--on:" + onAccent(accent) + ";--bg:#ffffff;--fg:#14161c;--mut:#5b6170;--line:#dfe2e8;--bot:#f1f3f6;",
    "position:fixed;" + (left ? "left" : "right") + ":max(16px,env(safe-area-inset-" + (left ? "left" : "right") + "));bottom:max(16px,env(safe-area-inset-bottom));z-index:2147483000;",
    "font:15px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--fg);-webkit-font-smoothing:antialiased}",
    "@media (prefers-color-scheme:dark){.w{--bg:#14171f;--fg:#eef0f5;--mut:#a7aebd;--line:#2b303c;--bot:#1f2430}}",
    ".l{width:56px;height:56px;border-radius:50%;border:0;background:var(--a);color:var(--on);cursor:pointer;display:grid;place-items:center;",
    "box-shadow:0 6px 20px rgba(0,0,0,.28);transition:transform .15s ease}",
    ".l:hover{transform:scale(1.06)}",
    ".l:focus-visible,.x:focus-visible,.s:focus-visible,.t:focus-visible,a:focus-visible{outline:3px solid var(--a);outline-offset:2px}",
    ".l svg{width:26px;height:26px}",
    ".p{position:absolute;" + (left ? "left" : "right") + ":0;bottom:68px;width:min(370px,calc(100vw - 32px));height:min(540px,calc(100vh - 110px));",
    "background:var(--bg);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;",
    "transform-origin:bottom " + (left ? "left" : "right") + ";animation:in .18s ease}",
    ".p[hidden]{display:none}",
    "@keyframes in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}",
    ".h{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 16px;border-bottom:1px solid var(--line)}",
    ".dot{width:10px;height:10px;border-radius:50%;background:var(--a);flex:none}",
    ".ti{flex:1;min-width:0}",
    ".n{font-weight:650;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}",
    ".b{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}",
    ".x{width:36px;height:36px;border-radius:10px;border:0;background:transparent;color:var(--fg);cursor:pointer;font-size:22px;line-height:1}",
    ".x:hover{background:var(--bot)}",
    ".m{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}",
    ".g{max-width:86%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}",
    ".g.a{align-self:flex-start;background:var(--bot);border-bottom-left-radius:4px}",
    ".g.u{align-self:flex-end;background:var(--a);color:var(--on);border-bottom-right-radius:4px}",
    ".g.e{align-self:flex-start;background:transparent;border:1px dashed var(--line);color:var(--mut)}",
    ".dots span{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:var(--mut);animation:bl 1s infinite}",
    ".dots span:nth-child(2){animation-delay:.15s}.dots span:nth-child(3){animation-delay:.3s}",
    "@keyframes bl{0%,80%,100%{opacity:.25}40%{opacity:1}}",
    ".f{border-top:1px solid var(--line);padding:10px 12px 8px}",
    ".r{display:flex;gap:8px;align-items:flex-end}",
    ".t{flex:1;resize:none;min-height:42px;max-height:110px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font:inherit}",
    ".t::placeholder{color:var(--mut)}",
    ".s{height:42px;padding:0 14px;border-radius:12px;border:0;background:var(--a);color:var(--on);font:inherit;font-weight:650;cursor:pointer}",
    ".s:disabled{opacity:.5;cursor:default}",
    ".note{margin:8px 2px 0;font-size:12px;color:var(--mut)}",
    ".note a{color:inherit;text-decoration:underline}",
    ".sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
    "@media (max-width:480px){.p{position:fixed;" + (left ? "left" : "right") + ":8px;bottom:80px;width:calc(100vw - 16px);height:min(560px,calc(100dvh - 96px))}}",
    "@media (prefers-reduced-motion:reduce){.l,.p{transition:none;animation:none}.dots span{animation:none;opacity:.6}.l:hover{transform:none}}",
  ].join("\n");

  // A custom tag so host-page element selectors (div, section...) don't match; inline !important beats host CSS.
  var host = document.createElement("cas-chat-widget");
  host.setAttribute("data-cas-chat", "");
  host.style.cssText = "all:initial!important;display:block!important;position:static!important;width:0!important;height:0!important";
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  var style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  var w = el("div", "w");
  var uid = "cas-chat-" + Math.random().toString(36).slice(2, 8);
  var launcher = el("button", "l", { type: "button", "aria-expanded": "false", "aria-controls": uid, "aria-label": "Open chat with our AI assistant" });
  launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';

  var panel = el("section", "p", { id: uid, role: "dialog", "aria-modal": "false", "aria-labelledby": uid + "-t" });
  panel.hidden = true;
  var head = el("div", "h");
  var dot = el("span", "dot", { "aria-hidden": "true" });
  var ti = el("div", "ti");
  var title = el("p", "n", { id: uid + "-t" });
  title.textContent = "Chat";
  var badge = el("span", "b");
  badge.textContent = "AI assistant";
  ti.appendChild(title); ti.appendChild(badge);
  var close = el("button", "x", { type: "button", "aria-label": "Close chat" });
  close.textContent = "×";
  head.appendChild(dot); head.appendChild(ti); head.appendChild(close);

  var log = el("div", "m", { role: "log", "aria-live": "polite", "aria-relevant": "additions", tabindex: "0", "aria-label": "Conversation" });
  var foot = el("form", "f");
  var row = el("div", "r");
  var label = el("label", "sr", { for: uid + "-i" });
  label.textContent = "Your question";
  var input = el("textarea", "t", { id: uid + "-i", rows: "1", maxlength: String(MAX_CHARS), placeholder: "Ask a question…", autocomplete: "off" });
  var send = el("button", "s", { type: "submit" });
  send.textContent = "Send";
  row.appendChild(label); row.appendChild(input); row.appendChild(send);
  var note = el("p", "note");
  foot.appendChild(row); foot.appendChild(note);

  panel.appendChild(head); panel.appendChild(log); panel.appendChild(foot);
  w.appendChild(panel); w.appendChild(launcher);
  root.appendChild(w);

  function renderNote() {
    note.textContent = "";
    note.appendChild(document.createTextNode("AI answers can be wrong. Conversations aren’t stored."));
    if (cfg.contact) {
      note.appendChild(document.createTextNode(" Email "));
      var a = el("a", "", { href: "mailto:" + cfg.contact });
      a.textContent = cfg.contact;
      note.appendChild(a);
    }
  }

  function bubble(kind, text) {
    var b = el("div", "g " + kind);
    b.textContent = text;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function applyConfig(c) {
    cfg = c;
    title.textContent = c.name || "Chat";
    launcher.setAttribute("aria-label", "Open chat with the " + (c.name || "site") + " AI assistant");
    if (!script.getAttribute("data-color") && /^#[0-9a-f]{3,8}$/i.test(c.accent || "")) {
      w.style.setProperty("--a", c.accent);
      w.style.setProperty("--on", onAccent(c.accent));
    }
    renderNote();
  }

  function loadConfig() {
    return fetch(api + "?brand=" + encodeURIComponent(brand), { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) { if (c && c.name) { applyConfig(c); ready = true; } })
      .catch(function () {});
  }

  function setOpen(v) {
    opened = v;
    panel.hidden = !v;
    launcher.setAttribute("aria-expanded", String(v));
    launcher.setAttribute("aria-label", v ? "Close chat" : "Open chat with the " + (cfg.name || "site") + " AI assistant");
    if (v) {
      if (!log.childNodes.length) {
        bubble("a", cfg.greeting || "Hi! I’m an AI assistant. Ask me a question about this site.");
      }
      setTimeout(function () { input.focus(); }, 0);
    }
  }

  function toggle() {
    if (!ready && !opened) {
      loadConfig().then(function () { setOpen(true); });
      return;
    }
    setOpen(!opened);
    if (!opened) launcher.focus();
  }

  function submit(e) {
    if (e) e.preventDefault();
    var text = input.value.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    input.value = "";
    autosize();
    bubble("u", text);
    var prior = history.slice(-MAX_PRIOR);
    history.push({ role: "user", content: text });
    busy = true; send.disabled = true;
    var wait = el("div", "g a dots", { "aria-label": "Assistant is typing" });
    wait.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(wait); log.scrollTop = log.scrollHeight;
    fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({ brand: brand, messages: prior.concat([{ role: "user", content: text }]) }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        wait.remove();
        if (d && d.reply) {
          bubble("a", d.reply);
          history.push({ role: "assistant", content: d.reply.slice(0, MAX_CHARS) });
        } else {
          bubble("e", (d && d.error) || "Sorry, I couldn’t answer that." + (cfg.contact ? " Please email " + cfg.contact + "." : ""));
          history.pop();
        }
      })
      .catch(function () {
        wait.remove();
        history.pop();
        bubble("e", "Connection problem. Please try again" + (cfg.contact ? " or email " + cfg.contact : "") + ".");
      })
      .then(function () { busy = false; send.disabled = false; input.focus(); });
  }

  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight + 2, 110) + "px";
  }

  launcher.addEventListener("click", toggle);
  close.addEventListener("click", function () { setOpen(false); launcher.focus(); });
  foot.addEventListener("submit", submit);
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) submit(e);
  });
  w.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && opened) { e.stopPropagation(); setOpen(false); launcher.focus(); }
  });

  renderNote();

  function mount() {
    document.body.appendChild(host);
    loadConfig();
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  window.CASChat = {
    brand: brand,
    open: function () { if (!opened) toggle(); },
    close: function () { if (opened) setOpen(false); },
  };
})();
