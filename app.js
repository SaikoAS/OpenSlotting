(function () {
  'use strict';

  const core = window.OpenSlottingCsv;
  const encoding = window.OpenSlottingEncoding;
  const workspaceModel = window.OpenSlottingWorkspace;
  const storageApi = window.OpenSlottingStorage;
  const workspaceRepository = storageApi.createRepository();
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
      workspace_eyebrow: 'Local storage',
      workspace_title: 'Workspaces',
      workspace_hint: 'Each workspace remains separate in this browser profile.',
      workspace_select_label: 'Workspace selection',
      workspace_none: 'No workspace selected',
      workspace_actions_label: 'Workspace actions',
      workspace_open_selected: 'Open selected',
      workspace_cancel_loading: 'Cancel loading',
      workspace_create: 'Create',
      workspace_rename: 'Rename',
      workspace_delete: 'Delete',
      workspace_backup: 'Export backup',
      workspace_restore_new: 'Restore as new',
      workspace_restore_replace: 'Replace from backup',
      workspace_create_prompt: 'Name the new workspace:',
      workspace_rename_prompt: 'Enter the new workspace name:',
      workspace_delete_confirm: 'Delete workspace “{{name}}” and all of its locally stored data? This cannot be undone.',
      workspace_replace_confirm: 'Replace workspace “{{name}}” with this backup? All current data in that workspace will be removed.',
      workspace_reset_confirm: 'Remove every source file and analysis result from workspace “{{name}}”? The workspace itself will remain.',
      workspace_default_name: 'Workspace {{number}}',
      workspace_loading: 'Opening local workspace storage…',
      workspace_none_status: 'Select and open a workspace, create one, or restore a backup before selecting CSV files.',
      workspace_select_status: 'Workspace overview is ready. Select a workspace to load its data.',
      workspace_last_used: 'Last used',
      workspace_active: 'Opened',
      workspace_overview_meta: '{{sources}} sources · {{rows}} normalized rows · updated {{updated}}',
      workspace_loading_payload: 'Loading “{{name}}” from local browser storage…',
      workspace_loading_validating: 'Validating “{{name}}” in the background…',
      workspace_loading_file: 'Preparing source {{current}} of {{total}} in the background: {{file}}',
      workspace_loading_analysis: 'Analyzing “{{name}}” in the background…',
      workspace_loading_cancelled: 'Loading was cancelled. No workspace data was changed.',
      workspace_worker_fallback: 'Background processing is unavailable. Continuing on the main browser thread…',
      worker_failed: 'Background preparation failed. The selected workspace was not opened.',
      workspace_storage_unavailable: 'Local workspace storage is unavailable in this browser context.',
      workspace_storage_estimating: '{{count}} workspaces · reading the approximate browser storage usage…',
      workspace_storage_summary: '{{count}} workspaces · approximately {{usage}} used · approximately {{remaining}} available in the browser quota ({{quota}} total).',
      workspace_storage_no_estimate: '{{count}} workspaces · the browser does not provide a storage estimate for this local origin.',
      workspace_storage_estimate_failed: '{{count}} workspaces · the browser storage estimate could not be read.',
      workspace_saving: 'Saving “{{name}}” locally…',
      workspace_saved: 'Workspace “{{name}}” is saved locally.',
      workspace_created: 'Workspace “{{name}}” was created.',
      workspace_opened: 'Workspace “{{name}}” was opened.',
      workspace_renamed: 'Workspace was renamed to “{{name}}”.',
      workspace_deleted: 'Workspace “{{name}}” was deleted.',
      workspace_backup_exported: 'A complete backup of “{{name}}” was exported.',
      workspace_restored_new: 'Backup was restored as the new workspace “{{name}}”.',
      workspace_restored_replace: 'Workspace “{{name}}” was replaced from the validated backup.',
      workspace_cleared: 'All sources were removed from workspace “{{name}}”.',
      workspace_error_prefix: 'Workspace error: ',
      workspace_name_required: 'Enter a workspace name.',
      workspace_name_too_long: 'The workspace name may contain at most 120 characters.',
      invalid_backup_json: 'The selected backup is not valid JSON.',
      invalid_backup_format: 'The selected file is not an OpenSlotting workspace backup.',
      unsupported_backup_version: 'The backup version is not supported by this OpenSlotting version.',
      unsupported_workspace_version: 'The workspace schema is newer than this OpenSlotting version.',
      invalid_backup: 'The workspace backup is invalid or incomplete.',
      backup_read_failed: 'The selected backup file could not be read.',
      quota_exceeded: 'The browser storage quota is insufficient. No partial change was saved.',
      storage_blocked: 'Another OpenSlotting window is blocking the local database upgrade. Close the other window and reload.',
      storage_unavailable: 'IndexedDB is unavailable. Persistent workspaces cannot be used in this browser context.',
      storage_aborted: 'The browser aborted the storage transaction. No partial change was saved.',
      workspace_not_found: 'The selected workspace no longer exists in local browser storage.',
      workspace_conflict: 'This workspace changed in another browser tab. Reopen it before saving more changes.',
      storage_failed: 'The local browser storage operation failed.',
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
      reset_button: 'Clear workspace data',
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
      workspace_eyebrow: 'Lokaler Speicher',
      workspace_title: 'Arbeitsbereiche',
      workspace_hint: 'Jeder Arbeitsbereich bleibt in diesem Browserprofil vollständig getrennt.',
      workspace_select_label: 'Arbeitsbereichsauswahl',
      workspace_none: 'Kein Arbeitsbereich ausgewählt',
      workspace_actions_label: 'Aktionen für Arbeitsbereiche',
      workspace_open_selected: 'Auswahl öffnen',
      workspace_cancel_loading: 'Laden abbrechen',
      workspace_create: 'Erstellen',
      workspace_rename: 'Umbenennen',
      workspace_delete: 'Löschen',
      workspace_backup: 'Backup exportieren',
      workspace_restore_new: 'Als neu wiederherstellen',
      workspace_restore_replace: 'Aus Backup ersetzen',
      workspace_create_prompt: 'Name des neuen Arbeitsbereichs:',
      workspace_rename_prompt: 'Neuen Namen des Arbeitsbereichs eingeben:',
      workspace_delete_confirm: 'Arbeitsbereich „{{name}}“ und alle lokal gespeicherten Daten löschen? Dies kann nicht rückgängig gemacht werden.',
      workspace_replace_confirm: 'Arbeitsbereich „{{name}}“ durch dieses Backup ersetzen? Alle aktuellen Daten dieses Arbeitsbereichs werden entfernt.',
      workspace_reset_confirm: 'Alle Quelldateien und Analyseergebnisse aus „{{name}}“ entfernen? Der Arbeitsbereich selbst bleibt erhalten.',
      workspace_default_name: 'Arbeitsbereich {{number}}',
      workspace_loading: 'Lokaler Arbeitsbereichsspeicher wird geöffnet …',
      workspace_none_status: 'Bitte einen Arbeitsbereich auswählen und öffnen, neu erstellen oder aus einem Backup wiederherstellen.',
      workspace_select_status: 'Die Arbeitsbereichsübersicht ist bereit. Zum Laden bitte einen Arbeitsbereich auswählen.',
      workspace_last_used: 'Zuletzt verwendet',
      workspace_active: 'Geöffnet',
      workspace_overview_meta: '{{sources}} Quellen · {{rows}} normalisierte Zeilen · geändert {{updated}}',
      workspace_loading_payload: '„{{name}}“ wird aus dem lokalen Browserspeicher geladen …',
      workspace_loading_validating: '„{{name}}“ wird im Hintergrund geprüft …',
      workspace_loading_file: 'Quelle {{current}} von {{total}} wird im Hintergrund vorbereitet: {{file}}',
      workspace_loading_analysis: '„{{name}}“ wird im Hintergrund analysiert …',
      workspace_loading_cancelled: 'Das Laden wurde abgebrochen. Es wurden keine Arbeitsbereichsdaten verändert.',
      workspace_worker_fallback: 'Die Hintergrundverarbeitung ist nicht verfügbar. Verarbeitung wird im Browser-Hauptthread fortgesetzt …',
      worker_failed: 'Die Hintergrundvorbereitung ist fehlgeschlagen. Der ausgewählte Arbeitsbereich wurde nicht geöffnet.',
      workspace_storage_unavailable: 'Der lokale Arbeitsbereichsspeicher ist in diesem Browserkontext nicht verfügbar.',
      workspace_storage_estimating: '{{count}} Arbeitsbereiche · ungefähre Browser-Speichernutzung wird ermittelt …',
      workspace_storage_summary: '{{count}} Arbeitsbereiche · ungefähr {{usage}} verwendet · ungefähr {{remaining}} innerhalb der Browserquote verfügbar ({{quota}} gesamt).',
      workspace_storage_no_estimate: '{{count}} Arbeitsbereiche · der Browser stellt für diesen lokalen Ursprung keine Speicherschätzung bereit.',
      workspace_storage_estimate_failed: '{{count}} Arbeitsbereiche · die Speicherschätzung des Browsers konnte nicht gelesen werden.',
      workspace_saving: '„{{name}}“ wird lokal gespeichert …',
      workspace_saved: 'Arbeitsbereich „{{name}}“ ist lokal gespeichert.',
      workspace_created: 'Arbeitsbereich „{{name}}“ wurde erstellt.',
      workspace_opened: 'Arbeitsbereich „{{name}}“ wurde geöffnet.',
      workspace_renamed: 'Arbeitsbereich wurde in „{{name}}“ umbenannt.',
      workspace_deleted: 'Arbeitsbereich „{{name}}“ wurde gelöscht.',
      workspace_backup_exported: 'Ein vollständiges Backup von „{{name}}“ wurde exportiert.',
      workspace_restored_new: 'Backup wurde als neuer Arbeitsbereich „{{name}}“ wiederhergestellt.',
      workspace_restored_replace: 'Arbeitsbereich „{{name}}“ wurde durch das geprüfte Backup ersetzt.',
      workspace_cleared: 'Alle Quellen wurden aus „{{name}}“ entfernt.',
      workspace_error_prefix: 'Arbeitsbereichsfehler: ',
      workspace_name_required: 'Bitte einen Namen für den Arbeitsbereich eingeben.',
      workspace_name_too_long: 'Der Name darf höchstens 120 Zeichen enthalten.',
      invalid_backup_json: 'Das ausgewählte Backup ist kein gültiges JSON.',
      invalid_backup_format: 'Die ausgewählte Datei ist kein OpenSlotting-Arbeitsbereichsbackup.',
      unsupported_backup_version: 'Die Backup-Version wird von dieser OpenSlotting-Version nicht unterstützt.',
      unsupported_workspace_version: 'Das Arbeitsbereichsschema ist neuer als diese OpenSlotting-Version.',
      invalid_backup: 'Das Arbeitsbereichsbackup ist ungültig oder unvollständig.',
      backup_read_failed: 'Die ausgewählte Backup-Datei konnte nicht gelesen werden.',
      quota_exceeded: 'Die Browser-Speicherquote reicht nicht aus. Es wurde keine Teiländerung gespeichert.',
      storage_blocked: 'Ein anderes OpenSlotting-Fenster blockiert das Datenbank-Upgrade. Bitte das andere Fenster schließen und neu laden.',
      storage_unavailable: 'IndexedDB ist nicht verfügbar. Dauerhafte Arbeitsbereiche können in diesem Browserkontext nicht verwendet werden.',
      storage_aborted: 'Der Browser hat die Speichertransaktion abgebrochen. Es wurde keine Teiländerung gespeichert.',
      workspace_not_found: 'Der ausgewählte Arbeitsbereich ist im lokalen Browserspeicher nicht mehr vorhanden.',
      workspace_conflict: 'Dieser Arbeitsbereich wurde in einem anderen Browser-Tab geändert. Öffnen Sie ihn vor weiteren Änderungen erneut.',
      storage_failed: 'Der lokale Browser-Speichervorgang ist fehlgeschlagen.',
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
      reset_button: 'Arbeitsbereich leeren',
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
    }
  };

  const state = {
    language: 'en',
    workspaces: [],
    selectedWorkspaceId: null,
    lastActiveWorkspaceId: null,
    activeWorkspace: null,
    storageEstimate: null,
    storageReady: false,
    workspaceLoading: false,
    workspaceProgress: null,
    restoreMode: null,
    files: [],
    fileSelectionVersion: 0,
    result: null,
    analysis: null,
    sourceStatus: { key: 'no_file_selected', replacements: {}, error: false, text: '' },
    articlePage: 1,
    selectedArticleId: null,
    detailPage: 1,
    issuePage: 1
  };

  const TABLE_PAGE_SIZE = 100;

  const elements = {
    workspaceSelect: document.getElementById('workspace-select'),
    workspaceOpen: document.getElementById('workspace-open'),
    workspaceCancel: document.getElementById('workspace-cancel'),
    workspaceCreate: document.getElementById('workspace-create'),
    workspaceRename: document.getElementById('workspace-rename'),
    workspaceDelete: document.getElementById('workspace-delete'),
    workspaceBackup: document.getElementById('workspace-backup'),
    workspaceRestoreNew: document.getElementById('workspace-restore-new'),
    workspaceRestoreReplace: document.getElementById('workspace-restore-replace'),
    workspaceRestoreFile: document.getElementById('workspace-restore-file'),
    workspaceLoadProgress: document.getElementById('workspace-load-progress'),
    workspaceLoadLabel: document.getElementById('workspace-load-label'),
    workspaceProgress: document.getElementById('workspace-progress'),
    workspaceOverview: document.getElementById('workspace-overview'),
    workspaceStorageStatus: document.getElementById('workspace-storage-status'),
    workspaceMessage: document.getElementById('workspace-message'),
    filePicker: document.querySelector('.file-picker'),
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
  };

  let workspaceSaveChain = Promise.resolve();
  let workspaceSaveRevision = 0;
  let workspaceLoadRevision = 0;
  let workspaceWorkerTask = null;
  let storageEstimateTimer = null;

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

  function formatStorageBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) {
      return '—';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let amount = bytes;
    let unitIndex = 0;
    while (amount >= 1024 && unitIndex < units.length - 1) {
      amount /= 1024;
      unitIndex += 1;
    }
    return new Intl.NumberFormat(state.language === 'de' ? 'de-DE' : 'en-US', {
      maximumFractionDigits: amount < 10 && unitIndex > 0 ? 1 : 0
    }).format(amount) + ' ' + units[unitIndex];
  }

  function setWorkspaceMessage(key, replacements, type) {
    if (!key) {
      elements.workspaceMessage.className = 'workspace-message hidden';
      setText(elements.workspaceMessage, '');
      return;
    }
    elements.workspaceMessage.className = 'workspace-message' + (type ? ' ' + type : '');
    setText(elements.workspaceMessage, translate(key, replacements));
  }

  function showWorkspaceError(error) {
    const code = error && (error.code || error.translationKey);
    let knownKey = Object.prototype.hasOwnProperty.call(TRANSLATIONS[state.language], code) ? code : 'storage_failed';
    if (code && (
      code.indexOf('invalid_backup') === 0 ||
      code.indexOf('invalid_workspace') === 0 ||
      code.indexOf('invalid_source') === 0 ||
      code.indexOf('invalid_mapping') === 0 ||
      code.indexOf('invalid_import') === 0 ||
      code.indexOf('invalid_normalized') === 0 ||
      code.indexOf('invalid_validation') === 0 ||
      code === 'duplicate_source_id'
    )) {
      knownKey = 'invalid_backup';
    }
    setWorkspaceMessage(knownKey, {}, 'error');
  }

  function renderWorkspaceProgress() {
    const progress = state.workspaceProgress;
    elements.workspaceLoadProgress.classList.toggle('hidden', !progress);
    if (!progress) {
      setText(elements.workspaceLoadLabel, '');
      elements.workspaceProgress.removeAttribute('value');
      return;
    }
    setText(elements.workspaceLoadLabel, translate(progress.key, progress.replacements));
    if (Number.isFinite(progress.value) && Number.isFinite(progress.max) && progress.max > 0) {
      elements.workspaceProgress.max = progress.max;
      elements.workspaceProgress.value = progress.value;
    } else {
      elements.workspaceProgress.removeAttribute('value');
    }
  }

  function renderWorkspaceOverview() {
    elements.workspaceOverview.replaceChildren();
    state.workspaces.forEach(function (workspace) {
      const card = document.createElement('article');
      card.className = 'workspace-card' + (workspace.id === state.selectedWorkspaceId ? ' selected' : '');
      const heading = document.createElement('div');
      heading.className = 'workspace-card-heading';
      const name = document.createElement('h3');
      setText(name, workspace.name);
      heading.appendChild(name);
      if (workspace.id === state.lastActiveWorkspaceId || (state.activeWorkspace && workspace.id === state.activeWorkspace.id)) {
        const tag = document.createElement('span');
        tag.className = 'workspace-card-tag';
        setText(tag, translate(state.activeWorkspace && workspace.id === state.activeWorkspace.id ? 'workspace_active' : 'workspace_last_used'));
        heading.appendChild(tag);
      }
      const updatedDate = new Date(workspace.updatedAt);
      const updated = Number.isFinite(updatedDate.getTime())
        ? new Intl.DateTimeFormat(state.language === 'de' ? 'de-DE' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(updatedDate)
        : '—';
      const details = document.createElement('p');
      details.className = 'table-note';
      setText(details, translate('workspace_overview_meta', {
        sources: Number.isInteger(workspace.sourceCount) ? formatNumber(workspace.sourceCount, 0) : '—',
        rows: Number.isInteger(workspace.normalizedRowCount) ? formatNumber(workspace.normalizedRowCount, 0) : '—',
        updated: updated
      }));
      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'secondary-button';
      openButton.dataset.openWorkspaceId = workspace.id;
      openButton.disabled = state.workspaceLoading;
      setText(openButton, translate('workspace_open_selected'));
      card.appendChild(heading);
      card.appendChild(details);
      card.appendChild(openButton);
      elements.workspaceOverview.appendChild(card);
    });
  }

  function renderWorkspaceControls() {
    const selectedId = state.selectedWorkspaceId || '';
    elements.workspaceSelect.replaceChildren();
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    setText(emptyOption, translate('workspace_none'));
    elements.workspaceSelect.appendChild(emptyOption);
    state.workspaces.forEach(function (workspace) {
      const option = document.createElement('option');
      option.value = workspace.id;
      setText(option, workspace.name + (workspace.id === state.lastActiveWorkspaceId ? ' · ' + translate('workspace_last_used') : ''));
      elements.workspaceSelect.appendChild(option);
    });
    elements.workspaceSelect.value = selectedId;

    const fileReadPending = state.files.some(function (file) { return Boolean(file.reading); });
    const editsLocked = state.workspaceLoading || fileReadPending;
    const ready = state.storageReady && !editsLocked;
    const hasWorkspace = ready && Boolean(state.activeWorkspace);
    const hasSelection = ready && Boolean(selectedId);
    elements.workspaceSelect.disabled = !ready || state.workspaces.length === 0;
    elements.workspaceOpen.disabled = !hasSelection;
    elements.workspaceCancel.classList.toggle('hidden', !state.workspaceLoading);
    elements.workspaceCreate.disabled = !ready;
    elements.workspaceRestoreNew.disabled = !ready;
    elements.workspaceRename.disabled = !hasSelection;
    elements.workspaceDelete.disabled = !hasSelection;
    elements.workspaceBackup.disabled = !hasSelection;
    elements.workspaceRestoreReplace.disabled = !hasSelection;
    elements.fileInput.disabled = !hasWorkspace;
    elements.resetButton.disabled = !hasWorkspace || state.files.length === 0;
    elements.filePicker.classList.toggle('disabled', !hasWorkspace);
    elements.languageSelect.disabled = editsLocked;
    elements.analyzeButton.disabled = editsLocked || !state.activeWorkspace || !state.files.some(function (file) { return Boolean(file.parsed); });
    elements.exportButton.disabled = editsLocked || !state.result || state.result.validRows === 0;
    elements.mappingGrid.querySelectorAll('select, button').forEach(function (control) {
      const fileId = control.dataset.encodingFileId || control.dataset.removeFileId || control.dataset.fileId;
      const file = state.files.find(function (item) { return item.id === fileId; });
      if (control.dataset.encodingFileId) {
        control.disabled = editsLocked || !file || file.reading || !file.buffer;
      } else if (control.dataset.removeFileId) {
        control.disabled = editsLocked || !file || file.reading;
      } else {
        control.disabled = editsLocked;
      }
    });
    renderWorkspaceProgress();
    renderWorkspaceOverview();
  }

  function renderStorageStatus() {
    const estimate = state.storageEstimate;
    if (!estimate) {
      setText(elements.workspaceStorageStatus, translate(state.storageReady ? 'workspace_storage_estimating' : 'workspace_loading', {
        count: state.workspaces.length
      }));
      return;
    }
    if (estimate.available) {
      setText(elements.workspaceStorageStatus, translate('workspace_storage_summary', {
        count: state.workspaces.length,
        usage: formatStorageBytes(estimate.usage),
        remaining: formatStorageBytes(estimate.remaining),
        quota: formatStorageBytes(estimate.quota)
      }));
    } else {
      setText(elements.workspaceStorageStatus, translate(
        estimate.reason === 'failed' ? 'workspace_storage_estimate_failed' : 'workspace_storage_no_estimate',
        { count: state.workspaces.length }
      ));
    }
  }

  async function refreshWorkspaceCatalog(options) {
    state.workspaces = await workspaceRepository.listWorkspaces();
    if (state.selectedWorkspaceId && !state.workspaces.some(function (workspace) { return workspace.id === state.selectedWorkspaceId; })) {
      state.selectedWorkspaceId = null;
    }
    renderStorageStatus();
    renderWorkspaceControls();
    if (options && options.refreshEstimate) {
      state.storageEstimate = await workspaceRepository.estimateStorage();
      renderStorageStatus();
    }
  }

  function scheduleStorageEstimateRefresh() {
    if (storageEstimateTimer !== null) {
      clearTimeout(storageEstimateTimer);
    }
    storageEstimateTimer = setTimeout(async function () {
      storageEstimateTimer = null;
      state.storageEstimate = await workspaceRepository.estimateStorage();
      renderStorageStatus();
    }, 1000);
  }

  function captureActiveWorkspace() {
    return workspaceModel.captureWorkspace(state.activeWorkspace, state, { clonePayload: false });
  }

  function persistActiveWorkspace(successKey) {
    if (!state.storageReady || state.workspaceLoading || !state.activeWorkspace) {
      return Promise.resolve(null);
    }
    let snapshot;
    try {
      snapshot = captureActiveWorkspace();
    } catch (error) {
      showWorkspaceError(error);
      return Promise.reject(error);
    }
    const revision = workspaceSaveRevision + 1;
    workspaceSaveRevision = revision;
    setWorkspaceMessage('workspace_saving', { name: snapshot.name });
    const task = workspaceSaveChain
      .catch(function () {})
      .then(function () {
        const current = state.activeWorkspace && state.activeWorkspace.id === snapshot.id
          ? state.activeWorkspace
          : state.workspaces.find(function (workspace) { return workspace.id === snapshot.id; });
        return workspaceRepository.updateWorkspace(snapshot, {
          validated: true,
          expectedRevision: current ? current.storageRevision : null
        });
      })
      .then(async function (saved) {
        if (state.activeWorkspace && state.activeWorkspace.id === saved.id) {
          state.activeWorkspace = workspaceMetadata(saved);
        }
        await refreshWorkspaceCatalog();
        scheduleStorageEstimateRefresh();
        if (revision === workspaceSaveRevision && state.activeWorkspace && state.activeWorkspace.id === saved.id) {
          setWorkspaceMessage(successKey || 'workspace_saved', { name: saved.name });
        }
        return saved;
      })
      .catch(function (error) {
        showWorkspaceError(error);
        throw error;
      });
    workspaceSaveChain = task;
    return task;
  }

  function downloadTextFile(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
    const editsLocked = state.workspaceLoading || state.files.some(function (file) { return Boolean(file.reading); });
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
      removeButton.disabled = editsLocked || file.reading;
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
      encodingSelect.disabled = editsLocked || file.reading || !file.buffer;
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
          select.disabled = editsLocked;
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

  function applyLanguage(options) {
    document.documentElement.lang = state.language;
    document.title = translate('page_title');
    setText(elements.appVersion, 'OpenSlotting v' + core.APP_VERSION);
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      setText(element, translate(element.dataset.i18n));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
      element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (element) {
      element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
    });
    elements.languageSelect.setAttribute('aria-label', translate('language_label'));
    renderWorkspaceControls();
    renderStorageStatus();
    if (state.files.length > 0) {
      renderMapping();
    }
    if (state.result && !(options && options.skipAnalysisRefresh)) {
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
    state.analysis = options && options.analysis ? options.analysis : core.analyzeRows(result.rows);
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

  function clearAnalysis(options) {
    const preserveMappings = Boolean(options && options.preserveMappings);
    state.result = null;
    state.analysis = null;
    state.articlePage = 1;
    state.selectedArticleId = null;
    state.detailPage = 1;
    state.issuePage = 1;
    state.files.forEach(function (file) {
      file.result = null;
      if (!preserveMappings) {
        file.confirmedMapping = null;
      }
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
        const emptyError = new Error('The selected CSV file is empty or has no header row.');
        emptyError.translationKey = 'empty_file';
        throw emptyError;
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
    if (!state.activeWorkspace || state.workspaceLoading || state.files.some(function (file) { return Boolean(file.reading); })) {
      elements.fileInput.value = '';
      return;
    }
    const selectedFiles = Array.from(elements.fileInput.files || []);
    if (selectedFiles.length === 0) {
      return;
    }
    const selectionVersion = state.fileSelectionVersion + 1;
    state.fileSelectionVersion = selectionVersion;
    clearAnalysis({ preserveMappings: true });
    elements.articleFilter.value = '';
    elements.analyzeButton.disabled = true;
    showMappingMessage('');

    const descriptors = state.files.map(function (file) {
      return {
        id: file.id,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified
      };
    }).concat(selectedFiles.map(function (file) {
      return {
        id: workspaceModel.createId('source'),
        name: file.name,
        size: file.size,
        lastModified: file.lastModified
      };
    }));
    const labeled = core.assignSourceFileLabels(descriptors);
    state.files.forEach(function (file, index) {
      file.label = labeled[index].label;
    });
    const newEntries = labeled.slice(state.files.length).map(function (source, index) {
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
    setSourceStatus('reading_files', { count: newEntries.length });
    elements.mappingPanel.classList.remove('hidden');
    renderMapping();
    renderWorkspaceControls();

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
      renderWorkspaceControls();
      return;
    }
    renderMapping();
    updateSourceStatus();
    const hasPreparedFile = state.files.some(function (file) { return Boolean(file.parsed); });
    elements.analyzeButton.disabled = !hasPreparedFile;
    showMappingMessage(hasPreparedFile ? '' : translate('no_prepared_files'));
    elements.fileInput.value = '';
    renderWorkspaceControls();
    persistActiveWorkspace().catch(function () {});
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
    persistActiveWorkspace().catch(function () {});
  }

  function workspaceMetadata(record) {
    return {
      id: record.id,
      name: record.name,
      schemaVersion: record.schemaVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      language: record.language,
      analyzed: record.analyzed,
      storageRevision: Number.isInteger(record.storageRevision) ? record.storageRevision : 0,
      sourceCount: Array.isArray(record.files) ? record.files.length : Number(record.sourceCount || 0),
      sourceBytes: Number(record.sourceBytes || 0),
      normalizedRowCount: Number(record.normalizedRowCount || 0)
    };
  }

  function runtimeFileFromStored(stored) {
    const savedMapping = Object.assign({}, stored.mapping || {});
    const savedConfirmedMapping = stored.confirmedMapping ? Object.assign({}, stored.confirmedMapping) : null;
    const file = {
      id: stored.id,
      name: stored.name,
      label: stored.label,
      size: stored.size,
      lastModified: stored.lastModified,
      browserFile: null,
      buffer: stored.buffer,
      reading: false,
      errorKey: stored.errorKey,
      encodingMode: stored.encodingMode || 'auto',
      activeEncoding: stored.activeEncoding,
      detectedEncoding: stored.detectedEncoding,
      content: null,
      parsed: null,
      headers: [],
      mapping: {},
      confirmedMapping: null,
      dataRowCount: 0,
      hasParseErrors: false,
      result: null
    };
    if (file.buffer) {
      decodeFileEntry(file);
      file.mapping = savedMapping;
      file.confirmedMapping = savedConfirmedMapping;
    }
    return file;
  }

  function prepareWorkspaceRecord(record, language, reportProgress) {
    reportProgress({ phase: 'validating' });
    const validated = workspaceModel.migrateWorkspace(record, { clonePayload: false });
    const files = validated.files.map(function (stored, index) {
      reportProgress({
        phase: 'file',
        current: index + 1,
        total: validated.files.length,
        file: stored.label || stored.name
      });
      return runtimeFileFromStored(stored);
    });
    let result = null;
    let analysis = null;
    if (validated.analyzed) {
      reportProgress({ phase: 'analysis' });
      const batchFiles = files.map(function (file) {
        if (file.parsed && !file.errorKey) {
          const mapping = file.confirmedMapping || file.mapping;
          file.result = core.importParsedCsv(file.parsed, mapping, {
            locale: language,
            sourceFile: { id: file.id, name: file.name, label: file.label }
          });
        }
        return file;
      });
      result = core.combineImportResults(batchFiles);
      analysis = core.analyzeRows(result.rows);
    }
    return {
      workspace: {
        id: validated.id,
        schemaVersion: validated.schemaVersion,
        name: validated.name,
        createdAt: validated.createdAt,
        updatedAt: validated.updatedAt,
        language: validated.language,
        analyzed: validated.analyzed,
        sourceCount: files.length,
        sourceBytes: files.reduce(function (sum, file) {
          return sum + (file.buffer instanceof ArrayBuffer ? file.buffer.byteLength : 0);
        }, 0),
        normalizedRowCount: files.reduce(function (sum, file) {
          return sum + (file.result && Array.isArray(file.result.rows) ? file.result.rows.length : 0);
        }, 0)
      },
      files: files,
      result: result,
      analysis: analysis
    };
  }

  function workspaceWorkerMain() {
    self.onmessage = function (event) {
      try {
        const prepared = prepareWorkspaceRecord(event.data.record, event.data.language, function (progress) {
          self.postMessage({ type: 'progress', progress: progress });
        });
        const buffers = [];
        const seenBuffers = new Set();
        prepared.files.forEach(function (file) {
          if (file.buffer instanceof ArrayBuffer && !seenBuffers.has(file.buffer)) {
            seenBuffers.add(file.buffer);
            buffers.push(file.buffer);
          }
        });
        self.postMessage({ type: 'complete', prepared: prepared }, buffers);
      } catch (error) {
        self.postMessage({
          type: 'error',
          code: error && (error.code || error.translationKey) || 'worker_failed',
          message: error && error.message ? error.message : 'Workspace background processing failed.'
        });
      }
    };
  }

  function workspaceLoadError(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function omitStoredResultsForRebuild(record) {
    (record.files || []).forEach(function (file) {
      file.result = null;
    });
    return record;
  }

  function nextBrowserPaint() {
    return new Promise(function (resolve) {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () { setTimeout(resolve, 0); });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  function updateWorkspaceLoadProgress(progress, workspaceName) {
    if (!progress) {
      state.workspaceProgress = null;
    } else if (progress.phase === 'validating') {
      state.workspaceProgress = {
        key: 'workspace_loading_validating',
        replacements: { name: workspaceName }
      };
    } else if (progress.phase === 'file') {
      state.workspaceProgress = {
        key: 'workspace_loading_file',
        replacements: progress,
        value: progress.current,
        max: progress.total
      };
    } else if (progress.phase === 'analysis') {
      state.workspaceProgress = {
        key: 'workspace_loading_analysis',
        replacements: { name: workspaceName }
      };
    }
    renderWorkspaceProgress();
  }

  function createWorkspaceWorker() {
    if (
      typeof Worker !== 'function' ||
      typeof Blob !== 'function' ||
      !window.OpenSlottingEncodingFactory ||
      !window.OpenSlottingCsvFactory ||
      !window.OpenSlottingWorkspaceFactory
    ) {
      throw workspaceLoadError('worker_unavailable', 'Background workers are unavailable.');
    }
    const source = [
      "'use strict';",
      'const encoding = (' + window.OpenSlottingEncodingFactory.toString() + ')();',
      'const core = (' + window.OpenSlottingCsvFactory.toString() + ')();',
      'const workspaceModel = (' + window.OpenSlottingWorkspaceFactory.toString() + ')();',
      decodeFileEntry.toString(),
      runtimeFileFromStored.toString(),
      prepareWorkspaceRecord.toString(),
      '(' + workspaceWorkerMain.toString() + ')();'
    ].join('\n');
    const url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
    try {
      return { worker: new Worker(url), url: url };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw workspaceLoadError('worker_unavailable', error && error.message);
    }
  }

  function runWorkspaceWorker(record, language, revision, workspaceName) {
    const created = createWorkspaceWorker();
    const transfer = [];
    const seenBuffers = new Set();
    (record.files || []).forEach(function (file) {
      if (file.buffer instanceof ArrayBuffer && !seenBuffers.has(file.buffer)) {
        seenBuffers.add(file.buffer);
        transfer.push(file.buffer);
      }
    });
    return new Promise(function (resolve, reject) {
      const task = {
        worker: created.worker,
        url: created.url,
        revision: revision,
        reject: reject
      };
      workspaceWorkerTask = task;
      function dispose() {
        task.worker.terminate();
        URL.revokeObjectURL(task.url);
        if (workspaceWorkerTask === task) {
          workspaceWorkerTask = null;
        }
      }
      task.worker.onmessage = function (event) {
        if (revision !== workspaceLoadRevision) {
          dispose();
          reject(workspaceLoadError('workspace_load_cancelled'));
          return;
        }
        const message = event.data || {};
        if (message.type === 'progress') {
          updateWorkspaceLoadProgress(message.progress, workspaceName);
          return;
        }
        if (message.type === 'complete') {
          dispose();
          resolve(message.prepared);
          return;
        }
        if (message.type === 'error') {
          dispose();
          reject(workspaceLoadError(message.code || 'worker_failed', message.message));
        }
      };
      task.worker.onerror = function (event) {
        dispose();
        reject(workspaceLoadError('worker_unavailable', event && event.message));
      };
      try {
        task.worker.postMessage({ record: record, language: language }, transfer);
      } catch (error) {
        dispose();
        reject(workspaceLoadError('worker_unavailable', error && error.message));
      }
    });
  }

  function cancelWorkspaceLoading() {
    if (!state.workspaceLoading) {
      return;
    }
    workspaceLoadRevision += 1;
    if (workspaceWorkerTask) {
      const task = workspaceWorkerTask;
      workspaceWorkerTask = null;
      task.worker.terminate();
      URL.revokeObjectURL(task.url);
      task.reject(workspaceLoadError('workspace_load_cancelled'));
    }
    state.workspaceLoading = false;
    updateWorkspaceLoadProgress(null);
    setWorkspaceMessage('workspace_loading_cancelled', {}, 'warning');
    renderWorkspaceControls();
  }

  function clearWorkspaceView() {
    state.files = [];
    state.fileSelectionVersion += 1;
    clearAnalysis();
    elements.fileInput.value = '';
    elements.articleFilter.value = '';
    setSourceStatus('no_file_selected');
    elements.mappingGrid.replaceChildren();
    elements.mappingPanel.classList.add('hidden');
    elements.resultsPanel.classList.add('hidden');
  }

  async function activateWorkspace(id, successKey) {
    const workspaceId = String(id || '');
    const listedWorkspace = state.workspaces.find(function (workspace) { return workspace.id === workspaceId; });
    if (!listedWorkspace) {
      showWorkspaceError(workspaceLoadError('workspace_not_found'));
      return;
    }
    const revision = workspaceLoadRevision + 1;
    const previousActiveId = state.activeWorkspace ? state.activeWorkspace.id : state.lastActiveWorkspaceId;
    workspaceLoadRevision = revision;
    state.selectedWorkspaceId = workspaceId;
    state.workspaceLoading = true;
    state.workspaceProgress = {
      key: 'workspace_loading_payload',
      replacements: { name: listedWorkspace.name }
    };
    setWorkspaceMessage('workspace_loading_payload', { name: listedWorkspace.name });
    renderWorkspaceControls();
    try {
      await workspaceSaveChain;
      let record = await workspaceRepository.loadWorkspaceRaw(workspaceId);
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      if (!record) {
        throw new storageApi.WorkspaceStorageError('workspace_not_found', 'Workspace does not exist.');
      }
      let targetStorageRevision = record.storageRevision;
      record = omitStoredResultsForRebuild(record);
      let targetLanguage = Number(record.schemaVersion) === 0
        ? (record.language === 'de' ? 'de' : 'en')
        : record.language;
      await nextBrowserPaint();
      let prepared;
      try {
        prepared = await runWorkspaceWorker(record, targetLanguage, revision, listedWorkspace.name);
      } catch (error) {
        if (error && error.code === 'workspace_load_cancelled') {
          throw error;
        }
        if (!error || error.code !== 'worker_unavailable') {
          throw error;
        }
        setWorkspaceMessage('workspace_worker_fallback', {}, 'warning');
        state.workspaceProgress = {
          key: 'workspace_worker_fallback',
          replacements: {}
        };
        renderWorkspaceProgress();
        await nextBrowserPaint();
        record = await workspaceRepository.loadWorkspaceRaw(workspaceId);
        if (!record || revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        targetStorageRevision = record.storageRevision;
        targetLanguage = Number(record.schemaVersion) === 0
          ? (record.language === 'de' ? 'de' : 'en')
          : record.language;
        record = omitStoredResultsForRebuild(record);
        prepared = prepareWorkspaceRecord(record, targetLanguage, function (progress) {
          updateWorkspaceLoadProgress(progress, listedWorkspace.name);
        });
      }
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      const committedMetadata = await workspaceRepository.commitWorkspaceActivation(workspaceId, prepared.workspace, {
        expectedRevision: targetStorageRevision
      });
      if (revision !== workspaceLoadRevision) {
        await workspaceRepository.setActiveWorkspace(previousActiveId || null);
        throw workspaceLoadError('workspace_load_cancelled');
      }
      state.lastActiveWorkspaceId = workspaceId;
      state.activeWorkspace = workspaceMetadata(Object.assign({}, prepared.workspace, {
        storageRevision: committedMetadata.storageRevision
      }));
      state.language = targetLanguage;
      elements.languageSelect.value = targetLanguage;
      state.workspaces = state.workspaces.map(function (workspace) {
        return workspace.id === workspaceId ? Object.assign({}, workspace, state.activeWorkspace) : workspace;
      });
      clearWorkspaceView();
      state.files = prepared.files;
      if (state.files.length > 0) {
        renderMapping();
        updateSourceStatus();
        elements.mappingPanel.classList.remove('hidden');
        elements.analyzeButton.disabled = !state.files.some(function (file) { return Boolean(file.parsed); });
        if (prepared.result) {
          renderResults(prepared.result, { preserveView: false, analysis: prepared.analysis });
        }
      }
      applyLanguage({ skipAnalysisRefresh: true });
      setWorkspaceMessage(successKey || 'workspace_opened', { name: prepared.workspace.name });
    } catch (error) {
      if (error && error.code === 'workspace_load_cancelled') {
        return;
      }
      if (state.activeWorkspace) {
        state.selectedWorkspaceId = state.activeWorkspace.id;
      }
      showWorkspaceError(error);
      throw error;
    } finally {
      if (revision === workspaceLoadRevision) {
        state.workspaceLoading = false;
        updateWorkspaceLoadProgress(null);
        renderWorkspaceControls();
      }
    }
  }

  async function createWorkspace() {
    const suggestedName = translate('workspace_default_name', { number: state.workspaces.length + 1 });
    const name = window.prompt(translate('workspace_create_prompt'), suggestedName);
    if (name === null) {
      return;
    }
    try {
      const record = workspaceModel.createWorkspace(name, { language: state.language });
      await workspaceRepository.createWorkspace(record, { validated: true });
      state.selectedWorkspaceId = record.id;
      await refreshWorkspaceCatalog();
      scheduleStorageEstimateRefresh();
      await activateWorkspace(record.id, 'workspace_created');
    } catch (error) {
      showWorkspaceError(error);
    }
  }

  async function renameActiveWorkspace() {
    const selected = state.workspaces.find(function (workspace) { return workspace.id === state.selectedWorkspaceId; });
    if (!selected) {
      return;
    }
    const name = window.prompt(translate('workspace_rename_prompt'), selected.name);
    if (name === null) {
      return;
    }
    try {
      await workspaceSaveChain.catch(function () {});
      const current = state.workspaces.find(function (workspace) { return workspace.id === selected.id; });
      const renamed = await workspaceRepository.renameWorkspace(selected.id, name, {
        expectedRevision: current ? current.storageRevision : null
      });
      if (state.activeWorkspace && state.activeWorkspace.id === selected.id) {
        state.activeWorkspace = workspaceMetadata(renamed);
      }
      await refreshWorkspaceCatalog();
      setWorkspaceMessage('workspace_renamed', { name: renamed.name });
    } catch (error) {
      showWorkspaceError(error);
    }
  }

  async function deleteActiveWorkspace() {
    const selected = state.workspaces.find(function (workspace) { return workspace.id === state.selectedWorkspaceId; });
    if (!selected) {
      return;
    }
    const deletedName = selected.name;
    if (!window.confirm(translate('workspace_delete_confirm', { name: deletedName }))) {
      return;
    }
    try {
      await workspaceSaveChain.catch(function () {});
      await workspaceRepository.deleteWorkspace(selected.id);
      if (state.activeWorkspace && state.activeWorkspace.id === selected.id) {
        state.activeWorkspace = null;
        clearWorkspaceView();
      }
      if (state.lastActiveWorkspaceId === selected.id) {
        state.lastActiveWorkspaceId = null;
      }
      state.selectedWorkspaceId = null;
      await refreshWorkspaceCatalog();
      state.selectedWorkspaceId = state.workspaces.length > 0 ? state.workspaces[0].id : null;
      scheduleStorageEstimateRefresh();
      setWorkspaceMessage('workspace_deleted', { name: deletedName });
      renderWorkspaceControls();
    } catch (error) {
      showWorkspaceError(error);
    }
  }

  async function exportWorkspaceBackup() {
    const selected = state.workspaces.find(function (workspace) { return workspace.id === state.selectedWorkspaceId; });
    if (!selected) {
      return;
    }
    try {
      if (state.activeWorkspace && state.activeWorkspace.id === selected.id) {
        await persistActiveWorkspace();
      } else {
        await workspaceSaveChain.catch(function () {});
      }
      const record = await workspaceRepository.loadWorkspace(selected.id);
      if (!record) {
        throw new storageApi.WorkspaceStorageError('workspace_not_found', 'Workspace does not exist.');
      }
      const text = workspaceModel.stringifyBackup(record);
      downloadTextFile(workspaceModel.backupFilename(record.name), text, 'application/json;charset=utf-8');
      setWorkspaceMessage('workspace_backup_exported', { name: record.name });
    } catch (error) {
      showWorkspaceError(error);
    }
  }

  function readBackupFile(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(createTranslationError('backup_read_failed')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  async function restoreWorkspaceBackup(file, mode) {
    try {
      const text = await readBackupFile(file);
      const parsed = workspaceModel.parseBackup(text);
      let restored;
      let successKey;
      let replaceTarget = null;
      if (mode === 'replace') {
        const target = state.workspaces.find(function (workspace) { return workspace.id === state.selectedWorkspaceId; });
        if (!target) {
          return;
        }
        if (!window.confirm(translate('workspace_replace_confirm', { name: target.name }))) {
          return;
        }
        await workspaceSaveChain.catch(function () {});
        replaceTarget = state.workspaces.find(function (workspace) { return workspace.id === target.id; });
        if (!replaceTarget) {
          throw new storageApi.WorkspaceStorageError('workspace_not_found', 'Workspace does not exist.');
        }
        restored = workspaceModel.prepareRestore(parsed, {
          mode: 'replace',
          targetId: replaceTarget.id
        });
        successKey = 'workspace_restored_replace';
      } else {
        restored = workspaceModel.prepareRestore(parsed, { mode: 'new' });
        successKey = 'workspace_restored_new';
      }
      if (replaceTarget) {
        await workspaceRepository.replaceWorkspace(restored, {
          validated: true,
          expectedRevision: replaceTarget.storageRevision
        });
        if (state.activeWorkspace && state.activeWorkspace.id === replaceTarget.id) {
          state.activeWorkspace = null;
          clearWorkspaceView();
        }
      } else {
        await workspaceRepository.createWorkspace(restored, { validated: true });
      }
      state.selectedWorkspaceId = restored.id;
      await refreshWorkspaceCatalog();
      scheduleStorageEstimateRefresh();
      await activateWorkspace(restored.id, successKey);
    } catch (error) {
      showWorkspaceError(error);
    } finally {
      elements.workspaceRestoreFile.value = '';
      state.restoreMode = null;
    }
  }

  async function initializeWorkspaces() {
    setText(elements.workspaceStorageStatus, translate('workspace_loading'));
    renderWorkspaceControls();
    try {
      await workspaceRepository.open();
      state.storageReady = true;
      await refreshWorkspaceCatalog();
      const activeId = await workspaceRepository.getActiveWorkspaceId();
      if (activeId && state.workspaces.some(function (workspace) { return workspace.id === activeId; })) {
        state.lastActiveWorkspaceId = activeId;
        state.selectedWorkspaceId = activeId;
      } else {
        if (activeId) {
          await workspaceRepository.setActiveWorkspace(null);
        }
        state.selectedWorkspaceId = state.workspaces.length > 0 ? state.workspaces[0].id : null;
      }
      const preferredWorkspace = state.workspaces.find(function (workspace) {
        return workspace.id === state.lastActiveWorkspaceId;
      });
      if (preferredWorkspace) {
        state.language = preferredWorkspace.language === 'de' ? 'de' : 'en';
        elements.languageSelect.value = state.language;
      }
      state.activeWorkspace = null;
      clearWorkspaceView();
      applyLanguage({ skipAnalysisRefresh: true });
      setWorkspaceMessage(state.workspaces.length > 0 ? 'workspace_select_status' : 'workspace_none_status', {}, state.workspaces.length > 0 ? '' : 'warning');
      renderWorkspaceControls();
      state.storageEstimate = await workspaceRepository.estimateStorage();
      renderStorageStatus();
    } catch (error) {
      state.storageReady = false;
      state.activeWorkspace = null;
      clearWorkspaceView();
      setText(elements.workspaceStorageStatus, translate('workspace_storage_unavailable'));
      showWorkspaceError(error);
      renderWorkspaceControls();
    }
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
    if (!state.activeWorkspace || state.files.length === 0) {
      return;
    }
    if (!window.confirm(translate('workspace_reset_confirm', { name: state.activeWorkspace.name }))) {
      return;
    }
    const name = state.activeWorkspace.name;
    clearWorkspaceView();
    persistActiveWorkspace('workspace_cleared').then(function () {
      setWorkspaceMessage('workspace_cleared', { name: name });
    }).catch(function () {});
  }

  elements.workspaceCreate.addEventListener('click', createWorkspace);
  elements.workspaceRename.addEventListener('click', renameActiveWorkspace);
  elements.workspaceDelete.addEventListener('click', deleteActiveWorkspace);
  elements.workspaceBackup.addEventListener('click', exportWorkspaceBackup);
  elements.workspaceOpen.addEventListener('click', function () {
    if (state.selectedWorkspaceId) {
      activateWorkspace(state.selectedWorkspaceId, 'workspace_opened').catch(function () {
        renderWorkspaceControls();
      });
    }
  });
  elements.workspaceCancel.addEventListener('click', cancelWorkspaceLoading);
  elements.workspaceSelect.addEventListener('change', function () {
    state.selectedWorkspaceId = elements.workspaceSelect.value || null;
    renderWorkspaceControls();
  });
  elements.workspaceOverview.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-open-workspace-id]');
    if (!button || !elements.workspaceOverview.contains(button)) {
      return;
    }
    state.selectedWorkspaceId = button.dataset.openWorkspaceId;
    activateWorkspace(state.selectedWorkspaceId, 'workspace_opened').catch(function () {
      renderWorkspaceControls();
    });
  });
  elements.workspaceRestoreNew.addEventListener('click', function () {
    state.restoreMode = 'new';
    elements.workspaceRestoreFile.value = '';
    elements.workspaceRestoreFile.click();
  });
  elements.workspaceRestoreReplace.addEventListener('click', function () {
    if (!state.selectedWorkspaceId) {
      return;
    }
    state.restoreMode = 'replace';
    elements.workspaceRestoreFile.value = '';
    elements.workspaceRestoreFile.click();
  });
  elements.workspaceRestoreFile.addEventListener('change', function () {
    const file = elements.workspaceRestoreFile.files && elements.workspaceRestoreFile.files[0];
    if (file && state.restoreMode) {
      restoreWorkspaceBackup(file, state.restoreMode);
    }
  });
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
    persistActiveWorkspace().catch(function () {});
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
    persistActiveWorkspace().catch(function () {});
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
      clearWorkspaceView();
      persistActiveWorkspace().catch(function () {});
      return;
    }
    renderMapping();
    updateSourceStatus();
    elements.analyzeButton.disabled = !state.files.some(function (file) { return Boolean(file.parsed); });
    persistActiveWorkspace().catch(function () {});
  });
  elements.languageSelect.addEventListener('change', function () {
    state.language = elements.languageSelect.value === 'de' ? 'de' : 'en';
    applyLanguage();
    persistActiveWorkspace().catch(function () {});
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

  applyLanguage();
  initializeWorkspaces();
}());
