'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const csv = require('../../../../csv.js');
const terminal = require('../../../../terminal.js');
const { SearchSession, ResultLRU, sortArticles } = require('../modules/search-session.cjs');
const { fixtures, queries } = require('../benchmarks/fixtures.cjs');
const variants = ['cached-linear', 'projected-linear', 'bigram', 'bigram-lru'];
const context = { workspaceId: 'synthetic-a', revision: 1, locale: 'de' };

test('1k/10k article, customer and order search exactly matches cached baseline across Unicode/short/unknown queries', () => {
  for (const count of [1000, 10000]) {
    const data = fixtures(count);
    for (const scope of ['article', 'customer', 'order']) {
      const sessions = variants.map(variant => { const session = new SearchSession({ scope, variant }); session.setData(data, context); return session; });
      for (const locale of ['de', 'en']) {
        sessions.forEach(session => session.setData(data, { ...context, locale }));
        for (const query of queries(count).cold) {
          const expected = sessions[0].query(query);
          for (const session of sessions.slice(1)) assert.deepEqual(session.query(query), expected, scope + ':' + locale + ':' + JSON.stringify(query));
        }
      }
    }
  }
});

test('baseline really uses existing prepared article text and current rankEntities ordering', () => {
  const data = fixtures(100);
  const article = new SearchSession(); article.setData(data, context);
  const query = csv.normalizeSearchQuery('Variante', 'de');
  assert.deepEqual(article.query('Variante'), sortArticles(data.articles).filter(value => csv.articleMatchesNormalizedQuery(value, query, 'de')));
  for (const scope of ['customer', 'order']) {
    const session = new SearchSession({ scope }); session.setData(data, context);
    const index = terminal.buildIndex(data.rows, [scope]);
    assert.deepEqual(session.query(''), terminal.rankEntities(data.rows, index.entities[scope], scope, index.latestDate, 'all', 'quantity'));
  }
  const before = article.stats.verified; article.query('Variante');
  assert.equal(article.stats.verified, before); assert.ok(article.stats.lastHits > 0);
  article.clearQueryCache(); const emptyBefore = article.stats.verified;
  assert.equal(article.query(''), article.ranked); assert.equal(article.stats.verified, emptyBefore);
});

test('BigInt rank and ties preserve exact values, leading zeros and stable duplicate ordinals', () => {
  const data = fixtures(12);
  data.articles.push({ ...data.articles[0], article_name: 'duplicate ordinal' });
  for (const variant of variants) {
    const session = new SearchSession({ variant }); session.setData(data, context);
    const matches = session.query('00000000');
    assert.equal(matches.length, 2);
    assert.equal(matches[0], data.articles[0]); assert.equal(matches[1], data.articles[12]);
    assert.equal(typeof matches[0].total_quantity, 'bigint');
    assert.deepEqual(session.query(''), sortArticles(data.articles));
  }
});

test('same order ID under two customers stays two composite entities', () => {
  const data = fixtures(2); data.rows[0].order_id = '0001'; data.rows[1].order_id = '0001';
  for (const variant of variants) {
    const session = new SearchSession({ scope: 'order', variant }); session.setData(data, context);
    const results = session.query('0001'); assert.equal(results.length, 2);
    assert.notEqual(results[0].key, results[1].key);
  }
});

test('workspace/revision/locale/input identity invalidate projections, index and query LRU', () => {
  const data = fixtures(20);
  const session = new SearchSession({ variant: 'bigram-lru' }); session.setData(data, context);
  session.query('Produkt'); session.query('Äpfel'); assert.ok(session.lru.entries.size > 0);
  assert.equal(session.setData(data, { ...context }), false);
  data.articles[0].article_name = 'NEUE QUELLE';
  assert.equal(session.setData(data, { ...context, revision: 2 }), true);
  assert.equal(session.lru.entries.size, 0); assert.equal(session.query('NEUE QUELLE').length, 1);
  for (const change of [{ workspaceId: 'other' }, { locale: 'en' }]) {
    session.query('Produkt'); assert.equal(session.setData(data, { ...context, ...change }), true); assert.equal(session.lru.entries.size, 0);
  }
  assert.equal(session.setData(fixtures(20), context), true);
});

test('rank days/metric invalidate sorted terminals and exactly retain current period semantics', () => {
  const data = fixtures(100);
  for (const scope of ['customer', 'order']) {
    const session = new SearchSession({ scope, variant: 'bigram-lru' }); session.setData(data, context);
    for (const [rankDays, metric] of [['14', 'quantity'], ['14', 'lines'], ['all', 'lines']]) {
      assert.equal(session.setData(data, { ...context, rankDays, metric }), true);
      const index = terminal.buildIndex(data.rows, [scope]);
      assert.deepEqual(session.query(''), terminal.rankEntities(data.rows, index.entities[scope], scope, index.latestDate, rankDays, metric));
    }
  }
});

test('candidate grams never replace final includes; reordered grams and NUL boundaries preserve semantics', () => {
  const data = fixtures(1); data.articles[0].article_name = 'ab bc ca';
  for (const variant of variants) {
    const session = new SearchSession({ variant }); session.setData(data, context);
    assert.equal(session.query('abca').length, 0); // all bigrams exist but no substring
    assert.equal(session.query('\u0000ab').length, 1); // existing joined projection allows this
    assert.equal(session.query('a').length, 1); // short fallback
  }
});

test('LRU is bounded by query count and retained references; broad result not cached', () => {
  const lru = new ResultLRU(2, 3); lru.set('a', [1, 2]); lru.set('b', [3]);
  assert.deepEqual(lru.get('a'), [1, 2]); lru.set('c', [4]); assert.equal(lru.get('b'), undefined);
  assert.equal(lru.references, 3); lru.set('broad', [1, 2, 3, 4]); assert.equal(lru.get('broad'), undefined);
  lru.clear(); assert.equal(lru.references, 0); assert.equal(lru.entries.size, 0);
  const data = fixtures(5000), session = new SearchSession({ variant: 'bigram-lru' }); session.setData(data, context);
  assert.equal(session.query('').length, 5000); assert.equal(session.lru.entries.size, 0);
});
