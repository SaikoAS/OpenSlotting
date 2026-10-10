'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRowCache, reconcile } = require('../src/ui/shared/windowed-dom.js');

test('visible row cache retains overlap only and invalidates complete presentation/owner changes', () => {
  const cache = createRowCache(), owner = [], one = {}, two = {};
  cache.begin(owner, 'de:article,quantity:rev1');
  cache.retain(1, one); cache.retain(2, two); cache.end();
  cache.begin(owner, 'de:article,quantity:rev1');
  assert.equal(cache.get(2), two);
  cache.retain(2, two); cache.retain(3, {}); cache.end();
  assert.equal(cache.get(1), undefined); assert.equal(cache.size(), 2);
  for (const signature of ['en:article,quantity:rev1', 'en:article,source:rev1', 'en:article,source:rev2']) {
    cache.begin(owner, signature); assert.equal(cache.get(2), undefined);
    cache.retain(2, two); cache.end();
  }
  cache.begin([], 'en:article,source:rev2'); assert.equal(cache.get(2), undefined);
  cache.clear(); assert.equal(cache.size(), 0);
});

function parentFixture() {
  const doc = { activeElement: null };
  const parent = { children: [], ownerDocument: doc,
    contains(node) { return this.children.includes(node) || this.children.some(row => row.button === node); },
    insertBefore(node, before) {
      if (this.children.includes(node)) this.children.splice(this.children.indexOf(node), 1);
      this.children.splice(before ? this.children.indexOf(before) : this.children.length, 0, node);
      node.parent = this;
    } };
  function node(id) {
    const row = { id, parent: null, remove() {
      this.parent.children.splice(this.parent.children.indexOf(this), 1);
      if (doc.activeElement === this.button) doc.activeElement = null;
    } };
    row.button = { focus() { doc.activeElement = this; } };
    return row;
  }
  return { doc, parent, node };
}

test('reconciliation preserves node order, source identity and retained focus', () => {
  const { doc, parent, node } = parentFixture();
  const a = node('source:2'), b = node('source:3'), c = node('source:4');
  reconcile(parent, [a, b]); doc.activeElement = b.button;
  reconcile(parent, [b, c]);
  assert.deepEqual(parent.children.map(row => row.id), ['source:3', 'source:4']);
  assert.equal(doc.activeElement, b.button);
  reconcile(parent, [c, b]);
  assert.deepEqual(parent.children.map(row => row.id), ['source:4', 'source:3']);
  assert.equal(doc.activeElement, b.button);
});

test('removed focused rows return focus to the scroll region; external focus is untouched', () => {
  const { doc, parent, node } = parentFixture(); const a = node('a');
  const region = { focus(options) { assert.equal(options.preventScroll, true); doc.activeElement = this; } };
  reconcile(parent, [a]); doc.activeElement = a.button;
  reconcile(parent, [], region); assert.equal(doc.activeElement, region);
  const external = {}; doc.activeElement = external;
  reconcile(parent, [node('b')], region); assert.equal(doc.activeElement, external);
});
