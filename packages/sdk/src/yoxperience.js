/**
 * YoXperience SDK — Framework-agnostic adaptive UI snippet.
 *
 * Usage:
 *   <script src="yoxperience.js" data-api-key="yxp_pk_..." data-user-id="user-123"></script>
 *
 *   <div data-yx-slot="hero-banner" data-yx-default="default">
 *     <template data-yx-variant="default">
 *       <h1>Default hero</h1>
 *     </template>
 *     <template data-yx-variant="bold">
 *       <h1 style="font-size:3rem">Bold hero</h1>
 *     </template>
 *     <div class="fallback">Loading…</div>
 *   </div>
 */
(function (w, d) {
  "use strict";

  // ── Config ──
  var SCRIPT = d.currentScript || d.querySelector('script[data-api-key]');
  var API_KEY = (SCRIPT && SCRIPT.getAttribute('data-api-key')) || '';
  var USER_ID = (SCRIPT && SCRIPT.getAttribute('data-user-id')) || 'anonymous';
  var BASE_URL = (SCRIPT && SCRIPT.getAttribute('data-base-url')) || '/v1';
  var POLL_MS = parseInt((SCRIPT && SCRIPT.getAttribute('data-poll')) || '30000', 10);
  var FLUSH_MS = 2000; // send telemetry every 2s

  // ── State ──
  var configCache = null;                    // latest layout config
  var eventBuffer = [];                      // queued telemetry
  var slots = [];                            // discovered [element, slotKey, variants[]]
  var initialized = false;
  var pollTimer = null;
  var flushTimer = null;

  // ── Helpers ──
  function qs(sel, ctx) { return (ctx || d).querySelector(sel); }
  function qsa(sel, ctx) { return (ctx || d).querySelectorAll(sel); }

  function attr(el, name) { return el.getAttribute(name); }

  // ── Gateway calls ──
  function api(method, path, body) {
    return fetch(BASE_URL + path, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function fetchLayout() {
    return api('GET', '/layout/' + encodeURIComponent(USER_ID));
  }

  function sendTelemetry(events) {
    if (events.length === 0) return;
    api('POST', '/telemetry', { userId: USER_ID, events: events }).catch(function () {});
  }

  function registerSlots(slotDefs) {
    api('POST', '/register-slots', { slots: slotDefs }).then(function () {
      // Re-fetch layout after registration so new slots are included
      fetchLayout().then(function (cfg) {
        configCache = cfg;
        applyAll();
      }).catch(function () {});
    }).catch(function () {});
  }

  // ── Telemetry queue ──
  function track(slotKey, variant, eventType, metadata) {
    eventBuffer.push({ slotKey: slotKey, variant: variant, eventType: eventType, metadata: metadata || {} });
  }

  function flushTelemetry() {
    var batch = eventBuffer.splice(0, eventBuffer.length);
    sendTelemetry(batch);
  }

  // ── Apply variants ──
  function applyVariant(el, slotKey, variantName) {
    // Find matching template
    var tmpl = qs('template[data-yx-variant="' + variantName.replace(/"/g, '&quot;') + '"]', el);
    if (!tmpl) return false;

    var content = tmpl.content ? tmpl.content.cloneNode(true) : tmpl.innerHTML;

    // Clear the slot element (keep templates, remove everything else)
    var children = Array.from(el.children);
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.tagName !== 'TEMPLATE' && child.getAttribute('data-yx-fallback') === null) {
        child.remove();
      }
    }

    // Append the variant content
    if (tmpl.content) {
      el.appendChild(content);
    } else {
      el.insertAdjacentHTML('beforeend', content);
    }

    el.setAttribute('data-yx-active', variantName);
    track(slotKey, variantName, 'impression');
    return true;
  }

  function applyAll() {
    if (!configCache || !configCache.slots) return;

    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      var el = s[0];
      var slotKey = s[1];
      var variants = s[2];

      var slotCfg = configCache.slots[slotKey];
      var variantName = slotCfg ? slotCfg.variant : null;

      if (!variantName) {
        // No server config — use default (first variant or data-yx-default)
        variantName = attr(el, 'data-yx-default') || (variants.length > 0 ? variants[0] : null);
      }

      if (variantName) {
        applyVariant(el, slotKey, variantName);
      }
    }
  }

  // ── Event delegation for tracking ──
  function handleClick(e) {
    var target = e.target;
    // Walk up to find a slot parent
    var slotEl = target.closest('[data-yx-slot]');
    if (slotEl) {
      var slotKey = attr(slotEl, 'data-yx-slot');
      var active = attr(slotEl, 'data-yx-active');
      if (slotKey && active) {
        track(slotKey, active, 'click', { targetTag: target.tagName, targetText: (target.textContent || '').substring(0, 80) });
      }
    }
  }

  function handleHover(e) {
    var target = e.target;
    var slotEl = target.closest('[data-yx-slot]');
    if (slotEl) {
      var slotKey = attr(slotEl, 'data-yx-slot');
      var active = attr(slotEl, 'data-yx-active');
      if (slotKey && active) {
        track(slotKey, active, 'hover');
      }
    }
  }

  // ── Init ──
  function init() {
    if (initialized) return;
    initialized = true;

    // Discover all slot elements
    var slotEls = qsa('[data-yx-slot]');
    for (var i = 0; i < slotEls.length; i++) {
      var el = slotEls[i];
      var slotKey = attr(el, 'data-yx-slot');
      if (!slotKey) continue;

      // Collect variant names from <template> children
      var tmpls = qsa('template[data-yx-variant]', el);
      var variants = [];
      for (var j = 0; j < tmpls.length; j++) {
        var v = attr(tmpls[j], 'data-yx-variant');
        if (v) variants.push(v);
      }

      slots.push([el, slotKey, variants]);
    }

    if (slots.length === 0) return;

    // Register slots with gateway
    var slotDefs = slots.map(function (s) {
      return { slotKey: s[1], variants: s[2], defaultVariant: attr(s[0], 'data-yx-default') || null };
    });
    registerSlots(slotDefs);

    // Set up event listeners for telemetry
    d.addEventListener('click', handleClick);
    d.addEventListener('mouseenter', handleHover, true);

    // Flush telemetry periodically
    flushTimer = setInterval(flushTelemetry, FLUSH_MS);

    // Poll for config updates
    if (POLL_MS > 0) {
      pollTimer = setInterval(function () {
        fetchLayout().then(function (cfg) {
          configCache = cfg;
          applyAll();
        }).catch(function () {});
      }, POLL_MS);
    }

    // Initial layout fetch (already triggered by registerSlots callback)
  }

  // ── Auto-init ──
  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API (expose on window for debugging) ──
  w.YoXperience = {
    init: init,
    refresh: function () {
      fetchLayout().then(function (cfg) { configCache = cfg; applyAll(); });
    },
    track: track,
    getConfig: function () { return configCache; },
  };

})(window, document);
