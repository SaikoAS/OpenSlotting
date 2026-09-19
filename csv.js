(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingCsvFactory = factory;
    root.OpenSlottingCsv = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const APP_VERSION = '0.2.1';
  const QUANTITY_DECIMAL_PLACES = 7;
  const QUANTITY_SCALE = 10000000n;
  const SALES_DECIMAL_PLACES = 2;
  const COLUMN_PROFILE_SAMPLE_LIMIT = 5;
  const COLUMN_PROFILE_DISTINCT_LIMIT = 256;
  const COLUMN_PROFILE_FREQUENT_LIMIT = 5;
  const COLUMN_PROFILE_VALUE_LIMIT = 256;

  const FIELD_DEFINITIONS = Object.freeze([
    { key: 'order_id', label: 'Order ID', labels: { en: 'Order ID', de: 'Auftrags-ID' }, required: true },
    { key: 'article_id', label: 'Article ID', labels: { en: 'Article ID', de: 'Artikel-ID' }, required: true },
    { key: 'article_name', label: 'Article description', labels: { en: 'Article description', de: 'Artikelbezeichnung' }, required: false },
    { key: 'quantity', label: 'Quantity', labels: { en: 'Quantity', de: 'Menge' }, required: true },
    { key: 'order_date', label: 'Order date', labels: { en: 'Order date', de: 'Auftragsdatum' }, required: true },
    { key: 'customer_id', label: 'Customer ID', labels: { en: 'Customer ID', de: 'Kunden-ID' }, required: false },
    { key: 'sales_value', label: 'Sales value', labels: { en: 'Sales value', de: 'Umsatz' }, required: false },
    { key: 'location', label: 'Location', labels: { en: 'Location', de: 'Stellplatz' }, required: false },
    { key: 'sales_unit_count', label: 'Selling units / Colli', labels: { en: 'Selling units / Colli', de: 'Verkaufseinheiten / VKU / Colli' }, required: false },
    { key: 'quantity_per_sales_unit', label: 'Quantity per selling unit', labels: { en: 'Quantity per selling unit', de: 'Menge pro VKU' }, required: false }
  ]);

  const MESSAGES = Object.freeze({
    en: {
      delimiter: 'The CSV delimiter must be exactly one character long.',
      requiredMapping: 'The required field “{{label}}” is not mapped to a source column.',
      duplicateMapping: 'The source column mapped to “{{first}}” is also mapped to “{{second}}”. Each source column can be mapped only once.',
      requiredValue: 'A required value for “{{label}}” is missing.',
      positiveQuantity: 'Quantity must be a positive number.',
      quantityPrecision: 'Quantity supports at most {{digits}} decimal places.',
      salesPrecision: 'Sales value supports at most {{digits}} decimal places.',
      salesUnitPrecision: 'Selling units support at most {{digits}} decimal places.',
      quantityPerSalesUnitPrecision: 'Quantity per selling unit supports at most {{digits}} decimal places.',
      nonNegativeSalesUnitCount: 'Selling units must be zero or a positive number. The optional value is ignored for this row.',
      positiveQuantityPerSalesUnit: 'Quantity per selling unit must be a positive number.',
      invalidDate: 'The order date is invalid.',
      invalidNumber: 'The sales value must be a valid number.',
      bareQuote: 'A quote in an unquoted field is not allowed.',
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
      salesPrecision: 'Der Umsatz darf höchstens {{digits}} Nachkommastellen haben.',
      salesUnitPrecision: 'Verkaufseinheiten dürfen höchstens {{digits}} Nachkommastellen haben.',
      quantityPerSalesUnitPrecision: 'Die Menge pro VKU darf höchstens {{digits}} Nachkommastellen haben.',
      nonNegativeSalesUnitCount: 'Die Anzahl Verkaufseinheiten muss null oder eine positive Zahl sein. Der optionale Wert wird für diese Zeile ignoriert.',
      positiveQuantityPerSalesUnit: 'Die Menge pro VKU muss eine positive Zahl sein. Der optionale Wert wird für diese Zeile ignoriert.',
      invalidDate: 'Das Auftragsdatum ist ungültig.',
      invalidNumber: 'Der Umsatz muss eine gültige Zahl sein.',
      bareQuote: 'Ein Anführungszeichen in einem unquotierten Feld ist nicht zulässig.',
      unexpectedQuote: 'Nach einem geschlossenen Anführungszeichen wurde ein unerwartetes Zeichen gefunden.',
      unterminatedQuote: 'Ein Anführungszeichen wurde nicht geschlossen.',
      headerMissing: 'Die CSV-Datei enthält keine Kopfzeile.',
      columnCount: 'Die Zeile enthält {{actual}} statt {{expected}} Spalten.'
    }
  });

  const PARSER_ERROR_MESSAGE_KEYS = Object.freeze({
    unexpected_quote_in_unquoted_field: 'bareQuote',
    unexpected_character_after_quote: 'unexpectedQuote',
    unterminated_quote: 'unterminatedQuote'
  });

  const FIELD_ALIASES = Object.freeze({
    order_id: ['order_id', 'order id', 'ordernumber', 'order number', 'auftragsnr', 'auftragsnummer', 'auftrnr', 'auftragnr', 'auftragsid', 'kundenauftragsnr', 'kundenauftragsnummer'],
    article_id: ['article_id', 'article id', 'sku', 'material', 'artnr', 'artikelnummer', 'artikelnr', 'materialnr', 'materialnummer', 'produktnr', 'produktnummer', 'skunr'],
    article_name: ['article_name', 'article name', 'article description', 'description', 'product name', 'artikelbezeichnung', 'bezeichnung', 'artikeltext', 'kurztext', 'artikelname', 'produktbezeichnung', 'materialbezeichnung', 'warenbezeichnung', 'produkttext', 'langtext'],
    quantity: ['quantity', 'qty', 'menge', 'anzahl', 'stück', 'stueck', 'gmenge', 'gesamtmenge', 'mengegesamt', 'auftragsmenge', 'kommissioniermenge', 'pickmenge', 'entnahmemenge'],
    order_date: ['order_date', 'order date', 'date', 'datum', 'bestelldatum', 'lfdat', 'lieferdatum'],
    customer_id: ['customer_id', 'customer id', 'customer', 'kdnr', 'kundennummer', 'kundenid', 'debitor', 'debitornr', 'debitorennr'],
    sales_value: ['sales_value', 'sales value', 'sales', 'revenue', 'umsatz', 'wert', 'vkwert', 'verkaufswert', 'umsatzwert', 'positionswert', 'nettowert', 'positionsnettowert'],
    location: ['location', 'storage location', 'stellplatz', 'lagerplatz', 'lgpl', 'lagerfach', 'lagerfachnr', 'kommissionierplatz', 'pickplatz', 'entnahmeplatz'],
    sales_unit_count: ['sales_unit_count', 'sales unit count', 'sales units', 'selling units', 'verkaufseinheit', 'verkaufseinheiten', 'vku', 'colli'],
    quantity_per_sales_unit: ['quantity_per_sales_unit', 'quantity per sales unit', 'quantity per selling unit', 'menge pro vku', 'menge je vku', 'inhalt', 'inh']
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

  function buildColumnCatalog(headers, sourceFile) {
    const source = normalizeSourceFile(sourceFile);
    const occurrences = new Map();
    return (Array.isArray(headers) ? headers : []).map(function (header, position) {
      const originalHeader = String(header === undefined || header === null ? '' : header);
      const normalizedHeader = normalizeHeader(originalHeader);
      const occurrence = (occurrences.get(normalizedHeader) || 0) + 1;
      occurrences.set(normalizedHeader, occurrence);
      return {
        position: position,
        header: originalHeader,
        normalizedHeader: normalizedHeader,
        occurrence: occurrence,
        isDuplicate: occurrence > 1,
        sourceFileId: source.id,
        sourceFileName: source.name,
        sourceFileLabel: source.label,
        profile: emptyColumnProfile()
      };
    });
  }

  function emptyColumnProfile() {
    return {
      totalRows: 0,
      nonEmptyCount: 0,
      emptyCount: 0,
      numericCompatibleCount: 0,
      dateCompatibleCount: 0,
      textCompatibleCount: 0,
      incompatibleCount: 0,
      distinctValueCount: 0,
      distinctValueCountExact: true,
      distinctValueLimit: COLUMN_PROFILE_DISTINCT_LIMIT,
      sampleValues: [],
      frequentValues: []
    };
  }

  function createColumnProfileStates(columnCount) {
    return Array.from({ length: columnCount }, function () {
      return {
        totalRows: 0,
        nonEmptyCount: 0,
        emptyCount: 0,
        numericCompatibleCount: 0,
        dateCompatibleCount: 0,
        textCompatibleCount: 0,
        incompatibleCount: 0,
        samples: [],
        sampleKeys: new Set(),
        distinctValues: new Map(),
        distinctLimitReached: false,
        truncatedValueSeen: false
      };
    });
  }

  function boundedProfileValue(value) {
    const text = String(value);
    if (text.length <= COLUMN_PROFILE_VALUE_LIMIT) {
      return { value: text, truncated: false };
    }
    return {
      value: text.slice(0, COLUMN_PROFILE_VALUE_LIMIT),
      truncated: true
    };
  }

  function observeColumnProfile(state, value) {
    state.totalRows += 1;
    const text = String(value === undefined || value === null ? '' : value);
    const trimmed = text.trim();
    if (trimmed === '') {
      state.emptyCount += 1;
      return;
    }

    state.nonEmptyCount += 1;
    state.textCompatibleCount += 1;
    const numericValue = normalizeNumericText(trimmed);
    const dateValue = normalizeDate(trimmed);
    if (numericValue !== null) {
      state.numericCompatibleCount += 1;
    }
    if (dateValue !== null) {
      state.dateCompatibleCount += 1;
    }
    if (numericValue === null && dateValue === null) {
      state.incompatibleCount += 1;
    }

    const bounded = boundedProfileValue(text);
    if (bounded.truncated) {
      state.truncatedValueSeen = true;
    }
    const key = bounded.value + (bounded.truncated ? '\u0000truncated' : '');
    if (!state.sampleKeys.has(key) && state.samples.length < COLUMN_PROFILE_SAMPLE_LIMIT) {
      state.sampleKeys.add(key);
      state.samples.push(bounded);
    }
    if (state.distinctValues.has(key)) {
      const current = state.distinctValues.get(key);
      current.count += 1;
      return;
    }
    if (state.distinctValues.size >= COLUMN_PROFILE_DISTINCT_LIMIT) {
      state.distinctLimitReached = true;
      let leastKey = null;
      let leastValue = null;
      state.distinctValues.forEach(function (candidate, candidateKey) {
        if (!leastValue || candidate.count < leastValue.count) {
          leastKey = candidateKey;
          leastValue = candidate;
        }
      });
      if (leastValue) {
        state.distinctValues.delete(leastKey);
        state.distinctValues.set(key, {
          value: bounded.value,
          truncated: bounded.truncated,
          count: leastValue.count + 1
        });
      }
      return;
    }
    state.distinctValues.set(key, { value: bounded.value, truncated: bounded.truncated, count: 1 });
  }

  function finalizeColumnProfiles(catalog, states) {
    return catalog.map(function (entry, index) {
      const state = states && states[index];
      if (!state) {
        return Object.assign({}, entry, { profile: emptyColumnProfile() });
      }
      const frequentValues = Array.from(state.distinctValues.values())
        .sort(function (left, right) {
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          return left.value.localeCompare(right.value);
        })
        .slice(0, COLUMN_PROFILE_FREQUENT_LIMIT);
      return Object.assign({}, entry, {
        profile: {
          totalRows: state.totalRows,
          nonEmptyCount: state.nonEmptyCount,
          emptyCount: state.emptyCount,
          numericCompatibleCount: state.numericCompatibleCount,
          dateCompatibleCount: state.dateCompatibleCount,
          textCompatibleCount: state.textCompatibleCount,
          incompatibleCount: state.incompatibleCount,
          distinctValueCount: state.distinctValues.size,
          distinctValueCountExact: !state.distinctLimitReached && !state.truncatedValueSeen,
          distinctValueLimit: COLUMN_PROFILE_DISTINCT_LIMIT,
          sampleValues: state.samples.map(function (sample) { return Object.assign({}, sample); }),
          frequentValues: frequentValues.map(function (value) { return Object.assign({}, value); })
        }
      });
    });
  }

  function observeColumnProfiles(states, values) {
    states.forEach(function (state, index) {
      observeColumnProfile(state, values && values[index]);
    });
  }

  function createCsvParser(options) {
    const delimiter = options && options.delimiter ? options.delimiter : ';';
    const locale = normalizeLocale(options && options.locale);
    const retainRows = !(options && options.retainRows === false);
    const onRow = options && typeof options.onRow === 'function' ? options.onRow : null;
    if (delimiter.length !== 1) {
      throw new Error(message(locale, 'delimiter'));
    }

    const rows = [];
    const errors = [];
    let recordErrors = [];
    let fields = [];
    let field = '';
    let inQuotes = false;
    let afterClosingQuote = false;
    let recordHasContent = false;
    let line = 1;
    let recordStartLine = 1;
    let headerValues = null;
    let dataRowCount = 0;
    let stopRequested = false;
    let quotePending = false;
    let skipLfAfterCr = false;
    let suppressLfLineIncrement = false;
    let firstChunk = true;

    function addParserError(error) {
      errors.push(error);
      recordErrors.push(error);
    }

    function flushField() {
      fields.push(field);
      field = '';
    }

    function flushRow() {
      flushField();
      if (recordHasContent) {
        const row = { sourceLine: recordStartLine, values: fields };
        if (headerValues === null) {
          headerValues = fields.slice();
        } else {
          dataRowCount += 1;
        }
        if (onRow) {
          stopRequested = onRow(row, recordErrors) === false;
        }
        if (retainRows) {
          rows.push(row);
        }
      }
      fields = [];
      recordErrors = [];
      afterClosingQuote = false;
      recordHasContent = false;
    }

    function finishLine() {
      flushRow();
      line += 1;
      recordStartLine = line;
    }

    function push(source) {
      let chunk = String(source === undefined || source === null ? '' : source);
      if (firstChunk) {
        chunk = chunk.replace(/^\uFEFF/, '');
        firstChunk = false;
      }
      for (let index = 0; index < chunk.length && !stopRequested; index += 1) {
        const character = chunk[index];

        if (skipLfAfterCr) {
          skipLfAfterCr = false;
          if (character === '\n') {
            if (!inQuotes) {
              continue;
            }
            suppressLfLineIncrement = true;
          }
        }

        if (quotePending) {
          quotePending = false;
          if (character === '"') {
            field += '"';
            inQuotes = true;
            continue;
          }
          inQuotes = false;
          afterClosingQuote = true;
        }

        if (character !== '\r' && character !== '\n') {
          recordHasContent = true;
        }

        if (inQuotes) {
          if (character === '"') {
            if (index + 1 < chunk.length) {
              if (chunk[index + 1] === '"') {
                field += '"';
                index += 1;
              } else {
                inQuotes = false;
                afterClosingQuote = true;
              }
            } else {
              quotePending = true;
            }
          } else {
            field += character;
            if (character === '\r') {
              line += 1;
              skipLfAfterCr = true;
            } else if (character === '\n') {
              if (!suppressLfLineIncrement) {
                line += 1;
              }
              suppressLfLineIncrement = false;
            }
          }
          continue;
        }

        if (afterClosingQuote) {
          if (character === delimiter) {
            flushField();
            afterClosingQuote = false;
          } else if (character === '\r') {
            finishLine();
            skipLfAfterCr = true;
          } else if (character === '\n') {
            finishLine();
          } else {
            addParserError({
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
        } else if (character === '"') {
          addParserError({
            sourceLine: recordStartLine,
            code: 'unexpected_quote_in_unquoted_field',
            message: message(locale, 'bareQuote')
          });
          field += character;
        } else if (character === '\r') {
          finishLine();
          skipLfAfterCr = true;
        } else if (character === '\n') {
          finishLine();
        } else {
          field += character;
        }
      }
      return !stopRequested;
    }

    function finish() {
      if (quotePending) {
        quotePending = false;
        inQuotes = false;
        afterClosingQuote = true;
      }
      if (!stopRequested && inQuotes) {
        addParserError({
          sourceLine: recordStartLine,
          code: 'unterminated_quote',
          message: message(locale, 'unterminatedQuote')
        });
      }
      if (!stopRequested && (field !== '' || fields.length > 0 || recordHasContent)) {
        flushRow();
      }
      const result = { rows: rows, errors: errors };
      if (!retainRows) {
        result.headers = headerValues || [];
        result.dataRowCount = dataRowCount;
      }
      return result;
    }

    return { push: push, finish: finish };
  }

  function parseCsv(text, options) {
    const parser = createCsvParser(options);
    parser.push(text);
    return parser.finish();
  }

  function parseCsvChunks(chunks, options) {
    const parser = createCsvParser(options);
    for (const chunk of chunks || []) {
      if (!parser.push(chunk)) {
        break;
      }
    }
    return parser.finish();
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

  function mappingSuggestionConfidence(score) {
    if (score >= 90) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  function headerSimilarityScore(header, alias) {
    if (!header || !alias) return 0;
    if (header === alias) return 100;
    if (header.indexOf(alias) === 0 || alias.indexOf(header) === 0) return 68;
    const headerParts = header.match(/[a-z]+|\d+/g) || [];
    const aliasParts = alias.match(/[a-z]+|\d+/g) || [];
    const overlap = aliasParts.filter(function (part) { return headerParts.indexOf(part) >= 0; }).length;
    return overlap > 0 ? 45 + Math.round(35 * overlap / Math.max(aliasParts.length, 1)) : 0;
  }

  function buildMappingSuggestions(headers, profiles, options) {
    const values = Array.isArray(headers) ? headers : [];
    const sourceProfiles = Array.isArray(profiles) ? profiles : [];
    const used = new Set();
    const suggestions = {};
    FIELD_DEFINITIONS.forEach(function (definition) {
      const aliases = (FIELD_ALIASES[definition.key] || []).map(normalizeHeader);
      const candidates = values.map(function (header, position) {
        const normalized = normalizeHeader(header);
        let score = 0;
        const reasons = [];
        const exactAlias = aliases.indexOf(normalized) >= 0;
        if (exactAlias) {
          score = 100;
          reasons.push('exact_alias');
        } else {
          aliases.forEach(function (alias) {
            score = Math.max(score, headerSimilarityScore(normalized, alias));
          });
          if (score > 0) reasons.push('header_similarity');
        }
        const profile = sourceProfiles[position] || {};
        const total = Number(profile.nonEmptyCount || 0);
        if (total > 0) {
          const ratio = function (count) { return Number(count || 0) / total; };
          if (definition.key === 'order_date' && ratio(profile.dateCompatibleCount) >= 0.8) {
            score += exactAlias ? 0 : 18;
            reasons.push('date_compatible');
          } else if (['quantity', 'sales_value', 'sales_unit_count', 'quantity_per_sales_unit'].indexOf(definition.key) >= 0 && ratio(profile.numericCompatibleCount) >= 0.8) {
            score += exactAlias ? 0 : 18;
            reasons.push('number_compatible');
          } else if (['order_id', 'article_id', 'article_name', 'customer_id', 'location'].indexOf(definition.key) >= 0 && ratio(profile.textCompatibleCount) >= 0.8) {
            score += exactAlias ? 0 : 8;
            reasons.push('text_compatible');
          }
        }
        return {
          sourcePosition: position,
          targetField: definition.key,
          confidence: mappingSuggestionConfidence(score),
          score: score,
          reasons: reasons,
          ambiguity: false,
          automaticApplicationSafe: false
        };
      }).filter(function (candidate) { return candidate.score > 0; })
        .sort(function (left, right) { return right.score - left.score || left.sourcePosition - right.sourcePosition; });
      const top = candidates[0];
      if (top) {
        const ties = candidates.filter(function (candidate) { return candidate.score === top.score; });
        const ambiguous = ties.length > 1;
        candidates.forEach(function (candidate) {
          candidate.ambiguity = ambiguous && candidate.score === top.score;
          candidate.automaticApplicationSafe = candidate === top && !candidate.ambiguity && candidate.confidence === 'high' && !used.has(candidate.sourcePosition);
        });
        if (top.automaticApplicationSafe) used.add(top.sourcePosition);
      }
      suggestions[definition.key] = candidates;
    });
    return suggestions;
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

  function canonicalDecimalText(value) {
    const expanded = expandExponential(String(value));
    const match = /^([+-]?)(?:(\d+)(?:\.(\d+))?|\.(\d+))$/.exec(expanded);
    if (!match) {
      return null;
    }

    const integerPart = (match[2] || '0').replace(/^0+(?=\d)/, '');
    const fractionPart = (match[3] || match[4] || '').replace(/0+$/, '');
    const isZero = integerPart === '0' && fractionPart === '';
    return (isZero || match[1] !== '-' ? '' : '-') + integerPart + (fractionPart ? '.' + fractionPart : '');
  }

  function parseExactNumber(value, maxDecimalPlaces) {
    const normalized = normalizeNumericText(value);
    if (normalized === null) {
      return null;
    }

    const decimalPlaces = (normalized.split('.')[1] || '').length;
    if (maxDecimalPlaces !== undefined && decimalPlaces > maxDecimalPlaces) {
      return { precisionExceeded: true };
    }

    const number = Number(normalized);
    if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) {
      return null;
    }

    const exactText = canonicalDecimalText(normalized);
    return exactText === canonicalDecimalText(number.toString()) ? { number: number, text: exactText } : null;
  }

  function normalizeNumber(value) {
    const parsed = parseExactNumber(value);
    return parsed ? parsed.number : null;
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

  function normalizeSourceFile(sourceFile) {
    const source = sourceFile || {};
    const name = source.name === undefined || source.name === null ? '' : String(source.name);
    const label = source.label === undefined || source.label === null ? name : String(source.label);
    return {
      id: source.id === undefined || source.id === null ? null : String(source.id),
      name: name || null,
      label: label || name || null,
      sourceType: source.sourceType === undefined || source.sourceType === null || source.sourceType === ''
        ? 'order-lines'
        : String(source.sourceType)
    };
  }

  function addSourceToIssues(issues, sourceFile) {
    return issues.map(function (issue) {
      return Object.assign({
        sourceFileId: sourceFile.id,
        sourceFileName: sourceFile.name,
        sourceFileLabel: sourceFile.label
      }, issue);
    });
  }

  function issueIsBlocking(issue) {
    return !issue || (issue.blocking !== false && issue.severity !== 'warning');
  }

  function advisoryIssue(details) {
    return Object.assign({ severity: 'warning', blocking: false }, details);
  }

  function sellingUnitQuantityRelation(salesUnitCount, quantityPerSalesUnit, quantity) {
    if (typeof salesUnitCount !== 'bigint' || typeof quantityPerSalesUnit !== 'bigint' || typeof quantity !== 'bigint') {
      return null;
    }
    const sellingUnitQuantity = salesUnitCount * quantityPerSalesUnit;
    const totalQuantity = quantity * QUANTITY_SCALE;
    if (sellingUnitQuantity === totalQuantity) {
      return 'exact';
    }
    return sellingUnitQuantity < totalQuantity ? 'partial' : 'exceeds';
  }

  function mappedOrderDate(values, mapping) {
    const sourceIndex = mapping && mapping.order_date;
    if (!Number.isInteger(sourceIndex) || !Array.isArray(values) || values[sourceIndex] === undefined) {
      return null;
    }
    return normalizeDate(String(values[sourceIndex]).trim());
  }

  function normalizeRecord(record, headers, mapping, locale, sourceFile) {
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
    const articleNameRaw = rawValue('article_name');
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
    const salesUnitCountRaw = rawValue('sales_unit_count');
    const quantityPerSalesUnitRaw = rawValue('quantity_per_sales_unit');
    const salesValueResult = parseExactNumber(salesValueRaw, SALES_DECIMAL_PLACES);
    const salesValue = salesValueResult && !salesValueResult.precisionExceeded ? salesValueResult.number : null;
    if (salesValueRaw && salesValueResult === null) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'sales_value',
        code: 'invalid_number',
        rawValue: salesValueRaw,
        message: message(locale, 'invalidNumber')
      });
    } else if (salesValueRaw && salesValueResult.precisionExceeded) {
      issues.push({
        sourceLine: record.sourceLine,
        field: 'sales_value',
        code: 'sales_precision_exceeded',
        rawValue: salesValueRaw,
        message: message(locale, 'salesPrecision', { digits: SALES_DECIMAL_PLACES })
      });
    }

    const salesUnitCountResult = parseQuantity(salesUnitCountRaw);
    let salesUnitCount = salesUnitCountRaw && !salesUnitCountResult.precisionExceeded
      ? salesUnitCountResult.value
      : null;
    if (salesUnitCountRaw && salesUnitCountResult.precisionExceeded) {
      issues.push(advisoryIssue({
        sourceLine: record.sourceLine,
        field: 'sales_unit_count',
        code: 'sales_unit_precision_exceeded',
        rawValue: salesUnitCountRaw,
        message: message(locale, 'salesUnitPrecision', { digits: QUANTITY_DECIMAL_PLACES })
      }));
    } else if (salesUnitCountRaw && (salesUnitCount === null || salesUnitCount < 0n)) {
      issues.push(advisoryIssue({
        sourceLine: record.sourceLine,
        field: 'sales_unit_count',
        code: 'sales_unit_must_be_non_negative',
        rawValue: salesUnitCountRaw,
        message: message(locale, 'nonNegativeSalesUnitCount')
      }));
      salesUnitCount = null;
    }

    const quantityPerSalesUnitResult = parseQuantity(quantityPerSalesUnitRaw);
    let quantityPerSalesUnit = quantityPerSalesUnitRaw && !quantityPerSalesUnitResult.precisionExceeded
      ? quantityPerSalesUnitResult.value
      : null;
    if (quantityPerSalesUnitRaw && quantityPerSalesUnitResult.precisionExceeded) {
      issues.push(advisoryIssue({
        sourceLine: record.sourceLine,
        field: 'quantity_per_sales_unit',
        code: 'quantity_per_sales_unit_precision_exceeded',
        rawValue: quantityPerSalesUnitRaw,
        message: message(locale, 'quantityPerSalesUnitPrecision', { digits: QUANTITY_DECIMAL_PLACES })
      }));
    } else if (quantityPerSalesUnitRaw && (quantityPerSalesUnit === null || quantityPerSalesUnit <= 0n)) {
      issues.push(advisoryIssue({
        sourceLine: record.sourceLine,
        field: 'quantity_per_sales_unit',
        code: 'quantity_per_sales_unit_must_be_positive',
        rawValue: quantityPerSalesUnitRaw,
        message: message(locale, 'positiveQuantityPerSalesUnit')
      }));
      quantityPerSalesUnit = null;
    }

    const salesUnitQuantityRelation = sellingUnitQuantityRelation(salesUnitCount, quantityPerSalesUnit, quantity);
    const salesUnitQuantityMatches = salesUnitQuantityRelation === null ? null : salesUnitQuantityRelation === 'exact';

    issues.forEach(function (issue) {
      issue.orderDate = orderDate;
    });

    return {
      record: {
        source_file_id: sourceFile.id,
        source_file_name: sourceFile.name,
        source_file_label: sourceFile.label,
        source_line: record.sourceLine,
        order_id: orderId,
        article_id: articleId,
        article_name: articleNameRaw || null,
        quantity: quantity,
        order_date: orderDate,
        customer_id: customerIdRaw || null,
        sales_value: salesValue,
        sales_value_exact: salesValueResult ? salesValueResult.text : null,
        location: locationRaw || null,
        sales_unit_count: salesUnitCount,
        quantity_per_sales_unit: quantityPerSalesUnit,
        sales_unit_quantity_matches: salesUnitQuantityMatches,
        sales_unit_quantity_relation: salesUnitQuantityRelation
      },
      issues: issues
    };
  }

  function parserErrorMessage(error, locale) {
    const key = PARSER_ERROR_MESSAGE_KEYS[error.code];
    return key ? message(locale, key) : error.message;
  }

  function importCsv(text, mapping, options) {
    return importCsvStreaming(text, mapping, options);
  }

  function importCsvStreaming(text, mapping, options) {
    return importCsvStreamingChunks([text], mapping, options);
  }

  function importCsvStreamingChunks(chunks, mapping, options) {
    const locale = normalizeLocale(options && options.locale);
    const sourceFile = normalizeSourceFile(options && options.sourceFile);
    let headers = null;
    let totalRows = 0;
    let selectedMapping = mapping || null;
    let columnCatalog = [];
    let columnProfileStates = [];
    let mappingIssues = null;
    let headerHasParserError = false;
    const issues = [];
    const rows = [];
    const invalidLines = new Set();
    const structuralLines = new Set();
    const dateByLine = new Map();

    const parsed = parseCsvChunks(chunks, Object.assign({}, options, {
      retainRows: false,
      onRow: function (dataRow, parserErrors) {
        if (headers === null) {
          headers = dataRow.values.map(function (header) { return String(header).trim(); });
          columnCatalog = buildColumnCatalog(headers, sourceFile);
          columnProfileStates = createColumnProfileStates(headers.length);
          headerHasParserError = parserErrors.length > 0;
          selectedMapping = selectedMapping || detectMapping(headers);
          mappingIssues = validateMapping(selectedMapping, locale);
          return;
        }

        totalRows += 1;
        observeColumnProfiles(columnProfileStates, dataRow.values);
        const rowHasParserError = parserErrors.length > 0;
        if (dataRow.values.length !== headers.length) {
          structuralLines.add(dataRow.sourceLine);
          invalidLines.add(dataRow.sourceLine);
          issues.push({
            sourceLine: dataRow.sourceLine,
            field: null,
            code: 'column_count_mismatch',
            orderDate: mappedOrderDate(dataRow.values, selectedMapping),
            message: message(locale, 'columnCount', { actual: dataRow.values.length, expected: headers.length })
          });
          return;
        }
        if (headerHasParserError || mappingIssues.length > 0) {
          return;
        }

        const normalized = normalizeRecord(dataRow, headers, selectedMapping, locale, sourceFile);
        if (normalized.record.order_date) {
          dateByLine.set(dataRow.sourceLine, normalized.record.order_date);
        }
        if (rowHasParserError) {
          invalidLines.add(dataRow.sourceLine);
        }
        const blockingIssues = normalized.issues.filter(issueIsBlocking);
        if (normalized.issues.length > 0) {
          normalized.issues.forEach(function (issue) { issues.push(issue); });
        }
        if (blockingIssues.length > 0) {
          invalidLines.add(dataRow.sourceLine);
        } else if (!rowHasParserError) {
          rows.push(normalized.record);
        }
      }
    }));
    const parserIssues = parsed.errors.map(function (error) {
      return {
        sourceLine: error.sourceLine,
        field: null,
        code: error.code,
        orderDate: dateByLine.get(error.sourceLine) || null,
        message: parserErrorMessage(error, locale)
      };
    });
    const finalHeaders = headers || parsed.headers || [];
    columnCatalog = finalizeColumnProfiles(columnCatalog, columnProfileStates);
    if (finalHeaders.length === 0) {
      return {
        headers: [],
        columnCatalog: [],
        rows: [],
        issues: addSourceToIssues(parserIssues.concat([{ sourceLine: null, field: null, code: 'header_missing', message: message(locale, 'headerMissing') }]), sourceFile),
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        structuralRows: 0,
        mapping: mapping || {},
        sourceFile: sourceFile,
        blocking: true
      };
    }
    if (headerHasParserError) {
      return {
        headers: finalHeaders,
        columnCatalog: columnCatalog,
        rows: [],
        issues: addSourceToIssues(parserIssues, sourceFile),
        totalRows: totalRows,
        validRows: 0,
        invalidRows: totalRows,
        structuralRows: 0,
        mapping: mapping || {},
        sourceFile: sourceFile,
        blocking: true
      };
    }
    if (mappingIssues && mappingIssues.length > 0) {
      return {
        headers: finalHeaders,
        columnCatalog: columnCatalog,
        rows: [],
        issues: addSourceToIssues(parserIssues.concat(mappingIssues), sourceFile),
        totalRows: totalRows,
        validRows: 0,
        invalidRows: 0,
        structuralRows: 0,
        mapping: selectedMapping,
        sourceFile: sourceFile,
        blocking: true
      };
    }
    return {
      headers: finalHeaders,
      columnCatalog: columnCatalog,
      rows: rows,
      issues: addSourceToIssues(parserIssues.concat(issues), sourceFile),
      totalRows: totalRows,
      validRows: rows.length,
      invalidRows: invalidLines.size,
      structuralRows: structuralLines.size,
      mapping: selectedMapping,
      sourceFile: sourceFile,
      blocking: false
    };
  }

  function importParsedCsv(parsed, mapping, options) {
    const locale = normalizeLocale(options && options.locale);
    const sourceFile = normalizeSourceFile(options && options.sourceFile);
    const dateByLine = new Map();
    const parserIssues = parsed.errors.map(function (error) {
      return {
        sourceLine: error.sourceLine,
        field: null,
        code: error.code,
        orderDate: null,
        message: parserErrorMessage(error, locale)
      };
    });

    if (parsed.rows.length === 0) {
      return {
        headers: [],
        columnCatalog: [],
        rows: [],
        issues: addSourceToIssues(parserIssues.concat([{ sourceLine: null, field: null, code: 'header_missing', message: message(locale, 'headerMissing') }]), sourceFile),
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        structuralRows: 0,
        mapping: mapping || {},
        sourceFile: sourceFile,
        blocking: true
      };
    }

    const headers = parsed.rows[0].values.map(function (header) { return String(header).trim(); });
    const columnCatalog = buildColumnCatalog(headers, sourceFile);
    const columnProfileStates = createColumnProfileStates(headers.length);
    const dataRows = parsed.rows.slice(1);
    const headerSourceLine = parsed.rows[0].sourceLine;
    const headerHasParserError = parsed.errors.some(function (error) {
      return error.sourceLine === headerSourceLine;
    });
    if (headerHasParserError) {
      return {
        headers: headers,
        columnCatalog: columnCatalog,
        rows: [],
        issues: addSourceToIssues(parserIssues, sourceFile),
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: dataRows.length,
        structuralRows: 0,
        mapping: mapping || {},
        sourceFile: sourceFile,
        blocking: true
      };
    }
    const selectedMapping = mapping || detectMapping(headers);
    const mappingIssues = validateMapping(selectedMapping, locale);
    if (mappingIssues.length > 0) {
      return {
        headers: headers,
        columnCatalog: columnCatalog,
        rows: [],
        issues: addSourceToIssues(parserIssues.concat(mappingIssues), sourceFile),
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: 0,
        structuralRows: 0,
        mapping: selectedMapping,
        sourceFile: sourceFile,
        blocking: true
      };
    }

    const parserErrorLines = new Set(parsed.errors.map(function (error) { return error.sourceLine; }));
    const issues = parserIssues.slice();
    const rows = [];
    const invalidLines = new Set();
    const structuralLines = new Set();

    dataRows.forEach(function (dataRow) {
      observeColumnProfiles(columnProfileStates, dataRow.values);
      if (dataRow.values.length !== headers.length) {
        structuralLines.add(dataRow.sourceLine);
        invalidLines.add(dataRow.sourceLine);
        issues.push({
          sourceLine: dataRow.sourceLine,
          field: null,
          code: 'column_count_mismatch',
          orderDate: mappedOrderDate(dataRow.values, selectedMapping),
          message: message(locale, 'columnCount', { actual: dataRow.values.length, expected: headers.length })
        });
        return;
      }

      const normalized = normalizeRecord(dataRow, headers, selectedMapping, locale, sourceFile);
      if (normalized.record.order_date) {
        dateByLine.set(dataRow.sourceLine, normalized.record.order_date);
      }
      const rowIssues = normalized.issues;
      if (parserErrorLines.has(dataRow.sourceLine)) {
        invalidLines.add(dataRow.sourceLine);
      }
      const blockingRowIssues = rowIssues.filter(issueIsBlocking);
      if (rowIssues.length > 0) {
        rowIssues.forEach(function (issue) { issues.push(issue); });
      }
      if (blockingRowIssues.length > 0) {
        invalidLines.add(dataRow.sourceLine);
      } else if (!parserErrorLines.has(dataRow.sourceLine)) {
        rows.push(normalized.record);
      }
    });

    parserIssues.forEach(function (issue) {
      issue.orderDate = dateByLine.get(issue.sourceLine) || null;
    });

    return {
      headers: headers,
      columnCatalog: finalizeColumnProfiles(columnCatalog, columnProfileStates),
      rows: rows,
      issues: addSourceToIssues(issues, sourceFile),
      totalRows: dataRows.length,
      validRows: rows.length,
      invalidRows: invalidLines.size,
      structuralRows: structuralLines.size,
      mapping: selectedMapping,
      sourceFile: sourceFile,
      blocking: false
    };
  }

  function reconstructRawSource(text, sourceLine, options) {
    const targetLine = Number(sourceLine);
    if (!Number.isInteger(targetLine) || targetLine < 1) {
      return null;
    }

    let headers = null;
    let values = null;
    parseCsv(text, Object.assign({}, options, {
      retainRows: false,
      onRow: function (row) {
        if (headers === null) {
          headers = row.values.map(function (value) { return String(value).trim(); });
          return;
        }
        if (row.sourceLine === targetLine) {
          values = row.values.slice();
          return false;
        }
      }
    }));
    if (!headers || !values) {
      return null;
    }
    return {
      sourceLine: targetLine,
      raw_values: values,
      raw_fields: headers.map(function (header, index) {
        return {
          position: index + 1,
          header: header,
          value: values[index] === undefined ? '' : values[index]
        };
      })
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

  function normalizeDecimal(value) {
    let coefficient = value.coefficient;
    let scale = value.scale;
    if (coefficient === 0n) {
      return { coefficient: 0n, scale: 0 };
    }
    while (scale > 0 && coefficient % 10n === 0n) {
      coefficient /= 10n;
      scale -= 1;
    }
    return { coefficient: coefficient, scale: scale };
  }

  function decimalFromText(value) {
    const text = canonicalDecimalText(value);
    if (text === null) {
      return null;
    }

    const negative = text[0] === '-';
    const unsigned = negative ? text.slice(1) : text;
    const parts = unsigned.split('.');
    const fractionPart = parts[1] || '';
    const digits = parts[0] + fractionPart;
    return normalizeDecimal({
      coefficient: BigInt(digits) * (negative ? -1n : 1n),
      scale: fractionPart.length
    });
  }

  function decimalFromValue(value) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      return decimalFromText(value);
    }
    return null;
  }

  function decimalZero() {
    return { coefficient: 0n, scale: 0 };
  }

  function addDecimals(left, right) {
    const scale = Math.max(left.scale, right.scale);
    const factorForLeft = 10n ** BigInt(scale - left.scale);
    const factorForRight = 10n ** BigInt(scale - right.scale);
    return normalizeDecimal({
      coefficient: left.coefficient * factorForLeft + right.coefficient * factorForRight,
      scale: scale
    });
  }

  function compareDecimals(left, right) {
    const scale = Math.max(left.scale, right.scale);
    const leftCoefficient = left.coefficient * (10n ** BigInt(scale - left.scale));
    const rightCoefficient = right.coefficient * (10n ** BigInt(scale - right.scale));
    return leftCoefficient > rightCoefficient ? 1 : leftCoefficient < rightCoefficient ? -1 : 0;
  }

  function roundDecimal(value, decimalPlaces) {
    const decimal = normalizeDecimal(value);
    if (decimal.scale <= decimalPlaces) {
      return normalizeDecimal({
        coefficient: decimal.coefficient * (10n ** BigInt(decimalPlaces - decimal.scale)),
        scale: decimalPlaces
      });
    }

    const divisor = 10n ** BigInt(decimal.scale - decimalPlaces);
    const absoluteCoefficient = decimal.coefficient < 0n ? -decimal.coefficient : decimal.coefficient;
    let quotient = absoluteCoefficient / divisor;
    if ((absoluteCoefficient % divisor) * 2n >= divisor) {
      quotient += 1n;
    }
    return normalizeDecimal({
      coefficient: decimal.coefficient < 0n ? -quotient : quotient,
      scale: decimalPlaces
    });
  }

  function decimalToText(value) {
    const decimal = normalizeDecimal(value);
    const negative = decimal.coefficient < 0n;
    const digits = (negative ? -decimal.coefficient : decimal.coefficient).toString();
    if (decimal.scale === 0) {
      return (negative ? '-' : '') + digits;
    }

    const padded = digits.padStart(decimal.scale + 1, '0');
    const splitIndex = padded.length - decimal.scale;
    const fractionPart = padded.slice(splitIndex).replace(/0+$/, '');
    return (negative ? '-' : '') + padded.slice(0, splitIndex) + (fractionPart ? '.' + fractionPart : '');
  }

  function decimalToPublicValue(value) {
    const text = decimalToText(value);
    const number = Number(text);
    return Number.isFinite(number) && Math.abs(number) <= Number.MAX_SAFE_INTEGER &&
      canonicalDecimalText(number.toString()) === text ? number : text;
  }

  function formatSalesValue(value, locale) {
    const decimal = decimalFromValue(value);
    if (decimal === null) {
      return '';
    }

    const text = decimalToText(roundDecimal(decimal, 2));
    const normalizedLocale = normalizeLocale(locale);
    const negative = text[0] === '-';
    const unsigned = negative ? text.slice(1) : text;
    const parts = unsigned.split('.');
    const integerPart = new Intl.NumberFormat(normalizedLocale === 'de' ? 'de-DE' : 'en-US').format(BigInt(parts[0]));
    const decimalSeparator = normalizedLocale === 'de' ? ',' : '.';
    return (negative ? '-' : '') + integerPart + (parts[1] ? decimalSeparator + parts[1] : '');
  }

  function compareScaledQuantitiesDescending(left, right) {
    return left > right ? -1 : left < right ? 1 : 0;
  }

  function compareSalesValuesDescending(left, right) {
    const leftDecimal = decimalFromValue(left);
    const rightDecimal = decimalFromValue(right);
    if (leftDecimal === null || rightDecimal === null) {
      return 0;
    }

    const comparison = compareDecimals(roundDecimal(leftDecimal, 2), roundDecimal(rightDecimal, 2));
    return comparison === 0 ? 0 : -comparison;
  }

  function normalizeSearchQuery(query, locale) {
    const languageTag = normalizeLocale(locale) === 'de' ? 'de-DE' : 'en-US';
    return String(query === undefined || query === null ? '' : query)
      .trim()
      .toLocaleLowerCase(languageTag);
  }

  function buildArticleSearchText(article, locale) {
    const languageTag = normalizeLocale(locale) === 'de' ? 'de-DE' : 'en-US';
    const descriptionVariants = article && Array.isArray(article.article_name_variants)
      ? article.article_name_variants
      : [];
    return [article && article.article_id, article && article.article_name]
      .concat(descriptionVariants)
      .map(function (value) {
        return String(value === undefined || value === null ? '' : value)
          .toLocaleLowerCase(languageTag);
      })
      .join('\u0000');
  }

  function prepareArticleSearchProjection(article, locale) {
    if (!article || typeof article !== 'object') {
      return article;
    }
    const normalizedLocale = normalizeLocale(locale);
    article.search_text = buildArticleSearchText(article, normalizedLocale);
    article.search_text_locale = normalizedLocale;
    return article;
  }

  function prepareArticleSearchProjections(articles, locale) {
    (articles || []).forEach(function (article) {
      prepareArticleSearchProjection(article, locale);
    });
    return articles;
  }

  function articleMatchesNormalizedQuery(article, normalizedQuery, locale) {
    if (!normalizedQuery) {
      return true;
    }
    const normalizedLocale = normalizeLocale(locale);
    if (!article || typeof article !== 'object' || article.search_text_locale !== normalizedLocale) {
      prepareArticleSearchProjection(article, normalizedLocale);
    }
    return Boolean(article && String(article.search_text || '').indexOf(normalizedQuery) >= 0);
  }

  function articleMatchesQuery(article, query, locale) {
    return articleMatchesNormalizedQuery(article, normalizeSearchQuery(query, locale), locale);
  }

  function assignSourceFileLabels(files) {
    const counts = new Map();
    const occurrences = new Map();
    const originalNames = new Set();
    const usedLabels = new Set();
    (files || []).forEach(function (file) {
      const name = String(file && file.name !== undefined && file.name !== null ? file.name : '');
      counts.set(name, (counts.get(name) || 0) + 1);
      originalNames.add(name);
    });

    return (files || []).map(function (file) {
      const copy = Object.assign({}, file);
      const name = String(copy.name === undefined || copy.name === null ? '' : copy.name);
      const occurrence = (occurrences.get(name) || 0) + 1;
      occurrences.set(name, occurrence);
      if (counts.get(name) === 1) {
        copy.label = name;
        usedLabels.add(copy.label);
        return copy;
      }

      const preferredLabel = name + ' (' + occurrence + '/' + counts.get(name) + ')';
      let label = preferredLabel;
      let suffix = 1;
      while (originalNames.has(label) || usedLabels.has(label)) {
        label = preferredLabel + ' [source ' + suffix + ']';
        suffix += 1;
      }
      copy.label = label;
      usedLabels.add(copy.label);
      return copy;
    });
  }

  function dateRangeForRows(rows) {
    let start = null;
    let end = null;
    (rows || []).forEach(function (row) {
      if (!row.order_date) {
        return;
      }
      if (start === null || row.order_date < start) {
        start = row.order_date;
      }
      if (end === null || row.order_date > end) {
        end = row.order_date;
      }
    });
    return { start: start, end: end };
  }

  function detectBatchWarnings(files) {
    const warnings = [];
    const entries = files || [];

    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const left = entries[leftIndex];
        const right = entries[rightIndex];
        const leftLabel = left.label || left.name || '';
        const rightLabel = right.label || right.name || '';
        const sameContent = (typeof left.content === 'string' && typeof right.content === 'string' &&
          left.content === right.content) ||
          (typeof left.contentFingerprint === 'string' && typeof right.contentFingerprint === 'string' &&
            left.contentFingerprint === right.contentFingerprint);

        if (sameContent) {
          warnings.push({
            code: 'identical_file_content',
            sourceFileIds: [left.id, right.id],
            sourceFileLabels: [leftLabel, rightLabel]
          });
        } else if (left.name && left.name === right.name &&
          Number.isFinite(left.size) && left.size === right.size &&
          Number.isFinite(left.lastModified) && left.lastModified === right.lastModified) {
          warnings.push({
            code: 'matching_file_metadata',
            sourceFileIds: [left.id, right.id],
            sourceFileLabels: [leftLabel, rightLabel]
          });
        }

        const leftResult = left.result;
        const rightResult = right.result;
        if (!leftResult || leftResult.blocking || !rightResult || rightResult.blocking) {
          continue;
        }
        const leftRange = dateRangeForRows(leftResult.rows);
        const rightRange = dateRangeForRows(rightResult.rows);
        if (leftRange.start !== null && rightRange.start !== null) {
          const overlapStart = leftRange.start > rightRange.start ? leftRange.start : rightRange.start;
          const overlapEnd = leftRange.end < rightRange.end ? leftRange.end : rightRange.end;
          if (overlapStart <= overlapEnd) {
            warnings.push({
              code: 'overlapping_date_ranges',
              sourceFileIds: [left.id, right.id],
              sourceFileLabels: [leftLabel, rightLabel],
              overlapStart: overlapStart,
              overlapEnd: overlapEnd
            });
          }
        }
      }
    }

    return warnings;
  }

  function combineImportResults(files, options) {
    const analysisAccumulator = options && options.analysisAccumulator;
    const rows = [];
    const issues = [];
    let totalRows = 0;
    let invalidRows = 0;
    let structuralRows = 0;
    let includedFiles = 0;
    const usedSourceIds = new Set();
    const normalizedFiles = [];

    const fileSummaries = (files || []).map(function (file, index) {
      let sourceId = file.id === undefined || file.id === null ? 'source-' + (index + 1) : String(file.id);
      if (usedSourceIds.has(sourceId)) {
        sourceId = 'source-' + (index + 1);
        while (usedSourceIds.has(sourceId)) {
          sourceId += '-duplicate';
        }
      }
      usedSourceIds.add(sourceId);
      const source = normalizeSourceFile({
        id: sourceId,
        name: file.name,
        label: file.label,
        sourceType: file.sourceType
      });
      const result = file.result || null;
      const columnCatalog = Array.isArray(file.columnCatalog)
        ? file.columnCatalog
        : (result && Array.isArray(result.columnCatalog) ? result.columnCatalog : []);
      const normalizedCatalog = columnCatalog.map(function (entry) {
        return Object.assign({}, entry, {
          sourceFileId: source.id,
          sourceFileName: source.name,
          sourceFileLabel: source.label
        });
      });
      const included = Boolean(result && !result.blocking);
      const resultRows = included && Array.isArray(result.rows)
        ? result.rows
        : [];
      const rowsNeedSourceDecoration = resultRows.some(function (row) {
        return row.source_file_id !== source.id ||
          row.source_file_name !== source.name ||
          row.source_file_label !== source.label;
      });
      const normalizedRows = rowsNeedSourceDecoration
        ? resultRows.map(function (row) {
          return Object.assign({}, row, {
            source_file_id: source.id,
            source_file_name: source.name,
            source_file_label: source.label
          });
        })
        : resultRows;
      const resultIssues = result && Array.isArray(result.issues)
        ? result.issues
        : [];
      const issuesNeedSourceDecoration = resultIssues.some(function (issue) {
        return issue.sourceFileId !== source.id ||
          issue.sourceFileName !== source.name ||
          issue.sourceFileLabel !== source.label;
      });
      const normalizedIssues = issuesNeedSourceDecoration
        ? resultIssues.map(function (issue) {
          return Object.assign({}, issue, {
            sourceFileId: source.id,
            sourceFileName: source.name,
            sourceFileLabel: source.label
          });
        })
        : resultIssues;
      normalizedFiles.push(Object.assign({}, file, {
        id: source.id,
        name: source.name,
        label: source.label,
        sourceType: source.sourceType,
        columnCatalog: normalizedCatalog,
        result: result ? Object.assign({}, result, {
          rows: normalizedRows,
          issues: normalizedIssues,
          sourceFile: source
        }) : null
      }));

      totalRows += result ? result.totalRows : 0;
      invalidRows += result ? result.invalidRows : 0;
      structuralRows += result ? result.structuralRows : 0;
      if (included) {
        includedFiles += 1;
        normalizedRows.forEach(function (row) {
          const detailIndex = rows.length;
          rows.push(row);
          if (analysisAccumulator && typeof analysisAccumulator.consume === 'function') {
            analysisAccumulator.consume(row, detailIndex);
          }
        });
      }
      normalizedIssues.forEach(function (issue) { issues.push(issue); });

      const range = dateRangeForRows(normalizedRows);
      return {
        id: source.id,
        name: source.name,
        label: source.label,
        sourceType: source.sourceType,
        columnCatalog: normalizedCatalog,
        included: included,
        blocking: !included,
        errorCode: file.errorCode || file.errorKey || null,
        totalRows: result ? result.totalRows : 0,
        validRows: result ? result.validRows : 0,
        invalidRows: result ? result.invalidRows : 0,
        structuralRows: result ? result.structuralRows : 0,
        dateStart: range.start,
        dateEnd: range.end
      };
    });

    return {
      rows: rows,
      issues: issues,
      totalRows: totalRows,
      validRows: rows.length,
      invalidRows: invalidRows,
      structuralRows: structuralRows,
      selectedFiles: fileSummaries.length,
      includedFiles: includedFiles,
      excludedFiles: fileSummaries.length - includedFiles,
      files: fileSummaries,
      warnings: detectBatchWarnings(normalizedFiles)
    };
  }

  function createAnalysisAccumulator(options) {
    const defaultLocale = normalizeLocale(options && options.locale);
    const articleMap = new Map();
    const orderIds = new Set();
    const customerIds = new Set();
    const activeDays = new Set();
    const sourceFiles = new Map();
    let totalQuantity = 0n;
    let totalSales = decimalZero();
    let salesValueRows = 0;
    let totalSalesUnits = 0n;
    let salesUnitRows = 0;
    let sellingUnitPartialRows = 0;
    let sellingUnitOverageRows = 0;
    let totalLines = 0;
    let nextDetailIndex = 0;

    function consume(row, detailIndex) {
      if (typeof row.quantity !== 'bigint') {
        throw new TypeError('Normalized rows must store quantity as a scaled integer.');
      }
      const resolvedDetailIndex = Number.isInteger(detailIndex) && detailIndex >= 0
        ? detailIndex
        : nextDetailIndex;
      nextDetailIndex += 1;
      totalLines += 1;
      orderIds.add(row.order_id);
      if (row.customer_id) {
        customerIds.add(row.customer_id);
      }
      activeDays.add(row.order_date);
      const sourceFileId = row.source_file_id === undefined || row.source_file_id === null
        ? ''
        : String(row.source_file_id);
      const sourceFileLabel = row.source_file_label || row.source_file_name || sourceFileId;
      const sourceFileKey = sourceFileId ? 'id:' + sourceFileId : (sourceFileLabel ? 'label:' + sourceFileLabel : '');
      if (sourceFileKey) {
        sourceFiles.set(sourceFileKey, sourceFileLabel);
      }
      totalQuantity += row.quantity;
      const rowSales = row.sales_value_exact !== null && row.sales_value_exact !== undefined
        ? decimalFromText(row.sales_value_exact)
        : decimalFromValue(row.sales_value);
      if (rowSales !== null) {
        totalSales = addDecimals(totalSales, rowSales);
        salesValueRows += 1;
      }
      if (typeof row.sales_unit_count === 'bigint') {
        totalSalesUnits += row.sales_unit_count;
        salesUnitRows += 1;
      }
      const unitRelation = sellingUnitQuantityRelation(row.sales_unit_count, row.quantity_per_sales_unit, row.quantity);
      if (unitRelation === 'partial') {
        sellingUnitPartialRows += 1;
      } else if (unitRelation === 'exceeds') {
        sellingUnitOverageRows += 1;
      }

      if (!articleMap.has(row.article_id)) {
        articleMap.set(row.article_id, {
          article_id: row.article_id,
          article_name: null,
          article_name_variants: new Set(),
          order_line_count: 0,
          total_quantity: 0n,
          order_ids: new Set(),
          customer_ids: new Set(),
          active_days: new Set(),
          total_sales: decimalZero(),
          sales_value_rows: 0,
          total_sales_units: 0n,
          sales_unit_rows: 0,
          quantity_per_sales_unit_values: new Set(),
          selling_unit_partial_rows: 0,
          selling_unit_overage_rows: 0,
          locations: new Set(),
          source_files: new Map(),
          order_line_refs: []
        });
      }

      const article = articleMap.get(row.article_id);
      if (row.article_name) {
        if (article.article_name === null) {
          article.article_name = row.article_name;
        }
        article.article_name_variants.add(row.article_name);
      }
      article.order_line_count += 1;
      article.total_quantity += row.quantity;
      article.order_ids.add(row.order_id);
      if (row.customer_id) {
        article.customer_ids.add(row.customer_id);
      }
      article.active_days.add(row.order_date);
      if (rowSales !== null) {
        article.total_sales = addDecimals(article.total_sales, rowSales);
        article.sales_value_rows += 1;
      }
      if (typeof row.sales_unit_count === 'bigint') {
        article.total_sales_units += row.sales_unit_count;
        article.sales_unit_rows += 1;
      }
      if (typeof row.quantity_per_sales_unit === 'bigint') {
        article.quantity_per_sales_unit_values.add(row.quantity_per_sales_unit);
      }
      if (unitRelation === 'partial') {
        article.selling_unit_partial_rows += 1;
      } else if (unitRelation === 'exceeds') {
        article.selling_unit_overage_rows += 1;
      }
      if (row.location) {
        article.locations.add(row.location);
      }
      if (sourceFileKey) {
        article.source_files.set(sourceFileKey, sourceFileLabel);
      }
      article.order_line_refs.push(resolvedDetailIndex);
    }

    function finish(options) {
      const locale = normalizeLocale(options && options.locale || defaultLocale);
      const articles = Array.from(articleMap.values())
        .sort(function (left, right) {
          return right.order_line_count - left.order_line_count ||
            compareScaledQuantitiesDescending(left.total_quantity, right.total_quantity) ||
            left.article_id.localeCompare(right.article_id);
        })
        .map(function (article) {
          const output = {
            article_id: article.article_id,
            article_name: article.article_name,
            article_name_variants: Array.from(article.article_name_variants),
            article_name_conflict: article.article_name_variants.size > 1,
            order_line_count: article.order_line_count,
            total_quantity: article.total_quantity,
            distinct_orders: article.order_ids.size,
            distinct_customers: article.customer_ids.size,
            active_days: article.active_days.size,
            total_sales: decimalToPublicValue(article.total_sales),
            total_sales_exact: decimalToText(article.total_sales),
            sales_value_rows: article.sales_value_rows,
            total_sales_units: article.total_sales_units,
            sales_unit_rows: article.sales_unit_rows,
            quantity_per_sales_unit_values: Array.from(article.quantity_per_sales_unit_values).sort(compareScaledQuantitiesDescending),
            selling_unit_conflict: article.quantity_per_sales_unit_values.size > 1,
            selling_unit_partial_rows: article.selling_unit_partial_rows,
            selling_unit_overage_rows: article.selling_unit_overage_rows,
            locations: Array.from(article.locations).sort(),
            source_file_count: article.source_files.size,
            source_files: Array.from(article.source_files.values()),
            order_line_refs: article.order_line_refs,
            share_of_order_lines: totalLines === 0 ? 0 : article.order_line_count / totalLines
          };
          prepareArticleSearchProjection(output, locale);
          return output;
        });

      let cumulativeLineCount = 0;
      articles.forEach(function (article) {
        cumulativeLineCount += article.order_line_count;
        article.cumulative_share_of_order_lines = totalLines === 0 ? 0 : cumulativeLineCount / totalLines;
      });

      return {
        articles: articles,
        total_lines: totalLines,
        total_quantity: totalQuantity,
        distinct_orders: orderIds.size,
        distinct_customers: customerIds.size,
        active_days: activeDays.size,
        source_file_count: sourceFiles.size,
        source_files: Array.from(sourceFiles.values()),
        total_sales: decimalToPublicValue(totalSales),
        total_sales_exact: decimalToText(totalSales),
        sales_value_rows: salesValueRows,
        total_sales_units: totalSalesUnits,
        sales_unit_rows: salesUnitRows,
        selling_unit_partial_rows: sellingUnitPartialRows,
        selling_unit_overage_rows: sellingUnitOverageRows,
        average_quantity_per_line: divideScaledQuantity(totalQuantity, totalLines),
        average_quantity_per_order: divideScaledQuantity(totalQuantity, orderIds.size)
      };
    }

    return { consume: consume, finish: finish };
  }

  function analyzeRows(rows, options) {
    const analysis = createAnalysisAccumulator(options);
    const detailIndexes = options && Array.isArray(options.detailIndexes) ? options.detailIndexes : null;
    (rows || []).forEach(function (row, index) {
      const detailIndex = detailIndexes && Number.isInteger(detailIndexes[index])
        ? detailIndexes[index]
        : index;
      analysis.consume(row, detailIndex);
    });
    return analysis.finish(options);
  }

  analyzeRows.createAnalysisAccumulator = createAnalysisAccumulator;

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

  function serializeSalesValue(value, exactValue) {
    const decimal = decimalFromValue(exactValue === undefined || exactValue === null ? value : exactValue);
    if (decimal === null) {
      return '';
    }
    return decimalToText(roundDecimal(decimal, 2));
  }

  function serializeLocations(locations) {
    if (!Array.isArray(locations) || locations.length === 0) {
      return '';
    }

    return JSON.stringify(locations);
  }

  function serializeArticleNameVariants(variants) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return '';
    }

    return JSON.stringify(variants);
  }

  function serializeSourceFiles(sourceFiles) {
    if (!Array.isArray(sourceFiles) || sourceFiles.length === 0) {
      return '';
    }

    return JSON.stringify(sourceFiles.map(protectSpreadsheetText));
  }

  function exportAnalysisCsv(articles, options) {
    const delimiter = options && options.delimiter ? options.delimiter : ';';
    const headers = [
      'article_id',
      'article_name',
      'article_name_conflict',
      'article_name_variants',
      'source_file_count',
      'source_files',
      'order_line_count',
      'total_quantity',
      'distinct_orders',
      'distinct_customers',
      'active_days',
      'total_sales',
      'sales_value_rows',
      'total_sales_units',
      'sales_unit_rows',
      'quantity_per_sales_unit_values',
      'selling_unit_conflict',
      'selling_unit_partial_rows',
      'selling_unit_overage_rows',
      'share_of_order_lines',
      'cumulative_share_of_order_lines',
      'locations'
    ];
    const lines = [headers.join(delimiter)];

    articles.forEach(function (article) {
      const sourceFileCount = Number.isInteger(article.source_file_count)
        ? article.source_file_count
        : (Array.isArray(article.source_files) ? article.source_files.length : 0);
      lines.push([
        protectSpreadsheetText(article.article_id),
        protectSpreadsheetText(article.article_name),
        article.article_name_conflict ? 'true' : 'false',
        protectSpreadsheetText(serializeArticleNameVariants(article.article_name_variants)),
        sourceFileCount,
        protectSpreadsheetText(serializeSourceFiles(article.source_files)),
        article.order_line_count,
        serializeQuantity(article.total_quantity),
        article.distinct_orders,
        article.distinct_customers,
        article.active_days,
        serializeSalesValue(article.total_sales, article.total_sales_exact),
        article.sales_value_rows,
        serializeQuantity(article.total_sales_units),
        article.sales_unit_rows,
        JSON.stringify((article.quantity_per_sales_unit_values || []).map(serializeQuantity)),
        article.selling_unit_conflict ? 'true' : 'false',
        article.selling_unit_partial_rows || 0,
        article.selling_unit_overage_rows || 0,
        serializeShare(article.share_of_order_lines),
        serializeShare(article.cumulative_share_of_order_lines),
        serializeLocations(article.locations)
      ].map(function (value) { return escapeCsvValue(value, delimiter); }).join(delimiter));
    });

    return lines.join('\r\n') + '\r\n';
  }

  return {
    APP_VERSION: APP_VERSION,
    FIELD_DEFINITIONS: FIELD_DEFINITIONS,
    QUANTITY_DECIMAL_PLACES: QUANTITY_DECIMAL_PLACES,
    QUANTITY_SCALE: QUANTITY_SCALE,
    SALES_DECIMAL_PLACES: SALES_DECIMAL_PLACES,
    assignSourceFileLabels: assignSourceFileLabels,
    buildColumnCatalog: buildColumnCatalog,
    buildMappingSuggestions: buildMappingSuggestions,
    detectMapping: detectMapping,
    combineImportResults: combineImportResults,
    detectBatchWarnings: detectBatchWarnings,
    analyzeRows: analyzeRows,
    articleMatchesQuery: articleMatchesQuery,
    articleMatchesNormalizedQuery: articleMatchesNormalizedQuery,
    buildArticleSearchText: buildArticleSearchText,
    compareSalesValuesDescending: compareSalesValuesDescending,
    createAnalysisAccumulator: createAnalysisAccumulator,
    compareScaledQuantitiesDescending: compareScaledQuantitiesDescending,
    exportAnalysisCsv: exportAnalysisCsv,
    formatSalesValue: formatSalesValue,
    formatScaledQuantity: formatScaledQuantity,
    getFieldLabel: getFieldLabel,
    normalizeSearchQuery: normalizeSearchQuery,
    prepareArticleSearchProjection: prepareArticleSearchProjection,
    prepareArticleSearchProjections: prepareArticleSearchProjections,
    importCsv: importCsv,
    importCsvStreaming: importCsvStreaming,
    importCsvStreamingChunks: importCsvStreamingChunks,
    importParsedCsv: importParsedCsv,
    issueIsBlocking: issueIsBlocking,
    normalizeDate: normalizeDate,
    normalizeHeader: normalizeHeader,
    normalizeNumber: normalizeNumber,
    parseCsv: parseCsv,
    parseCsvChunks: parseCsvChunks,
    reconstructRawSource: reconstructRawSource,
    validateMapping: validateMapping
  };
}));
