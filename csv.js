(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingCsv = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUANTITY_DECIMAL_PLACES = 7;
  const QUANTITY_SCALE = 10000000n;

  const FIELD_DEFINITIONS = Object.freeze([
    { key: 'order_id', label: 'Order ID', labels: { en: 'Order ID', de: 'Auftrags-ID' }, required: true },
    { key: 'article_id', label: 'Article ID', labels: { en: 'Article ID', de: 'Artikel-ID' }, required: true },
    { key: 'quantity', label: 'Quantity', labels: { en: 'Quantity', de: 'Menge' }, required: true },
    { key: 'order_date', label: 'Order date', labels: { en: 'Order date', de: 'Auftragsdatum' }, required: true },
    { key: 'customer_id', label: 'Customer ID', labels: { en: 'Customer ID', de: 'Kunden-ID' }, required: false },
    { key: 'sales_value', label: 'Sales value', labels: { en: 'Sales value', de: 'Umsatz' }, required: false },
    { key: 'location', label: 'Location', labels: { en: 'Location', de: 'Stellplatz' }, required: false }
  ]);

  const MESSAGES = Object.freeze({
    en: {
      delimiter: 'The CSV delimiter must be exactly one character long.',
      requiredMapping: 'The required field “{{label}}” is not mapped to a source column.',
      duplicateMapping: 'The source column mapped to “{{first}}” is also mapped to “{{second}}”. Each source column can be mapped only once.',
      requiredValue: 'A required value for “{{label}}” is missing.',
      positiveQuantity: 'Quantity must be a positive number.',
      quantityPrecision: 'Quantity supports at most {{digits}} decimal places.',
      invalidDate: 'The order date is invalid.',
      invalidNumber: 'The sales value must be a valid number.',
      unexpectedQuote: 'An unexpected character was found after a closing quote.',
      unterminatedQuote: 'A quote was not closed.',
      headerMissing: 'The CSV file does not contain a header row.',
      columnCount: 'The row contains {{actual}} columns instead of {{expected}}.'
    },
    de: {
      delimiter: 'Der CSV-Trenner muss genau ein Zeichen lang sein.',
      requiredMapping: 'Das erforderliche Feld „{{label}}“ ist keiner Quellspalte zugeordnet.',
      duplicateMapping: 'Die Quellspalte von „{{first}}“ ist auch „{{second}}“ zugeordnet. Jede Quellspalte darf nur einmal zugeordnet werden.',
      requiredValue: 'Erforderlicher Wert für „{{label}}“ fehlt.',
      positiveQuantity: 'Die Menge muss eine positive Zahl sein.',
      quantityPrecision: 'Die Menge darf höchstens {{digits}} Nachkommastellen haben.',
      invalidDate: 'Das Auftragsdatum ist ungültig.',
      invalidNumber: 'Der Umsatz muss eine gültige Zahl sein.',
      unexpectedQuote: 'Nach einem geschlossenen Anführungszeichen wurde ein unerwartetes Zeichen gefunden.',
      unterminatedQuote: 'Ein Anführungszeichen wurde nicht geschlossen.',
      headerMissing: 'Die CSV-Datei enthält keine Kopfzeile.',
      columnCount: 'Die Zeile enthält {{actual}} statt {{expected}} Spalten.'
    }
  });

  const FIELD_ALIASES = Object.freeze({
    order_id: ['order_id', 'order id', 'ordernumber', 'order number', 'auftragsnr', 'auftragsnummer'],
    article_id: ['article_id', 'article id', 'sku', 'material', 'artnr', 'artikelnummer'],
    quantity: ['quantity', 'qty', 'menge', 'anzahl', 'stück', 'stueck'],
    order_date: ['order_date', 'order date', 'date', 'datum', 'bestelldatum'],
    customer_id: ['customer_id', 'customer id', 'customer', 'kdnr', 'kundennummer'],
    sales_value: ['sales_value', 'sales value', 'sales', 'revenue', 'umsatz', 'wert'],
    location: ['location', 'storage location', 'stellplatz', 'lagerplatz']
  });

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
  }

  function normalizeLocale(locale) {
    return locale === 'de' ? 'de' : 'en';
  }

  function message(locale, key, replacements) {
    const messages = MESSAGES[normalizeLocale(locale)];
    let text = messages[key] || MESSAGES.en[key] || key;
    Object.keys(replacements || {}).forEach(function (name) {
      text = text.replace(new RegExp('\\{\\{' + name + '\\}\\}', 'g'), String(replacements[name]));
    });
    return text;
  }

  function getFieldLabel(fieldKey, locale) {
    const definition = FIELD_DEFINITIONS.find(function (item) { return item.key === fieldKey; });
    if (!definition) {
      return fieldKey || '';
    }
    return definition.labels[normalizeLocale(locale)] || definition.label;
  }

  function normalizeHeader(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/^\uFEFF/, '')
      .trim()
      .toLocaleLowerCase('de-DE')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  }

  function parseCsv(text, options) {
    const delimiter = options && options.delimiter ? options.delimiter : ';';
    const locale = normalizeLocale(options && options.locale);
    if (delimiter.length !== 1) {
      throw new Error(message(locale, 'delimiter'));
    }

    const source = String(text === undefined || text === null ? '' : text).replace(/^\uFEFF/, '');
    const rows = [];
    const errors = [];
    let fields = [];
    let field = '';
    let inQuotes = false;
    let afterClosingQuote = false;
    let recordHasContent = false;
    let line = 1;
    let recordStartLine = 1;

    function flushField() {
      fields.push(field);
      field = '';
    }

    function flushRow() {
      flushField();
      if (recordHasContent) {
        rows.push({ sourceLine: recordStartLine, values: fields });
      }
      fields = [];
      afterClosingQuote = false;
      recordHasContent = false;
    }

    function finishLine() {
      flushRow();
      line += 1;
      recordStartLine = line;
    }

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];

      if (character !== '\r' && character !== '\n') {
        recordHasContent = true;
      }

      if (inQuotes) {
        if (character === '"') {
          if (source[index + 1] === '"') {
            field += '"';
            index += 1;
          } else {
            inQuotes = false;
            afterClosingQuote = true;
          }
        } else {
          field += character;
          if (character === '\n') {
            line += 1;
          }
        }
        continue;
      }

      if (afterClosingQuote) {
        if (character === delimiter) {
          flushField();
          afterClosingQuote = false;
        } else if (character === '\r') {
          if (source[index + 1] === '\n') {
            index += 1;
          }
          finishLine();
        } else if (character === '\n') {
          finishLine();
        } else {
          errors.push({
            sourceLine: recordStartLine,
            code: 'unexpected_character_after_quote',
            message: message(locale, 'unexpectedQuote')
          });
          field += character;
          afterClosingQuote = false;
        }
        continue;
      }

      if (character === delimiter) {
        flushField();
      } else if (character === '"' && field === '') {
        inQuotes = true;
      } else if (character === '\r') {
        if (source[index + 1] === '\n') {
          index += 1;
        }
        finishLine();
      } else if (character === '\n') {
        finishLine();
      } else {
        field += character;
      }
    }

    if (inQuotes) {
      errors.push({
        sourceLine: recordStartLine,
        code: 'unterminated_quote',
        message: message(locale, 'unterminatedQuote')
      });
    }

    if (field !== '' || fields.length > 0 || recordHasContent) {
      flushRow();
    }

    return { rows: rows, errors: errors };
  }

  function detectMapping(headers) {
    const normalizedHeaders = headers.map(normalizeHeader);
    const usedIndexes = new Set();
    const mapping = {};

    FIELD_DEFINITIONS.forEach(function (definition) {
      const aliases = new Set((FIELD_ALIASES[definition.key] || []).map(normalizeHeader));
      let foundIndex = null;
      normalizedHeaders.some(function (header, index) {
        if (!usedIndexes.has(index) && aliases.has(header)) {
          foundIndex = index;
          return true;
        }
        return false;
      });
      mapping[definition.key] = foundIndex;
      if (foundIndex !== null) {
        usedIndexes.add(foundIndex);
      }
    });

    return mapping;
  }

  function validateMapping(mapping, locale) {
    const issues = FIELD_DEFINITIONS
      .filter(function (definition) {
        return definition.required && !Number.isInteger(mapping[definition.key]);
      })
      .map(function (definition) {
        return {
          sourceLine: null,
          field: definition.key,
          code: 'required_mapping_missing',
          message: message(locale, 'requiredMapping', { label: getFieldLabel(definition.key, locale) })
        };
      });

    const mappedFields = new Map();
    FIELD_DEFINITIONS.forEach(function (definition) {
      const sourceIndex = mapping[definition.key];
      if (!Number.isInteger(sourceIndex)) {
        return;
      }
      if (mappedFields.has(sourceIndex)) {
        const firstField = mappedFields.get(sourceIndex);
        issues.push({
          sourceLine: null,
          field: definition.key,
          code: 'source_column_reused',
          message: message(locale, 'duplicateMapping', {
            first: getFieldLabel(firstField, locale),
            second: getFieldLabel(definition.key, locale)
          })
        });
      } else {
        mappedFields.set(sourceIndex, definition.key);
      }
    });

    return issues;
  }

  function normalizeNumericText(value) {
    if (isBlank(value)) {
      return null;
    }

    let normalized = String(value).trim();
    if (/\s/.test(normalized)) {
      return null;
    }

    const commaIndex = normalized.lastIndexOf(',');
    const dotIndex = normalized.lastIndexOf('.');

    if (commaIndex >= 0 && dotIndex >= 0) {
      return null;
    } else if (commaIndex >= 0) {
      normalized = normalized.replace(',', '.');
    }

    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  function normalizeNumber(value) {
    const normalized = normalizeNumericText(value);
    if (normalized === null) {
      return null;
    }

    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function parseQuantity(value) {
    const normalized = normalizeNumericText(value);
    if (normalized === null) {
      return { value: null, precisionExceeded: false };
    }

    const decimalPlaces = (normalized.split('.')[1] || '').length;
    if (decimalPlaces > QUANTITY_DECIMAL_PLACES) {
      return { value: null, precisionExceeded: true };
    }

    const negative = normalized[0] === '-';
    const unsigned = normalized.replace(/^[+-]/, '');
    const parts = unsigned.split('.');
    const integerPart = parts[0] || '0';
    const fractionPart = (parts[1] || '').padEnd(QUANTITY_DECIMAL_PLACES, '0');
    const scaled = BigInt(integerPart + fractionPart) * (negative ? -1n : 1n);
    return {
      value: scaled,
      precisionExceeded: false
    };
  }

  function normalizeDate(value) {
    if (isBlank(value)) {
      return null;
    }

    const text = String(value).trim();
    let year;
    let month;
    let day;
    let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);

    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      match = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
      if (!match) {
        return null;
      }
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return [
      String(year).padStart(4, '0'),
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0')
    ].join('-');
  }

  function normalizeRecord(record, headers, mapping, locale) {
    const values = record.values;
    const issues = [];

    function rawValue(field) {
      const sourceIndex = mapping[field];
      return Number.isInteger(sourceIndex) ? String(values[sourceIndex] === undefined ? '' : values[sourceIndex]).trim() : '';
    }

    function requiredText(field, label) {
      const value = rawValue(field);
      if (!value) {
        issues.push({
          sourceLine: record.sourceLine,
          field: field,
          code: 'required_value_missing',
          rawValue: value,
        message: message(locale, 'requiredValue', { label: getFieldLabel(field, locale) })
        });
      }
      return value || null;
    }

    const orderId = requiredText('order_id', 'Auftrags-ID');
    const articleId = requiredText('article_id', 'Artikel-ID');
    const quantityRaw = rawValue('quantity');
    const quantityResult = parseQuantity(quantityRaw);
    const quantity = quantityResult.value;
    if (!quantityRaw) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'quantity',
        code: 'required_value_missing',
        rawValue: quantityRaw,
        message: message(locale, 'requiredValue', { label: getFieldLabel('quantity', locale) })
      });
    } else if (quantityResult.precisionExceeded) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'quantity',
        code: 'quantity_precision_exceeded',
        rawValue: quantityRaw,
        message: message(locale, 'quantityPrecision', { digits: QUANTITY_DECIMAL_PLACES })
      });
    } else if (quantity === null || quantity <= 0n) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'quantity',
        code: 'quantity_must_be_positive',
        rawValue: quantityRaw,
        message: message(locale, 'positiveQuantity')
      });
    }

    const dateRaw = rawValue('order_date');
    const orderDate = normalizeDate(dateRaw);
    if (!dateRaw) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'order_date',
        code: 'required_value_missing',
        rawValue: dateRaw,
        message: message(locale, 'requiredValue', { label: getFieldLabel('order_date', locale) })
      });
    } else if (orderDate === null) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'order_date',
        code: 'invalid_date',
        rawValue: dateRaw,
        message: message(locale, 'invalidDate')
      });
    }

    const customerIdRaw = rawValue('customer_id');
    const salesValueRaw = rawValue('sales_value');
    const locationRaw = rawValue('location');
    const salesValue = normalizeNumber(salesValueRaw);
    if (salesValueRaw && salesValue === null) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'sales_value',
        code: 'invalid_number',
        rawValue: salesValueRaw,
        message: message(locale, 'invalidNumber')
      });
    }

    return {
      record: {
        source_line: record.sourceLine,
        raw_values: values.slice(),
        raw_fields: headers.map(function (header, index) {
          return { position: index + 1, header: header, value: values[index] === undefined ? '' : values[index] };
        }),
        order_id: orderId,
        article_id: articleId,
        quantity: quantity,
        order_date: orderDate,
        customer_id: customerIdRaw || null,
        sales_value: salesValue,
        location: locationRaw || null
      },
      issues: issues
    };
  }

  function importCsv(text, mapping, options) {
    const parsed = parseCsv(text, options);
    const locale = normalizeLocale(options && options.locale);
    const parserIssues = parsed.errors.map(function (error) {
      return {
        sourceLine: error.sourceLine,
        field: null,
        code: error.code,
        message: error.message
      };
    });

    if (parsed.rows.length === 0) {
      return {
        headers: [],
        rows: [],
        issues: parserIssues.concat([{ sourceLine: null, field: null, code: 'header_missing', message: message(locale, 'headerMissing') }]),
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        structuralRows: 0,
        mapping: mapping || {}
      };
    }

    const headers = parsed.rows[0].values.map(function (header) { return String(header).trim(); });
    const dataRows = parsed.rows.slice(1);
    const selectedMapping = mapping || detectMapping(headers);
    const mappingIssues = validateMapping(selectedMapping, locale);
    if (mappingIssues.length > 0) {
      return {
        headers: headers,
        rows: [],
        issues: parserIssues.concat(mappingIssues),
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: 0,
        structuralRows: 0,
        mapping: selectedMapping
      };
    }

    const parserErrorLines = new Set(parsed.errors.map(function (error) { return error.sourceLine; }));
    const issues = parserIssues.slice();
    const rows = [];
    const invalidLines = new Set();
    const structuralLines = new Set();

    dataRows.forEach(function (dataRow) {
      if (dataRow.values.length !== headers.length) {
        structuralLines.add(dataRow.sourceLine);
        invalidLines.add(dataRow.sourceLine);
        issues.push({
          sourceLine: dataRow.sourceLine,
          field: null,
          code: 'column_count_mismatch',
          message: message(locale, 'columnCount', { actual: dataRow.values.length, expected: headers.length })
        });
        return;
      }

      const normalized = normalizeRecord(dataRow, headers, selectedMapping, locale);
      const rowIssues = normalized.issues;
      if (parserErrorLines.has(dataRow.sourceLine)) {
        invalidLines.add(dataRow.sourceLine);
      }
      if (rowIssues.length > 0) {
        invalidLines.add(dataRow.sourceLine);
        Array.prototype.push.apply(issues, rowIssues);
      } else if (!parserErrorLines.has(dataRow.sourceLine)) {
        rows.push(normalized.record);
      }
    });

    return {
      headers: headers,
      rows: rows,
      issues: issues,
      totalRows: dataRows.length,
      validRows: rows.length,
      invalidRows: invalidLines.size,
      structuralRows: structuralLines.size,
      mapping: selectedMapping
    };
  }

  function divideScaledQuantity(value, divisor) {
    if (!divisor) {
      return 0n;
    }

    const divisorBigInt = BigInt(divisor);
    const negative = value < 0n;
    const absoluteValue = negative ? -value : value;
    let quotient = absoluteValue / divisorBigInt;
    const remainder = absoluteValue % divisorBigInt;
    if (remainder * 2n >= divisorBigInt) {
      quotient += 1n;
    }
    return negative ? -quotient : quotient;
  }

  function scaledQuantityToText(value) {
    const scaled = typeof value === 'bigint' ? value : BigInt(value);
    const negative = scaled < 0n;
    const absoluteValue = (negative ? -scaled : scaled).toString().padStart(QUANTITY_DECIMAL_PLACES + 1, '0');
    const integerPart = absoluteValue.slice(0, -QUANTITY_DECIMAL_PLACES) || '0';
    const fractionalPart = absoluteValue.slice(-QUANTITY_DECIMAL_PLACES).replace(/0+$/, '');
    return (negative ? '-' : '') + integerPart + (fractionalPart ? '.' + fractionalPart : '');
  }

  function formatScaledQuantity(value, locale) {
    const text = scaledQuantityToText(value);
    const normalizedLocale = normalizeLocale(locale);
    const negative = text[0] === '-';
    const unsigned = negative ? text.slice(1) : text;
    const parts = unsigned.split('.');
    const integerPart = new Intl.NumberFormat(normalizedLocale === 'de' ? 'de-DE' : 'en-US').format(BigInt(parts[0]));
    const decimalSeparator = normalizedLocale === 'de' ? ',' : '.';
    return (negative ? '-' : '') + integerPart + (parts[1] ? decimalSeparator + parts[1] : '');
  }

  function analyzeRows(rows) {
    const articleMap = new Map();
    const orderIds = new Set();
    const customerIds = new Set();
    const activeDays = new Set();
    let totalQuantity = 0n;
    let totalSales = 0;
    let salesValueRows = 0;

    rows.forEach(function (row) {
      if (typeof row.quantity !== 'bigint') {
        throw new TypeError('Normalized rows must store quantity as a scaled integer.');
      }
      orderIds.add(row.order_id);
      if (row.customer_id) {
        customerIds.add(row.customer_id);
      }
      activeDays.add(row.order_date);
      totalQuantity += row.quantity;
      if (row.sales_value !== null) {
        totalSales += row.sales_value;
        salesValueRows += 1;
      }

      if (!articleMap.has(row.article_id)) {
        articleMap.set(row.article_id, {
          article_id: row.article_id,
          order_line_count: 0,
          total_quantity: 0n,
          order_ids: new Set(),
          customer_ids: new Set(),
          active_days: new Set(),
          total_sales: 0,
          sales_value_rows: 0,
          locations: new Set()
        });
      }

      const article = articleMap.get(row.article_id);
      article.order_line_count += 1;
      article.total_quantity += row.quantity;
      article.order_ids.add(row.order_id);
      if (row.customer_id) {
        article.customer_ids.add(row.customer_id);
      }
      article.active_days.add(row.order_date);
      if (row.sales_value !== null) {
        article.total_sales += row.sales_value;
        article.sales_value_rows += 1;
      }
      if (row.location) {
        article.locations.add(row.location);
      }
    });

    const articles = Array.from(articleMap.values())
      .sort(function (left, right) {
        return right.order_line_count - left.order_line_count ||
          (right.total_quantity > left.total_quantity ? -1 : right.total_quantity < left.total_quantity ? 1 : 0) ||
          left.article_id.localeCompare(right.article_id);
      })
      .map(function (article) {
        return {
          article_id: article.article_id,
          order_line_count: article.order_line_count,
          total_quantity: article.total_quantity,
          distinct_orders: article.order_ids.size,
          distinct_customers: article.customer_ids.size,
          active_days: article.active_days.size,
          total_sales: article.total_sales,
          sales_value_rows: article.sales_value_rows,
          locations: Array.from(article.locations).sort(),
          share_of_order_lines: rows.length === 0 ? 0 : article.order_line_count / rows.length
        };
      });

    let cumulativeShare = 0;
    articles.forEach(function (article) {
      cumulativeShare += article.share_of_order_lines;
      article.cumulative_share_of_order_lines = cumulativeShare;
    });

    return {
      articles: articles,
      total_lines: rows.length,
      total_quantity: totalQuantity,
      distinct_orders: orderIds.size,
      distinct_customers: customerIds.size,
      active_days: activeDays.size,
      total_sales: totalSales,
      sales_value_rows: salesValueRows,
      average_quantity_per_line: divideScaledQuantity(totalQuantity, rows.length),
      average_quantity_per_order: divideScaledQuantity(totalQuantity, orderIds.size)
    };
  }

  function escapeCsvValue(value, delimiter) {
    const text = value === null || value === undefined ? '' : String(value);
    if (text.indexOf('"') >= 0 || text.indexOf('\n') >= 0 || text.indexOf('\r') >= 0 || text.indexOf(delimiter) >= 0) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function protectSpreadsheetText(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return /^[\t\r\n ]*[=+\-@]/.test(text) ? "'" + text : text;
  }

  function serializeQuantity(value) {
    if (typeof value !== 'bigint') {
      return '';
    }
    return scaledQuantityToText(value);
  }

  function expandExponential(value) {
    const text = String(value);
    if (!/[eE]/.test(text)) {
      return text;
    }

    const parts = text.toLowerCase().split('e');
    const coefficient = parts[0];
    const exponent = Number(parts[1]);
    const negative = coefficient[0] === '-';
    const unsigned = coefficient.replace(/^[+-]/, '');
    const coefficientParts = unsigned.split('.');
    const digits = coefficientParts.join('');
    const decimalPosition = coefficientParts[0].length + exponent;
    let expanded;

    if (decimalPosition <= 0) {
      expanded = '0.' + '0'.repeat(-decimalPosition) + digits;
    } else if (decimalPosition >= digits.length) {
      expanded = digits + '0'.repeat(decimalPosition - digits.length);
    } else {
      expanded = digits.slice(0, decimalPosition) + '.' + digits.slice(decimalPosition);
    }

    return negative ? '-' + expanded : expanded;
  }

  function serializeShare(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '';
    }
    return expandExponential(number.toString());
  }

  function exportAnalysisCsv(articles, options) {
    const delimiter = options && options.delimiter ? options.delimiter : ';';
    const headers = [
      'article_id',
      'order_line_count',
      'total_quantity',
      'distinct_orders',
      'distinct_customers',
      'active_days',
      'total_sales',
      'sales_value_rows',
      'share_of_order_lines',
      'cumulative_share_of_order_lines',
      'locations'
    ];
    const lines = [headers.join(delimiter)];

    function rounded(value, decimals) {
      return Number(Number(value).toFixed(decimals));
    }

    articles.forEach(function (article) {
      lines.push([
        protectSpreadsheetText(article.article_id),
        article.order_line_count,
        serializeQuantity(article.total_quantity),
        article.distinct_orders,
        article.distinct_customers,
        article.active_days,
        rounded(article.total_sales, 2),
        article.sales_value_rows,
        serializeShare(article.share_of_order_lines),
        serializeShare(article.cumulative_share_of_order_lines),
        protectSpreadsheetText(article.locations.join(', '))
      ].map(function (value) { return escapeCsvValue(value, delimiter); }).join(delimiter));
    });

    return lines.join('\r\n') + '\r\n';
  }

  return {
    FIELD_DEFINITIONS: FIELD_DEFINITIONS,
    QUANTITY_DECIMAL_PLACES: QUANTITY_DECIMAL_PLACES,
    QUANTITY_SCALE: QUANTITY_SCALE,
    detectMapping: detectMapping,
    analyzeRows: analyzeRows,
    exportAnalysisCsv: exportAnalysisCsv,
    formatScaledQuantity: formatScaledQuantity,
    getFieldLabel: getFieldLabel,
    importCsv: importCsv,
    normalizeDate: normalizeDate,
    normalizeHeader: normalizeHeader,
    normalizeNumber: normalizeNumber,
    parseCsv: parseCsv,
    validateMapping: validateMapping
  };
}));
