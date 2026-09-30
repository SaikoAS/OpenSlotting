(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpenSlottingTerminal = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function entityKey(row, scope) {
    if (scope === 'article') return row.article_id || null;
    if (scope === 'customer') return row.customer_id || null;
    if (scope === 'order') return row.order_id ? JSON.stringify([row.customer_id || '', row.order_id]) : null;
    return null;
  }

  function updateEntity(map, key, label, secondary, row) {
    if (!key) return;
    let entity = map.get(key);
    if (!entity) {
      entity = { key: key, label: label, secondary: secondary || '', quantity: 0n, lines: 0 };
      map.set(key, entity);
    }
    if (!entity.secondary && secondary) entity.secondary = secondary;
    entity.quantity += row.quantity;
    entity.lines += 1;
  }

  function buildIndex(rows, scopes) {
    const selectedScopes = Array.isArray(scopes) ? scopes.filter(function (scope) { return ['article', 'customer', 'order'].includes(scope); }) : ['article', 'customer', 'order'];
    const maps = {};
    selectedScopes.forEach(function (scope) { maps[scope] = new Map(); });
    const coverage = { total: 0, article: 0, customer: 0, order: 0 };
    let latestDate = null;
    (rows || []).forEach(function (row) {
      if (!row || typeof row.quantity !== 'bigint') return;
      coverage.total += 1;
      if (row.article_id) coverage.article += 1;
      if (row.customer_id) coverage.customer += 1;
      if (row.order_id) coverage.order += 1;
      if (row.delivery_date && (!latestDate || row.delivery_date > latestDate)) latestDate = row.delivery_date;
      if (maps.article) updateEntity(maps.article, entityKey(row, 'article'), row.article_id, row.article_name, row);
      if (maps.customer) updateEntity(maps.customer, entityKey(row, 'customer'), row.customer_id, row.customer_name, row);
      if (maps.order) updateEntity(maps.order, entityKey(row, 'order'), row.order_id, row.customer_name || row.customer_id, row);
    });
    const byScope = {};
    Object.keys(maps).forEach(function (scope) {
      byScope[scope] = Array.from(maps[scope].values()).sort(function (a, b) {
        if (a.quantity !== b.quantity) return a.quantity > b.quantity ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
    });
    return { entities: byScope, latestDate: latestDate, coverage: coverage };
  }

  function rangeStart(latestDate, days) {
    if (!latestDate || days === 'all') return null;
    const count = Number(days);
    if (!Number.isInteger(count) || count < 1) return null;
    const date = new Date(latestDate + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - count + 1);
    return date.toISOString().slice(0, 10);
  }

  function matchesSelectedLine(row, scope, key, latestDate, start) {
    return Boolean(row && entityKey(row, scope) === key && typeof row.quantity === 'bigint' &&
      row.delivery_date && (!start || row.delivery_date >= start) &&
      (!latestDate || row.delivery_date <= latestDate));
  }

  function compareLatestLines(a, b) {
    const dateOrder = (b.delivery_date || '').localeCompare(a.delivery_date || '');
    return dateOrder || (b.source_line || 0) - (a.source_line || 0);
  }

  function selectedLines(rows, scope, key, latestDate, days) {
    const start = rangeStart(latestDate, days);
    return (rows || []).filter(function (row) {
      return matchesSelectedLine(row, scope, key, latestDate, start);
    }).sort(compareLatestLines);
  }

  function visibleLineWindow(count, scrollTop, viewportHeight, rowHeight, overscan) {
    const height = Math.max(1, rowHeight);
    const padding = Math.max(0, overscan || 0);
    const first = Math.max(0, Math.floor(Math.max(0, scrollTop) / height) - padding);
    const start = Math.min(count, first);
    const end = Math.min(count, Math.max(start, Math.ceil((Math.max(0, scrollTop) + viewportHeight) / height) + padding));
    return { start: start, end: end, before: start * height, after: (count - end) * height };
  }

  function selectedSummary(rows, scope, key, latestDate, days) {
    const start = rangeStart(latestDate, days);
    const dates = new Map();
    const orders = new Set();
    const customers = new Set();
    const articles = new Set();
    const latest = [];
    let quantity = 0n;
    let lines = 0;
    let firstDate = null;
    let lastDate = null;
    (rows || []).forEach(function (row) {
      if (!matchesSelectedLine(row, scope, key, latestDate, start)) return;
      lines += 1;
      quantity += row.quantity;
      if (row.order_id) orders.add(JSON.stringify([row.customer_id || '', row.order_id]));
      if (row.customer_id) customers.add(row.customer_id);
      if (row.article_id) articles.add(row.article_id);
      if (!firstDate || row.delivery_date < firstDate) firstDate = row.delivery_date;
      if (!lastDate || row.delivery_date > lastDate) lastDate = row.delivery_date;
      let point = dates.get(row.delivery_date);
      if (!point) {
        point = { date: row.delivery_date, quantity: 0n, lines: 0 };
        dates.set(row.delivery_date, point);
      }
      point.quantity += row.quantity;
      point.lines += 1;
      latest.push(row);
      latest.sort(compareLatestLines);
      if (latest.length > 25) latest.pop();
    });
    return {
      quantity: quantity,
      lines: lines,
      orders: orders.size,
      customers: customers.size,
      articles: articles.size,
      firstDate: firstDate,
      lastDate: lastDate,
      start: start,
      points: Array.from(dates.values()).sort(function (a, b) { return a.date.localeCompare(b.date); }),
      latest: latest
    };
  }

  return { buildIndex: buildIndex, entityKey: entityKey, rangeStart: rangeStart,
    selectedSummary: selectedSummary, selectedLines: selectedLines, visibleLineWindow: visibleLineWindow };
});
