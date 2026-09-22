(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingPeriods = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_WEEKDAYS = Object.freeze([0, 1, 2, 3, 4, 5, 6]);
  const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const MAX_SUPPORTED_DATE = '9999-12-31';

  function validDate(value) {
    if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
      return false;
    }
    const parsed = new Date(value + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function normalizeWeekdays(value) {
    const input = Array.isArray(value) ? value : DEFAULT_WEEKDAYS;
    const unique = new Set();
    input.forEach(function (day) {
      if (Number.isInteger(day) && day >= 0 && day <= 6) {
        unique.add(day);
      }
    });
    return Array.from(unique).sort(function (left, right) { return left - right; });
  }

  function normalizePeriod(value, fallbackName) {
    const input = value && typeof value === 'object' ? value : {};
    const start = validDate(input.start) ? input.start : null;
    const end = validDate(input.end) ? input.end : null;
    return {
      name: String(input.name || fallbackName).trim().slice(0, 80) || fallbackName,
      start: start,
      end: end
    };
  }

  function normalizeSettings(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      mode: input.mode === 'custom' ? 'custom' : 'weeks',
      expectedWeekdays: normalizeWeekdays(input.expectedWeekdays),
      periodA: normalizePeriod(input.periodA, 'Period A'),
      periodB: normalizePeriod(input.periodB, 'Period B')
    };
  }

  function observedDates(rows) {
    return Array.from(new Set((rows || []).map(function (row) {
      return row && validDate(row.delivery_date) ? row.delivery_date : null;
    }).filter(Boolean))).sort();
  }

  function utcDate(year, month, day) {
    const date = new Date(0);
    date.setUTCFullYear(year, month, day);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  function isoDate(date) {
    const year = date.getUTCFullYear();
    if (year < 1 || year > 9999) {
      return null;
    }
    return String(year).padStart(4, '0') + '-' +
      String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(date.getUTCDate()).padStart(2, '0');
  }

  function calendarWeekForDate(value) {
    if (!validDate(value)) {
      return null;
    }
    const date = new Date(value + 'T00:00:00Z');
    const isoDay = date.getUTCDay() || 7;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - isoDay + 1);
    const thursday = new Date(monday);
    thursday.setUTCDate(monday.getUTCDate() + 3);
    const year = thursday.getUTCFullYear();
    const januaryFourth = utcDate(year, 0, 4);
    const januaryFourthIsoDay = januaryFourth.getUTCDay() || 7;
    const firstMonday = new Date(januaryFourth);
    firstMonday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthIsoDay + 1);
    const week = Math.floor((monday.getTime() - firstMonday.getTime()) / 604800000) + 1;
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const number = String(week).padStart(2, '0');
    const start = isoDate(monday);
    if (!start) {
      return null;
    }
    return {
      id: String(year).padStart(4, '0') + '-W' + number,
      year: year,
      week: week,
      start: start,
      end: isoDate(sunday) || MAX_SUPPORTED_DATE,
      name: 'KW' + number + '/' + String(year).padStart(4, '0')
    };
  }

  function detectedCalendarWeeks(rows) {
    const weekMap = new Map();
    (rows || []).forEach(function (row) {
      const detected = row && calendarWeekForDate(row.delivery_date);
      if (!detected) {
        return;
      }
      if (!weekMap.has(detected.id)) {
        weekMap.set(detected.id, Object.assign({}, detected, {
          rowCount: 0,
          observedDates: new Set()
        }));
      }
      const week = weekMap.get(detected.id);
      week.rowCount += 1;
      week.observedDates.add(row.delivery_date);
    });
    return Array.from(weekMap.values()).sort(function (left, right) {
      return left.start.localeCompare(right.start);
    }).map(function (week) {
      return {
        id: week.id,
        year: week.year,
        week: week.week,
        start: week.start,
        end: week.end,
        name: week.name,
        rowCount: week.rowCount,
        observedDayCount: week.observedDates.size
      };
    });
  }

  function periodFromCalendarWeek(week) {
    if (!week || !validDate(week.start) || !validDate(week.end)) {
      return normalizePeriod(null, 'Period');
    }
    return normalizePeriod({ name: week.name, start: week.start, end: week.end }, week.name || 'Period');
  }

  function defaultSettings(rows) {
    const weeks = detectedCalendarWeeks(rows);
    const settings = normalizeSettings();
    if (weeks.length === 0) {
      return settings;
    }
    const periodBWeek = weeks[weeks.length - 1];
    const periodAWeek = weeks.length > 1 ? weeks[weeks.length - 2] : periodBWeek;
    settings.periodA = periodFromCalendarWeek(periodAWeek);
    settings.periodB = periodFromCalendarWeek(periodBWeek);
    return settings;
  }

  function dateRange(start, end, expectedWeekdays) {
    if (!validDate(start) || !validDate(end) || start > end) {
      return [];
    }
    const allowed = new Set(normalizeWeekdays(expectedWeekdays));
    const dates = [];
    let current = new Date(start + 'T00:00:00Z');
    const finish = new Date(end + 'T00:00:00Z');
    const daySpan = Math.floor((finish.getTime() - current.getTime()) / 86400000) + 1;
    if (daySpan > 36600) {
      return null;
    }
    while (current <= finish) {
      if (allowed.has(current.getUTCDay())) {
        dates.push(current.toISOString().slice(0, 10));
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  function rowsForPeriod(rows, period) {
    if (!period || !validDate(period.start) || !validDate(period.end) || period.start > period.end) {
      return [];
    }
    return (rows || []).filter(function (row) {
      return row && row.delivery_date >= period.start && row.delivery_date <= period.end;
    });
  }

  function coverageForPeriod(rows, period, expectedWeekdays) {
    const normalized = normalizePeriod(period, 'Period');
    const accumulator = createCoverageAccumulator(normalized, expectedWeekdays);
    (rows || []).forEach(function (row) {
      accumulator.consume(row);
    });
    return accumulator.finish();
  }

  function createCoverageAccumulator(period, expectedWeekdays) {
    const normalized = normalizePeriod(period, 'Period');
    const validRange = Boolean(normalized.start && normalized.end && normalized.start <= normalized.end);
    const expected = validRange ? dateRange(normalized.start, normalized.end, expectedWeekdays) : [];
    const observedSet = new Set();
    const sources = new Map();
    let rowCount = 0;

    function consume(row) {
      if (!validRange || !row || row.delivery_date < normalized.start || row.delivery_date > normalized.end) {
        return;
      }
      rowCount += 1;
      if (validDate(row.delivery_date)) {
        observedSet.add(row.delivery_date);
      }
      const id = row.source_file_id || row.source_file_label || row.source_file_name;
      if (id) {
        sources.set(String(id), row.source_file_label || row.source_file_name || String(id));
      }
    }

    function finish() {
      if (!validRange) {
        return {
          status: 'unavailable',
          start: normalized.start,
          end: normalized.end,
          rowCount: 0,
          observedDates: [],
          observedDayCount: 0,
          expectedDates: [],
          expectedDayCount: 0,
          missingDates: [],
          missingDayCount: 0,
          sourceFiles: []
        };
      }
      const observed = Array.from(observedSet).sort();
      if (expected === null) {
        return {
          status: 'unavailable',
          start: normalized.start,
          end: normalized.end,
          rowCount: rowCount,
          observedDates: observed,
          observedDayCount: observed.length,
          expectedDates: [],
          expectedDayCount: 0,
          missingDates: [],
          missingDayCount: 0,
          sourceFiles: Array.from(sources.values())
        };
      }
      const missing = expected.filter(function (date) { return !observedSet.has(date); });
      const observedExpected = expected.filter(function (date) { return observedSet.has(date); });
      return {
        status: rowCount === 0 ? 'empty' : (missing.length > 0 ? 'partial' : 'complete'),
        start: normalized.start,
        end: normalized.end,
        rowCount: rowCount,
        observedDates: observed,
        observedDayCount: observedExpected.length,
        expectedDates: expected,
        expectedDayCount: expected.length,
        missingDates: missing,
        missingDayCount: missing.length,
        sourceFiles: Array.from(sources.values())
      };
    }

    return { consume: consume, finish: finish };
  }

  function emptyArticle(articleId, articleName, options) {
    const settings = options || {};
    return {
      article_id: articleId,
      article_name: articleName || null,
      article_name_conflict: false,
      article_name_variants: [],
      order_line_count: 0,
      total_quantity: 0n,
      distinct_orders: settings.orderMetricsAvailable === false ? null : 0,
      distinct_customers: settings.customerMetricsAvailable === false ? null : 0,
      active_days: 0,
      total_sales: 0,
      total_sales_exact: '0',
      sales_value_rows: 0,
      total_sales_units: 0n,
      sales_unit_rows: 0,
      selling_unit_conflict: false,
      selling_unit_partial_rows: 0,
      selling_unit_overage_rows: 0,
      quantity_per_sales_unit_values: [],
      locations: [],
      source_file_count: 0,
      source_files: [],
      order_line_refs: []
    };
  }

  function percentageChange(before, after) {
    if (typeof before === 'bigint' && typeof after === 'bigint') {
      if (before === 0n) {
        return null;
      }
      return Number(((after - before) * 10000n) / before) / 100;
    }
    if (!Number.isFinite(before) || !Number.isFinite(after) || before === 0) {
      return null;
    }
    return ((after - before) / before) * 100;
  }

  function decimalParts(value) {
    const text = String(value === null || value === undefined ? '0' : value).trim();
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text);
    if (!match) {
      return { coefficient: 0n, scale: 0 };
    }
    const fraction = match[3] || '';
    const coefficient = BigInt((match[2] || '0') + fraction) * (match[1] === '-' ? -1n : 1n);
    return { coefficient: coefficient, scale: fraction.length };
  }

  function decimalDifference(before, after) {
    const left = decimalParts(before);
    const right = decimalParts(after);
    const scale = Math.max(left.scale, right.scale);
    const coefficient = right.coefficient * (10n ** BigInt(scale - right.scale)) - left.coefficient * (10n ** BigInt(scale - left.scale));
    const negative = coefficient < 0n;
    const absolute = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, '0');
    if (scale === 0) {
      return (negative ? '-' : '') + absolute;
    }
    const integer = absolute.slice(0, absolute.length - scale) || '0';
    const fraction = absolute.slice(absolute.length - scale).replace(/0+$/, '');
    return (negative ? '-' : '') + integer + (fraction ? '.' + fraction : '');
  }

  function articleState(before, after) {
    if (before.order_line_count === 0 && after.order_line_count > 0) {
      return 'new';
    }
    if (before.order_line_count > 0 && after.order_line_count === 0) {
      return 'inactive';
    }
    if (after.total_quantity > before.total_quantity) {
      return 'increased';
    }
    if (after.total_quantity < before.total_quantity) {
      return 'decreased';
    }
    return 'unchanged';
  }

  function comparePeriods(rows, settings, analyzeRows, featureReadiness, articleRegistry) {
    if (typeof analyzeRows !== 'function') {
      throw new TypeError('An analyzeRows function is required.');
    }
    const normalized = normalizeSettings(settings);
    const createAccumulator = analyzeRows && analyzeRows.createAnalysisAccumulator;
    let analysisA;
    let analysisB;
    let coverageA;
    let coverageB;
    if (typeof createAccumulator === 'function') {
      const accumulatorA = createAccumulator();
      const accumulatorB = createAccumulator();
      const coverageAccumulatorA = createCoverageAccumulator(normalized.periodA, normalized.expectedWeekdays);
      const coverageAccumulatorB = createCoverageAccumulator(normalized.periodB, normalized.expectedWeekdays);
      (rows || []).forEach(function (row, index) {
        if (!row) {
          return;
        }
        const inA = normalized.periodA && validDate(normalized.periodA.start) && validDate(normalized.periodA.end) &&
          row.delivery_date >= normalized.periodA.start && row.delivery_date <= normalized.periodA.end;
        const inB = normalized.periodB && validDate(normalized.periodB.start) && validDate(normalized.periodB.end) &&
          row.delivery_date >= normalized.periodB.start && row.delivery_date <= normalized.periodB.end;
        if (inA) {
          accumulatorA.consume(row, index);
        }
        if (inB) {
          accumulatorB.consume(row, index);
        }
        coverageAccumulatorA.consume(row);
        coverageAccumulatorB.consume(row);
      });
      analysisA = accumulatorA.finish();
      analysisB = accumulatorB.finish();
      coverageA = coverageAccumulatorA.finish();
      coverageB = coverageAccumulatorB.finish();
    } else {
      const rowsA = [];
      const indexesA = [];
      const rowsB = [];
      const indexesB = [];
      (rows || []).forEach(function (row, index) {
        if (!row) {
          return;
        }
        if (normalized.periodA && validDate(normalized.periodA.start) && validDate(normalized.periodA.end) &&
          row.delivery_date >= normalized.periodA.start && row.delivery_date <= normalized.periodA.end) {
          rowsA.push(row);
          indexesA.push(index);
        }
        if (normalized.periodB && validDate(normalized.periodB.start) && validDate(normalized.periodB.end) &&
          row.delivery_date >= normalized.periodB.start && row.delivery_date <= normalized.periodB.end) {
          rowsB.push(row);
          indexesB.push(index);
        }
      });
      analysisA = analyzeRows(rowsA, { detailIndexes: indexesA });
      analysisB = analyzeRows(rowsB, { detailIndexes: indexesB });
      coverageA = coverageForPeriod(rows, normalized.periodA, normalized.expectedWeekdays);
      coverageB = coverageForPeriod(rows, normalized.periodB, normalized.expectedWeekdays);
    }
    const orderComponent = featureReadiness && featureReadiness.periodComparison &&
      featureReadiness.periodComparison.components && featureReadiness.periodComparison.components.distinctOrders;
    const customerComponent = featureReadiness && featureReadiness.periodComparison &&
      featureReadiness.periodComparison.components && featureReadiness.periodComparison.components.customers;
    const orderMetricsAvailable = !orderComponent || orderComponent.status === 'ready';
    const orderMetricsStatus = orderComponent ? (orderComponent.status || 'blocked') : 'ready';
    const customerMetricsAvailable = !customerComponent || customerComponent.status === 'ready';
    const customerMetricsStatus = customerComponent ? (customerComponent.status || 'blocked') : 'ready';
    [analysisA, analysisB].forEach(function (analysis) {
      analysis.order_metrics_status = orderMetricsStatus;
      analysis.order_metrics_available = orderMetricsAvailable;
      if (!orderMetricsAvailable) {
        analysis.distinct_orders = null;
        analysis.average_quantity_per_order = null;
        analysis.articles = (analysis.articles || []).map(function (article) {
          return Object.assign({}, article, { distinct_orders: null, order_metrics_status: orderMetricsStatus });
        });
      } else {
        analysis.articles = (analysis.articles || []).map(function (article) {
          return Object.assign({}, article, { order_metrics_status: orderMetricsStatus });
        });
      }
      analysis.customer_metrics_status = customerMetricsStatus;
      analysis.customer_metrics_available = customerMetricsAvailable;
      if (!customerMetricsAvailable) {
        analysis.distinct_customers = null;
        analysis.articles = (analysis.articles || []).map(function (article) {
          return Object.assign({}, article, { distinct_customers: null, customer_metrics_status: customerMetricsStatus });
        });
      } else {
        analysis.articles = (analysis.articles || []).map(function (article) {
          return Object.assign({}, article, { customer_metrics_status: customerMetricsStatus });
        });
      }
    });
    const mapA = new Map(analysisA.articles.map(function (article) { return [article.article_id, article]; }));
    const mapB = new Map(analysisB.articles.map(function (article) { return [article.article_id, article]; }));
    const articleIds = Array.from(new Set(Array.from(mapA.keys()).concat(Array.from(mapB.keys()))));
    const registryById = new Map((articleRegistry || []).map(function (entry) { return [entry.article_id, entry]; }));
    const articles = articleIds.map(function (articleId) {
      const existingA = mapA.get(articleId);
      const existingB = mapB.get(articleId);
      const registryEntry = registryById.get(articleId);
      const masterName = registryEntry && registryEntry.master_data && registryEntry.master_data.article_name ||
        (registryEntry && registryEntry.has_master_data ? registryEntry.article_name : null);
      const articleName = masterName || (existingB && existingB.article_name) || (existingA && existingA.article_name) || null;
      const periodA = existingA
        ? Object.assign({}, existingA, { article_name: masterName || existingA.article_name })
        : emptyArticle(articleId, articleName, { orderMetricsAvailable: orderMetricsAvailable, customerMetricsAvailable: customerMetricsAvailable });
      const periodB = existingB
        ? Object.assign({}, existingB, { article_name: masterName || existingB.article_name })
        : emptyArticle(articleId, articleName, { orderMetricsAvailable: orderMetricsAvailable, customerMetricsAvailable: customerMetricsAvailable });
      const articleNameVariants = Array.from(new Set(
        (periodA.article_name_variants || []).concat(periodB.article_name_variants || []).concat(masterName ? [masterName] : [])
      ));
      periodA.article_name_variants = Array.from(new Set((periodA.article_name_variants || []).concat(masterName ? [masterName] : [])));
      periodA.article_name_conflict = periodA.article_name_variants.length > 1;
      periodB.article_name_variants = Array.from(new Set((periodB.article_name_variants || []).concat(masterName ? [masterName] : [])));
      periodB.article_name_conflict = periodB.article_name_variants.length > 1;
      const quantityChange = periodB.total_quantity - periodA.total_quantity;
      return {
        article_id: articleId,
        article_name: articleName,
        article_name_variants: articleNameVariants,
        period_a: periodA,
        period_b: periodB,
        quantity_change: quantityChange,
        quantity_percent_change: percentageChange(periodA.total_quantity, periodB.total_quantity),
        line_change: periodB.order_line_count - periodA.order_line_count,
        state: articleState(periodA, periodB),
        selling_unit_conflict: Boolean(
          periodA.selling_unit_conflict ||
          periodB.selling_unit_conflict ||
          new Set((periodA.quantity_per_sales_unit_values || []).concat(periodB.quantity_per_sales_unit_values || [])).size > 1
        ),
        selling_unit_partial: (periodA.selling_unit_partial_rows || 0) + (periodB.selling_unit_partial_rows || 0) > 0,
        selling_unit_overage: (periodA.selling_unit_overage_rows || 0) + (periodB.selling_unit_overage_rows || 0) > 0
      };
    }).sort(function (left, right) {
      const leftAbs = left.quantity_change < 0n ? -left.quantity_change : left.quantity_change;
      const rightAbs = right.quantity_change < 0n ? -right.quantity_change : right.quantity_change;
      return leftAbs === rightAbs ? left.article_id.localeCompare(right.article_id) : (leftAbs > rightAbs ? -1 : 1);
    });
    return {
      settings: normalized,
      coverageA: coverageA,
      coverageB: coverageB,
      overlapping: Boolean(normalized.periodA.start && normalized.periodB.start &&
        normalized.periodA.start <= normalized.periodB.end && normalized.periodB.start <= normalized.periodA.end),
      analysisA: analysisA,
      analysisB: analysisB,
      articles: articles,
      summary: {
        lineChange: analysisB.total_lines - analysisA.total_lines,
        quantityChange: analysisB.total_quantity - analysisA.total_quantity,
        quantityPercentChange: percentageChange(analysisA.total_quantity, analysisB.total_quantity),
        orderChange: orderMetricsAvailable ? analysisB.distinct_orders - analysisA.distinct_orders : null,
        customerChange: customerMetricsAvailable ? analysisB.distinct_customers - analysisA.distinct_customers : null,
        activeDayChange: analysisB.active_days - analysisA.active_days,
        salesChangeExact: decimalDifference(analysisA.total_sales_exact, analysisB.total_sales_exact),
        salesRowChange: analysisB.sales_value_rows - analysisA.sales_value_rows,
        salesUnitChange: analysisB.total_sales_units - analysisA.total_sales_units,
        salesUnitRowChange: analysisB.sales_unit_rows - analysisA.sales_unit_rows
      },
      order_metrics_status: orderMetricsStatus,
      customer_metrics_status: customerMetricsStatus
    };
  }

  function protectSpreadsheetText(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return /^[\t\r\n ]*[=+\-@]/.test(text) ? "'" + text : text;
  }

  function escapeCsv(value, delimiter) {
    const text = value === null || value === undefined ? '' : String(value);
    return /["\r\n]/.test(text) || text.indexOf(delimiter) >= 0
      ? '"' + text.replace(/"/g, '""') + '"'
      : text;
  }

  function exportComparisonCsv(comparison, core, options) {
    if (!comparison || !Array.isArray(comparison.articles) || !core || typeof core.formatScaledQuantity !== 'function') {
      throw new TypeError('A complete comparison and CSV core are required.');
    }
    const delimiter = options && options.delimiter ? options.delimiter : ';';
    const headers = [
      'article_id', 'article_name', 'article_name_conflict', 'article_name_variants', 'change_state', 'order_metrics_status', 'customer_metrics_status',
      'period_a_start', 'period_a_end', 'period_a_lines', 'period_a_quantity', 'period_a_orders', 'period_a_customers', 'period_a_active_days', 'period_a_sales', 'period_a_sales_rows', 'period_a_sales_units', 'period_a_sales_unit_rows', 'period_a_locations',
      'period_b_start', 'period_b_end', 'period_b_lines', 'period_b_quantity', 'period_b_orders', 'period_b_customers', 'period_b_active_days', 'period_b_sales', 'period_b_sales_rows', 'period_b_sales_units', 'period_b_sales_unit_rows', 'period_b_locations',
      'line_change', 'quantity_change', 'quantity_percent_change',
      'selling_unit_conflict', 'selling_unit_partial', 'selling_unit_overage', 'period_a_source_files', 'period_b_source_files'
    ];
    const lines = [headers.join(delimiter)];
    function comparisonQuantity(value) {
      return String(core.formatScaledQuantity(value, 'en')).replace(/,/g, '');
    }
    function comparisonSales(value) {
      return String(core.formatSalesValue(value, 'en')).replace(/,/g, '');
    }
    comparison.articles.forEach(function (article) {
      const articleNameVariants = Array.from(new Set(
        (article.period_a.article_name_variants || []).concat(article.period_b.article_name_variants || [])
      ));
      const values = [
        protectSpreadsheetText(article.article_id),
        protectSpreadsheetText(article.article_name),
        articleNameVariants.length > 1 ? 'true' : 'false',
        protectSpreadsheetText(JSON.stringify(articleNameVariants)),
        article.state,
        comparison.order_metrics_status || 'ready',
        comparison.customer_metrics_status || 'ready',
        comparison.settings.periodA.start,
        comparison.settings.periodA.end,
        article.period_a.order_line_count,
        comparisonQuantity(article.period_a.total_quantity),
        article.period_a.distinct_orders,
        article.period_a.distinct_customers,
        article.period_a.active_days,
        comparisonSales(article.period_a.total_sales_exact),
        article.period_a.sales_value_rows,
        comparisonQuantity(article.period_a.total_sales_units),
        article.period_a.sales_unit_rows,
        protectSpreadsheetText(JSON.stringify(article.period_a.locations || [])),
        comparison.settings.periodB.start,
        comparison.settings.periodB.end,
        article.period_b.order_line_count,
        comparisonQuantity(article.period_b.total_quantity),
        article.period_b.distinct_orders,
        article.period_b.distinct_customers,
        article.period_b.active_days,
        comparisonSales(article.period_b.total_sales_exact),
        article.period_b.sales_value_rows,
        comparisonQuantity(article.period_b.total_sales_units),
        article.period_b.sales_unit_rows,
        protectSpreadsheetText(JSON.stringify(article.period_b.locations || [])),
        article.line_change,
        comparisonQuantity(article.quantity_change),
        article.quantity_percent_change === null ? '' : article.quantity_percent_change,
        article.selling_unit_conflict ? 'true' : 'false',
        article.selling_unit_partial ? 'true' : 'false',
        article.selling_unit_overage ? 'true' : 'false',
        protectSpreadsheetText(JSON.stringify(article.period_a.source_files || [])),
        protectSpreadsheetText(JSON.stringify(article.period_b.source_files || []))
      ];
      lines.push(values.map(function (value) { return escapeCsv(value, delimiter); }).join(delimiter));
    });
    return lines.join('\r\n') + '\r\n';
  }

  return {
    DEFAULT_WEEKDAYS: DEFAULT_WEEKDAYS,
    validDate: validDate,
    calendarWeekForDate: calendarWeekForDate,
    detectedCalendarWeeks: detectedCalendarWeeks,
    periodFromCalendarWeek: periodFromCalendarWeek,
    normalizeSettings: normalizeSettings,
    defaultSettings: defaultSettings,
    rowsForPeriod: rowsForPeriod,
    coverageForPeriod: coverageForPeriod,
    comparePeriods: comparePeriods,
    exportComparisonCsv: exportComparisonCsv
  };
}));
