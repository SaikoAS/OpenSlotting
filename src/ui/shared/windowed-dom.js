(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenSlottingWindowedDom = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Keeps only the currently visible rows. Input identity and the entire
  // presentation signature must match before a node can be reused.
  function createRowCache() {
    let owner;
    let signature;
    let rows = new Map();
    let next = new Map();
    function begin(input, presentation) {
      if (owner !== input || signature !== presentation) rows.clear();
      owner = input;
      signature = presentation;
      next = new Map();
    }
    function get(key) { return rows.get(key); }
    function retain(key, node) { next.set(key, node); return node; }
    function end() { rows = next; }
    function clear() { owner = undefined; rows.clear(); next.clear(); }
    return Object.freeze({ begin: begin, get: get, retain: retain, end: end, clear: clear,
      size: function () { return rows.size; } });
  }

  function reconcile(parent, nodes, focusFallback) {
    const document = parent.ownerDocument;
    const focus = document && parent.contains(document.activeElement) ? document.activeElement : null;
    const keep = new Set(nodes);
    Array.from(parent.children).forEach(function (node) { if (!keep.has(node)) node.remove(); });
    nodes.forEach(function (node, index) {
      if (parent.children[index] !== node) parent.insertBefore(node, parent.children[index] || null);
    });
    if (focus && document.activeElement !== focus) {
      const target = parent.contains(focus) ? focus : focusFallback;
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
    }
  }

  return Object.freeze({ createRowCache: createRowCache, reconcile: reconcile });
}));
