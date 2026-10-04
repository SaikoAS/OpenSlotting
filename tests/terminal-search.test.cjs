'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const terminal = require('../terminal.js');

function baseline(entities, raw, locale) {
  const tag = locale === 'de' ? 'de-DE' : 'en-US';
  const query = raw.trim().toLocaleLowerCase(tag);
  return query ? entities.filter(entity => (entity.label + ' ' + entity.secondary).toLocaleLowerCase(tag).includes(query)) : entities;
}

function sourceRows(count) {
  const names = ['Äpfel', 'Öl', 'Überblick', 'Straße', 'İstanbul', 'Cafe\u0301', 'Café', '😀 Box'];
  return Array.from({ length: count }, (_, index) => ({
    article_id: String(index).padStart(8, '0'), article_name: names[index % names.length] + ' Artikel ' + index,
    customer_id: 'K' + String(index).padStart(8, '0'), customer_name: names[index % names.length] + ' Kunde ' + index,
    order_id: 'O' + String(index).padStart(8, '0'), delivery_date: '2026-09-' + String(index % 28 + 1).padStart(2, '0'),
    quantity: 90071992547409930000000n + BigInt(index % 31), source_file_id: 'synthetic', source_line: index + 2
  }));
}

test('prepared entity search preserves the current substring contract for all terminal scopes and locales', () => {
  const queries = ['', ' ', '0', 'Ö', 'ÄPFEL', 'überblick', 'STRASSE', 'straße', 'İSTANBUL', 'café', 'cafe\u0301', '😀', 'Box', '\u0000', 'unknown', ' 00000001 '];
  for (const count of [1000, 10000]) {
    const rows = sourceRows(count), index = terminal.buildIndex(rows);
    for (const scope of ['article', 'customer', 'order']) {
      const list = terminal.rankEntities(rows, index.entities[scope], scope, index.latestDate, 'all', 'quantity');
      for (const locale of ['de', 'en', 'de']) {
        assert.equal(terminal.prepareEntitySearchProjections(list, locale), list);
        for (const query of queries) assert.deepEqual(terminal.filterEntities(list, query, locale), baseline(list, query, locale), scope + ':' + locale + ':' + query);
      }
    }
  }
});

test('search projections are private and do not change entities, rows, serialization or frozen inputs', () => {
  const entity = Object.freeze({ key: '0001', label: '0001', secondary: 'Äpfel', quantity: 123456789012345678901n, lines: 1 });
  const list = Object.freeze([entity]), keys = Object.keys(entity), snapshot = { ...entity };
  terminal.prepareEntitySearchProjections(list, 'de');
  assert.deepEqual(terminal.filterEntities(list, 'äpfel', 'de'), [entity]);
  assert.deepEqual(Object.keys(entity), keys); assert.deepEqual(entity, snapshot);
  assert.equal(terminal.filterEntities(list, '', 'de'), list);
  assert.equal(terminal.filterEntities(list, ' ', 'de'), list);
  assert.equal(terminal.filterEntities(list, undefined, 'de'), list);
  assert.deepEqual(terminal.filterEntities(undefined, '', 'de'), []);
});

test('cached projection updates when label or secondary changes and keeps workspace objects isolated', () => {
  const first = { key: 'same-key', label: 'ALT', secondary: 'Äpfel' };
  const other = { key: 'same-key', label: 'NEU', secondary: 'Öl' };
  assert.deepEqual(terminal.filterEntities([first], 'ALT', 'de'), [first]);
  first.label = 'NEU'; first.secondary = 'Überblick';
  assert.deepEqual(terminal.filterEntities([first], 'ALT', 'de'), []);
  assert.deepEqual(terminal.filterEntities([first], 'überblick', 'de'), [first]);
  assert.deepEqual(terminal.filterEntities([other], 'öl', 'de'), [other]);
  assert.deepEqual(terminal.filterEntities([first], 'öl', 'de'), []);
  first.secondary = 'Café';
  assert.deepEqual(terminal.filterEntities([first], 'café', 'en'), [first]);
  assert.deepEqual(terminal.filterEntities([first], 'café', 'de'), [first]);
});

test('rank/period changes retain exact BigInt values, deterministic ties and composite order identities', () => {
  const rows = sourceRows(20); rows[0].order_id = '0001'; rows[1].order_id = '0001';
  const index = terminal.buildIndex(rows);
  for (const scope of ['article', 'customer', 'order']) for (const days of ['all', '14']) for (const metric of ['quantity', 'lines']) {
    const list = terminal.rankEntities(rows, index.entities[scope], scope, index.latestDate, days, metric);
    const expected = baseline(list, '0', 'de');
    terminal.prepareEntitySearchProjections(list, 'de');
    const actual = terminal.filterEntities(list, '0', 'de');
    assert.deepEqual(actual, expected);
    assert.ok(actual.every(entity => typeof entity.quantity === 'bigint'));
  }
  const orders = terminal.rankEntities(rows, index.entities.order, 'order', index.latestDate, 'all', 'quantity');
  const matches = terminal.filterEntities(orders, '0001', 'de').filter(entity => entity.label === '0001');
  assert.equal(matches.length, 2); assert.notEqual(matches[0].key, matches[1].key);
});

test('duplicate keys are not deduplicated and original string-concatenation semantics stay exact', () => {
  const list = [{ key: 'same', label: '0001', secondary: undefined }, { key: 'same', label: '0001', secondary: null }, { key: 'same', label: '0001', secondary: '' }];
  for (const query of ['0001', 'undefined', 'null', '0001 ']) assert.deepEqual(terminal.filterEntities(list, query, 'de'), baseline(list, query, 'de'));
  assert.equal(terminal.filterEntities(list, '0001', 'de').length, 3);
});
