'use strict';

const csv = require('../../../../csv.js');
const terminal = require('../../../../terminal.js');

function sortArticles(values) {
  return values.slice().sort((left, right) =>
    right.order_line_count - left.order_line_count ||
    csv.compareScaledQuantitiesDescending(left.total_quantity, right.total_quantity) ||
    left.article_id.localeCompare(right.article_id));
}

function grams(text) {
  const values = new Set();
  // UTF-16-Codeeinheiten wie String.includes, auch für surrogate pairs/NUL.
  for (let index = 0; index + 1 < text.length; index += 1) values.add(text.slice(index, index + 2));
  return values;
}

function containsSorted(postings, target) {
  let low = 0, high = postings.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (postings[middle] < target) low = middle + 1;
    else high = middle;
  }
  return postings[low] === target;
}

class ResultLRU {
  constructor(maxQueries = 64, maxReferences = 4096) {
    if (!Number.isInteger(maxQueries) || maxQueries < 1 || !Number.isInteger(maxReferences) || maxReferences < 1) throw new RangeError('Positive LRU limits required');
    this.maxQueries = maxQueries; this.maxReferences = maxReferences;
    this.entries = new Map(); this.references = 0;
  }
  clear() { this.entries.clear(); this.references = 0; }
  get(key) {
    if (!this.entries.has(key)) return undefined;
    const value = this.entries.get(key); this.entries.delete(key); this.entries.set(key, value); return value;
  }
  set(key, value) {
    if (value.length > this.maxReferences) return;
    if (this.entries.has(key)) { this.references -= this.entries.get(key).length; this.entries.delete(key); }
    while (this.entries.size >= this.maxQueries || this.references + value.length > this.maxReferences) {
      const oldest = this.entries.keys().next().value;
      this.references -= this.entries.get(oldest).length; this.entries.delete(oldest);
    }
    this.entries.set(key, value); this.references += value.length;
  }
}

class SearchSession {
  constructor({ scope = 'article', variant = 'cached-linear', maxQueries = 64, maxReferences = 4096 } = {}) {
    if (!['article', 'customer', 'order'].includes(scope)) throw new RangeError('Unknown scope');
    if (!['cached-linear', 'projected-linear', 'bigram', 'bigram-lru'].includes(variant)) throw new RangeError('Unknown variant');
    this.scope = scope; this.variant = variant; this.context = null; this.data = null;
    this.lru = new ResultLRU(maxQueries, maxReferences); this.postings = new Map(); this.last = null;
    this.stats = { builds: 0, queries: 0, lastHits: 0, lruHits: 0, verified: 0, postingReferences: 0, distinctGrams: 0 };
  }
  setData(data, { workspaceId, revision, locale = 'de', rankDays = 'all', metric = 'quantity', latestDate } = {}) {
    const language = locale === 'de' ? 'de' : 'en';
    const context = JSON.stringify([workspaceId, revision, language, rankDays, metric, latestDate]);
    if (data === this.data && context === this.context) return false;
    this.data = data; this.context = context; this.locale = language;
    this.last = null; this.lru.clear(); this.postings = new Map(); this.stats.builds += 1;
    if (this.scope === 'article') {
      csv.prepareArticleSearchProjections(data.articles, language);
      this.ranked = sortArticles(data.articles);
      this.texts = this.ranked.map(article => article.search_text);
    } else {
      const model = terminal.buildIndex(data.rows, [this.scope]);
      this.ranked = terminal.rankEntities(data.rows, model.entities[this.scope], this.scope, latestDate || model.latestDate, rankDays, metric);
      const tag = language === 'de' ? 'de-DE' : 'en-US';
      // Echte Terminalbaseline berechnet die lowercase-Projektion pro neuer
      // Query. Nur die Indexvarianten legen sie einmal vorbereitet ab.
      this.texts = this.variant === 'cached-linear' ? null : this.ranked.map(entity => (entity.label + ' ' + entity.secondary).toLocaleLowerCase(tag));
    }
    if (this.variant === 'bigram' || this.variant === 'bigram-lru') {
      for (let ordinal = 0; ordinal < this.texts.length; ordinal += 1) {
        for (const gram of grams(this.texts[ordinal])) {
          let values = this.postings.get(gram);
          if (!values) { values = []; this.postings.set(gram, values); }
          values.push(ordinal);
        }
      }
    }
    this.stats.distinctGrams = this.postings.size;
    this.stats.postingReferences = Array.from(this.postings.values()).reduce((sum, values) => sum + values.length, 0);
    return true;
  }
  clearQueryCache() { this.last = null; this.lru.clear(); }
  matches(ordinal, query) {
    this.stats.verified += 1;
    if (this.scope === 'article') return csv.articleMatchesNormalizedQuery(this.ranked[ordinal], query, this.locale);
    const tag = this.locale === 'de' ? 'de-DE' : 'en-US';
    const entity = this.ranked[ordinal];
    const text = this.texts ? this.texts[ordinal] : (entity.label + ' ' + entity.secondary).toLocaleLowerCase(tag);
    return text.includes(query);
  }
  query(raw) {
    if (!this.ranked) throw new Error('Call setData first');
    const query = csv.normalizeSearchQuery(raw, this.locale); this.stats.queries += 1;
    // Echte Ein-Abfrage-Viewcache bleibt auch in der Baseline bestehen.
    if (this.last?.query === query) { this.stats.lastHits += 1; return this.last.result; }
    if (this.variant === 'bigram-lru') {
      const cached = this.lru.get(query);
      if (cached !== undefined) { this.stats.lruHits += 1; this.last = { query, result: cached }; return cached; }
    }
    let ordinals = null;
    if ((this.variant === 'bigram' || this.variant === 'bigram-lru') && query.length >= 2) {
      const lists = Array.from(grams(query), gram => this.postings.get(gram));
      if (lists.some(values => !values)) ordinals = [];
      else {
        lists.sort((a, b) => a.length - b.length);
        ordinals = lists[0].filter(ordinal => lists.every(values => containsSorted(values, ordinal)));
      }
    }
    const result = query ? [] : this.ranked;
    if (!query) {
      // Aktuelle Terminalsuche liefert bei leerem Suchtext direkt die Rangliste.
    } else if (ordinals === null) {
      for (let ordinal = 0; ordinal < this.ranked.length; ordinal += 1) if (this.matches(ordinal, query)) result.push(this.ranked[ordinal]);
    } else {
      // Bigramme sind nur Kandidaten: der echte substring-Test bleibt zwingend.
      for (const ordinal of ordinals) if (this.matches(ordinal, query)) result.push(this.ranked[ordinal]);
    }
    this.last = { query, result };
    if (this.variant === 'bigram-lru') this.lru.set(query, result);
    return result;
  }
}

module.exports = { SearchSession, ResultLRU, sortArticles, grams };
