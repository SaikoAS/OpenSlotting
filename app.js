(function () {
  'use strict';

  const core = window.OpenSlottingCsv;
  const TRANSLATIONS = {
    en: {
      page_title: 'OpenSlotting – CSV Analysis',
      eyebrow: 'OpenSlotting · V0.1',
      hero_title: 'Understand order lines',
      hero_subtitle: 'Inspect CSV data locally, aggregate article movement, and build the foundation for slotting.',
      language_label: 'Language',
      language_english: 'English',
      language_german: 'German',
      local_badge: 'local · file:///',
      step_1: 'Step 1',
      select_file_title: 'Select a CSV file',
      local_hint: 'No data leaves your browser.',
      open_csv: 'Open CSV file',
      file_format_hint: 'UTF-8 or UTF-16 with semicolon delimiter',
      no_file_selected: 'No file selected yet.',
      step_2: 'Step 2',
      mapping_title: 'Map source columns',
      mapping_hint: 'Review and adjust the detected mappings.',
      analyze_button: 'Validate and analyze data',
      step_3: 'Step 3',
      analysis_title: 'Analysis',
      export_button: 'Export analysis',
      article_overview: 'Article overview',
      search_label: 'Search',
      search_placeholder: 'Article ID',
      sort_label: 'Sort by',
      sort_lines: 'Order lines',
      sort_quantity: 'Total quantity',
      sort_sales: 'Sales value',
      sort_article: 'Article ID',
      column_article: 'Article',
      column_lines: 'Lines',
      column_quantity: 'Quantity',
      column_orders: 'Orders',
      column_customers: 'Customers',
      column_days: 'Days',
      column_share: 'Line share',
      issues_title: 'Validation notes',
      issues_note: 'Invalid rows are not aggregated and remain traceable by source line.',
      issue_source_line: 'Source line',
      issue_field: 'Field',
      issue_code: 'Code',
      issue_message: 'Message',
      footer_local: 'OpenSlotting processes the selected file locally only.',
      reset_button: 'Reset',
      not_mapped: '— not mapped —',
      empty_header: '(empty)',
      required_marker: 'required',
      metric_lines: 'Order lines',
      metric_lines_detail: 'valid rows',
      metric_quantity: 'Total quantity',
      metric_quantity_detail: 'sum of all quantities',
      metric_orders: 'Orders',
      metric_orders_detail: 'unique order IDs',
      metric_customers: 'Customers',
      metric_customers_detail: 'with customer ID',
      metric_days: 'Active days',
      metric_days_detail: 'with valid date',
      metric_average_line: 'Avg. quantity / line',
      metric_average_line_detail: 'quantity divided by lines',
      metric_average_order: 'Avg. quantity / order',
      metric_average_order_detail: 'quantity divided by orders',
      metric_sales: 'Sales value',
      metric_sales_detail: '{{count}} rows with sales value',
      article_count: '{{count}} articles shown',
      no_matches: 'No matching articles found.',
      file_detected: '{{file}} · {{count}} data rows detected.',
      reading_file: 'Reading {{file}}…',
      structure_hint: 'The file also contains CSV structure notes, which will appear after mapping.',
      error_prefix: 'Error: ',
      summary_valid: '{{file}}: {{valid}} of {{total}} data rows are valid.',
      summary_held_back: '{{count}} rows were held back',
      summary_structural: ' ({{count}} structural column errors)',
      structure_field: 'Structure',
      file_read_error: 'The file could not be read.',
      invalid_encoding: 'The file encoding is not supported. Use UTF-8 or UTF-16.'
    },
    de: {
      page_title: 'OpenSlotting – CSV-Analyse',
      eyebrow: 'OpenSlotting · V0.1',
      hero_title: 'Auftragszeilen verstehen',
      hero_subtitle: 'CSV lokal prüfen, Artikelbewegungen aggregieren und die Grundlage für Slotting schaffen.',
      language_label: 'Sprache',
      language_english: 'Englisch',
      language_german: 'Deutsch',
      local_badge: 'lokal · file:///',
      step_1: 'Schritt 1',
      select_file_title: 'CSV-Datei auswählen',
      local_hint: 'Keine Daten verlassen den Browser.',
      open_csv: 'CSV-Datei öffnen',
      file_format_hint: 'UTF-8 oder UTF-16 mit Semikolon-Trenner',
      no_file_selected: 'Noch keine Datei ausgewählt.',
      step_2: 'Schritt 2',
      mapping_title: 'Quellspalten zuordnen',
      mapping_hint: 'Erkannte Zuordnungen können angepasst werden.',
      analyze_button: 'Daten prüfen und analysieren',
      step_3: 'Schritt 3',
      analysis_title: 'Analyse',
      export_button: 'Analyse exportieren',
      article_overview: 'Artikelübersicht',
      search_label: 'Suche',
      search_placeholder: 'Artikel-ID',
      sort_label: 'Sortierung',
      sort_lines: 'Auftragszeilen',
      sort_quantity: 'Gesamtmenge',
      sort_sales: 'Umsatz',
      sort_article: 'Artikel-ID',
      column_article: 'Artikel',
      column_lines: 'Zeilen',
      column_quantity: 'Menge',
      column_orders: 'Aufträge',
      column_customers: 'Kunden',
      column_days: 'Tage',
      column_share: 'Anteil Zeilen',
      issues_title: 'Prüfhinweise',
      issues_note: 'Fehlerhafte Zeilen werden nicht aggregiert und bleiben über die Quellzeile nachvollziehbar.',
      issue_source_line: 'Quellzeile',
      issue_field: 'Feld',
      issue_code: 'Code',
      issue_message: 'Hinweis',
      footer_local: 'OpenSlotting verarbeitet die ausgewählte Datei ausschließlich lokal.',
      reset_button: 'Zurücksetzen',
      not_mapped: '— nicht zugeordnet —',
      empty_header: '(leer)',
      required_marker: 'erforderlich',
      metric_lines: 'Auftragszeilen',
      metric_lines_detail: 'gültige Zeilen',
      metric_quantity: 'Gesamtmenge',
      metric_quantity_detail: 'Summe aller Mengen',
      metric_orders: 'Aufträge',
      metric_orders_detail: 'eindeutige Auftrags-IDs',
      metric_customers: 'Kunden',
      metric_customers_detail: 'mit Kunden-ID',
      metric_days: 'Aktive Tage',
      metric_days_detail: 'mit gültigem Datum',
      metric_average_line: 'Ø Menge / Zeile',
      metric_average_line_detail: 'Menge geteilt durch Zeilen',
      metric_average_order: 'Ø Menge / Auftrag',
      metric_average_order_detail: 'Menge geteilt durch Aufträge',
      metric_sales: 'Umsatz',
      metric_sales_detail: '{{count}} Zeilen mit Umsatz',
      article_count: '{{count}} Artikel angezeigt',
      no_matches: 'Keine passenden Artikel gefunden.',
      file_detected: '{{file}} · {{count}} Datenzeilen erkannt.',
      reading_file: '{{file}} wird gelesen …',
      structure_hint: 'Die Datei enthält zusätzlich CSV-Strukturhinweise, die nach der Zuordnung angezeigt werden.',
      error_prefix: 'Fehler: ',
      summary_valid: '{{file}}: {{valid}} von {{total}} Datenzeilen sind gültig.',
      summary_held_back: '{{count}} Zeilen wurden zurückgestellt',
      summary_structural: ' ({{count}} strukturelle Spaltenfehler)',
      structure_field: 'Struktur',
      file_read_error: 'Die Datei konnte nicht gelesen werden.',
      invalid_encoding: 'Die Dateikodierung wird nicht unterstützt. Bitte UTF-8 oder UTF-16 verwenden.'
    }
  };

  const state = {
    language: 'en',
    fileName: '',
    text: '',
    headers: [],
    mapping: {},
    confirmedMapping: null,
    dataRowCount: 0,
    hasParseErrors: false,
    fileSelectionVersion: 0,
    result: null,
    analysis: null
  };

  const elements = {
    fileInput: document.getElementById('file-input'),
    languageSelect: document.getElementById('language-select'),
    sourceStatus: document.getElementById('source-status'),
    mappingPanel: document.getElementById('mapping-panel'),
    mappingGrid: document.getElementById('mapping-grid'),
    mappingMessage: document.getElementById('mapping-message'),
    analyzeButton: document.getElementById('analyze-button'),
    resultsPanel: document.getElementById('results-panel'),
    importSummary: document.getElementById('import-summary'),
    metricGrid: document.getElementById('metric-grid'),
    exportButton: document.getElementById('export-button'),
    articleFilter: document.getElementById('article-filter'),
    articleSort: document.getElementById('article-sort'),
    articleCount: document.getElementById('article-count'),
    articleTableBody: document.getElementById('article-table-body'),
    issuesPanel: document.getElementById('issues-panel'),
    issuesTableBody: document.getElementById('issues-table-body'),
    resetButton: document.getElementById('reset-button')
  };

  function translate(key, replacements) {
    let value = TRANSLATIONS[state.language][key] || TRANSLATIONS.en[key] || key;
    Object.keys(replacements || {}).forEach(function (name) {
      value = value.replace(new RegExp('\\{\\{' + name + '\\}\\}', 'g'), String(replacements[name]));
    });
    return value;
  }

  function decodeBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    let encoding = 'utf-8';
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
      encoding = 'utf-16le';
    } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
      encoding = 'utf-16be';
    }
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(bytes);
    } catch (error) {
      throw new Error(translate('invalid_encoding'));
    }
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(decodeBuffer(reader.result));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function () { reject(reader.error || new Error(translate('file_read_error'))); };
      reader.readAsArrayBuffer(file);
    });
  }

  function setText(element, value) {
    element.textContent = value;
  }

  function formatNumber(value, digits) {
    return new Intl.NumberFormat(state.language === 'de' ? 'de-DE' : 'en-US', {
      maximumFractionDigits: digits === undefined ? 2 : digits,
      minimumFractionDigits: 0
    }).format(value);
  }

  function formatQuantity(value) {
    return core.formatScaledQuantity(value, state.language);
  }

  function formatSharePercent(value) {
    const percent = value * 100;
    if (percent > 0 && percent < 0.01) {
      return '<' + formatNumber(0.01, 2) + ' %';
    }
    return formatNumber(percent) + ' %';
  }

  function formatSalesValue(value, exactValue) {
    return core.formatSalesValue(exactValue === undefined ? value : exactValue, state.language);
  }

  function addOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function renderMapping() {
    elements.mappingGrid.replaceChildren();
    core.FIELD_DEFINITIONS.forEach(function (definition) {
      const wrapper = document.createElement('div');
      wrapper.className = 'mapping-field' + (definition.required ? ' required' : '');
      const label = document.createElement('label');
      label.htmlFor = 'mapping-' + definition.key;
      label.textContent = core.getFieldLabel(definition.key, state.language);
      if (definition.required) {
        const requiredMarker = document.createElement('span');
        requiredMarker.className = 'required-marker';
        requiredMarker.textContent = ' · ' + translate('required_marker');
        label.appendChild(requiredMarker);
      }
      const select = document.createElement('select');
      select.id = 'mapping-' + definition.key;
      select.dataset.field = definition.key;
      addOption(select, '', translate('not_mapped'));
      state.headers.forEach(function (header, index) {
        addOption(select, String(index), (index + 1) + ': ' + (header || translate('empty_header')));
      });
      if (Number.isInteger(state.mapping[definition.key])) {
        select.value = String(state.mapping[definition.key]);
      }
      wrapper.appendChild(label);
      wrapper.appendChild(select);
      elements.mappingGrid.appendChild(wrapper);
    });
  }

  function currentMapping() {
    const mapping = {};
    elements.mappingGrid.querySelectorAll('select[data-field]').forEach(function (select) {
      mapping[select.dataset.field] = select.value === '' ? null : Number(select.value);
    });
    return mapping;
  }

  function showMappingMessage(message) {
    if (!message) {
      elements.mappingMessage.classList.add('hidden');
      setText(elements.mappingMessage, '');
      return;
    }
    setText(elements.mappingMessage, message);
    elements.mappingMessage.classList.remove('hidden');
  }

  function applyLanguage() {
    document.documentElement.lang = state.language;
    document.title = translate('page_title');
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      setText(element, translate(element.dataset.i18n));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
      element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
    });
    elements.languageSelect.setAttribute('aria-label', translate('language_label'));
    if (state.headers.length > 0) {
      if (elements.mappingGrid.querySelector('select[data-field]')) {
        state.mapping = currentMapping();
      }
      renderMapping();
      setText(elements.sourceStatus, translate('file_detected', { file: state.fileName, count: state.dataRowCount }));
      showMappingMessage(state.hasParseErrors ? translate('structure_hint') : '');
    }
    if (state.result) {
      const analyzedMapping = state.confirmedMapping || state.mapping;
      state.result = core.importCsv(state.text, analyzedMapping, { locale: state.language });
      renderResults(state.result);
    }
  }

  function renderMetrics(analysis) {
    const metrics = [
      [translate('metric_lines'), formatNumber(analysis.total_lines, 0), translate('metric_lines_detail')],
      [translate('metric_quantity'), formatQuantity(analysis.total_quantity), translate('metric_quantity_detail')],
      [translate('metric_orders'), formatNumber(analysis.distinct_orders, 0), translate('metric_orders_detail')],
      [translate('metric_customers'), formatNumber(analysis.distinct_customers, 0), translate('metric_customers_detail')],
      [translate('metric_days'), formatNumber(analysis.active_days, 0), translate('metric_days_detail')],
      [translate('metric_average_line'), formatQuantity(analysis.average_quantity_per_line), translate('metric_average_line_detail')],
      [translate('metric_average_order'), formatQuantity(analysis.average_quantity_per_order), translate('metric_average_order_detail')],
      [translate('metric_sales'), formatSalesValue(analysis.total_sales, analysis.total_sales_exact), translate('metric_sales_detail', { count: analysis.sales_value_rows })]
    ];

    elements.metricGrid.replaceChildren();
    metrics.forEach(function (metric) {
      const card = document.createElement('div');
      card.className = 'metric';
      const label = document.createElement('div');
      label.className = 'metric-label';
      setText(label, metric[0]);
      const value = document.createElement('div');
      value.className = 'metric-value';
      setText(value, metric[1]);
      const detail = document.createElement('div');
      detail.className = 'metric-detail';
      setText(detail, metric[2]);
      card.appendChild(label);
      card.appendChild(value);
      card.appendChild(detail);
      elements.metricGrid.appendChild(card);
    });
  }

  function sortedArticles() {
    if (!state.analysis) {
      return [];
    }
    const locale = state.language === 'de' ? 'de-DE' : 'en-US';
    const query = elements.articleFilter.value.trim().toLocaleLowerCase(locale);
    const articles = state.analysis.articles.filter(function (article) {
      return !query || article.article_id.toLocaleLowerCase(locale).indexOf(query) >= 0;
    });
    const sort = elements.articleSort.value;
    return articles.sort(function (left, right) {
      if (sort === 'quantity') {
        return core.compareScaledQuantitiesDescending(left.total_quantity, right.total_quantity) || left.article_id.localeCompare(right.article_id);
      }
      if (sort === 'sales') {
        return core.compareSalesValuesDescending(left.total_sales_exact || left.total_sales, right.total_sales_exact || right.total_sales) || left.article_id.localeCompare(right.article_id);
      }
      if (sort === 'article') {
        return left.article_id.localeCompare(right.article_id);
      }
      return right.order_line_count - left.order_line_count ||
        core.compareScaledQuantitiesDescending(left.total_quantity, right.total_quantity) ||
        left.article_id.localeCompare(right.article_id);
    });
  }

  function appendCell(row, value, className) {
    const cell = document.createElement('td');
    if (className) {
      cell.className = className;
    }
    setText(cell, value);
    row.appendChild(cell);
  }

  function renderArticles() {
    const articles = sortedArticles();
    elements.articleTableBody.replaceChildren();
    setText(elements.articleCount, translate('article_count', { count: articles.length }));
    if (articles.length === 0) {
      const row = document.createElement('tr');
      row.className = 'empty-row';
      const cell = document.createElement('td');
      cell.colSpan = 7;
      setText(cell, translate('no_matches'));
      row.appendChild(cell);
      elements.articleTableBody.appendChild(row);
      return;
    }

    articles.forEach(function (article) {
      const row = document.createElement('tr');
      appendCell(row, article.article_id);
      appendCell(row, formatNumber(article.order_line_count, 0), 'number');
      appendCell(row, formatQuantity(article.total_quantity), 'number');
      appendCell(row, formatNumber(article.distinct_orders, 0), 'number');
      appendCell(row, formatNumber(article.distinct_customers, 0), 'number');
      appendCell(row, formatNumber(article.active_days, 0), 'number');
      appendCell(row, formatSharePercent(article.share_of_order_lines), 'number');
      elements.articleTableBody.appendChild(row);
    });
  }

  function renderIssues(issues) {
    const rowIssues = issues.filter(function (issue) { return issue.sourceLine !== null; });
    elements.issuesTableBody.replaceChildren();
    if (rowIssues.length === 0) {
      elements.issuesPanel.classList.add('hidden');
      return;
    }
    elements.issuesPanel.classList.remove('hidden');
    rowIssues.forEach(function (issue) {
      const row = document.createElement('tr');
      appendCell(row, String(issue.sourceLine));
      appendCell(row, issue.field ? core.getFieldLabel(issue.field, state.language) : translate('structure_field'));
      appendCell(row, issue.code);
      appendCell(row, issue.message);
      elements.issuesTableBody.appendChild(row);
    });
  }

  function renderResults(result) {
    state.result = result;
    state.analysis = core.analyzeRows(result.rows);
    const hasIssues = result.invalidRows > 0 || result.issues.some(function (issue) { return issue.sourceLine === null; });
    elements.importSummary.className = 'import-summary' + (hasIssues ? ' warning' : '');
    let summary = translate('summary_valid', {
      file: state.fileName,
      valid: result.validRows,
      total: result.totalRows
    });
    if (result.invalidRows > 0) {
      summary += ' ' + translate('summary_held_back', { count: result.invalidRows });
      if (result.structuralRows > 0) {
        summary += translate('summary_structural', { count: result.structuralRows });
      }
      summary += '.';
    }
    setText(elements.importSummary, summary);
    renderMetrics(state.analysis);
    renderArticles();
    renderIssues(result.issues);
    elements.exportButton.disabled = result.validRows === 0;
    elements.resultsPanel.classList.remove('hidden');
  }

  async function handleFileChange() {
    const file = elements.fileInput.files[0];
    if (!file) {
      return;
    }
    const selectionVersion = state.fileSelectionVersion + 1;
    state.fileSelectionVersion = selectionVersion;
    state.result = null;
    state.analysis = null;
    state.fileName = '';
    state.text = '';
    state.headers = [];
    state.mapping = {};
    state.confirmedMapping = null;
    state.dataRowCount = 0;
    state.hasParseErrors = false;
    elements.mappingGrid.replaceChildren();
    elements.mappingPanel.classList.add('hidden');
    elements.resultsPanel.classList.add('hidden');
    elements.analyzeButton.disabled = true;
    elements.exportButton.disabled = true;
    setText(elements.sourceStatus, translate('reading_file', { file: file.name }));
    try {
      const fileText = await readFile(file);
      if (selectionVersion !== state.fileSelectionVersion) {
        return;
      }
      state.fileName = file.name;
      state.text = fileText;
      const parsed = core.parseCsv(state.text);
      if (parsed.rows.length === 0) {
        throw new Error(translate('no_file_selected'));
      }
      state.headers = parsed.rows[0].values.map(function (header) { return String(header).trim(); });
      state.mapping = core.detectMapping(state.headers);
      state.dataRowCount = Math.max(0, parsed.rows.length - 1);
      state.hasParseErrors = parsed.errors.length > 0;
      renderMapping();
      showMappingMessage(parsed.errors.length > 0 ? translate('structure_hint') : '');
      setText(elements.sourceStatus, translate('file_detected', { file: file.name, count: Math.max(0, parsed.rows.length - 1) }));
      elements.mappingPanel.classList.remove('hidden');
      elements.resultsPanel.classList.add('hidden');
      elements.analyzeButton.disabled = false;
    } catch (error) {
      if (selectionVersion !== state.fileSelectionVersion) {
        return;
      }
      setText(elements.sourceStatus, translate('error_prefix') + error.message);
      elements.mappingPanel.classList.add('hidden');
      elements.resultsPanel.classList.add('hidden');
      elements.analyzeButton.disabled = true;
      elements.exportButton.disabled = true;
    }
  }

  function analyze() {
    const draftMapping = currentMapping();
    const mappingIssues = core.validateMapping(draftMapping, state.language);
    if (mappingIssues.length > 0) {
      showMappingMessage(mappingIssues.map(function (issue) { return issue.message; }).join(' '));
      return;
    }
    state.mapping = draftMapping;
    state.confirmedMapping = Object.assign({}, draftMapping);
    showMappingMessage('');
    renderResults(core.importCsv(state.text, state.confirmedMapping, { locale: state.language }));
  }

  function exportResults() {
    if (!state.analysis || state.analysis.articles.length === 0) {
      return;
    }
    const csv = core.exportAnalysisCsv(state.analysis.articles);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'openslotting-article-analysis.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    state.fileName = '';
    state.text = '';
    state.headers = [];
    state.mapping = {};
    state.confirmedMapping = null;
    state.dataRowCount = 0;
    state.hasParseErrors = false;
    state.fileSelectionVersion += 1;
    state.result = null;
    state.analysis = null;
    elements.fileInput.value = '';
    setText(elements.sourceStatus, translate('no_file_selected'));
    elements.mappingGrid.replaceChildren();
    elements.mappingPanel.classList.add('hidden');
    elements.resultsPanel.classList.add('hidden');
  }

  elements.fileInput.addEventListener('change', handleFileChange);
  elements.languageSelect.addEventListener('change', function () {
    state.language = elements.languageSelect.value === 'de' ? 'de' : 'en';
    applyLanguage();
  });
  elements.analyzeButton.addEventListener('click', analyze);
  elements.exportButton.addEventListener('click', exportResults);
  elements.articleFilter.addEventListener('input', renderArticles);
  elements.articleSort.addEventListener('change', renderArticles);
  elements.resetButton.addEventListener('click', reset);

  applyLanguage();
}());
