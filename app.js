(function () {
  'use strict';

  const core = window.OpenSlottingCsv;
  const encoding = window.OpenSlottingEncoding;
  const workspaceCore = window.OpenSlottingWorkspaces;
  const TRANSLATIONS = {
    en: {
      page_title: 'OpenSlotting – CSV Analysis',
      eyebrow: 'OpenSlotting · V0.2',
      hero_title: 'Analyze order lines across exports',
      hero_subtitle: 'Combine multiple CSV exports locally while keeping every source file and line traceable.',
      language_label: 'Language',
      language_english: 'English',
      language_german: 'German',
      local_badge: 'local · file:///',
      step_1: 'Step 1',
      select_file_title: 'Select CSV files',
      local_hint: 'No data leaves your browser.',
      open_csv: 'Open CSV files',
      file_format_hint: 'UTF-8, UTF-16, or Windows-1252 with semicolon delimiter',
      no_file_selected: 'No files selected yet.',
      reading_files: 'Reading {{count}} files…',
      files_detected: '{{files}} files selected · {{rows}} data rows detected.',
      files_detected_with_errors: '{{files}} files selected · {{rows}} data rows detected · {{errors}} files could not be prepared.',
      step_2: 'Step 2',
      mapping_title: 'Map source columns per file',
      mapping_hint: 'Review each file independently. Blocking files are excluded from the combined analysis.',
      mapping_file_rows: '{{count}} detected data rows',
      mapping_file_ready: 'Ready for validation',
      mapping_file_included: 'Included',
      mapping_file_excluded: 'Excluded',
      mapping_file_reading: 'Reading…',
      encoding_label: 'Encoding',
      encoding_auto: 'Automatic',
      encoding_auto_detected: 'Automatic (detected: {{encoding}})',
      remove_file: 'Remove file',
      remove_file_label: 'Remove {{file}}',
      no_prepared_files: 'No readable CSV file is available for analysis.',
      analyze_button: 'Validate and analyze data',
      step_3: 'Step 3',
      analysis_title: 'Analysis',
      export_button: 'Export analysis',
      article_overview: 'Article overview',
      search_label: 'Search',
      search_placeholder: 'Article ID or description',
      sort_label: 'Sort by',
      sort_lines: 'Order lines',
      sort_quantity: 'Total quantity',
      sort_sales: 'Sales value',
      sort_article: 'Article ID',
      column_article_id: 'Article ID',
      column_article_name: 'Article description',
      column_lines: 'Lines',
      column_quantity: 'Quantity',
      column_sales: 'Sales value / coverage',
      column_orders: 'Orders',
      column_customers: 'Customers',
      column_days: 'Days',
      column_locations: 'Locations',
      column_share: 'Line share',
      article_detail: 'Article details',
      detail_back: 'Back to article overview',
      detail_open: 'Open details for {{article}}',
      detail_conflict: 'Multiple article descriptions were found: {{variants}}',
      detail_page: 'Page {{page}} of {{pages}} · {{count}} order lines on this page',
      detail_source_line: 'Source line',
      detail_source_file: 'Source file',
      detail_order_id: 'Order ID',
      detail_order_date: 'Order date',
      detail_customer_id: 'Customer ID',
      detail_sales_value: 'Sales value',
      detail_location: 'Location',
      no_detail_rows: 'No normalized order lines are available for this article.',
      empty_value: '—',
      issues_title: 'Validation notes',
      issues_note: 'Blocking files and invalid rows are not aggregated and remain traceable by source file and line.',
      issue_source_file: 'Source file',
      issue_source_line: 'Source line',
      issue_field: 'Field',
      issue_code: 'Code',
      issue_message: 'Message',
      footer_local: 'OpenSlotting processes the selected files locally only.',
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
      article_page: 'Page {{page}} of {{pages}} · {{count}} articles on this page',
      issue_page: 'Page {{page}} of {{pages}} · {{count}} notes on this page',
      sales_coverage: '{{value}} · {{rows}}/{{lines}} rows',
      previous_page: 'Previous',
      next_page: 'Next',
      no_matches: 'No matching articles found.',
      structure_hint: 'The file also contains CSV structure notes, which will appear after mapping.',
      error_prefix: 'Error: ',
      summary_valid: '{{included}} of {{selected}} files included · {{valid}} of {{total}} data rows are valid.',
      summary_held_back: '{{count}} rows were held back',
      summary_structural: ' ({{count}} structural column errors)',
      summary_excluded: '{{count}} files were excluded because of blocking errors.',
      source_files_title: 'Source files',
      source_files_note: 'Rows are combined without automatic cross-file deduplication.',
      source_file_column: 'Source file',
      status_column: 'Status',
      total_rows_column: 'Rows',
      valid_rows_column: 'Valid',
      invalid_rows_column: 'Invalid',
      warning_title: 'Overlap and duplicate-risk warnings',
      warning_overlap: '{{left}} and {{right}} overlap from {{start}} to {{end}}. Rows are preserved and may double-count activity.',
      warning_identical: '{{left}} and {{right}} have identical decoded content. No rows are removed automatically.',
      warning_metadata: '{{left}} and {{right}} have matching filename, size, and modification time. Review them before analysis.',
      structure_field: 'Structure',
      file_read_error: 'The file could not be read.',
      empty_file: 'The selected CSV file is empty or has no header row.',
      invalid_encoding: 'The file encoding is not supported. Use UTF-8, UTF-16, or Windows-1252.'
      ,workspace_label: 'Workspace', workspace_title: 'Local workspaces', workspace_hint: 'Saved automatically in this browser.',
      workspace_open: 'Open workspace', workspace_create: 'Create', workspace_rename: 'Rename', workspace_delete: 'Delete', workspace_export: 'Back up', workspace_restore: 'Restore',
      workspace_default_name: 'My workspace', workspace_name_prompt: 'Workspace name', workspace_delete_confirm: 'Delete this workspace and all its local data?',
      workspace_replace_confirm: 'Replace the selected workspace with this backup? Cancel restores it as a new workspace.', workspace_saved: 'Workspace saved locally.',
      workspace_restored: 'Workspace restored.', workspace_invalid_backup: 'The backup is invalid or truncated.', workspace_unsupported_backup: 'This backup version is not supported.',
      workspace_storage_unavailable: 'Browser storage is unavailable.', workspace_storage_quota: 'Browser storage is full. Your latest change could not be saved.', workspace_error: 'The workspace operation failed.'
    },
    de: {
      page_title: 'OpenSlotting – CSV-Analyse',
      eyebrow: 'OpenSlotting · V0.2',
      hero_title: 'Auftragszeilen über Exporte analysieren',
      hero_subtitle: 'Mehrere CSV-Exporte lokal zusammenführen und jede Quelldatei und -zeile nachvollziehbar halten.',
      language_label: 'Sprache',
      language_english: 'Englisch',
      language_german: 'Deutsch',
      local_badge: 'lokal · file:///',
      step_1: 'Schritt 1',
      select_file_title: 'CSV-Dateien auswählen',
      local_hint: 'Keine Daten verlassen den Browser.',
      open_csv: 'CSV-Dateien öffnen',
      file_format_hint: 'UTF-8, UTF-16 oder Windows-1252 mit Semikolon-Trenner',
      no_file_selected: 'Noch keine Dateien ausgewählt.',
      reading_files: '{{count}} Dateien werden gelesen …',
      files_detected: '{{files}} Dateien ausgewählt · {{rows}} Datenzeilen erkannt.',
      files_detected_with_errors: '{{files}} Dateien ausgewählt · {{rows}} Datenzeilen erkannt · {{errors}} Dateien konnten nicht vorbereitet werden.',
      step_2: 'Schritt 2',
      mapping_title: 'Quellspalten je Datei zuordnen',
      mapping_hint: 'Jede Datei wird unabhängig geprüft. Blockierte Dateien werden von der gemeinsamen Analyse ausgeschlossen.',
      mapping_file_rows: '{{count}} erkannte Datenzeilen',
      mapping_file_ready: 'Bereit zur Prüfung',
      mapping_file_included: 'Einbezogen',
      mapping_file_excluded: 'Ausgeschlossen',
      mapping_file_reading: 'Wird gelesen …',
      encoding_label: 'Kodierung',
      encoding_auto: 'Automatisch',
      encoding_auto_detected: 'Automatisch (erkannt: {{encoding}})',
      remove_file: 'Datei entfernen',
      remove_file_label: '{{file}} entfernen',
      no_prepared_files: 'Für die Analyse ist keine lesbare CSV-Datei verfügbar.',
      analyze_button: 'Daten prüfen und analysieren',
      step_3: 'Schritt 3',
      analysis_title: 'Analyse',
      export_button: 'Analyse exportieren',
      article_overview: 'Artikelübersicht',
      search_label: 'Suche',
      search_placeholder: 'Artikel-ID oder Artikelbezeichnung',
      sort_label: 'Sortierung',
      sort_lines: 'Auftragszeilen',
      sort_quantity: 'Gesamtmenge',
      sort_sales: 'Umsatz',
      sort_article: 'Artikel-ID',
      column_article_id: 'Artikel-ID',
      column_article_name: 'Artikelbezeichnung',
      column_lines: 'Zeilen',
      column_quantity: 'Menge',
      column_sales: 'Umsatz / Abdeckung',
      column_orders: 'Aufträge',
      column_customers: 'Kunden',
      column_days: 'Tage',
      column_locations: 'Stellplätze',
      column_share: 'Anteil Zeilen',
      article_detail: 'Artikeldetails',
      detail_back: 'Zurück zur Artikelübersicht',
      detail_open: 'Details für {{article}} öffnen',
      detail_conflict: 'Es wurden mehrere Artikelbezeichnungen gefunden: {{variants}}',
      detail_page: 'Seite {{page}} von {{pages}} · {{count}} Auftragszeilen auf dieser Seite',
      detail_source_line: 'Quellzeile',
      detail_source_file: 'Quelldatei',
      detail_order_id: 'Auftrags-ID',
      detail_order_date: 'Auftragsdatum',
      detail_customer_id: 'Kunden-ID',
      detail_sales_value: 'Umsatz',
      detail_location: 'Stellplatz',
      no_detail_rows: 'Für diesen Artikel sind keine normalisierten Auftragszeilen verfügbar.',
      empty_value: '—',
      issues_title: 'Prüfhinweise',
      issues_note: 'Blockierte Dateien und fehlerhafte Zeilen werden nicht aggregiert und bleiben über Quelldatei und Quellzeile nachvollziehbar.',
      issue_source_file: 'Quelldatei',
      issue_source_line: 'Quellzeile',
      issue_field: 'Feld',
      issue_code: 'Code',
      issue_message: 'Hinweis',
      footer_local: 'OpenSlotting verarbeitet die ausgewählten Dateien ausschließlich lokal.',
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
      article_page: 'Seite {{page}} von {{pages}} · {{count}} Artikel auf dieser Seite',
      issue_page: 'Seite {{page}} von {{pages}} · {{count}} Hinweise auf dieser Seite',
      sales_coverage: '{{value}} · {{rows}}/{{lines}} Zeilen',
      previous_page: 'Zurück',
      next_page: 'Weiter',
      no_matches: 'Keine passenden Artikel gefunden.',
      structure_hint: 'Die Datei enthält zusätzlich CSV-Strukturhinweise, die nach der Zuordnung angezeigt werden.',
      error_prefix: 'Fehler: ',
      summary_valid: '{{included}} von {{selected}} Dateien einbezogen · {{valid}} von {{total}} Datenzeilen sind gültig.',
      summary_held_back: '{{count}} Zeilen wurden zurückgestellt',
      summary_structural: ' ({{count}} strukturelle Spaltenfehler)',
      summary_excluded: '{{count}} Dateien wurden wegen blockierender Fehler ausgeschlossen.',
      source_files_title: 'Quelldateien',
      source_files_note: 'Zeilen werden ohne automatische dateiübergreifende Deduplizierung zusammengeführt.',
      source_file_column: 'Quelldatei',
      status_column: 'Status',
      total_rows_column: 'Zeilen',
      valid_rows_column: 'Gültig',
      invalid_rows_column: 'Fehlerhaft',
      warning_title: 'Warnungen zu Überschneidungen und Dublettenrisiken',
      warning_overlap: '{{left}} und {{right}} überschneiden sich vom {{start}} bis {{end}}. Die Zeilen bleiben erhalten und können Aktivitäten doppelt zählen.',
      warning_identical: '{{left}} und {{right}} haben identische dekodierte Inhalte. Es werden keine Zeilen automatisch entfernt.',
      warning_metadata: '{{left}} und {{right}} haben gleichen Dateinamen, gleiche Größe und gleiche Änderungszeit. Bitte vor der Analyse prüfen.',
      structure_field: 'Struktur',
      file_read_error: 'Die Datei konnte nicht gelesen werden.',
      empty_file: 'Die ausgewählte CSV-Datei ist leer oder enthält keine Kopfzeile.',
      invalid_encoding: 'Die Dateikodierung wird nicht unterstützt. Bitte UTF-8, UTF-16 oder Windows-1252 verwenden.'
      ,workspace_label: 'Arbeitsbereich', workspace_title: 'Lokale Arbeitsbereiche', workspace_hint: 'Wird automatisch in diesem Browser gespeichert.',
      workspace_open: 'Arbeitsbereich öffnen', workspace_create: 'Erstellen', workspace_rename: 'Umbenennen', workspace_delete: 'Löschen', workspace_export: 'Sichern', workspace_restore: 'Wiederherstellen',
      workspace_default_name: 'Mein Arbeitsbereich', workspace_name_prompt: 'Name des Arbeitsbereichs', workspace_delete_confirm: 'Diesen Arbeitsbereich und alle lokalen Daten löschen?',
      workspace_replace_confirm: 'Den ausgewählten Arbeitsbereich durch diese Sicherung ersetzen? Abbrechen stellt sie als neuen Arbeitsbereich wieder her.', workspace_saved: 'Arbeitsbereich lokal gespeichert.',
      workspace_restored: 'Arbeitsbereich wiederhergestellt.', workspace_invalid_backup: 'Die Sicherung ist ungültig oder unvollständig.', workspace_unsupported_backup: 'Diese Sicherungsversion wird nicht unterstützt.',
      workspace_storage_unavailable: 'Der Browserspeicher ist nicht verfügbar.', workspace_storage_quota: 'Der Browserspeicher ist voll. Die letzte Änderung konnte nicht gespeichert werden.', workspace_error: 'Der Arbeitsbereichsvorgang ist fehlgeschlagen.'
    }
  };

  const state = {
    language: 'en',
    files: [],
    fileSelectionVersion: 0,
    result: null,
    analysis: null,
    sourceStatus: { key: 'no_file_selected', replacements: {}, error: false, text: '' },
    articlePage: 1,
    selectedArticleId: null,
    detailPage: 1,
    issuePage: 1
    ,workspaceId: null
  };

  const TABLE_PAGE_SIZE = 100;

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
    sourceFilesTableBody: document.getElementById('source-files-table-body'),
    batchWarnings: document.getElementById('batch-warnings'),
    metricGrid: document.getElementById('metric-grid'),
    exportButton: document.getElementById('export-button'),
    articleOverviewPanel: document.getElementById('article-overview-panel'),
    articleFilter: document.getElementById('article-filter'),
    articleSort: document.getElementById('article-sort'),
    articleCount: document.getElementById('article-count'),
    articleTableBody: document.getElementById('article-table-body'),
    articlePagination: document.getElementById('article-pagination'),
    articlePrevious: document.getElementById('article-previous'),
    articleNext: document.getElementById('article-next'),
    articlePageStatus: document.getElementById('article-page-status'),
    articleDetailPanel: document.getElementById('article-detail-panel'),
    articleDetailBack: document.getElementById('article-detail-back'),
    articleDetailTitle: document.getElementById('article-detail-title'),
    articleDetailHeading: document.getElementById('article-detail-heading'),
    articleDetailWarning: document.getElementById('article-detail-warning'),
    articleDetailMetrics: document.getElementById('article-detail-metrics'),
    articleDetailTableBody: document.getElementById('article-detail-table-body'),
    articleDetailPagination: document.getElementById('article-detail-pagination'),
    articleDetailPrevious: document.getElementById('article-detail-previous'),
    articleDetailNext: document.getElementById('article-detail-next'),
    articleDetailPageStatus: document.getElementById('article-detail-page-status'),
    issuesPanel: document.getElementById('issues-panel'),
    issuesTableBody: document.getElementById('issues-table-body'),
    issuePagination: document.getElementById('issue-pagination'),
    issuePrevious: document.getElementById('issue-previous'),
    issueNext: document.getElementById('issue-next'),
    issuePageStatus: document.getElementById('issue-page-status'),
    appVersion: document.getElementById('app-version'),
    resetButton: document.getElementById('reset-button')
    ,workspaceSelect: document.getElementById('workspace-select'), workspaceCreate: document.getElementById('workspace-create'),
    workspaceRename: document.getElementById('workspace-rename'), workspaceDelete: document.getElementById('workspace-delete'), workspaceExport: document.getElementById('workspace-export'),
    workspaceRestoreInput: document.getElementById('workspace-restore-input'), workspaceMessage: document.getElementById('workspace-message')
  };

  let workspaceRepository = null;

  function translate(key, replacements) {
    let value = TRANSLATIONS[state.language][key] || TRANSLATIONS.en[key] || key;
    Object.keys(replacements || {}).forEach(function (name) {
      value = value.replace(new RegExp('\\{\\{' + name + '\\}\\}', 'g'), String(replacements[name]));
    });
    return value;
  }

  function createTranslationError(key) {
    const error = new Error(translate(key));
    error.translationKey = key;
    return error;
  }

  function renderSourceStatus() {
    const status = state.sourceStatus;
    const message = status.key ? translate(status.key, status.replacements) : status.text;
    setText(elements.sourceStatus, status.error ? translate('error_prefix') + message : message);
  }

  function setSourceStatus(key, replacements) {
    state.sourceStatus = { key: key, replacements: replacements || {}, error: false, text: '' };
    renderSourceStatus();
  }

  function readFileBuffer(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () { reject(createTranslationError('file_read_error')); };
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

  function formatArticleSales(article) {
    const value = article.sales_value_rows > 0
      ? formatSalesValue(article.total_sales, article.total_sales_exact)
      : '—';
    return translate('sales_coverage', {
      value: value,
      rows: article.sales_value_rows,
      lines: article.order_line_count
    });
  }

  function formatTotalSales(analysis) {
    return analysis.sales_value_rows > 0
      ? formatSalesValue(analysis.total_sales, analysis.total_sales_exact)
      : '—';
  }

  function addOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function mappingStatusKey(file) {
    if (file.reading) {
      return 'mapping_file_reading';
    }
    if (file.errorKey || (file.result && file.result.blocking)) {
      return 'mapping_file_excluded';
    }
    if (file.result) {
      return 'mapping_file_included';
    }
    return 'mapping_file_ready';
  }

  function formatEncodingName(value) {
    const names = {
      'utf-8': 'UTF-8',
      'utf-16le': 'UTF-16 LE',
      'utf-16be': 'UTF-16 BE',
      'windows-1252': 'Windows-1252'
    };
    return names[value] || String(value || '');
  }

  function renderMapping() {
    elements.mappingGrid.replaceChildren();
    state.files.forEach(function (file) {
      const section = document.createElement('section');
      section.className = 'mapping-file' + (file.errorKey || (file.result && file.result.blocking) ? ' blocked' : '');
      section.dataset.fileId = file.id;

      const heading = document.createElement('div');
      heading.className = 'mapping-file-heading';
      const headingCopy = document.createElement('div');
      const title = document.createElement('h3');
      title.className = 'mapping-file-title';
      setText(title, file.label);
      const meta = document.createElement('p');
      meta.className = 'mapping-file-meta';
      setText(meta, file.parsed
        ? translate('mapping_file_rows', { count: file.dataRowCount }) + ' · ' + translate(mappingStatusKey(file))
        : translate(mappingStatusKey(file)));
      headingCopy.appendChild(title);
      headingCopy.appendChild(meta);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'text-button';
      removeButton.dataset.removeFileId = file.id;
      removeButton.disabled = file.reading;
      setText(removeButton, translate('remove_file'));
      removeButton.setAttribute('aria-label', translate('remove_file_label', { file: file.label }));
      heading.appendChild(headingCopy);
      heading.appendChild(removeButton);
      section.appendChild(heading);

      const encodingField = document.createElement('label');
      encodingField.className = 'compact-field encoding-field';
      const encodingLabel = document.createElement('span');
      setText(encodingLabel, translate('encoding_label'));
      const encodingSelect = document.createElement('select');
      encodingSelect.dataset.encodingFileId = file.id;
      encodingSelect.disabled = file.reading || !file.buffer;
      addOption(
        encodingSelect,
        'auto',
        file.detectedEncoding
          ? translate('encoding_auto_detected', { encoding: formatEncodingName(file.detectedEncoding) })
          : translate('encoding_auto')
      );
      encoding.SUPPORTED_ENCODINGS.forEach(function (encodingName) {
        addOption(encodingSelect, encodingName, formatEncodingName(encodingName));
      });
      encodingSelect.value = file.encodingMode || 'auto';
      encodingField.appendChild(encodingLabel);
      encodingField.appendChild(encodingSelect);
      section.appendChild(encodingField);

      if (file.errorKey) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message mapping-file-message';
        setText(errorMessage, translate(file.errorKey));
        section.appendChild(errorMessage);
        elements.mappingGrid.appendChild(section);
        return;
      }

      if (file.parsed) {
        const fields = document.createElement('div');
        fields.className = 'mapping-fields';
        core.FIELD_DEFINITIONS.forEach(function (definition) {
          const wrapper = document.createElement('div');
          wrapper.className = 'mapping-field' + (definition.required ? ' required' : '');
          const label = document.createElement('label');
          const selectId = 'mapping-' + file.id + '-' + definition.key;
          label.htmlFor = selectId;
          label.textContent = core.getFieldLabel(definition.key, state.language);
          if (definition.required) {
            const requiredMarker = document.createElement('span');
            requiredMarker.className = 'required-marker';
            requiredMarker.textContent = ' · ' + translate('required_marker');
            label.appendChild(requiredMarker);
          }
          const select = document.createElement('select');
          select.id = selectId;
          select.dataset.field = definition.key;
          select.dataset.fileId = file.id;
          addOption(select, '', translate('not_mapped'));
          file.headers.forEach(function (header, index) {
            addOption(select, String(index), (index + 1) + ': ' + (header || translate('empty_header')));
          });
          if (Number.isInteger(file.mapping[definition.key])) {
            select.value = String(file.mapping[definition.key]);
          }
          wrapper.appendChild(label);
          wrapper.appendChild(select);
          fields.appendChild(wrapper);
        });
        section.appendChild(fields);
      }

      if (file.result && file.result.blocking && file.result.issues.length > 0) {
        const blockingMessage = document.createElement('div');
        blockingMessage.className = 'message mapping-file-message';
        setText(blockingMessage, file.result.issues.map(function (issue) { return issue.message; }).join(' '));
        section.appendChild(blockingMessage);
      } else if (file.hasParseErrors) {
        const structureMessage = document.createElement('div');
        structureMessage.className = 'message warning-message mapping-file-message';
        setText(structureMessage, translate('structure_hint'));
        section.appendChild(structureMessage);
      }

      elements.mappingGrid.appendChild(section);
    });
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
    setText(elements.appVersion, 'OpenSlotting v' + core.APP_VERSION);
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      setText(element, translate(element.dataset.i18n));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
      element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
    });
    elements.languageSelect.setAttribute('aria-label', translate('language_label'));
    if (state.files.length > 0) {
      renderMapping();
    }
    if (state.result) {
      refreshAnalyzedResults(true);
    }
    renderSourceStatus();
  }

  function renderMetricCards(container, metrics) {
    container.replaceChildren();
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
      container.appendChild(card);
    });
  }

  function renderMetrics(analysis) {
    renderMetricCards(elements.metricGrid, [
      [translate('metric_lines'), formatNumber(analysis.total_lines, 0), translate('metric_lines_detail')],
      [translate('metric_quantity'), formatQuantity(analysis.total_quantity), translate('metric_quantity_detail')],
      [translate('metric_orders'), formatNumber(analysis.distinct_orders, 0), translate('metric_orders_detail')],
      [translate('metric_customers'), formatNumber(analysis.distinct_customers, 0), translate('metric_customers_detail')],
      [translate('metric_days'), formatNumber(analysis.active_days, 0), translate('metric_days_detail')],
      [translate('metric_average_line'), formatQuantity(analysis.average_quantity_per_line), translate('metric_average_line_detail')],
      [translate('metric_average_order'), formatQuantity(analysis.average_quantity_per_order), translate('metric_average_order_detail')],
      [translate('metric_sales'), formatTotalSales(analysis), translate('metric_sales_detail', { count: analysis.sales_value_rows })]
    ]);
  }

  function sortedArticles() {
    if (!state.analysis) {
      return [];
    }
    const query = elements.articleFilter.value;
    const articles = state.analysis.articles.filter(function (article) {
      return core.articleMatchesQuery(article, query, state.language);
    });
    const sort = elements.articleSort.value;
    return articles.sort(function (left, right) {
      if (sort === 'quantity') {
        return core.compareScaledQuantitiesDescending(left.total_quantity, right.total_quantity) || left.article_id.localeCompare(right.article_id);
      }
      if (sort === 'sales') {
        const leftHasSales = left.sales_value_rows > 0;
        const rightHasSales = right.sales_value_rows > 0;
        if (leftHasSales !== rightHasSales) {
          return leftHasSales ? -1 : 1;
        }
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

  function optionalText(value) {
    return value === null || value === undefined || String(value) === ''
      ? translate('empty_value')
      : String(value);
  }

  function formatLocations(locations) {
    return Array.isArray(locations) && locations.length > 0
      ? locations.join(', ')
      : translate('empty_value');
  }

  function appendArticleIdCell(row, article) {
    const cell = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-detail-link';
    button.dataset.articleId = article.article_id;
    button.textContent = article.article_id;
    button.setAttribute('aria-label', translate('detail_open', { article: article.article_id }));
    cell.appendChild(button);
    row.appendChild(cell);
  }

  function appendArticleNameCell(row, article) {
    const cell = document.createElement('td');
    cell.className = 'article-name-cell';
    const name = document.createElement('span');
    setText(name, optionalText(article.article_name));
    cell.appendChild(name);
    if (article.article_name_conflict) {
      const warning = document.createElement('span');
      warning.className = 'description-warning';
      warning.textContent = '!';
      warning.title = translate('detail_conflict', { variants: article.article_name_variants.join(' · ') });
      warning.setAttribute('role', 'img');
      warning.setAttribute('aria-label', warning.title);
      cell.appendChild(warning);
    }
    row.appendChild(cell);
  }

  function selectedArticle() {
    if (!state.analysis || !state.selectedArticleId) {
      return null;
    }
    return state.analysis.articles.find(function (article) {
      return article.article_id === state.selectedArticleId;
    }) || null;
  }

  function renderArticleDetailMetrics(article) {
    renderMetricCards(elements.articleDetailMetrics, [
      [translate('column_article_id'), article.article_id, ''],
      [translate('column_article_name'), optionalText(article.article_name), ''],
      [translate('metric_lines'), formatNumber(article.order_line_count, 0), translate('metric_lines_detail')],
      [translate('metric_quantity'), formatQuantity(article.total_quantity), translate('metric_quantity_detail')],
      [translate('metric_orders'), formatNumber(article.distinct_orders, 0), translate('metric_orders_detail')],
      [translate('metric_customers'), formatNumber(article.distinct_customers, 0), translate('metric_customers_detail')],
      [translate('metric_days'), formatNumber(article.active_days, 0), translate('metric_days_detail')],
      [translate('metric_sales'), formatArticleSales(article), translate('metric_sales_detail', { count: article.sales_value_rows })],
      [translate('column_locations'), formatLocations(article.locations), '']
    ]);
  }

  function renderArticleDetail() {
    const article = selectedArticle();
    if (!article) {
      showArticleOverview();
      return;
    }

    const lines = Array.isArray(article.order_lines) ? article.order_lines : [];
    const pageCount = Math.max(1, Math.ceil(lines.length / TABLE_PAGE_SIZE));
    state.detailPage = Math.min(Math.max(state.detailPage, 1), pageCount);
    const pageStart = (state.detailPage - 1) * TABLE_PAGE_SIZE;
    const visibleLines = lines.slice(pageStart, pageStart + TABLE_PAGE_SIZE);

    setText(elements.articleDetailHeading, article.article_id + ' · ' + optionalText(article.article_name));
    if (article.article_name_conflict) {
      setText(elements.articleDetailWarning, translate('detail_conflict', {
        variants: article.article_name_variants.join(' · ')
      }));
      elements.articleDetailWarning.classList.remove('hidden');
    } else {
      setText(elements.articleDetailWarning, '');
      elements.articleDetailWarning.classList.add('hidden');
    }
    renderArticleDetailMetrics(article);

    elements.articleDetailTableBody.replaceChildren();
    if (visibleLines.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 9;
      setText(emptyCell, translate('no_detail_rows'));
      emptyRow.appendChild(emptyCell);
      elements.articleDetailTableBody.appendChild(emptyRow);
    } else {
      visibleLines.forEach(function (line) {
        const row = document.createElement('tr');
        appendCell(row, optionalText(line.source_file_label || line.source_file_name));
        appendCell(row, String(line.source_line), 'number');
        appendCell(row, line.order_id);
        appendCell(row, line.order_date);
        appendCell(row, formatQuantity(line.quantity), 'number');
        appendCell(row, optionalText(line.customer_id));
        appendCell(row, line.sales_value === null ? translate('empty_value') : formatSalesValue(line.sales_value, line.sales_value_exact), 'number');
        appendCell(row, optionalText(line.location), 'location-cell');
        appendCell(row, optionalText(line.article_name), 'article-name-cell');
        elements.articleDetailTableBody.appendChild(row);
      });
    }

    elements.articleDetailPagination.classList.toggle('hidden', lines.length <= TABLE_PAGE_SIZE);
    elements.articleDetailPrevious.disabled = state.detailPage <= 1;
    elements.articleDetailNext.disabled = state.detailPage >= pageCount;
    setText(elements.articleDetailPageStatus, translate('detail_page', {
      page: state.detailPage,
      pages: pageCount,
      count: visibleLines.length
    }));
    elements.articleOverviewPanel.classList.add('hidden');
    elements.articleDetailPanel.classList.remove('hidden');
  }

  function showArticleOverview(focusArticleId) {
    state.selectedArticleId = null;
    state.detailPage = 1;
    elements.articleDetailPanel.classList.add('hidden');
    elements.articleOverviewPanel.classList.remove('hidden');
    if (focusArticleId) {
      const matchingButton = Array.from(elements.articleTableBody.querySelectorAll('button[data-article-id]'))
        .find(function (button) { return button.dataset.articleId === focusArticleId; });
      if (matchingButton) {
        matchingButton.focus();
      }
    }
  }

  function openArticleDetail(articleId) {
    if (!state.analysis || !state.analysis.articles.some(function (article) { return article.article_id === articleId; })) {
      return;
    }
    state.selectedArticleId = articleId;
    state.detailPage = 1;
    renderArticleDetail();
    elements.articleDetailTitle.focus();
  }

  function renderArticles() {
    const allArticles = sortedArticles();
    const pageCount = Math.max(1, Math.ceil(allArticles.length / TABLE_PAGE_SIZE));
    state.articlePage = Math.min(Math.max(state.articlePage, 1), pageCount);
    const pageStart = (state.articlePage - 1) * TABLE_PAGE_SIZE;
    const articles = allArticles.slice(pageStart, pageStart + TABLE_PAGE_SIZE);
    elements.articleTableBody.replaceChildren();
    setText(elements.articleCount, translate('article_count', { count: allArticles.length }));
    elements.articlePagination.classList.toggle('hidden', allArticles.length <= TABLE_PAGE_SIZE);
    elements.articlePrevious.disabled = state.articlePage <= 1;
    elements.articleNext.disabled = state.articlePage >= pageCount;
    setText(elements.articlePageStatus, translate('article_page', {
      page: state.articlePage,
      pages: pageCount,
      count: articles.length
    }));
    if (allArticles.length === 0) {
      const row = document.createElement('tr');
      row.className = 'empty-row';
      const cell = document.createElement('td');
      cell.colSpan = 10;
      setText(cell, translate('no_matches'));
      row.appendChild(cell);
      elements.articleTableBody.appendChild(row);
      return;
    }

    articles.forEach(function (article) {
      const row = document.createElement('tr');
      appendArticleIdCell(row, article);
      appendArticleNameCell(row, article);
      appendCell(row, formatNumber(article.order_line_count, 0), 'number');
      appendCell(row, formatQuantity(article.total_quantity), 'number');
      appendCell(row, formatArticleSales(article), 'number');
      appendCell(row, formatNumber(article.distinct_orders, 0), 'number');
      appendCell(row, formatNumber(article.distinct_customers, 0), 'number');
      appendCell(row, formatNumber(article.active_days, 0), 'number');
      appendCell(row, formatLocations(article.locations), 'location-cell');
      appendCell(row, formatSharePercent(article.share_of_order_lines), 'number');
      elements.articleTableBody.appendChild(row);
    });
  }

  function renderIssues(issues) {
    const rowIssues = issues.slice();
    const pageCount = Math.max(1, Math.ceil(rowIssues.length / TABLE_PAGE_SIZE));
    state.issuePage = Math.min(Math.max(state.issuePage, 1), pageCount);
    const pageStart = (state.issuePage - 1) * TABLE_PAGE_SIZE;
    const visibleIssues = rowIssues.slice(pageStart, pageStart + TABLE_PAGE_SIZE);
    elements.issuesTableBody.replaceChildren();
    if (rowIssues.length === 0) {
      elements.issuesPanel.classList.add('hidden');
      elements.issuePagination.classList.add('hidden');
      return;
    }
    elements.issuesPanel.classList.remove('hidden');
    elements.issuePagination.classList.toggle('hidden', rowIssues.length <= TABLE_PAGE_SIZE);
    elements.issuePrevious.disabled = state.issuePage <= 1;
    elements.issueNext.disabled = state.issuePage >= pageCount;
    setText(elements.issuePageStatus, translate('issue_page', {
      page: state.issuePage,
      pages: pageCount,
      count: visibleIssues.length
    }));
    visibleIssues.forEach(function (issue) {
      const row = document.createElement('tr');
      appendCell(row, optionalText(issue.sourceFileLabel || issue.sourceFileName));
      appendCell(row, issue.sourceLine === null ? translate('empty_value') : String(issue.sourceLine));
      appendCell(row, issue.field ? core.getFieldLabel(issue.field, state.language) : translate('structure_field'));
      appendCell(row, issue.code);
      appendCell(row, issue.message);
      elements.issuesTableBody.appendChild(row);
    });
  }

  function warningText(warning) {
    const replacements = {
      left: warning.sourceFileLabels[0],
      right: warning.sourceFileLabels[1],
      start: warning.overlapStart,
      end: warning.overlapEnd
    };
    if (warning.code === 'overlapping_date_ranges') {
      return translate('warning_overlap', replacements);
    }
    if (warning.code === 'identical_file_content') {
      return translate('warning_identical', replacements);
    }
    return translate('warning_metadata', replacements);
  }

  function renderSourceFiles(result) {
    elements.sourceFilesTableBody.replaceChildren();
    result.files.forEach(function (file) {
      const row = document.createElement('tr');
      appendCell(row, file.label);
      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = 'status-badge' + (file.included ? '' : ' excluded');
      setText(status, translate(file.included ? 'mapping_file_included' : 'mapping_file_excluded'));
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      appendCell(row, formatNumber(file.totalRows, 0), 'number');
      appendCell(row, formatNumber(file.validRows, 0), 'number');
      appendCell(row, formatNumber(file.invalidRows, 0), 'number');
      elements.sourceFilesTableBody.appendChild(row);
    });

    elements.batchWarnings.replaceChildren();
    elements.batchWarnings.classList.toggle('hidden', result.warnings.length === 0);
    if (result.warnings.length > 0) {
      const title = document.createElement('strong');
      setText(title, translate('warning_title'));
      const list = document.createElement('ul');
      result.warnings.forEach(function (warning) {
        const item = document.createElement('li');
        setText(item, warningText(warning));
        list.appendChild(item);
      });
      elements.batchWarnings.appendChild(title);
      elements.batchWarnings.appendChild(list);
    }
  }

  function renderResults(result, options) {
    const preserveView = Boolean(options && options.preserveView);
    state.result = result;
    state.analysis = core.analyzeRows(result.rows);
    if (!preserveView) {
      state.articlePage = 1;
      state.selectedArticleId = null;
      state.detailPage = 1;
      state.issuePage = 1;
    }
    const hasIssues = result.invalidRows > 0 || result.excludedFiles > 0 || result.warnings.length > 0;
    elements.importSummary.className = 'import-summary' + (hasIssues ? ' warning' : '');
    let summary = translate('summary_valid', {
      included: result.includedFiles,
      selected: result.selectedFiles,
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
    if (result.excludedFiles > 0) {
      summary += ' ' + translate('summary_excluded', { count: result.excludedFiles });
    }
    setText(elements.importSummary, summary);
    renderSourceFiles(result);
    renderMetrics(state.analysis);
    renderArticles();
    if (state.selectedArticleId && selectedArticle()) {
      renderArticleDetail();
    } else {
      showArticleOverview();
    }
    renderIssues(result.issues);
    elements.exportButton.disabled = result.validRows === 0;
    elements.resultsPanel.classList.remove('hidden');
  }

  function sourceContext(file) {
    return { id: file.id, name: file.name, label: file.label };
  }

  function refreshAnalyzedResults(preserveView) {
    const batchFiles = state.files.map(function (file) {
      if (file.parsed && !file.errorKey) {
        const mapping = file.confirmedMapping || file.mapping;
        file.result = core.importParsedCsv(file.parsed, mapping, {
          locale: state.language,
          sourceFile: sourceContext(file)
        });
      } else {
        file.result = null;
      }
      return file;
    });
    const result = core.combineImportResults(batchFiles);
    renderMapping();
    renderResults(result, { preserveView: preserveView });
  }

  function clearAnalysis() {
    state.result = null;
    state.analysis = null;
    state.articlePage = 1;
    state.selectedArticleId = null;
    state.detailPage = 1;
    state.issuePage = 1;
    state.files.forEach(function (file) {
      file.result = null;
      file.confirmedMapping = null;
    });
    elements.resultsPanel.classList.add('hidden');
    elements.exportButton.disabled = true;
  }

  function updateSourceStatus() {
    const rows = state.files.reduce(function (sum, file) { return sum + (file.dataRowCount || 0); }, 0);
    const errors = state.files.filter(function (file) { return Boolean(file.errorKey); }).length;
    setSourceStatus(errors > 0 ? 'files_detected_with_errors' : 'files_detected', {
      files: state.files.length,
      rows: rows,
      errors: errors
    });
  }

  function decodeFileEntry(file) {
    file.errorKey = null;
    file.content = null;
    file.parsed = null;
    file.headers = [];
    file.mapping = {};
    file.confirmedMapping = null;
    file.dataRowCount = 0;
    file.hasParseErrors = false;
    file.result = null;
    file.activeEncoding = null;
    try {
      const decoded = encoding.decodeBufferDetailed(file.buffer, file.encodingMode || 'auto');
      const parsed = core.parseCsv(decoded.text);
      if (parsed.rows.length === 0) {
        throw createTranslationError('empty_file');
      }
      file.content = decoded.text;
      file.activeEncoding = decoded.encoding;
      if (decoded.automatic) {
        file.detectedEncoding = decoded.encoding;
      }
      file.parsed = parsed;
      file.headers = parsed.rows[0].values.map(function (header) { return String(header).trim(); });
      file.mapping = core.detectMapping(file.headers);
      file.dataRowCount = Math.max(0, parsed.rows.length - 1);
      file.hasParseErrors = parsed.errors.length > 0;
    } catch (error) {
      file.errorKey = error && error.translationKey ? error.translationKey : 'invalid_encoding';
    }
  }

  async function handleFileChange() {
    const selectedFiles = Array.from(elements.fileInput.files || []);
    if (selectedFiles.length === 0) {
      return;
    }
    const selectionVersion = state.fileSelectionVersion + 1;
    state.fileSelectionVersion = selectionVersion;
    clearAnalysis();
    elements.articleFilter.value = '';
    elements.analyzeButton.disabled = true;
    showMappingMessage('');

    const idPrefix = 'source-' + Date.now().toString(36) + '-';
    const newSources = selectedFiles.map(function (file, index) {
      return {
        id: idPrefix + (index + 1),
        name: file.name,
        size: file.size,
        lastModified: file.lastModified
      };
    });
    const newEntries = newSources.map(function (source, index) {
      return {
        id: source.id,
        name: source.name,
        label: source.label,
        size: source.size,
        lastModified: source.lastModified,
        browserFile: selectedFiles[index],
        buffer: null,
        reading: true,
        errorKey: null,
        encodingMode: 'auto',
        activeEncoding: null,
        detectedEncoding: null,
        content: null,
        parsed: null,
        headers: [],
        mapping: {},
        confirmedMapping: null,
        dataRowCount: 0,
        hasParseErrors: false,
        result: null
      };
    });
    state.files = state.files.concat(newEntries);
    core.assignSourceFileLabels(state.files).forEach(function (source, index) { state.files[index].label = source.label; });
    setSourceStatus('reading_files', { count: state.files.length });
    elements.mappingPanel.classList.remove('hidden');
    renderMapping();

    await Promise.all(newEntries.map(async function (file) {
      try {
        file.buffer = await readFileBuffer(file.browserFile);
        if (selectionVersion !== state.fileSelectionVersion) {
          return;
        }
        decodeFileEntry(file);
      } catch (error) {
        file.errorKey = error && error.translationKey ? error.translationKey : 'file_read_error';
      } finally {
        file.reading = false;
      }
    }));

    if (selectionVersion !== state.fileSelectionVersion) {
      return;
    }
    renderMapping();
    updateSourceStatus();
    const hasPreparedFile = state.files.some(function (file) { return Boolean(file.parsed); });
    elements.analyzeButton.disabled = !hasPreparedFile;
    showMappingMessage(hasPreparedFile ? '' : translate('no_prepared_files'));
    persistWorkspace();
  }

  function analyze() {
    const preparedFiles = state.files.filter(function (file) { return Boolean(file.parsed) && !file.errorKey; });
    if (preparedFiles.length === 0) {
      showMappingMessage(translate('no_prepared_files'));
      return;
    }
    preparedFiles.forEach(function (file) {
      file.confirmedMapping = Object.assign({}, file.mapping);
    });
    showMappingMessage('');
    refreshAnalyzedResults(false);
    persistWorkspace();
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

  function workspaceError(error) {
    const keys = { STORAGE_UNAVAILABLE: 'workspace_storage_unavailable', STORAGE_QUOTA: 'workspace_storage_quota',
      INVALID_BACKUP: 'workspace_invalid_backup', STORAGE_INVALID: 'workspace_invalid_backup',
      UNSUPPORTED_BACKUP: 'workspace_unsupported_backup', UNSUPPORTED_SCHEMA: 'workspace_unsupported_backup' };
    setText(elements.workspaceMessage, translate(keys[error && error.message] || 'workspace_error'));
    elements.workspaceMessage.classList.remove('hidden');
  }

  function workspaceSnapshot() {
    return {
      files: state.files.map(function (file) {
        const saved = Object.assign({}, file);
        delete saved.browserFile; delete saved.buffer; delete saved.content; saved.reading = false;
        return saved;
      }),
      result: state.result, analysis: state.analysis, sourceStatus: state.sourceStatus,
      articleFilter: elements.articleFilter.value, articleSort: elements.articleSort.value
    };
  }

  function persistWorkspace() {
    if (!workspaceRepository || !state.workspaceId) return;
    try {
      workspaceRepository.save(state.workspaceId, workspaceSnapshot());
      elements.workspaceMessage.classList.add('hidden');
    } catch (error) { workspaceError(error); }
  }

  function renderWorkspaceList() {
    const store = workspaceRepository.load();
    elements.workspaceSelect.replaceChildren();
    store.workspaces.forEach(function (workspace) { addOption(elements.workspaceSelect, workspace.id, workspace.name); });
    elements.workspaceSelect.value = state.workspaceId || '';
    const unavailable = store.workspaces.length === 0;
    [elements.workspaceRename, elements.workspaceDelete, elements.workspaceExport].forEach(function (button) { button.disabled = unavailable; });
  }

  function openWorkspace(workspaceId) {
    const store = workspaceRepository.load();
    const workspace = store.workspaces.find(function (item) { return item.id === workspaceId; });
    if (!workspace) throw new Error('WORKSPACE_NOT_FOUND');
    workspaceRepository.select(workspaceId); state.workspaceId = workspaceId;
    const data = workspace.data || {};
    state.files = data.files || []; state.result = data.result || null; state.analysis = data.analysis || null;
    state.sourceStatus = data.sourceStatus || { key: 'no_file_selected', replacements: {}, error: false, text: '' };
    state.fileSelectionVersion += 1; state.articlePage = 1; state.selectedArticleId = null; state.detailPage = 1; state.issuePage = 1;
    elements.articleFilter.value = data.articleFilter || ''; elements.articleSort.value = data.articleSort || 'lines'; elements.fileInput.value = '';
    if (state.files.length) { elements.mappingPanel.classList.remove('hidden'); renderMapping(); elements.analyzeButton.disabled = !state.files.some(function (file) { return file.parsed; }); }
    else { elements.mappingPanel.classList.add('hidden'); elements.mappingGrid.replaceChildren(); }
    if (state.result && state.analysis) renderResults(state.result, { preserveView: false }); else elements.resultsPanel.classList.add('hidden');
    renderSourceStatus(); renderWorkspaceList();
  }

  function createWorkspace() {
    const name = window.prompt(translate('workspace_name_prompt'), translate('workspace_default_name'));
    if (name === null) return;
    try { const workspace = workspaceRepository.create(name, {}); openWorkspace(workspace.id); } catch (error) { workspaceError(error); }
  }

  function downloadWorkspace() {
    try {
      persistWorkspace(); const text = workspaceRepository.export(state.workspaceId);
      const blob = new Blob([text], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'openslotting-workspace.json'; link.click(); URL.revokeObjectURL(url);
    } catch (error) { workspaceError(error); }
  }

  function initializeWorkspaces() {
    try {
      workspaceRepository = new workspaceCore.Repository(window.localStorage);
      let store = workspaceRepository.load();
      if (!store.workspaces.length) { const initial = workspaceRepository.create(translate('workspace_default_name'), {}); store = workspaceRepository.load(); store.selectedId = initial.id; }
      openWorkspace(store.selectedId || store.workspaces[0].id);
    } catch (error) { workspaceRepository = null; workspaceError(error); }
  }

  function reset() {
    state.files = [];
    state.fileSelectionVersion += 1;
    clearAnalysis();
    elements.fileInput.value = '';
    elements.articleFilter.value = '';
    setSourceStatus('no_file_selected');
    elements.mappingGrid.replaceChildren();
    elements.mappingPanel.classList.add('hidden');
    elements.resultsPanel.classList.add('hidden');
    persistWorkspace();
  }

  elements.fileInput.addEventListener('change', handleFileChange);
  elements.mappingGrid.addEventListener('change', function (event) {
    const select = event.target.closest('select[data-encoding-file-id]');
    if (!select || !elements.mappingGrid.contains(select)) {
      return;
    }
    const file = state.files.find(function (item) { return item.id === select.dataset.encodingFileId; });
    if (!file || !file.buffer) {
      return;
    }
    clearAnalysis();
    file.encodingMode = select.value;
    decodeFileEntry(file);
    renderMapping();
    updateSourceStatus();
    const replacement = elements.mappingGrid.querySelector('select[data-encoding-file-id="' + file.id + '"]');
    if (replacement) {
      replacement.focus();
    }
    const hasPreparedFile = state.files.some(function (item) { return Boolean(item.parsed); });
    elements.analyzeButton.disabled = !hasPreparedFile;
    showMappingMessage(hasPreparedFile ? '' : translate('no_prepared_files'));
    persistWorkspace();
  });
  elements.mappingGrid.addEventListener('change', function (event) {
    const select = event.target.closest('select[data-file-id][data-field]');
    if (!select || !elements.mappingGrid.contains(select)) {
      return;
    }
    const file = state.files.find(function (item) { return item.id === select.dataset.fileId; });
    if (!file) {
      return;
    }
    file.mapping[select.dataset.field] = select.value === '' ? null : Number(select.value);
    const fileId = file.id;
    const field = select.dataset.field;
    clearAnalysis();
    renderMapping();
    const replacement = elements.mappingGrid.querySelector('select[data-file-id="' + fileId + '"][data-field="' + field + '"]');
    if (replacement) {
      replacement.focus();
    }
    persistWorkspace();
  });
  elements.mappingGrid.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-remove-file-id]');
    if (!button || !elements.mappingGrid.contains(button)) {
      return;
    }
    clearAnalysis();
    state.files = state.files.filter(function (file) { return file.id !== button.dataset.removeFileId; });
    const relabeled = core.assignSourceFileLabels(state.files);
    relabeled.forEach(function (source, index) {
      state.files[index].label = source.label;
    });
    elements.fileInput.value = '';
    if (state.files.length === 0) {
      reset();
      return;
    }
    renderMapping();
    updateSourceStatus();
    elements.analyzeButton.disabled = !state.files.some(function (file) { return Boolean(file.parsed); });
    persistWorkspace();
  });
  elements.languageSelect.addEventListener('change', function () {
    state.language = elements.languageSelect.value === 'de' ? 'de' : 'en';
    applyLanguage();
  });
  elements.analyzeButton.addEventListener('click', analyze);
  elements.exportButton.addEventListener('click', exportResults);
  elements.articleFilter.addEventListener('input', function () {
    state.articlePage = 1;
    renderArticles();
  });
  elements.articleSort.addEventListener('change', function () {
    state.articlePage = 1;
    renderArticles();
  });
  elements.articlePrevious.addEventListener('click', function () {
    if (state.articlePage > 1) {
      state.articlePage -= 1;
      renderArticles();
    }
  });
  elements.articleNext.addEventListener('click', function () {
    state.articlePage += 1;
    renderArticles();
  });
  elements.articleTableBody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-article-id]');
    if (button && elements.articleTableBody.contains(button)) {
      openArticleDetail(button.dataset.articleId);
    }
  });
  elements.articleDetailBack.addEventListener('click', function () {
    const articleId = state.selectedArticleId;
    showArticleOverview(articleId);
  });
  elements.articleDetailPrevious.addEventListener('click', function () {
    if (state.detailPage > 1) {
      state.detailPage -= 1;
      renderArticleDetail();
    }
  });
  elements.articleDetailNext.addEventListener('click', function () {
    state.detailPage += 1;
    renderArticleDetail();
  });
  elements.issuePrevious.addEventListener('click', function () {
    if (state.issuePage > 1) {
      state.issuePage -= 1;
      renderIssues(state.result ? state.result.issues : []);
    }
  });
  elements.issueNext.addEventListener('click', function () {
    state.issuePage += 1;
    renderIssues(state.result ? state.result.issues : []);
  });
  elements.resetButton.addEventListener('click', reset);

  elements.workspaceSelect.addEventListener('change', function () {
    try { openWorkspace(elements.workspaceSelect.value); } catch (error) { workspaceError(error); }
  });
  elements.workspaceCreate.addEventListener('click', createWorkspace);
  elements.workspaceRename.addEventListener('click', function () {
    if (!workspaceRepository || !state.workspaceId) return;
    const current = elements.workspaceSelect.options[elements.workspaceSelect.selectedIndex];
    const name = window.prompt(translate('workspace_name_prompt'), current ? current.textContent : '');
    if (name === null) return;
    try { workspaceRepository.rename(state.workspaceId, name); renderWorkspaceList(); } catch (error) { workspaceError(error); }
  });
  elements.workspaceDelete.addEventListener('click', function () {
    if (!workspaceRepository || !state.workspaceId || !window.confirm(translate('workspace_delete_confirm'))) return;
    try {
      const store = workspaceRepository.remove(state.workspaceId);
      if (store.selectedId) openWorkspace(store.selectedId);
      else { const workspace = workspaceRepository.create(translate('workspace_default_name'), {}); openWorkspace(workspace.id); }
    } catch (error) { workspaceError(error); }
  });
  elements.workspaceExport.addEventListener('click', downloadWorkspace);
  elements.workspaceRestoreInput.addEventListener('change', function () {
    const file = elements.workspaceRestoreInput.files && elements.workspaceRestoreInput.files[0];
    if (!file || !workspaceRepository) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const replace = window.confirm(translate('workspace_replace_confirm'));
        const restored = workspaceRepository.restore(String(reader.result), replace ? { replaceId: state.workspaceId } : {});
        openWorkspace(restored.id); setText(elements.workspaceMessage, translate('workspace_restored')); elements.workspaceMessage.classList.remove('hidden');
      } catch (error) { workspaceError(error); }
      elements.workspaceRestoreInput.value = '';
    };
    reader.onerror = function () { workspaceError(new Error('INVALID_BACKUP')); };
    reader.readAsText(file, 'utf-8');
  });

  applyLanguage();
  initializeWorkspaces();
}());
