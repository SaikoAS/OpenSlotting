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
    let earliestDate = null;
    (rows || []).forEach(function (row) {
      if (!row || typeof row.quantity !== 'bigint') return;
      coverage.total += 1;
      if (row.article_id) coverage.article += 1;
      if (row.customer_id) coverage.customer += 1;
      if (row.order_id) coverage.order += 1;
      if (row.delivery_date && (!latestDate || row.delivery_date > latestDate)) latestDate = row.delivery_date;
      if (row.delivery_date && (!earliestDate || row.delivery_date < earliestDate)) earliestDate = row.delivery_date;
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
    return { entities: byScope, latestDate: latestDate, earliestDate: earliestDate, coverage: coverage };
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

  function rankEntities(rows, entities, scope, latestDate, days, metric) {
    const start = rangeStart(latestDate, days);
    const totals = new Map();
    if (days !== 'all') (rows || []).forEach(function (row) {
      if (!row || typeof row.quantity !== 'bigint' || !row.delivery_date ||
          row.delivery_date < start || row.delivery_date > latestDate) return;
      const key = entityKey(row, scope);
      if (!key) return;
      const current = totals.get(key) || { quantity: 0n, lines: 0 };
      current.quantity += row.quantity;
      current.lines += 1;
      totals.set(key, current);
    });
    return (entities || []).map(function (entity) {
      const total = days === 'all' ? entity : totals.get(entity.key);
      return Object.assign({}, entity, {
        quantity: total ? total.quantity : 0n,
        lines: total ? total.lines : 0
      });
    }).sort(function (a, b) {
      const av = metric === 'lines' ? a.lines : a.quantity;
      const bv = metric === 'lines' ? b.lines : b.quantity;
      if (av !== bv) return av > bv ? -1 : 1;
      return a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
    });
  }

  function filterLines(lines, filters) {
    const criteria = filters || {};
    const contains = function (value, query) {
      return !query || String(value || '').toLocaleLowerCase().includes(query.toLocaleLowerCase());
    };
    return (lines || []).filter(function (row) {
      return (!criteria.from || row.delivery_date >= criteria.from) &&
        (!criteria.to || row.delivery_date <= criteria.to) &&
        (!criteria.day || row.delivery_date === criteria.day) &&
        contains((row.customer_id || '') + ' ' + (row.customer_name || ''), criteria.customer) &&
        contains(row.order_id, criteria.order) &&
        contains((row.source_file_label || row.source_file_name || '') + ' ' + (row.source_line || ''), criteria.source);
    });
  }

  function chartDateAtX(points, x, left, right) {
    if (!points || !points.length) return null;
    const first = Date.parse(points[0].date + 'T00:00:00Z');
    const last = Date.parse(points[points.length - 1].date + 'T00:00:00Z');
    const ratio = Math.max(0, Math.min(1, (x - left) / Math.max(1, right - left)));
    const dayOffset = Math.round((last - first) / 86400000 * ratio);
    return new Date(first + dayOffset * 86400000).toISOString().slice(0, 10);
  }

  function chartDateRange(points, startX, endX, left, right) {
    const start = chartDateAtX(points, startX, left, right);
    const end = chartDateAtX(points, endX, left, right);
    if (!start || !end) return null;
    return start <= end ? { from: start, to: end } : { from: end, to: start };
  }

  function summarizeSelection(lines, from, to) {
    const orders = new Set();
    const customers = new Set();
    const days = new Set();
    let quantity = 0n;
    let count = 0;
    (lines || []).forEach(function (line) {
      if (!line || !line.delivery_date || (from && line.delivery_date < from) || (to && line.delivery_date > to)) return;
      count += 1;
      quantity += line.quantity;
      days.add(line.delivery_date);
      if (line.order_id) orders.add(JSON.stringify([line.customer_id || '', line.order_id]));
      if (line.customer_id) customers.add(line.customer_id);
    });
    return { quantity: quantity, lines: count, orders: orders.size, customers: customers.size, days: days.size };
  }

  function chartGranularity(start, end, requested) {
    if (['day', 'week', 'month'].includes(requested)) return requested;
    if (!start || !end) return 'day';
    const days = (Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000 + 1;
    return days <= 45 ? 'day' : days <= 180 ? 'week' : 'month';
  }

  function chartBucketStart(date, granularity) {
    if (granularity === 'month') return date.slice(0, 7) + '-01';
    if (granularity === 'week') {
      const value = new Date(date + 'T00:00:00Z');
      value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7);
      return value.toISOString().slice(0, 10);
    }
    return date;
  }

  function nextChartBucket(date, granularity) {
    const value = new Date(date + 'T00:00:00Z');
    if (granularity === 'month') value.setUTCMonth(value.getUTCMonth() + 1);
    else value.setUTCDate(value.getUTCDate() + (granularity === 'week' ? 7 : 1));
    if (value.getUTCFullYear() > 9999) return null;
    return value.toISOString().slice(0, 10);
  }

  function previousDate(date) {
    const value = new Date(date + 'T00:00:00Z');
    value.setUTCDate(value.getUTCDate() - 1);
    return value.toISOString().slice(0, 10);
  }

  function aggregateChart(points, start, end, granularity, expectedDates, observedDates) {
    if (!start || !end || start > end) return [];
    const daySpan = (Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000 + 1;
    if (!Number.isFinite(daySpan) || daySpan > 36600) return [];
    const buckets = [];
    const byStart = new Map();
    let cursor = chartBucketStart(start, granularity);
    while (cursor <= end) {
      const next = nextChartBucket(cursor, granularity);
      const bucketEnd = next ? previousDate(next) : end;
      const bucket = { from: cursor < start ? start : cursor, to: bucketEnd > end ? end : bucketEnd,
        date: cursor, quantity: 0n, lines: 0, hasRows: false, expectedDays: 0, observedDays: 0 };
      buckets.push(bucket);
      byStart.set(cursor, bucket);
      if (!next) break;
      cursor = next;
    }
    (points || []).forEach(function (point) {
      if (point.date < start || point.date > end) return;
      const bucket = byStart.get(chartBucketStart(point.date, granularity));
      if (!bucket) return;
      bucket.quantity += point.quantity;
      bucket.lines += point.lines;
      bucket.hasRows = true;
    });
    const expected = new Set(expectedDates || []);
    expected.forEach(function (date) {
      const bucket = byStart.get(chartBucketStart(date, granularity));
      if (bucket) bucket.expectedDays += 1;
    });
    (observedDates || []).forEach(function (date) {
      if (!expected.has(date)) return;
      const bucket = byStart.get(chartBucketStart(date, granularity));
      if (bucket) bucket.observedDays += 1;
    });
    return buckets;
  }

  function coverageCounts(expectedDates, observedDates, from, to) {
    const observed = new Set(observedDates || []);
    let expectedCount = 0;
    let observedCount = 0;
    (expectedDates || []).forEach(function (date) {
      if ((from && date < from) || (to && date > to)) return;
      expectedCount += 1;
      if (observed.has(date)) observedCount += 1;
    });
    return { expected: expectedCount, observed: observedCount, unknown: expectedCount - observedCount };
  }

  function sortLines(lines, key, direction) {
    const factor = direction === 'asc' ? 1 : -1;
    return (lines || []).slice().sort(function (a, b) {
      const av = key === 'customer' ? a.customer_name || a.customer_id || '' :
        key === 'source_file' ? a.source_file_label || a.source_file_name || '' :
        key.indexOf('custom:') === 0 ? (a.custom_fields && a.custom_fields[key.slice(7)]) || '' : a[key];
      const bv = key === 'customer' ? b.customer_name || b.customer_id || '' :
        key === 'source_file' ? b.source_file_label || b.source_file_name || '' :
        key.indexOf('custom:') === 0 ? (b.custom_fields && b.custom_fields[key.slice(7)]) || '' : b[key];
      let result = 0;
      if (typeof av === 'bigint' || typeof bv === 'bigint') {
        const left = typeof av === 'bigint' ? av : 0n;
        const right = typeof bv === 'bigint' ? bv : 0n;
        result = left === right ? 0 : left > right ? 1 : -1;
      } else if (key === 'source_line') result = Number(av || 0) - Number(bv || 0);
      else result = String(av || '').localeCompare(String(bv || ''), undefined, { numeric: true });
      return result * factor || compareLatestLines(a, b);
    });
  }

  function exportLinesCsv(lines, columns, valueForColumn) {
    const safeCell = function (value, numeric) {
      let text = value === null || value === undefined ? '' : String(value);
      if (!(numeric && /^-?\d+(?:\.\d+)?$/.test(text)) && /^[\t\r\n ]*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    return '\uFEFF' + [columns.map(function (column) { return safeCell(column.label); }).join(';')]
      .concat((lines || []).map(function (row) {
        return columns.map(function (column) { return safeCell(valueForColumn(row, column.key), column.number); }).join(';');
      })).join('\r\n') + '\r\n';
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
    selectedSummary: selectedSummary, selectedLines: selectedLines, visibleLineWindow: visibleLineWindow,
    rankEntities: rankEntities, filterLines: filterLines, sortLines: sortLines, exportLinesCsv: exportLinesCsv,
    chartDateAtX: chartDateAtX, chartDateRange: chartDateRange,
    summarizeSelection: summarizeSelection, chartGranularity: chartGranularity,
    aggregateChart: aggregateChart, coverageCounts: coverageCounts };
});
