#!/usr/bin/env node

const { performance } = require('node:perf_hooks');
const csv = require('../csv.js');

const count = Number(process.argv[2] || 50000);
const passes = Number(process.argv[3] || 8);
if (!Number.isInteger(count) || count <= 0 || !Number.isInteger(passes) || passes <= 0) {
  throw new Error('Usage: node tools/benchmark-search-sort.cjs [positive article count] [positive passes]');
}

const articles = Array.from({ length: count }, (_, index) => ({
  article_id: `SKU-${String(index).padStart(7, '0')}`,
  article_name: `Synthetic article ${index}`,
  article_name_variants: [`Synthetic article ${index}`, `Variant ${index}`],
  order_line_count: (index * 17) % 1000,
  total_quantity: BigInt((index * 7919) % 1000000)
}));
const query = csv.normalizeSearchQuery('variant', 'en');

function uncachedMatch(article) {
  return [article.article_id, article.article_name]
    .concat(article.article_name_variants)
    .some((value) => String(value).toLocaleLowerCase('en-US').includes(query));
}

function sortArticles(values) {
  return values.slice().sort((left, right) =>
    right.order_line_count - left.order_line_count ||
    csv.compareScaledQuantitiesDescending(left.total_quantity, right.total_quantity) ||
    left.article_id.localeCompare(right.article_id));
}

function elapsed(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

const uncachedMs = elapsed(() => {
  for (let pass = 0; pass < passes; pass += 1) {
    sortArticles(articles.filter(uncachedMatch));
  }
});

csv.prepareArticleSearchProjections(articles, 'en');
const cachedMs = elapsed(() => {
  let view = null;
  for (let pass = 0; pass < passes; pass += 1) {
    if (!view) {
      view = sortArticles(articles.filter((article) =>
        csv.articleMatchesNormalizedQuery(article, query, 'en')));
    }
  }
});

console.log(JSON.stringify({
  articles: count,
  passes,
  uncached_ms: Number(uncachedMs.toFixed(2)),
  cached_ms: Number(cachedMs.toFixed(2)),
  speedup: Number((uncachedMs / Math.max(cachedMs, 0.001)).toFixed(2))
}, null, 2));
