(function () {
  'use strict';

  const core = window.OpenSlottingCsv;
  const periods = window.OpenSlottingPeriods;
  const encoding = window.OpenSlottingEncoding;
  const workspaceModel = window.OpenSlottingWorkspace;
  const storageApi = window.OpenSlottingStorage;
  const runtime = window.OpenSlottingRuntime;
  const workspaceRepository = storageApi.createRepository();
  const TRANSLATIONS = {
    en: {
      page_title: 'OpenSlotting – CSV Analysis',
      eyebrow: 'OpenSlotting · v{{version}}',
      hero_title: 'Analyze order lines across exports',
      hero_subtitle: 'Combine multiple CSV exports locally while keeping every source file and line traceable.',
      language_label: 'Language',
      language_english: 'English',
      language_german: 'German',
      runtime_badge_portable: 'Runtime · Portable',
      runtime_badge_enhanced_local: 'Runtime · Enhanced Local',
      runtime_badge_unsupported: 'Runtime · Unsupported',
      runtime_diagnostics_title: 'Runtime diagnostics',
      runtime_mode_label: 'Mode',
      runtime_origin_label: 'Origin',
      runtime_capabilities_label: 'Browser capabilities',
      runtime_mode_portable: 'Portable Mode',
      runtime_mode_enhanced_local: 'Enhanced Local Mode',
      runtime_mode_unsupported: 'Unsupported origin',
      runtime_capability_available: '{{name}} available',
      runtime_capability_unavailable: '{{name}} unavailable',
      runtime_capability_indexedDb: 'IndexedDB',
      runtime_capability_webWorkers: 'Web Workers',
      runtime_capability_persistentStorage: 'Persistent storage request',
      runtime_capability_webLocks: 'Web Locks',
      runtime_capability_broadcastChannel: 'BroadcastChannel',
      runtime_capability_opfs: 'OPFS',
      runtime_capability_folderAccess: 'Folder access',
      runtime_capability_sqlite: 'SQLite',
      workspace_eyebrow: 'Local storage',
      workspace_title: 'Workspaces',
      workspace_hint: 'Each workspace remains separate in this browser profile.',
      workspace_select_label: 'Workspace selection',
      workspace_none: 'No workspace selected',
      workspace_actions_label: 'Workspace actions',
      workspace_open_selected: 'Open selected',
      workspace_cancel_loading: 'Cancel loading',
      workspace_recover_save_failure: 'Discard unsaved changes and reload',
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
      custom_fields_eyebrow: 'Workspace schema',
      custom_fields_title: 'Custom fields',
      custom_field_create: 'Add field',
      custom_field_empty: 'No custom fields defined yet.',
      custom_field_name_prompt: 'Custom field name:',
      custom_field_type_prompt: 'Type (text, number, or date):',
      custom_field_name_required: 'Custom field name is required.',
      custom_field_name_too_long: 'Custom field name is too long.',
      invalid_custom_field_type: 'Custom field type is not supported.',
      invalid_custom_field: 'Custom field definition is invalid.',
      invalid_custom_field_id: 'Custom field ID is invalid or duplicated.',
      duplicate_custom_field_name: 'Custom field names must be unique.',
      invalid_custom_fields: 'Custom fields must be an array.',
      invalid_custom_field_mapping: 'Custom field mapping is invalid.',
      unknown_custom_field: 'Source mapping references an unknown custom field.',
      custom_field_not_found: 'Custom field does not exist.',
      custom_field_rename: 'Rename',
      custom_field_remove: 'Remove',
      custom_field_remove_confirm: 'Deactivate custom field “{{name}}”? Existing source values remain stored, but new mappings will no longer use this field.',
      custom_field_removed: 'Removed',
      custom_field_mapping_title: 'Custom fields',
      custom_field_mapping_help: 'Map optional workspace fields to source columns.',
      custom_field_create_from_source: 'Create from source column',
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
      source_columns_title: 'Source-column overview',
      source_columns_hint: 'Each decoded source column is shown by physical position. Suggestions never change mappings automatically.',
      source_column_header: 'Source column',
      source_column_mapping: 'Current mapping',
      source_column_profile: 'Profile',
      source_column_samples: 'Examples',
      source_column_unused: 'Unused',
      source_column_rows: '{{count}} rows',
      source_column_non_empty: '{{count}} non-empty',
      source_column_distinct: '{{count}} distinct{{suffix}}',
      source_column_suggestion: 'Suggestion: {{field}} ({{confidence}})',
      source_column_ambiguous: 'Ambiguous suggestion',
      source_column_confidence_high: 'high',
      source_column_confidence_medium: 'medium',
      source_column_confidence_low: 'low',
      encoding_label: 'Encoding',
      source_type_label: 'Source type',
      source_type_order_lines: 'Order lines',
      source_type_article_master: 'Article master',
      mapping_group_core: 'Core',
      mapping_group_order: 'Order metrics',
      mapping_group_customer: 'Customer metrics',
      mapping_group_sales: 'Sales metrics',
      mapping_group_location: 'Location functions',
      mapping_group_selling_unit: 'Selling-unit analysis',
      mapping_group_article: 'Article data',
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
      search_placeholder: 'Article ID / SKU or description',
      sort_label: 'Sort by',
      sort_lines: 'Order lines',
      sort_quantity: 'Total quantity',
      sort_sales: 'Legacy sales value',
      sort_article: 'Article ID / SKU',
      column_article_id: 'Article ID / SKU',
      column_article_name: 'Article description',
      column_master_status: 'Master-data status',
      master_status_matched: 'Matched',
      master_status_movement_only: 'No master data',
      master_status_master_only: 'Master only',
      master_current_location: 'Current master location',
      master_quantity_per_sales_unit: 'Current quantity per selling unit',
      master_unit_of_measure: 'Unit of measure',
      master_vat_rate: 'VAT rate',
      feature_readiness_ready: 'Period comparison ready.',
      feature_readiness_partial: 'Period comparison is available only for part of the included source coverage.',
      feature_readiness_blocked: 'Period comparison is blocked because a core capability is missing.',
      column_lines: 'Lines',
      column_quantity: 'Quantity',
      column_sales: 'Legacy sales value / coverage',
      column_orders: 'Orders',
      column_customers: 'Customers',
      column_days: 'Days',
      column_locations: 'Locations',
      column_share: 'Line share',
      article_detail: 'Article details',
      detail_back: 'Back to article overview',
      detail_source_values_action: 'Show source',
      detail_source_values_title: 'Original source values',
      detail_source_values_summary: 'Source values reconstructed from {{file}} · line {{line}}.',
      detail_source_values_unavailable: 'The original source row is unavailable.',
      detail_source_values_header: 'Source column',
      detail_source_values_value: 'Original value',
      detail_open: 'Open details for {{article}}',
      detail_conflict: 'Multiple article descriptions were found: {{variants}}',
      detail_page: 'Page {{page}} of {{pages}} · {{count}} order lines on this page',
      detail_source_line: 'Source line',
      detail_source_file: 'Source file',
      detail_order_id: 'Order ID',
      detail_order_date: 'Delivery date',
      detail_customer_id: 'Customer ID',
      detail_customer_name: 'Customer name',
      detail_sales_value_net: 'Sales value excl. VAT',
      detail_sales_value_gross: 'Sales value incl. VAT',
      detail_unit_price_net: 'Unit price excl. VAT',
      detail_unit_price_gross: 'Unit price incl. VAT',
      detail_sales_value: 'Legacy sales value',
      detail_location: 'Location',
      no_detail_rows: 'No normalized order lines are available for this article.',
      empty_value: '—',
      issues_title: 'Validation notes',
      issues_note: 'Excluded rows are not aggregated. Advisory notes on optional fields remain included and traceable by source file and line.',
      issue_source_file: 'Source file',
      issue_source_line: 'Source line',
      issue_field: 'Field',
      issue_code: 'Code',
      issue_message: 'Message',
      issue_status: 'Status',
      issue_status_included: 'Row included',
      issue_status_excluded: 'Row excluded',
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
      metric_sales: 'Legacy sales value',
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
      invalid_encoding: 'The file encoding is not supported. Use UTF-8, UTF-16, or Windows-1252.',
      workflow_label: 'Analysis workflow',
      nav_kicker: 'Workspace',
      nav_title: 'Analysis workspace',
      nav_local_note: 'Local-first · source traceable',
      workflow_workspace: 'Workspace',
      workflow_import: 'Import sources',
      workflow_mapping: 'Mapping & quality',
      workflow_coverage: 'Coverage & periods',
      workflow_comparison: 'Comparison results',
      workflow_analysis: 'Analysis',
      page_status_ready: 'Ready',
      page_status_workspace: 'Manage workspace',
      page_status_import: 'Import files',
      page_status_mapping: 'Review columns',
      page_status_coverage: 'Check date coverage',
      page_status_comparison: 'Compare periods',
      page_status_analysis: 'Explore articles',
      step_4: 'Step 4',
      step_5: 'Step 5',
      required_label: 'Required',
      optional_label: 'Optional',
      coverage_title: 'Data coverage & periods',
      coverage_intro: 'Review observed dates and define two inclusive comparison periods.',
      coverage_unknown_note: 'Dates without imported rows remain unknown coverage, not zero demand.',
      coverage_timeline_label: 'Observed date coverage',
      coverage_sources_title: 'Coverage by source',
      coverage_sources_intro: 'Review ranges, valid rows, dated invalid rows, and selling-unit coverage per source.',
      coverage_dates_title: 'Coverage by date',
      coverage_dates_intro: 'Invalid rows appear on a date only when that row contains a valid mapped delivery date.',
      coverage_range: 'Observed range',
      selling_unit_rows: 'Selling-unit rows',
      coverage_date_page: 'Page {{page}} of {{pages}} · {{count}} dates on this page',
      coverage_view_evidence: 'View evidence',
      coverage_drilldown_label: 'Coverage evidence',
      coverage_drilldown_close: 'Close evidence',
      coverage_evidence_type: 'Type',
      coverage_valid_row: 'Valid row',
      coverage_invalid_row: 'Excluded row',
      coverage_advisory_row: 'Advisory · row included',
      coverage_drilldown_date_title: 'Evidence for {{date}}',
      coverage_drilldown_source_title: 'Evidence for {{source}}',
      coverage_drilldown_summary: '{{valid}} valid rows · {{invalid}} invalid source rows · {{sources}} contributing sources',
      expected_weekdays: 'Expected weekdays',
      expected_weekdays_hint: 'Only selected weekdays count toward unknown dates.',
      weekday_mon: 'Mon',
      weekday_tue: 'Tue',
      weekday_wed: 'Wed',
      weekday_thu: 'Thu',
      weekday_fri: 'Fri',
      weekday_sat: 'Sat',
      weekday_sun: 'Sun',
      period_a: 'Period A',
      period_b: 'Period B',
      period_mode: 'Period selection',
      period_mode_hint: 'Compare automatically detected calendar weeks or define custom date ranges.',
      period_mode_weeks: 'Detected calendar weeks',
      period_mode_custom: 'Custom periods',
      calendar_week_select: 'Calendar week',
      calendar_week_name: 'CW {{week}}/{{year}}',
      calendar_week_summary: '{{count}} calendar weeks detected · {{start}} to {{end}}',
      calendar_week_option: 'CW {{week}}/{{year}} · {{start}}–{{end}} · Rows: {{rows}}',
      calendar_week_no_options: 'No calendar weeks detected',
      period_name: 'Name',
      period_start: 'Start date (inclusive)',
      period_end: 'End date (inclusive)',
      compare_periods: 'Compare periods',
      reset_periods: 'Reset periods',
      comparison_title: 'Comparison results',
      comparison_intro: 'Compare key figures and article-level changes between the selected periods.',
      edit_periods: 'Edit periods',
      export_comparison: 'Export comparison',
      comparison_search_placeholder: 'Article ID / SKU or description',
      change_filter: 'Change',
      change_all: 'All changes',
      change_increased: 'Increased',
      change_decreased: 'Decreased',
      change_new: 'New',
      change_inactive: 'Inactive',
      change_incomplete: 'Incomplete data',
      change_conflict: 'Selling-unit review',
      sort_change: 'Largest quantity change',
      sort_percent: 'Largest percent change',
      column_sales_units: 'Selling units / cases',
      comparison_change: 'Change',
      comparison_quality: 'Data quality',
      comparison_action: 'Action',
      quantity_change: 'Quantity change',
      percent_change: 'Percent change',
      all_data_label: 'Reference view',
      metric_sales_units: 'Selling units / cases',
      metric_sales_units_detail: 'Rows: {{rows}} · Partial sales: {{partials}} · Review notes: {{overages}}',
      metric_sales_unit_relations: 'Partial sales: {{partials}} · Review notes: {{overages}}',
      detail_sales_units: 'Selling units / cases',
      detail_quantity_per_sales_unit: 'Quantity per selling unit',
      coverage_overview: '{{days}} observed days from {{start}} to {{end}} · {{dated}}/{{rows}} rows with a valid date',
      coverage_no_dates: 'No valid delivery dates are available. Map and validate a delivery-date column first.',
      coverage_complete: '{{observed}}/{{expected}} expected days observed · complete coverage',
      coverage_partial: '{{observed}}/{{expected}} expected days observed · {{missing}} days unknown',
      coverage_empty: '0/{{expected}} expected days observed · no imported rows in this period',
      coverage_unavailable: 'Enter a valid start and end date.',
      coverage_sources: '{{count}} source files',
      period_invalid: 'Enter valid inclusive periods. The start date must not be after the end date.',
      weekdays_required: 'Select at least one expected weekday.',
      period_overlap: 'The periods overlap. The same rows can appear in both periods.',
      comparison_period_summary: '{{start}} to {{end}} · {{coverage}}',
      metric_period_lines: 'Order lines',
      metric_period_quantity: 'Quantity',
      metric_period_orders: 'Orders',
      metric_period_customers: 'Customers',
      metric_period_days: 'Active observed days',
      metric_period_sales: 'Legacy sales value',
      metric_period_sales_units: 'Selling units / cases',
      metric_period_row_coverage: '{{rows}}/{{lines}} rows',
      percent_unavailable: 'n/a',
      comparison_empty: 'No articles match the current filters.',
      comparison_page: 'Page {{page}} of {{pages}} · {{count}} articles on this page',
      quality_ok: 'Complete',
      quality_unknown_dates: 'Unknown dates',
      quality_unit_conflict: 'Unit conflict',
      quality_unit_partial: 'Partial sale',
      quality_unit_exceeds: 'Selling-unit quantity exceeds total',
      change_unchanged: 'Unchanged',
      open_article: 'Open',
      comparison_detail_label: 'Period-specific article evidence',
      comparison_detail_close: 'Close details',
      comparison_detail_period: 'Period',
      comparison_detail_description: '{{name}} · {{sources}} sources · {{locations}} locations',
      comparison_detail_conflict: 'Description variants: {{variants}}',
      comparison_detail_page: 'Page {{page}} of {{pages}} · {{count}} period rows on this page',
      mapping_help_sales_unit_count: 'Optional number of complete selling units; zero is valid for a pure partial sale. Total quantity remains authoritative.',
      mapping_help_quantity_per_sales_unit: 'Optional content of one selling unit; used to identify full units and a possible partial remainder.',
      comparison_export_filename: 'openslotting-period-comparison.csv'
    },
    de: {
      page_title: 'OpenSlotting – CSV-Analyse',
      eyebrow: 'OpenSlotting · v{{version}}',
      hero_title: 'Auftragszeilen über Exporte analysieren',
      hero_subtitle: 'Mehrere CSV-Exporte lokal zusammenführen und jede Quelldatei und -zeile nachvollziehbar halten.',
      language_label: 'Sprache',
      language_english: 'Englisch',
      language_german: 'Deutsch',
      runtime_badge_portable: 'Runtime · Portabel',
      runtime_badge_enhanced_local: 'Runtime · Erweitert lokal',
      runtime_badge_unsupported: 'Runtime · Nicht unterstützt',
      runtime_diagnostics_title: 'Runtime-Diagnose',
      runtime_mode_label: 'Modus',
      runtime_origin_label: 'Ursprung',
      runtime_capabilities_label: 'Browser-Fähigkeiten',
      runtime_mode_portable: 'Portabler Modus',
      runtime_mode_enhanced_local: 'Erweiterter lokaler Modus',
      runtime_mode_unsupported: 'Nicht unterstützter Ursprung',
      runtime_capability_available: '{{name}} verfügbar',
      runtime_capability_unavailable: '{{name}} nicht verfügbar',
      runtime_capability_indexedDb: 'IndexedDB',
      runtime_capability_webWorkers: 'Web Worker',
      runtime_capability_persistentStorage: 'Dauerhafte Speicheranfrage',
      runtime_capability_webLocks: 'Web Locks',
      runtime_capability_broadcastChannel: 'BroadcastChannel',
      runtime_capability_opfs: 'OPFS',
      runtime_capability_folderAccess: 'Ordnerzugriff',
      runtime_capability_sqlite: 'SQLite',
      workspace_eyebrow: 'Lokaler Speicher',
      workspace_title: 'Arbeitsbereiche',
      workspace_hint: 'Jeder Arbeitsbereich bleibt in diesem Browserprofil vollständig getrennt.',
      workspace_select_label: 'Arbeitsbereichsauswahl',
      workspace_none: 'Kein Arbeitsbereich ausgewählt',
      workspace_actions_label: 'Aktionen für Arbeitsbereiche',
      workspace_open_selected: 'Auswahl öffnen',
      workspace_cancel_loading: 'Laden abbrechen',
      workspace_recover_save_failure: 'Ungespeicherte Änderungen verwerfen und neu laden',
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
      custom_fields_eyebrow: 'Workspace-Schema',
      custom_fields_title: 'Benutzerdefinierte Felder',
      custom_field_create: 'Feld hinzufügen',
      custom_field_empty: 'Noch keine benutzerdefinierten Felder definiert.',
      custom_field_name_prompt: 'Name des benutzerdefinierten Feldes:',
      custom_field_type_prompt: 'Typ (text, number oder date):',
      custom_field_name_required: 'Der Name des benutzerdefinierten Feldes ist erforderlich.',
      custom_field_name_too_long: 'Der Name des benutzerdefinierten Feldes ist zu lang.',
      invalid_custom_field_type: 'Der Typ des benutzerdefinierten Feldes wird nicht unterstützt.',
      invalid_custom_field: 'Die Definition des benutzerdefinierten Feldes ist ungültig.',
      invalid_custom_field_id: 'Die ID des benutzerdefinierten Feldes ist ungültig oder doppelt vorhanden.',
      duplicate_custom_field_name: 'Namen benutzerdefinierter Felder müssen eindeutig sein.',
      invalid_custom_fields: 'Benutzerdefinierte Felder müssen als Liste vorliegen.',
      invalid_custom_field_mapping: 'Die Zuordnung des benutzerdefinierten Feldes ist ungültig.',
      unknown_custom_field: 'Die Quellzuordnung verweist auf ein unbekanntes benutzerdefiniertes Feld.',
      custom_field_not_found: 'Das benutzerdefinierte Feld ist nicht vorhanden.',
      custom_field_rename: 'Umbenennen',
      custom_field_remove: 'Entfernen',
      custom_field_remove_confirm: 'Benutzerdefiniertes Feld „{{name}}“ deaktivieren? Vorhandene Quellwerte bleiben gespeichert, neue Zuordnungen verwenden dieses Feld nicht mehr.',
      custom_field_removed: 'Entfernt',
      custom_field_mapping_title: 'Benutzerdefinierte Felder',
      custom_field_mapping_help: 'Optionale Workspace-Felder einer Quellspalte zuordnen.',
      custom_field_create_from_source: 'Aus Quellspalte erstellen',
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
      source_columns_title: 'Übersicht der Quellspalten',
      source_columns_hint: 'Jede dekodierte Quellspalte wird nach physischer Position gezeigt. Vorschläge ändern Zuordnungen nie automatisch.',
      source_column_header: 'Quellspalte',
      source_column_mapping: 'Aktuelle Zuordnung',
      source_column_profile: 'Profil',
      source_column_samples: 'Beispiele',
      source_column_unused: 'Nicht verwendet',
      source_column_rows: '{{count}} Zeilen',
      source_column_non_empty: '{{count}} nicht leer',
      source_column_distinct: '{{count}} verschiedene{{suffix}}',
      source_column_suggestion: 'Vorschlag: {{field}} ({{confidence}})',
      source_column_ambiguous: 'Mehrdeutiger Vorschlag',
      source_column_confidence_high: 'hoch',
      source_column_confidence_medium: 'mittel',
      source_column_confidence_low: 'niedrig',
      encoding_label: 'Kodierung',
      source_type_label: 'Quelltyp',
      source_type_order_lines: 'Auftragszeilen',
      source_type_article_master: 'Artikelstamm',
      mapping_group_core: 'Kernfelder',
      mapping_group_order: 'Auftragskennzahlen',
      mapping_group_customer: 'Kundenkennzahlen',
      mapping_group_sales: 'Verkaufskennzahlen',
      mapping_group_location: 'Stellplatzfunktionen',
      mapping_group_selling_unit: 'Verkaufseinheitenanalyse',
      mapping_group_article: 'Artikeldaten',
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
      search_placeholder: 'Artikel-ID / SKU oder Artikelbezeichnung',
      sort_label: 'Sortierung',
      sort_lines: 'Auftragszeilen',
      sort_quantity: 'Gesamtmenge',
      sort_sales: 'Bisheriger Verkaufswert',
      sort_article: 'Artikel-ID / SKU',
      column_article_id: 'Artikel-ID / SKU',
      column_article_name: 'Artikelbezeichnung',
      column_master_status: 'Stammdatenstatus',
      master_status_matched: 'Verknüpft',
      master_status_movement_only: 'Ohne Stammdaten',
      master_status_master_only: 'Nur Stammdaten',
      master_current_location: 'Aktueller Stamm-Stellplatz',
      master_quantity_per_sales_unit: 'Aktuelle Menge je Verkaufseinheit',
      master_unit_of_measure: 'Mengeneinheit',
      master_vat_rate: 'Mehrwertsteuersatz',
      feature_readiness_ready: 'Periodenvergleich ist bereit.',
      feature_readiness_partial: 'Der Periodenvergleich ist nur für einen Teil der einbezogenen Quellen verfügbar.',
      feature_readiness_blocked: 'Der Periodenvergleich ist blockiert, weil eine Kernfähigkeit fehlt.',
      column_lines: 'Zeilen',
      column_quantity: 'Menge',
      column_sales: 'Bisheriger Verkaufswert / Abdeckung',
      column_orders: 'Aufträge',
      column_customers: 'Kunden',
      column_days: 'Tage',
      column_locations: 'Stellplätze',
      column_share: 'Anteil Zeilen',
      article_detail: 'Artikeldetails',
      detail_back: 'Zurück zur Artikelübersicht',
      detail_source_values_action: 'Quelle anzeigen',
      detail_source_values_title: 'Originale Quellwerte',
      detail_source_values_summary: 'Quellwerte rekonstruiert aus {{file}} · Zeile {{line}}.',
      detail_source_values_unavailable: 'Die ursprüngliche Quellzeile ist nicht verfügbar.',
      detail_source_values_header: 'Quellspalte',
      detail_source_values_value: 'Originalwert',
      detail_open: 'Details für {{article}} öffnen',
      detail_conflict: 'Es wurden mehrere Artikelbezeichnungen gefunden: {{variants}}',
      detail_page: 'Seite {{page}} von {{pages}} · {{count}} Auftragszeilen auf dieser Seite',
      detail_source_line: 'Quellzeile',
      detail_source_file: 'Quelldatei',
      detail_order_id: 'Auftrags-ID',
      detail_order_date: 'Lieferdatum',
      detail_customer_id: 'Kunden-ID',
      detail_customer_name: 'Kundenname',
      detail_sales_value_net: 'Verkaufswert ohne Mehrwertsteuer',
      detail_sales_value_gross: 'Verkaufswert mit Mehrwertsteuer',
      detail_unit_price_net: 'Verkaufspreis ohne Mehrwertsteuer',
      detail_unit_price_gross: 'Verkaufspreis mit Mehrwertsteuer',
      detail_sales_value: 'Bisheriger Verkaufswert',
      detail_location: 'Stellplatz',
      no_detail_rows: 'Für diesen Artikel sind keine normalisierten Auftragszeilen verfügbar.',
      empty_value: '—',
      issues_title: 'Prüfhinweise',
      issues_note: 'Ausgeschlossene Zeilen werden nicht aggregiert. Hinweise zu optionalen Feldern bleiben einbezogen und über Quelldatei und Quellzeile nachvollziehbar.',
      issue_source_file: 'Quelldatei',
      issue_source_line: 'Quellzeile',
      issue_field: 'Feld',
      issue_code: 'Code',
      issue_message: 'Hinweis',
      issue_status: 'Status',
      issue_status_included: 'Zeile einbezogen',
      issue_status_excluded: 'Zeile ausgeschlossen',
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
      metric_sales: 'Bisheriger Verkaufswert',
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
      invalid_encoding: 'Die Dateikodierung wird nicht unterstützt. Bitte UTF-8, UTF-16 oder Windows-1252 verwenden.',
      workflow_label: 'Analyseablauf',
      nav_kicker: 'Arbeitsbereich',
      nav_title: 'Analyse-Arbeitsbereich',
      nav_local_note: 'Lokal · Quellen nachverfolgbar',
      workflow_workspace: 'Arbeitsbereich',
      workflow_import: 'CSV importieren',
      workflow_mapping: 'Quellspalten & Hinweise',
      workflow_coverage: 'Datenabdeckung',
      workflow_comparison: 'Perioden & Vergleich',
      workflow_analysis: 'Analyse',
      page_status_ready: 'Bereit',
      page_status_workspace: 'Arbeitsbereich verwalten',
      page_status_import: 'Dateien importieren',
      page_status_mapping: 'Spalten prüfen',
      page_status_coverage: 'Datenabdeckung prüfen',
      page_status_comparison: 'Perioden vergleichen',
      page_status_analysis: 'Artikel analysieren',
      step_4: 'Schritt 4',
      step_5: 'Schritt 5',
      required_label: 'Pflichtfeld',
      optional_label: 'Optional',
      coverage_title: 'Datenabdeckung & Perioden',
      coverage_intro: 'Beobachtete Datumswerte prüfen und zwei inklusive Vergleichsperioden festlegen.',
      coverage_unknown_note: 'Tage ohne importierte Zeilen bleiben unbekannte Abdeckung und gelten nicht als Nullabsatz.',
      coverage_timeline_label: 'Beobachtete Datumsabdeckung',
      coverage_sources_title: 'Abdeckung nach Quelle',
      coverage_sources_intro: 'Zeiträume, gültige Zeilen, datierbare fehlerhafte Zeilen und Verkaufseinheiten-Abdeckung je Quelle prüfen.',
      coverage_dates_title: 'Abdeckung nach Datum',
      coverage_dates_intro: 'Fehlerhafte Zeilen erscheinen nur dann bei einem Datum, wenn sie ein gültiges zugeordnetes Lieferdatum enthalten.',
      coverage_range: 'Beobachteter Zeitraum',
      selling_unit_rows: 'Verkaufseinheiten-Zeilen',
      coverage_date_page: 'Seite {{page}} von {{pages}} · {{count}} Datumswerte auf dieser Seite',
      coverage_view_evidence: 'Nachweise anzeigen',
      coverage_drilldown_label: 'Abdeckungsnachweise',
      coverage_drilldown_close: 'Nachweise schließen',
      coverage_evidence_type: 'Typ',
      coverage_valid_row: 'Gültige Zeile',
      coverage_invalid_row: 'Ausgeschlossene Zeile',
      coverage_advisory_row: 'Hinweis · Zeile einbezogen',
      coverage_drilldown_date_title: 'Nachweise für {{date}}',
      coverage_drilldown_source_title: 'Nachweise für {{source}}',
      coverage_drilldown_summary: '{{valid}} gültige Zeilen · {{invalid}} fehlerhafte Quellzeilen · {{sources}} beitragende Quellen',
      expected_weekdays: 'Erwartete Wochentage',
      expected_weekdays_hint: 'Nur ausgewählte Wochentage zählen als unbekannte Tage.',
      weekday_mon: 'Mo',
      weekday_tue: 'Di',
      weekday_wed: 'Mi',
      weekday_thu: 'Do',
      weekday_fri: 'Fr',
      weekday_sat: 'Sa',
      weekday_sun: 'So',
      period_a: 'Periode A',
      period_b: 'Periode B',
      period_mode: 'Periodenauswahl',
      period_mode_hint: 'Automatisch erkannte Kalenderwochen vergleichen oder eigene Zeiträume festlegen.',
      period_mode_weeks: 'Erkannte Kalenderwochen',
      period_mode_custom: 'Eigene Perioden',
      calendar_week_select: 'Kalenderwoche',
      calendar_week_name: 'KW{{week}}/{{year}}',
      calendar_week_summary: '{{count}} Kalenderwochen erkannt · {{start}} bis {{end}}',
      calendar_week_option: 'KW{{week}}/{{year}} · {{start}}–{{end}} · Zeilen: {{rows}}',
      calendar_week_no_options: 'Keine Kalenderwochen erkannt',
      period_name: 'Name',
      period_start: 'Startdatum (inklusive)',
      period_end: 'Enddatum (inklusive)',
      compare_periods: 'Perioden vergleichen',
      reset_periods: 'Perioden zurücksetzen',
      comparison_title: 'Vergleichsergebnisse',
      comparison_intro: 'Kennzahlen und Änderungen je Artikel zwischen den ausgewählten Perioden vergleichen.',
      edit_periods: 'Perioden bearbeiten',
      export_comparison: 'Vergleich exportieren',
      comparison_search_placeholder: 'Artikel-ID / SKU oder Bezeichnung',
      change_filter: 'Änderung',
      change_all: 'Alle Änderungen',
      change_increased: 'Gestiegen',
      change_decreased: 'Gesunken',
      change_new: 'Neu',
      change_inactive: 'Inaktiv',
      change_incomplete: 'Unvollständige Daten',
      change_conflict: 'Prüfhinweis Verkaufseinheiten',
      sort_change: 'Größte Mengenänderung',
      sort_percent: 'Größte prozentuale Änderung',
      column_sales_units: 'Colli',
      comparison_change: 'Änderung',
      comparison_quality: 'Datenqualität',
      comparison_action: 'Aktion',
      quantity_change: 'Mengenänderung',
      percent_change: 'Prozentänderung',
      all_data_label: 'Referenzansicht',
      metric_sales_units: 'Verkaufseinheiten / Colli',
      metric_sales_units_detail: 'Zeilen: {{rows}} · Teilmengen/Anbrüche: {{partials}} · Prüfhinweise: {{overages}}',
      metric_sales_unit_relations: 'Teilmengen/Anbrüche: {{partials}} · Prüfhinweise: {{overages}}',
      detail_sales_units: 'Verkaufseinheiten / Colli',
      detail_quantity_per_sales_unit: 'Menge je Verkaufseinheit',
      coverage_overview: '{{days}} beobachtete Tage von {{start}} bis {{end}} · {{dated}}/{{rows}} Zeilen mit gültigem Datum',
      coverage_no_dates: 'Es sind keine gültigen Lieferdaten vorhanden. Bitte zuerst eine Lieferdatumsspalte zuordnen und validieren.',
      coverage_complete: '{{observed}}/{{expected}} erwartete Tage vorhanden · vollständige Abdeckung',
      coverage_partial: '{{observed}}/{{expected}} erwartete Tage vorhanden · {{missing}} Tage unbekannt',
      coverage_empty: '0/{{expected}} erwartete Tage vorhanden · keine importierten Zeilen in dieser Periode',
      coverage_unavailable: 'Bitte ein gültiges Start- und Enddatum eingeben.',
      coverage_sources: '{{count}} Quelldateien',
      period_invalid: 'Bitte gültige inklusive Perioden eingeben. Das Startdatum darf nicht nach dem Enddatum liegen.',
      weekdays_required: 'Bitte mindestens einen erwarteten Wochentag auswählen.',
      period_overlap: 'Die Perioden überschneiden sich. Dieselben Zeilen können in beiden Perioden enthalten sein.',
      comparison_period_summary: '{{start}} bis {{end}} · {{coverage}}',
      metric_period_lines: 'Auftragszeilen',
      metric_period_quantity: 'Menge',
      metric_period_orders: 'Aufträge',
      metric_period_customers: 'Kunden',
      metric_period_days: 'Aktive beobachtete Tage',
      metric_period_sales: 'Bisheriger Verkaufswert',
      metric_period_sales_units: 'Verkaufseinheiten / Colli',
      metric_period_row_coverage: '{{rows}}/{{lines}} Zeilen',
      percent_unavailable: 'k. A.',
      comparison_empty: 'Keine Artikel entsprechen den aktuellen Filtern.',
      comparison_page: 'Seite {{page}} von {{pages}} · {{count}} Artikel auf dieser Seite',
      quality_ok: 'Vollständig',
      quality_unknown_dates: 'Unbekannte Tage',
      quality_unit_conflict: 'Einheitenkonflikt',
      quality_unit_partial: 'Teilmenge/Anbruch',
      quality_unit_exceeds: 'Menge aus Verkaufseinheiten größer als Gesamtmenge',
      change_unchanged: 'Unverändert',
      open_article: 'Öffnen',
      comparison_detail_label: 'Periodenspezifische Artikelnachweise',
      comparison_detail_close: 'Details schließen',
      comparison_detail_period: 'Periode',
      comparison_detail_description: '{{name}} · {{sources}} Quellen · {{locations}} Stellplätze',
      comparison_detail_conflict: 'Bezeichnungsvarianten: {{variants}}',
      comparison_detail_page: 'Seite {{page}} von {{pages}} · {{count}} Periodenzeilen auf dieser Seite',
      mapping_help_sales_unit_count: 'Optionale Anzahl vollständiger Verkaufseinheiten; null ist bei reinem Anbruch zulässig. Die Gesamtmenge bleibt maßgeblich.',
      mapping_help_quantity_per_sales_unit: 'Optionaler Inhalt einer Verkaufseinheit; dient zur Ermittlung vollständiger Einheiten und einer möglichen Teilmenge.',
      comparison_export_filename: 'openslotting-periodenvergleich.csv'
    }
  };

  const state = {
    language: 'en',
    workspaces: [],
    selectedWorkspaceId: null,
    lastActiveWorkspaceId: null,
    activeWorkspace: null,
    customFields: [],
    storageEstimate: null,
    storageReady: false,
    workspaceLoading: false,
    workspaceLoadCancellable: false,
    workspaceProgress: null,
    workspaceMessage: { key: null, replacements: {}, type: '' },
    workspaceSaveFailure: null,
    workspaceRecoveryAvailable: false,
    restoreMode: null,
    files: [],
    fileSelectionVersion: 0,
    result: null,
    articleRegistry: [],
    detailRowsByRef: [],
    analysis: null,
    periodSettings: periods.normalizeSettings(),
    comparison: null,
    comparisonPage: 1,
    coverageDatePage: 1,
    coverageDrilldown: null,
    selectedComparisonArticleId: null,
    comparisonDetailPage: 1,
    sourceStatus: { key: 'no_file_selected', replacements: {}, error: false, text: '' },
    articlePage: 1,
    selectedArticleId: null,
    detailPage: 1,
    issuePage: 1,
    articleViewCache: null,
    comparisonViewCache: null,
    activePageTarget: 'workspace-panel'
  };

  const TABLE_PAGE_SIZE = 100;

  const RUNTIME_MODE_TRANSLATION_KEYS = {
    portable: {
      badge: 'runtime_badge_portable',
      mode: 'runtime_mode_portable'
    },
    'enhanced-local': {
      badge: 'runtime_badge_enhanced_local',
      mode: 'runtime_mode_enhanced_local'
    },
    unsupported: {
      badge: 'runtime_badge_unsupported',
      mode: 'runtime_mode_unsupported'
    }
  };
  const SOURCE_COLUMN_CONFIDENCE_KEYS = {
    high: 'source_column_confidence_high',
    medium: 'source_column_confidence_medium',
    low: 'source_column_confidence_low'
  };

  const RUNTIME_CAPABILITY_TRANSLATION_KEYS = {
    indexedDb: 'runtime_capability_indexedDb',
    webWorkers: 'runtime_capability_webWorkers',
    persistentStorage: 'runtime_capability_persistentStorage',
    webLocks: 'runtime_capability_webLocks',
    broadcastChannel: 'runtime_capability_broadcastChannel',
    opfs: 'runtime_capability_opfs',
    folderAccess: 'runtime_capability_folderAccess',
    sqlite: 'runtime_capability_sqlite'
  };

  const PAGE_CONFIG = {
    'workspace-panel': { view: 'workspace-page', kicker: 'nav_kicker', title: 'workspace_title', status: 'page_status_workspace' },
    'import-panel': { view: 'import-page', kicker: 'workflow_import', title: 'select_file_title', status: 'page_status_import' },
    'mapping-panel': { view: 'import-page', kicker: 'workflow_mapping', title: 'mapping_title', status: 'page_status_mapping' },
    'coverage-panel': { view: 'coverage-page', kicker: 'workflow_coverage', title: 'coverage_title', status: 'page_status_coverage' },
    'comparison-panel': { view: 'comparison-page', kicker: 'workflow_comparison', title: 'comparison_title', status: 'page_status_comparison' },
    'results-panel': { view: 'analysis-page', kicker: 'workflow_analysis', title: 'analysis_title', status: 'page_status_analysis' }
  };

  const elements = {
    headerWorkspaceName: document.getElementById('header-workspace-name'),
    workflowSteps: Array.from(document.querySelectorAll('[data-workflow-target]')),
    pageViews: Array.from(document.querySelectorAll('.app-page')),
    pageContextKicker: document.getElementById('page-context-kicker'),
    pageContextTitle: document.getElementById('page-context-title'),
    pageContextStatus: document.getElementById('page-context-status'),
    runtimeBadge: document.getElementById('runtime-badge'),
    runtimeMode: document.getElementById('runtime-mode'),
    runtimeOrigin: document.getElementById('runtime-origin'),
    runtimeCapabilities: document.getElementById('runtime-capabilities'),
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
    customFieldsPanel: document.getElementById('custom-fields-panel'),
    customFieldsList: document.getElementById('custom-fields-list'),
    customFieldCreate: document.getElementById('custom-field-create'),
    workspaceStorageStatus: document.getElementById('workspace-storage-status'),
    workspaceMessage: document.getElementById('workspace-message'),
    workspaceRecovery: document.getElementById('workspace-recovery'),
    filePicker: document.querySelector('.file-picker'),
    fileInput: document.getElementById('file-input'),
    languageSelect: document.getElementById('language-select'),
    sourceStatus: document.getElementById('source-status'),
    mappingPanel: document.getElementById('mapping-panel'),
    mappingGrid: document.getElementById('mapping-grid'),
    mappingMessage: document.getElementById('mapping-message'),
    analyzeButton: document.getElementById('analyze-button'),
    coveragePanel: document.getElementById('coverage-panel'),
    coverageOverview: document.getElementById('coverage-overview'),
    coverageTimeline: document.getElementById('coverage-timeline'),
    coverageSourceTableBody: document.getElementById('coverage-source-table-body'),
    coverageDateTableBody: document.getElementById('coverage-date-table-body'),
    coverageDatePagination: document.getElementById('coverage-date-pagination'),
    coverageDatePrevious: document.getElementById('coverage-date-previous'),
    coverageDateNext: document.getElementById('coverage-date-next'),
    coverageDatePageStatus: document.getElementById('coverage-date-page-status'),
    coverageDrilldown: document.getElementById('coverage-drilldown'),
    coverageDrilldownTitle: document.getElementById('coverage-drilldown-title'),
    coverageDrilldownSummary: document.getElementById('coverage-drilldown-summary'),
    coverageDrilldownTableBody: document.getElementById('coverage-drilldown-table-body'),
    coverageDrilldownClose: document.getElementById('coverage-drilldown-close'),
    expectedWeekdays: Array.from(document.querySelectorAll('input[name="expected-weekday"]')),
    periodModes: Array.from(document.querySelectorAll('input[name="period-mode"]')),
    calendarWeekSummary: document.getElementById('calendar-week-summary'),
    periodAWeekFields: document.getElementById('period-a-week-fields'),
    periodAWeek: document.getElementById('period-a-week'),
    periodACustomFields: document.getElementById('period-a-custom-fields'),
    periodAName: document.getElementById('period-a-name'),
    periodAStart: document.getElementById('period-a-start'),
    periodAEnd: document.getElementById('period-a-end'),
    periodAStatus: document.getElementById('period-a-status'),
    periodBWeekFields: document.getElementById('period-b-week-fields'),
    periodBWeek: document.getElementById('period-b-week'),
    periodBCustomFields: document.getElementById('period-b-custom-fields'),
    periodBName: document.getElementById('period-b-name'),
    periodBStart: document.getElementById('period-b-start'),
    periodBEnd: document.getElementById('period-b-end'),
    periodBStatus: document.getElementById('period-b-status'),
    periodMessage: document.getElementById('period-message'),
    comparePeriods: document.getElementById('compare-periods'),
    resetPeriods: document.getElementById('reset-periods'),
    comparisonPanel: document.getElementById('comparison-panel'),
    comparisonPeriodSummary: document.getElementById('comparison-period-summary'),
    comparisonMetrics: document.getElementById('comparison-metrics'),
    comparisonSearch: document.getElementById('comparison-search'),
    comparisonFilter: document.getElementById('comparison-filter'),
    comparisonSort: document.getElementById('comparison-sort'),
    comparisonTableBody: document.getElementById('comparison-table-body'),
    comparisonPagination: document.getElementById('comparison-pagination'),
    comparisonPrevious: document.getElementById('comparison-previous'),
    comparisonNext: document.getElementById('comparison-next'),
    comparisonPageStatus: document.getElementById('comparison-page-status'),
    editPeriods: document.getElementById('edit-periods'),
    exportComparison: document.getElementById('export-comparison'),
    comparisonDetail: document.getElementById('comparison-detail'),
    comparisonDetailTitle: document.getElementById('comparison-detail-title'),
    comparisonDetailDescription: document.getElementById('comparison-detail-description'),
    comparisonDetailPeriods: document.getElementById('comparison-detail-periods'),
    comparisonDetailTableBody: document.getElementById('comparison-detail-table-body'),
    comparisonDetailClose: document.getElementById('comparison-detail-close'),
    comparisonDetailPagination: document.getElementById('comparison-detail-pagination'),
    comparisonDetailPrevious: document.getElementById('comparison-detail-previous'),
    comparisonDetailNext: document.getElementById('comparison-detail-next'),
    comparisonDetailPageStatus: document.getElementById('comparison-detail-page-status'),
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
    articleSourceInspection: document.getElementById('article-source-inspection'),
    articleSourceInspectionSummary: document.getElementById('article-source-inspection-summary'),
    articleSourceInspectionBody: document.getElementById('article-source-inspection-body'),
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
  let workspaceSavePending = 0;
  let workspaceSaveRevision = 0;
  let workspaceSaveGeneration = 0;

  function invalidateViewCaches() {
    state.articleViewCache = null;
    state.comparisonViewCache = null;
  }
  let workspaceLoadRevision = 0;
  let workspaceWorkerTask = null;
  let storageEstimateTimer = null;

  function translate(key, replacements) {
    let value = TRANSLATIONS[state.language][key] || TRANSLATIONS.en[key] || key;
    Object.keys(replacements || {}).forEach(function (name) {
      value = value.replace(new RegExp('\\{\\{' + name + '\\}\\}', 'g'), function () {
        return String(replacements[name]);
      });
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

  function renderWorkspaceMessage() {
    const message = state.workspaceMessage;
    if (!message || !message.key) {
      elements.workspaceMessage.className = 'workspace-message hidden';
      setText(elements.workspaceMessage, '');
      elements.workspaceRecovery.classList.add('hidden');
      return;
    }
    elements.workspaceMessage.className = 'workspace-message' + (message.type ? ' ' + message.type : '');
    setText(elements.workspaceMessage, translate(message.key, message.replacements));
    elements.workspaceRecovery.classList.toggle('hidden', !state.workspaceRecoveryAvailable);
  }

  function setWorkspaceMessage(key, replacements, type) {
    if (type !== 'error') {
      state.workspaceRecoveryAvailable = false;
    }
    state.workspaceMessage = {
      key: key || null,
      replacements: Object.assign({}, replacements || {}),
      type: type || ''
    };
    renderWorkspaceMessage();
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
    state.workspaceRecoveryAvailable = Boolean(
      state.workspaceSaveFailure &&
      state.activeWorkspace &&
      state.workspaceSaveFailure.workspaceId === state.activeWorkspace.id
    );
    renderWorkspaceMessage();
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

  function renderCustomFields() {
    const fields = Array.isArray(state.customFields) ? state.customFields : [];
    elements.customFieldCreate.disabled = !state.activeWorkspace || state.workspaceLoading;
    elements.customFieldsList.replaceChildren();
    if (!fields.length) {
      const empty = document.createElement('p');
      empty.className = 'table-note';
      setText(empty, translate('custom_field_empty'));
      elements.customFieldsList.appendChild(empty);
      return;
    }
    fields.forEach(function (field) {
      const row = document.createElement('div');
      row.className = 'custom-field-row' + (field.active === false ? ' removed' : '');
      const label = document.createElement('span');
      setText(label, field.name + ' · ' + field.type + (field.active === false ? ' · ' + translate('custom_field_removed') : ''));
      row.appendChild(label);
      if (field.active !== false) {
        const rename = document.createElement('button');
        rename.type = 'button'; rename.className = 'text-button'; rename.dataset.renameCustomField = field.id;
        rename.disabled = state.workspaceLoading;
        setText(rename, translate('custom_field_rename'));
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'text-button danger-button'; remove.dataset.removeCustomField = field.id;
        remove.disabled = state.workspaceLoading;
        setText(remove, translate('custom_field_remove'));
        row.appendChild(rename); row.appendChild(remove);
      }
      elements.customFieldsList.appendChild(row);
    });
  }

  function renderWorkspaceControls() {
    setText(elements.headerWorkspaceName, state.activeWorkspace ? state.activeWorkspace.name : translate('workspace_none'));
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
    elements.workspaceCancel.classList.toggle('hidden', !state.workspaceLoading || !state.workspaceLoadCancellable);
    elements.workspaceRecovery.disabled = state.workspaceLoading && !state.workspaceRecoveryAvailable;
    elements.workspaceCreate.disabled = !ready;
    elements.workspaceRestoreNew.disabled = !ready;
    elements.workspaceRename.disabled = !hasSelection;
    elements.workspaceDelete.disabled = !hasSelection;
    elements.workspaceBackup.disabled = !hasSelection;
    elements.workspaceRestoreReplace.disabled = !hasSelection;
    renderCustomFields();
    elements.fileInput.disabled = !hasWorkspace;
    elements.resetButton.disabled = !hasWorkspace || state.files.length === 0;
    elements.filePicker.classList.toggle('disabled', !hasWorkspace);
    elements.languageSelect.disabled = editsLocked;
    elements.analyzeButton.disabled = editsLocked || !state.activeWorkspace || !state.files.some(function (file) { return Boolean(file.parsed); });
    elements.exportButton.disabled = editsLocked || !state.result || !state.analysis || state.analysis.articles.length === 0;
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
    renderWorkflow();
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
    return workspaceModel.captureWorkspaceTrusted(state.activeWorkspace, state);
  }

  function persistActiveWorkspace(successKey, options) {
    if (!state.storageReady || (state.workspaceLoading && !(options && options.allowWhileLoading)) || !state.activeWorkspace) {
      return Promise.resolve(null);
    }
    if (state.workspaceSaveFailure && state.workspaceSaveFailure.workspaceId === state.activeWorkspace.id) {
      showWorkspaceError(state.workspaceSaveFailure.error);
      return Promise.reject(state.workspaceSaveFailure.error);
    }
    const metadataOnly = Boolean(options && options.metadataOnly);
    let snapshot;
    try {
      snapshot = metadataOnly
        ? {
          id: state.activeWorkspace.id,
          name: state.activeWorkspace.name,
          language: state.language,
          analyzed: Boolean(state.analysis),
          periodSettings: periods.normalizeSettings(state.periodSettings),
          customFields: state.customFields,
          sourceCount: state.files.length,
          sourceBytes: state.files.reduce(function (sum, file) {
            return sum + (file.buffer instanceof ArrayBuffer ? file.buffer.byteLength : 0);
          }, 0),
          normalizedRowCount: state.result && Array.isArray(state.result.rows) ? state.result.rows.length : 0
        }
        : captureActiveWorkspace();
    } catch (error) {
      showWorkspaceError(error);
      return Promise.reject(error);
    }
    const revision = workspaceSaveRevision + 1;
    workspaceSaveRevision = revision;
    const generation = workspaceSaveGeneration;
    workspaceSavePending += 1;
    setWorkspaceMessage('workspace_saving', { name: snapshot.name });
    const task = workspaceSaveChain
      .catch(function () {})
      .then(function () {
        if (generation !== workspaceSaveGeneration) {
          throw workspaceLoadError('workspace_save_discarded');
        }
        const current = state.activeWorkspace && state.activeWorkspace.id === snapshot.id
          ? state.activeWorkspace
          : state.workspaces.find(function (workspace) { return workspace.id === snapshot.id; });
        const saveOptions = {
          expectedRevision: current ? current.storageRevision : null
        };
        if (metadataOnly) {
          return workspaceRepository.updateWorkspaceSummary(snapshot.id, snapshot, saveOptions);
        }
        saveOptions.validated = true;
        return workspaceRepository.updateWorkspace(snapshot, saveOptions);
      })
      .then(async function (saved) {
        if (generation !== workspaceSaveGeneration) {
          return saved;
        }
        state.workspaceSaveFailure = null;
        if (state.activeWorkspace && state.activeWorkspace.id === saved.id) {
          state.activeWorkspace = workspaceMetadata(saved);
        }
        await refreshWorkspaceCatalog();
        if (generation !== workspaceSaveGeneration) {
          return saved;
        }
        scheduleStorageEstimateRefresh();
        if (revision === workspaceSaveRevision && state.activeWorkspace && state.activeWorkspace.id === saved.id) {
          setWorkspaceMessage(successKey || 'workspace_saved', { name: saved.name });
        }
        return saved;
      })
      .catch(function (error) {
        if (generation === workspaceSaveGeneration) {
          state.workspaceSaveFailure = {
            workspaceId: snapshot.id,
            error: error
          };
          showWorkspaceError(error);
        }
        throw error;
      })
      .finally(function () {
        workspaceSavePending = Math.max(0, workspaceSavePending - 1);
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
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return translate('percent_unavailable');
    }
    return new Intl.NumberFormat(state.language === 'de' ? 'de-DE' : 'en-US', {
      maximumFractionDigits: digits === undefined ? 2 : digits,
      minimumFractionDigits: 0
    }).format(value);
  }

  function formatQuantity(value) {
    if (value === null || value === undefined) {
      return translate('percent_unavailable');
    }
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

  function renderSourceColumnOverview(file, section) {
    if (!file.parsed || !Array.isArray(file.headers) || file.headers.length === 0) {
      return;
    }
    const catalog = Array.isArray(file.columnCatalog) && file.columnCatalog.length === file.headers.length
      ? file.columnCatalog
      : file.headers.map(function (header, position) { return { position: position, header: header, profile: null }; });
    const suggestions = core.buildMappingSuggestions(file.headers, catalog.map(function (entry) { return entry.profile || {}; }), {
      sourceType: file.sourceType,
      mapping: file.mapping
    });
    const mappedByPosition = {};
    Object.keys(file.mapping || {}).forEach(function (field) {
      if (Number.isInteger(file.mapping[field])) mappedByPosition[file.mapping[field]] = core.getFieldLabel(field, state.language);
    });
    const activeCustomFields = new Map((state.customFields || [])
      .filter(function (field) { return field && field.active !== false; })
      .map(function (field) { return [String(field.id), field]; }));
    Object.keys(file.customFieldMapping || {}).forEach(function (fieldId) {
      const field = activeCustomFields.get(String(fieldId));
      const position = file.customFieldMapping[fieldId];
      if (field && Number.isInteger(position)) {
        mappedByPosition[position] = field.name;
      }
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'source-column-overview';
    const title = document.createElement('h4');
    setText(title, translate('source_columns_title'));
    const hint = document.createElement('p');
    hint.className = 'table-note';
    setText(hint, translate('source_columns_hint'));
    wrapper.appendChild(title);
    wrapper.appendChild(hint);
    const scroll = document.createElement('div');
    scroll.className = 'table-scroll';
    const table = document.createElement('table');
    table.className = 'source-column-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['source_column_header', 'source_column_mapping', 'source_column_profile', 'source_column_samples'].forEach(function (key) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      setText(cell, translate(key));
      headRow.appendChild(cell);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const body = document.createElement('tbody');
    catalog.forEach(function (entry, position) {
      const profile = entry.profile || {};
      const row = document.createElement('tr');
      const sourceCell = document.createElement('th');
      sourceCell.scope = 'row';
      setText(sourceCell, (position + 1) + ': ' + (entry.header || translate('empty_header')));
      row.appendChild(sourceCell);
      const mappingCell = document.createElement('td');
      const mappedField = mappedByPosition[position];
      setText(mappingCell, mappedField || translate('source_column_unused'));
      const candidates = Object.keys(suggestions).map(function (field) {
        return (suggestions[field] || []).find(function (candidate) { return candidate.sourcePosition === position; });
      }).filter(Boolean).sort(function (left, right) { return right.score - left.score; });
      const best = candidates[0];
      if (!mappedField && best) {
        const topScore = best.score;
        const crossFieldTie = candidates.filter(function (candidate) { return candidate.score === topScore; }).length > 1;
        const note = document.createElement('small');
        note.className = 'source-column-suggestion ' + best.confidence;
        setText(note, best.ambiguity || crossFieldTie
          ? translate('source_column_ambiguous')
          : translate('source_column_suggestion', {
            field: core.getFieldLabel(best.targetField, state.language),
            confidence: translate(SOURCE_COLUMN_CONFIDENCE_KEYS[best.confidence] || SOURCE_COLUMN_CONFIDENCE_KEYS.low)
          }));
        mappingCell.appendChild(document.createElement('br'));
        mappingCell.appendChild(note);
      }
      row.appendChild(mappingCell);
      const profileCell = document.createElement('td');
      if (Number.isInteger(profile.totalRows)) {
        setText(profileCell, [
          translate('source_column_rows', { count: profile.totalRows }),
          translate('source_column_non_empty', { count: profile.nonEmptyCount || 0 }),
          translate('source_column_distinct', { count: profile.distinctValueCount || 0, suffix: profile.distinctValueCountExact ? '' : ' *' })
        ].join(' · '));
      } else {
        setText(profileCell, '—');
      }
      row.appendChild(profileCell);
      const samplesCell = document.createElement('td');
      const samples = Array.isArray(profile.sampleValues) ? profile.sampleValues : [];
      setText(samplesCell, samples.length ? samples.map(function (sample) { return sample.value; }).join(', ') : '—');
      row.appendChild(samplesCell);
      body.appendChild(row);
    });
    table.appendChild(body);
    scroll.appendChild(table);
    wrapper.appendChild(scroll);
    section.appendChild(wrapper);
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

      const sourceTypeField = document.createElement('label');
      sourceTypeField.className = 'compact-field source-type-field';
      const sourceTypeLabel = document.createElement('span');
      setText(sourceTypeLabel, translate('source_type_label'));
      const sourceTypeSelect = document.createElement('select');
      sourceTypeSelect.dataset.sourceTypeFileId = file.id;
      sourceTypeSelect.disabled = editsLocked || file.reading;
      addOption(sourceTypeSelect, 'order-lines', translate('source_type_order_lines'));
      addOption(sourceTypeSelect, 'article-master', translate('source_type_article_master'));
      sourceTypeSelect.value = workspaceModel.normalizeSourceType(file.sourceType);
      sourceTypeField.appendChild(sourceTypeLabel);
      sourceTypeField.appendChild(sourceTypeSelect);
      section.appendChild(sourceTypeField);

      if (file.errorKey) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message mapping-file-message';
        setText(errorMessage, translate(file.errorKey));
        section.appendChild(errorMessage);
        elements.mappingGrid.appendChild(section);
        return;
      }

      if (file.parsed) {
        renderSourceColumnOverview(file, section);
        const fields = document.createElement('div');
        fields.className = 'mapping-fields';
        core.getFieldDefinitionsForSource(file.sourceType, { mapping: file.mapping }).forEach(function (definition) {
          const required = core.fieldRequiredForSource(definition, file.sourceType);
          const wrapper = document.createElement('div');
          wrapper.className = 'mapping-field' + (required ? ' required' : '');
          const label = document.createElement('label');
          const selectId = 'mapping-' + file.id + '-' + definition.key;
          label.htmlFor = selectId;
          const labelLine = document.createElement('span');
          labelLine.className = 'field-label-line';
          const fieldName = document.createElement('span');
          setText(fieldName, core.getFieldLabel(definition.key, state.language));
          const fieldBadge = document.createElement('span');
          fieldBadge.className = 'field-badge ' + (required ? 'required' : 'optional');
          const groupKey = 'mapping_group_' + String(definition.group || 'article').replace(/-/g, '_');
          setText(fieldBadge, required ? translate('required_label') : translate(groupKey));
          labelLine.appendChild(fieldName);
          labelLine.appendChild(fieldBadge);
          label.appendChild(labelLine);
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
          if (definition.key === 'sales_unit_count' || definition.key === 'quantity_per_sales_unit') {
            const help = document.createElement('small');
            help.className = 'mapping-help';
            const helpKey = 'mapping_help_' + definition.key;
            setText(help, translate(helpKey));
            wrapper.appendChild(help);
          }
          fields.appendChild(wrapper);
        });
        const customFields = state.customFields.filter(function (field) { return field.active !== false; });
        if (file.sourceType === 'article-master') {
          const customHeading = document.createElement('h4');
          setText(customHeading, translate('custom_field_mapping_title'));
          fields.appendChild(customHeading);
          const createFromSource = document.createElement('button');
          createFromSource.type = 'button';
          createFromSource.className = 'text-button';
          createFromSource.dataset.createCustomFromFile = file.id;
          createFromSource.disabled = editsLocked;
          setText(createFromSource, translate('custom_field_create_from_source'));
          fields.appendChild(createFromSource);
          customFields.forEach(function (field) {
            const wrapper = document.createElement('div');
            wrapper.className = 'mapping-field';
            const label = document.createElement('label');
            const selectId = 'mapping-' + file.id + '-custom-' + field.id;
            label.htmlFor = selectId;
            const labelLine = document.createElement('span');
            labelLine.className = 'field-label-line';
            const fieldName = document.createElement('span');
            setText(fieldName, field.name + ' (' + field.type + ')');
            labelLine.appendChild(fieldName); label.appendChild(labelLine);
            const select = document.createElement('select');
            select.id = selectId;
            select.dataset.customField = field.id;
            select.dataset.fileId = file.id;
            select.disabled = editsLocked;
            addOption(select, '', translate('not_mapped'));
            file.headers.forEach(function (header, index) {
              addOption(select, String(index), (index + 1) + ': ' + (header || translate('empty_header')));
            });
            if (file.customFieldMapping && Number.isInteger(file.customFieldMapping[field.id])) {
              select.value = String(file.customFieldMapping[field.id]);
            }
            wrapper.appendChild(label); wrapper.appendChild(select); fields.appendChild(wrapper);
          });
        }
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

  function renderRuntimeDiagnostics() {
    const modeTranslation = RUNTIME_MODE_TRANSLATION_KEYS[runtime.mode] || RUNTIME_MODE_TRANSLATION_KEYS.unsupported;
    setText(elements.runtimeBadge, translate(modeTranslation.badge));
    setText(elements.runtimeMode, translate(modeTranslation.mode));
    setText(elements.runtimeOrigin, runtime.origin);
    elements.runtimeCapabilities.replaceChildren();
    window.OpenSlottingRuntimeFactory.CAPABILITY_KEYS.forEach(function (capabilityName) {
      const available = runtime.supports(capabilityName);
      const item = document.createElement('li');
      item.className = 'runtime-capability' + (available ? '' : ' unavailable');
      setText(item, translate(
        available ? 'runtime_capability_available' : 'runtime_capability_unavailable',
        { name: translate(RUNTIME_CAPABILITY_TRANSLATION_KEYS[capabilityName]) }
      ));
      elements.runtimeCapabilities.appendChild(item);
    });
  }

  function applyLanguage(options) {
    document.documentElement.lang = state.language;
    document.title = translate('page_title');
    setText(elements.appVersion, 'OpenSlotting v' + core.APP_VERSION);
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      const replacements = element.dataset.i18n === 'eyebrow' ? { version: core.APP_VERSION } : undefined;
      setText(element, translate(element.dataset.i18n, replacements));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
      element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (element) {
      element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
    });
    renderRuntimeDiagnostics();
    elements.languageSelect.setAttribute('aria-label', translate('language_label'));
    renderWorkspaceControls();
    renderStorageStatus();
    renderWorkspaceMessage();
    if (state.files.length > 0) {
      renderMapping();
    }
    if (state.result && !(options && options.skipAnalysisRefresh)) {
      refreshAnalyzedResults(true);
    } else if (state.result) {
      renderCoverage();
      renderComparison();
    }
    renderSourceStatus();
    renderWorkflow();
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
      [translate('metric_sales'), formatTotalSales(analysis), translate('metric_sales_detail', { count: analysis.sales_value_rows })],
      [translate('metric_sales_units'), formatQuantity(analysis.total_sales_units), translate('metric_sales_units_detail', {
        rows: analysis.sales_unit_rows,
        partials: analysis.selling_unit_partial_rows,
        overages: analysis.selling_unit_overage_rows
      })]
    ]);
  }

  function renderWorkflow(activeTarget) {
    const availability = {
      'workspace-panel': Boolean(state.activeWorkspace),
      'import-panel': Boolean(state.activeWorkspace),
      'mapping-panel': state.files.length > 0,
      'coverage-panel': Boolean(state.result && analysisRowCount(state.result) > 0),
      'comparison-panel': Boolean(state.comparison),
      'results-panel': Boolean(state.result && resultHasRetainedData(state.result))
    };
    const completion = {
      'workspace-panel': Boolean(state.activeWorkspace),
      'import-panel': state.files.length > 0,
      'mapping-panel': Boolean(state.result && analysisRowCount(state.result) > 0),
      'coverage-panel': Boolean(state.comparison),
      'comparison-panel': false,
      'results-panel': false
    };
    const fallbackTarget = state.comparison
      ? 'comparison-panel'
      : state.result && analysisRowCount(state.result) > 0
        ? 'coverage-panel'
        : state.result && resultHasRetainedData(state.result)
          ? 'results-panel'
        : state.files.length
          ? 'mapping-panel'
          : state.activeWorkspace
            ? 'import-panel'
            : 'workspace-panel';
    const candidateTarget = activeTarget || state.activePageTarget;
    const candidateAvailable = candidateTarget === 'workspace-panel' || availability[candidateTarget];
    const requestedTarget = PAGE_CONFIG[candidateTarget] && candidateAvailable ? candidateTarget : fallbackTarget;
    const config = PAGE_CONFIG[requestedTarget] || PAGE_CONFIG[fallbackTarget];
    state.activePageTarget = requestedTarget;
    elements.pageViews.forEach(function (view) {
      view.classList.toggle('hidden', view.id !== config.view);
    });
    setText(elements.pageContextKicker, translate(config.kicker));
    setText(elements.pageContextTitle, translate(config.title));
    setText(elements.pageContextStatus, translate(config.status));
    elements.workflowSteps.forEach(function (button) {
      const target = button.dataset.workflowTarget;
      button.classList.toggle('available', availability[target]);
      button.classList.toggle('complete', completion[target]);
      button.classList.toggle('active', target === requestedTarget);
      button.disabled = !availability[target] && target !== 'workspace-panel';
    });
  }

  function coverageText(coverage) {
    if (!coverage || coverage.status === 'unavailable') {
      return translate('coverage_unavailable');
    }
    if (coverage.status === 'empty') {
      return translate('coverage_empty', { expected: coverage.expectedDayCount });
    }
    if (coverage.status === 'partial') {
      return translate('coverage_partial', {
        observed: coverage.observedDayCount,
        expected: coverage.expectedDayCount,
        missing: coverage.missingDayCount
      });
    }
    return translate('coverage_complete', {
      observed: coverage.observedDayCount,
      expected: coverage.expectedDayCount
    });
  }

  function formatCalendarDate(value) {
    if (!periods.validDate(value)) {
      return value || '';
    }
    return new Intl.DateTimeFormat(state.language === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(value + 'T00:00:00Z'));
  }

  function selectedPeriodMode() {
    const selected = elements.periodModes.find(function (input) { return input.checked; });
    return selected && selected.value === 'custom' ? 'custom' : 'weeks';
  }

  function calendarWeekPeriod(week) {
    const period = periods.periodFromCalendarWeek(week);
    period.name = translate('calendar_week_name', {
      week: String(week.week).padStart(2, '0'),
      year: week.year
    });
    return period;
  }

  function periodSettingsFromControls() {
    const mode = selectedPeriodMode();
    const weeks = state.result ? periods.detectedCalendarWeeks(state.result.rows) : [];
    const selectedWeekA = weeks.find(function (week) { return week.id === elements.periodAWeek.value; });
    const selectedWeekB = weeks.find(function (week) { return week.id === elements.periodBWeek.value; });
    const customPeriodA = {
      name: elements.periodAName.value.trim() || translate('period_a'),
      start: elements.periodAStart.value,
      end: elements.periodAEnd.value
    };
    const customPeriodB = {
      name: elements.periodBName.value.trim() || translate('period_b'),
      start: elements.periodBStart.value,
      end: elements.periodBEnd.value
    };
    return periods.normalizeSettings({
      mode: mode,
      expectedWeekdays: elements.expectedWeekdays.filter(function (input) { return input.checked; }).map(function (input) { return Number(input.value); }),
      periodA: mode === 'weeks' && selectedWeekA ? calendarWeekPeriod(selectedWeekA) : customPeriodA,
      periodB: mode === 'weeks' && selectedWeekB ? calendarWeekPeriod(selectedWeekB) : customPeriodB
    });
  }

  function periodSettingsValid(settings) {
    return settings.expectedWeekdays.length > 0 &&
      periods.validDate(settings.periodA.start) && periods.validDate(settings.periodA.end) && settings.periodA.start <= settings.periodA.end &&
      periods.validDate(settings.periodB.start) && periods.validDate(settings.periodB.end) && settings.periodB.start <= settings.periodB.end;
  }

  function periodSettingsStorable(settings) {
    return settings.expectedWeekdays.length > 0 &&
      (!settings.periodA.start || !settings.periodA.end || settings.periodA.start <= settings.periodA.end) &&
      (!settings.periodB.start || !settings.periodB.end || settings.periodB.start <= settings.periodB.end);
  }

  function populateCalendarWeekSelect(select, weeks, period, fallbackWeek) {
    select.replaceChildren();
    if (weeks.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      setText(option, translate('calendar_week_no_options'));
      select.appendChild(option);
      select.disabled = true;
      return;
    }
    weeks.forEach(function (week) {
      const option = document.createElement('option');
      option.value = week.id;
      setText(option, translate('calendar_week_option', {
        week: String(week.week).padStart(2, '0'),
        year: week.year,
        start: formatCalendarDate(week.start),
        end: formatCalendarDate(week.end),
        rows: week.rowCount
      }));
      select.appendChild(option);
    });
    const matchingWeek = weeks.find(function (week) {
      return week.start === period.start && week.end === period.end;
    });
    select.value = (matchingWeek || fallbackWeek || weeks[0]).id;
    select.disabled = false;
  }

  function renderPeriodControls() {
    const settings = periods.normalizeSettings(state.periodSettings);
    const weeks = state.result ? periods.detectedCalendarWeeks(state.result.rows) : [];
    const fallbackB = weeks.length > 0 ? weeks[weeks.length - 1] : null;
    const fallbackA = weeks.length > 1 ? weeks[weeks.length - 2] : fallbackB;
    elements.periodModes.forEach(function (input) {
      input.checked = input.value === settings.mode;
    });
    const customMode = settings.mode === 'custom';
    elements.periodAWeekFields.classList.toggle('hidden', customMode);
    elements.periodBWeekFields.classList.toggle('hidden', customMode);
    elements.periodACustomFields.classList.toggle('hidden', !customMode);
    elements.periodBCustomFields.classList.toggle('hidden', !customMode);
    populateCalendarWeekSelect(elements.periodAWeek, weeks, settings.periodA, fallbackA);
    populateCalendarWeekSelect(elements.periodBWeek, weeks, settings.periodB, fallbackB);
    setText(elements.calendarWeekSummary, weeks.length > 0
      ? translate('calendar_week_summary', {
        count: weeks.length,
        start: formatCalendarDate(weeks[0].start),
        end: formatCalendarDate(weeks[weeks.length - 1].end)
      })
      : translate('calendar_week_no_options'));
    elements.periodAName.value = settings.periodA.name;
    elements.periodAStart.value = settings.periodA.start || '';
    elements.periodAEnd.value = settings.periodA.end || '';
    elements.periodBName.value = settings.periodB.name;
    elements.periodBStart.value = settings.periodB.start || '';
    elements.periodBEnd.value = settings.periodB.end || '';
    elements.expectedWeekdays.forEach(function (input) {
      input.checked = settings.expectedWeekdays.includes(Number(input.value));
    });
  }

  function settingsForDetectedCalendarWeeks(settings, rows) {
    const normalized = periods.normalizeSettings(settings);
    if (normalized.mode !== 'weeks') {
      return normalized;
    }
    const weeks = periods.detectedCalendarWeeks(rows);
    if (weeks.length === 0) {
      return normalized;
    }
    const periodMatchesWeek = function (period) {
      return weeks.some(function (week) { return week.start === period.start && week.end === period.end; });
    };
    if (periodMatchesWeek(normalized.periodA) && periodMatchesWeek(normalized.periodB)) {
      return normalized;
    }
    const defaults = periods.defaultSettings(rows);
    defaults.expectedWeekdays = normalized.expectedWeekdays;
    return defaults;
  }

  function renderCoverageTimeline(rows) {
    const dates = Array.from(new Set(rows.map(function (row) { return periods.validDate(row.delivery_date) ? row.delivery_date : null; }).filter(Boolean))).sort();
    elements.coverageTimeline.replaceChildren();
    if (dates.length === 0) {
      elements.coverageTimeline.classList.add('hidden');
      return;
    }
    elements.coverageTimeline.classList.remove('hidden');
    const first = new Date(dates[0] + 'T00:00:00Z');
    const last = new Date(dates[dates.length - 1] + 'T00:00:00Z');
    const dayCount = Math.max(1, Math.round((last - first) / 86400000) + 1);
    const bucketSize = Math.max(1, Math.ceil(dayCount / 366));
    const observed = new Set(dates);
    const observedBuckets = new Set(Array.from(observed).map(function (value) {
      const observedDate = new Date(value + 'T00:00:00Z');
      const offset = Math.round((observedDate.getTime() - first.getTime()) / 86400000);
      return Math.floor(offset / bucketSize);
    }));
    const bucketCount = Math.ceil(dayCount / bucketSize);
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
      const offset = bucketIndex * bucketSize;
      const bucketStart = new Date(first.getTime() + offset * 86400000);
      const bucketEndOffset = Math.min(dayCount - 1, offset + bucketSize - 1);
      const bucketEnd = new Date(first.getTime() + bucketEndOffset * 86400000);
      const hasObserved = observedBuckets.has(bucketIndex);
      const day = document.createElement('span');
      day.className = 'coverage-day' + (hasObserved ? ' observed' : '');
      day.title = bucketStart.toISOString().slice(0, 10) + (bucketSize > 1 ? ' – ' + bucketEnd.toISOString().slice(0, 10) : '');
      elements.coverageTimeline.appendChild(day);
    }
  }

  function buildCoverageData() {
    const sourceMap = new Map((state.result.files || []).filter(function (file) {
      return file.sourceType !== 'article-master';
    }).map(function (file) {
      return [file.id, {
        id: file.id,
        label: file.label,
        dateStart: file.dateStart,
        dateEnd: file.dateEnd,
        validRows: file.validRows,
        invalidRows: file.invalidRows,
        dates: new Set(),
        salesUnitRows: 0
      }];
    }));
    const dateMap = new Map();
    function dateEntry(date) {
      if (!dateMap.has(date)) {
        dateMap.set(date, { date: date, validRows: 0, invalidLines: new Set(), sources: new Map() });
      }
      return dateMap.get(date);
    }
    state.result.rows.forEach(function (row) {
      const source = sourceMap.get(row.source_file_id);
      if (source && periods.validDate(row.delivery_date)) {
        source.dates.add(row.delivery_date);
        if (typeof row.sales_unit_count === 'bigint') {
          source.salesUnitRows += 1;
        }
      }
      if (periods.validDate(row.delivery_date)) {
        const entry = dateEntry(row.delivery_date);
        entry.validRows += 1;
        if (row.source_file_id) {
          entry.sources.set(row.source_file_id, row.source_file_label || row.source_file_name || row.source_file_id);
        }
      }
    });
    state.result.issues.forEach(function (issue) {
      if (!sourceMap.has(issue.sourceFileId) || !core.issueIsBlocking(issue) || !periods.validDate(issue.deliveryDate) || !Number.isInteger(issue.sourceLine)) {
        return;
      }
      const entry = dateEntry(issue.deliveryDate);
      entry.invalidLines.add(String(issue.sourceFileId || '') + ':' + issue.sourceLine);
      if (issue.sourceFileId) {
        entry.sources.set(issue.sourceFileId, issue.sourceFileLabel || issue.sourceFileName || issue.sourceFileId);
      }
    });
    return {
      sources: Array.from(sourceMap.values()),
      dates: Array.from(dateMap.values()).sort(function (left, right) { return left.date.localeCompare(right.date); })
    };
  }

  function evidenceButton(datasetName, value) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.dataset[datasetName] = value;
    setText(button, translate('coverage_view_evidence'));
    return button;
  }

  function renderCoverageSources(coverageData) {
    elements.coverageSourceTableBody.replaceChildren();
    coverageData.sources.forEach(function (source) {
      const row = document.createElement('tr');
      appendCell(row, source.label);
      appendCell(row, source.dateStart && source.dateEnd ? source.dateStart + ' – ' + source.dateEnd : translate('empty_value'));
      appendCell(row, formatNumber(source.dates.size, 0), 'number');
      appendCell(row, formatNumber(source.validRows, 0), 'number');
      appendCell(row, formatNumber(source.invalidRows, 0), 'number');
      appendCell(row, formatNumber(source.salesUnitRows, 0), 'number');
      const action = document.createElement('td');
      action.appendChild(evidenceButton('coverageSourceId', source.id));
      row.appendChild(action);
      elements.coverageSourceTableBody.appendChild(row);
    });
  }

  function renderCoverageDates(coverageData) {
    const pageCount = Math.max(1, Math.ceil(coverageData.dates.length / TABLE_PAGE_SIZE));
    state.coverageDatePage = Math.min(Math.max(state.coverageDatePage, 1), pageCount);
    const pageStart = (state.coverageDatePage - 1) * TABLE_PAGE_SIZE;
    const visible = coverageData.dates.slice(pageStart, pageStart + TABLE_PAGE_SIZE);
    elements.coverageDateTableBody.replaceChildren();
    visible.forEach(function (entry) {
      const row = document.createElement('tr');
      appendCell(row, entry.date);
      appendCell(row, formatNumber(entry.validRows, 0), 'number');
      appendCell(row, formatNumber(entry.invalidLines.size, 0), 'number');
      appendCell(row, Array.from(entry.sources.values()).join(', ') || translate('empty_value'));
      const action = document.createElement('td');
      action.appendChild(evidenceButton('coverageDate', entry.date));
      row.appendChild(action);
      elements.coverageDateTableBody.appendChild(row);
    });
    elements.coverageDatePagination.classList.toggle('hidden', coverageData.dates.length <= TABLE_PAGE_SIZE);
    elements.coverageDatePrevious.disabled = state.coverageDatePage <= 1;
    elements.coverageDateNext.disabled = state.coverageDatePage >= pageCount;
    setText(elements.coverageDatePageStatus, translate('coverage_date_page', {
      page: state.coverageDatePage,
      pages: pageCount,
      count: visible.length
    }));
  }

  function renderCoverageDrilldown() {
    const selection = state.coverageDrilldown;
    if (!selection || !state.result) {
      elements.coverageDrilldown.classList.add('hidden');
      return;
    }
    const isDate = selection.type === 'date';
    const sourceSummary = state.result.files.find(function (source) { return source.id === selection.value; });
    const validRows = state.result.rows.filter(function (row) {
      return isDate ? row.delivery_date === selection.value : row.source_file_id === selection.value;
    });
    const issues = state.result.issues.filter(function (issue) {
      const source = state.result.files.find(function (file) { return file.id === issue.sourceFileId; });
      return source && source.sourceType !== 'article-master' && (isDate ? issue.deliveryDate === selection.value : issue.sourceFileId === selection.value);
    });
    const invalidLines = new Set(issues.filter(function (issue) {
      return core.issueIsBlocking(issue) && Number.isInteger(issue.sourceLine);
    }).map(function (issue) {
      return String(issue.sourceFileId || '') + ':' + issue.sourceLine;
    }));
    const sources = new Set();
    validRows.forEach(function (row) { if (row.source_file_id) { sources.add(row.source_file_id); } });
    issues.forEach(function (issue) { if (issue.sourceFileId) { sources.add(issue.sourceFileId); } });
    setText(elements.coverageDrilldownTitle, translate(isDate ? 'coverage_drilldown_date_title' : 'coverage_drilldown_source_title', {
      date: selection.value,
      source: sourceSummary ? sourceSummary.label : selection.value
    }));
    setText(elements.coverageDrilldownSummary, translate('coverage_drilldown_summary', {
      valid: validRows.length,
      invalid: invalidLines.size,
      sources: sources.size
    }));
    elements.coverageDrilldownTableBody.replaceChildren();
    validRows.forEach(function (rowData) {
      const row = document.createElement('tr');
      appendCell(row, translate('coverage_valid_row'));
      appendCell(row, optionalText(rowData.source_file_label || rowData.source_file_name));
      appendCell(row, String(rowData.source_line), 'number');
      appendCell(row, rowData.delivery_date);
      appendCell(row, rowData.article_id);
      appendCell(row, optionalText(rowData.order_id) + ' · ' + formatQuantity(rowData.quantity));
      elements.coverageDrilldownTableBody.appendChild(row);
    });
    issues.forEach(function (issue) {
      const row = document.createElement('tr');
      appendCell(row, translate(core.issueIsBlocking(issue) ? 'coverage_invalid_row' : 'coverage_advisory_row'));
      appendCell(row, optionalText(issue.sourceFileLabel || issue.sourceFileName));
      appendCell(row, Number.isInteger(issue.sourceLine) ? String(issue.sourceLine) : translate('empty_value'), 'number');
      appendCell(row, optionalText(issue.deliveryDate));
      appendCell(row, translate('empty_value'));
      appendCell(row, issue.message);
      elements.coverageDrilldownTableBody.appendChild(row);
    });
    elements.coverageDrilldown.classList.remove('hidden');
  }

  function renderCoverage() {
    if (!state.result || analysisRowCount(state.result) === 0) {
      elements.coveragePanel.classList.add('hidden');
      return;
    }
    const rows = state.result.rows;
    const dates = Array.from(new Set(rows.map(function (row) { return periods.validDate(row.delivery_date) ? row.delivery_date : null; }).filter(Boolean))).sort();
    const datedRows = rows.filter(function (row) { return periods.validDate(row.delivery_date); }).length;
    elements.coverageOverview.replaceChildren();
    const summary = document.createElement('div');
    summary.className = 'coverage-stat';
    const summaryStrong = document.createElement('strong');
    const summaryDetail = document.createElement('span');
    if (dates.length > 0) {
      setText(summaryStrong, translate('coverage_overview', {
        days: dates.length,
        start: dates[0],
        end: dates[dates.length - 1],
        dated: datedRows,
        rows: rows.length
      }));
      setText(summaryDetail, translate('coverage_unknown_note'));
    } else {
      setText(summaryStrong, translate('coverage_no_dates'));
      setText(summaryDetail, '');
    }
    summary.appendChild(summaryStrong);
    summary.appendChild(summaryDetail);
    elements.coverageOverview.appendChild(summary);
    renderCoverageTimeline(rows);
    const coverageData = buildCoverageData();
    renderCoverageSources(coverageData);
    renderCoverageDates(coverageData);
    renderCoverageDrilldown();
    renderPeriodControls();
    const coverageA = state.comparison
      ? state.comparison.coverageA
      : periods.coverageForPeriod(rows, state.periodSettings.periodA, state.periodSettings.expectedWeekdays);
    const coverageB = state.comparison
      ? state.comparison.coverageB
      : periods.coverageForPeriod(rows, state.periodSettings.periodB, state.periodSettings.expectedWeekdays);
    const hasExpectedWeekdays = state.periodSettings.expectedWeekdays.length > 0;
    elements.periodAStatus.className = 'period-status ' + (hasExpectedWeekdays ? coverageA.status : 'unavailable');
    elements.periodBStatus.className = 'period-status ' + (hasExpectedWeekdays ? coverageB.status : 'unavailable');
    setText(elements.periodAStatus, hasExpectedWeekdays
      ? coverageText(coverageA) + ' · ' + translate('coverage_sources', { count: coverageA.sourceFiles.length })
      : translate('weekdays_required'));
    setText(elements.periodBStatus, hasExpectedWeekdays
      ? coverageText(coverageB) + ' · ' + translate('coverage_sources', { count: coverageB.sourceFiles.length })
      : translate('weekdays_required'));
    elements.comparePeriods.disabled = dates.length === 0;
    elements.coveragePanel.classList.remove('hidden');
  }

  function signedQuantity(value) {
    if (value === 0n) {
      return formatQuantity(value);
    }
    return (value > 0n ? '+' : '') + formatQuantity(value);
  }

  function signedNumber(value) {
    return (value > 0 ? '+' : '') + formatNumber(value, 0);
  }

  function signedPercent(value) {
    return value === null ? translate('percent_unavailable') : (value > 0 ? '+' : '') + formatNumber(value) + ' %';
  }

  function signedSales(value) {
    const text = String(value || '0');
    const formatted = core.formatSalesValue(text, state.language);
    return text !== '0' && text[0] !== '-' ? '+' + formatted : formatted;
  }

  function metricComparisonCard(label, before, after, delta, className) {
    const card = document.createElement('article');
    card.className = 'comparison-metric';
    const title = document.createElement('strong');
    setText(title, label);
    const values = document.createElement('dl');
    [['A', before], ['B', after]].forEach(function (entry) {
      const term = document.createElement('dt');
      const definition = document.createElement('dd');
      setText(term, entry[0]);
      setText(definition, entry[1]);
      values.appendChild(term);
      values.appendChild(definition);
    });
    const change = document.createElement('span');
    change.className = 'comparison-delta ' + (className || '');
    setText(change, delta);
    card.appendChild(title);
    card.appendChild(values);
    card.appendChild(change);
    return card;
  }

  function filteredComparisonArticles() {
    if (!state.comparison) {
      return [];
    }
    const query = core.normalizeSearchQuery(elements.comparisonSearch.value, state.language);
    const filter = elements.comparisonFilter.value;
    const sort = elements.comparisonSort.value;
    const cached = state.comparisonViewCache;
    if (cached && cached.comparison === state.comparison && cached.language === state.language &&
      cached.query === query && cached.filter === filter && cached.sort === sort) {
      return cached.articles;
    }
    const incomplete = state.comparison.coverageA.status !== 'complete' || state.comparison.coverageB.status !== 'complete';
    const articles = state.comparison.articles.filter(function (article) {
      const searchMatch = core.articleMatchesNormalizedQuery(article, query, state.language);
      if (!searchMatch || filter === 'all') {
        return searchMatch;
      }
      if (filter === 'incomplete') {
        return incomplete;
      }
      if (filter === 'conflict') {
        return article.selling_unit_conflict;
      }
      return article.state === filter;
    });
    const sorted = articles.sort(function (left, right) {
      if (sort === 'article') {
        return left.article_id.localeCompare(right.article_id);
      }
      if (sort === 'percent') {
        const leftValue = left.quantity_percent_change === null ? -Infinity : Math.abs(left.quantity_percent_change);
        const rightValue = right.quantity_percent_change === null ? -Infinity : Math.abs(right.quantity_percent_change);
        return rightValue - leftValue || left.article_id.localeCompare(right.article_id);
      }
      const leftAbs = left.quantity_change < 0n ? -left.quantity_change : left.quantity_change;
      const rightAbs = right.quantity_change < 0n ? -right.quantity_change : right.quantity_change;
      return leftAbs === rightAbs ? left.article_id.localeCompare(right.article_id) : (leftAbs > rightAbs ? -1 : 1);
    });
    state.comparisonViewCache = {
      comparison: state.comparison,
      language: state.language,
      query: query,
      filter: filter,
      sort: sort,
      articles: sorted
    };
    return sorted;
  }

  function appendComparisonPeriodSummary(period, coverage) {
    const card = document.createElement('article');
    card.className = 'comparison-period';
    const title = document.createElement('strong');
    const detail = document.createElement('span');
    detail.className = 'coverage-' + coverage.status;
    setText(title, period.name);
    setText(detail, translate('comparison_period_summary', {
      name: period.name,
      start: period.start,
      end: period.end,
      coverage: coverageText(coverage)
    }));
    card.appendChild(title);
    card.appendChild(detail);
    elements.comparisonPeriodSummary.appendChild(card);
  }

  function appendComparisonQuality(row, article, incomplete) {
    const cell = document.createElement('td');
    cell.className = 'comparison-quality-cell';
    const stateKey = 'change_' + article.state;
    const labels = [[translate(stateKey), article.state === 'increased' || article.state === 'new' ? 'positive' : article.state === 'decreased' || article.state === 'inactive' ? 'excluded' : '']];
    if (incomplete) {
      labels.push([translate('quality_unknown_dates'), 'warning']);
    }
    if (article.selling_unit_conflict) {
      labels.push([translate('quality_unit_conflict'), 'warning']);
    }
    if (article.selling_unit_partial) {
      labels.push([translate('quality_unit_partial'), 'positive']);
    }
    if (article.selling_unit_overage) {
      labels.push([translate('quality_unit_exceeds'), 'warning']);
    }
    if (labels.length === 1) {
      labels.push([translate('quality_ok'), '']);
    }
    labels.forEach(function (label) {
      const badge = document.createElement('span');
      badge.className = 'status-badge' + (label[1] ? ' ' + label[1] : '');
      setText(badge, label[0]);
      cell.appendChild(badge);
    });
    row.appendChild(cell);
  }

  function appendComparisonDetailPeriod(periodName, article) {
    const card = document.createElement('article');
    card.className = 'comparison-detail-period';
    const title = document.createElement('h4');
    setText(title, periodName);
    const metrics = document.createElement('dl');
    [
      [translate('metric_period_lines'), formatNumber(article.order_line_count, 0)],
      [translate('metric_period_quantity'), formatQuantity(article.total_quantity)],
      [translate('metric_period_orders'), formatNumber(article.distinct_orders, 0)],
      [translate('metric_period_customers'), formatNumber(article.distinct_customers, 0)],
      [translate('metric_period_days'), formatNumber(article.active_days, 0)],
      [translate('metric_period_sales'), formatSalesValue(article.total_sales, article.total_sales_exact) + ' · ' + translate('metric_period_row_coverage', { rows: article.sales_value_rows, lines: article.order_line_count })],
      [translate('metric_period_sales_units'), formatQuantity(article.total_sales_units) + ' · ' + translate('metric_period_row_coverage', { rows: article.sales_unit_rows, lines: article.order_line_count }) + ' · ' + translate('metric_sales_unit_relations', { partials: article.selling_unit_partial_rows, overages: article.selling_unit_overage_rows })]
    ].forEach(function (metric) {
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      setText(term, metric[0]);
      setText(value, metric[1]);
      metrics.appendChild(term);
      metrics.appendChild(value);
    });
    card.appendChild(title);
    card.appendChild(metrics);
    elements.comparisonDetailPeriods.appendChild(card);
  }

  function renderComparisonDetail() {
    if (!state.comparison || !state.selectedComparisonArticleId) {
      elements.comparisonDetail.classList.add('hidden');
      return;
    }
    const article = state.comparison.articles.find(function (candidate) {
      return candidate.article_id === state.selectedComparisonArticleId;
    });
    if (!article) {
      state.selectedComparisonArticleId = null;
      elements.comparisonDetail.classList.add('hidden');
      return;
    }
    setText(elements.comparisonDetailTitle, article.article_id);
    let description = translate('comparison_detail_description', {
      name: optionalText(article.article_name),
      sources: new Set((article.period_a.source_files || []).concat(article.period_b.source_files || [])).size,
      locations: new Set((article.period_a.locations || []).concat(article.period_b.locations || [])).size
    });
    const variants = Array.from(new Set((article.period_a.article_name_variants || []).concat(article.period_b.article_name_variants || [])));
    if (variants.length > 1) {
      description += ' · ' + translate('comparison_detail_conflict', { variants: variants.join(' · ') });
    }
    setText(elements.comparisonDetailDescription, description);
    elements.comparisonDetailPeriods.replaceChildren();
    appendComparisonDetailPeriod(state.comparison.settings.periodA.name, article.period_a);
    appendComparisonDetailPeriod(state.comparison.settings.periodB.name, article.period_b);
    const referencesA = Array.isArray(article.period_a.order_line_refs) ? article.period_a.order_line_refs : [];
    const referencesB = Array.isArray(article.period_b.order_line_refs) ? article.period_b.order_line_refs : [];
    const totalRows = referencesA.length + referencesB.length;
    const pageCount = Math.max(1, Math.ceil(totalRows / TABLE_PAGE_SIZE));
    state.comparisonDetailPage = Math.min(Math.max(state.comparisonDetailPage, 1), pageCount);
    const pageStart = (state.comparisonDetailPage - 1) * TABLE_PAGE_SIZE;
    const pageEnd = pageStart + TABLE_PAGE_SIZE;
    const visible = [];
    const appendVisible = function (references, periodName, offset) {
      const start = Math.max(0, pageStart - offset);
      const end = Math.min(references.length, pageEnd - offset);
      if (start >= end) {
        return;
      }
      detailRowsForReferences(references, start, end).forEach(function (line) {
        visible.push({ period: periodName, line: line });
      });
    };
    appendVisible(referencesA, state.comparison.settings.periodA.name, 0);
    appendVisible(referencesB, state.comparison.settings.periodB.name, referencesA.length);
    elements.comparisonDetailTableBody.replaceChildren();
    visible.forEach(function (entry) {
      const line = entry.line;
      const row = document.createElement('tr');
      appendCell(row, entry.period);
      appendCell(row, optionalText(line.source_file_label || line.source_file_name));
      appendCell(row, String(line.source_line), 'number');
      appendCell(row, line.order_id);
      appendCell(row, line.delivery_date);
      appendCell(row, formatQuantity(line.quantity), 'number');
      appendCell(row, line.sales_unit_count === null ? translate('empty_value') : formatQuantity(line.sales_unit_count), 'number');
      appendCell(row, line.sales_value === null ? translate('empty_value') : formatSalesValue(line.sales_value, line.sales_value_exact), 'number');
      appendCell(row, optionalText(line.location));
      elements.comparisonDetailTableBody.appendChild(row);
    });
    elements.comparisonDetailPagination.classList.toggle('hidden', totalRows <= TABLE_PAGE_SIZE);
    elements.comparisonDetailPrevious.disabled = state.comparisonDetailPage <= 1;
    elements.comparisonDetailNext.disabled = state.comparisonDetailPage >= pageCount;
    setText(elements.comparisonDetailPageStatus, translate('comparison_detail_page', {
      page: state.comparisonDetailPage,
      pages: pageCount,
      count: visible.length
    }));
    elements.comparisonDetail.classList.remove('hidden');
  }

  function renderComparison() {
    if (!state.comparison) {
      elements.comparisonPanel.classList.add('hidden');
      return;
    }
    const comparison = state.comparison;
    elements.comparisonPeriodSummary.replaceChildren();
    appendComparisonPeriodSummary(comparison.settings.periodA, comparison.coverageA);
    appendComparisonPeriodSummary(comparison.settings.periodB, comparison.coverageB);
    elements.comparisonMetrics.replaceChildren();
    [
      [translate('metric_period_lines'), formatNumber(comparison.analysisA.total_lines, 0), formatNumber(comparison.analysisB.total_lines, 0), signedNumber(comparison.summary.lineChange), comparison.summary.lineChange],
      [translate('metric_period_quantity'), formatQuantity(comparison.analysisA.total_quantity), formatQuantity(comparison.analysisB.total_quantity), signedQuantity(comparison.summary.quantityChange) + ' · ' + signedPercent(comparison.summary.quantityPercentChange), comparison.summary.quantityChange],
      [translate('metric_period_orders'), formatNumber(comparison.analysisA.distinct_orders, 0), formatNumber(comparison.analysisB.distinct_orders, 0), signedNumber(comparison.summary.orderChange), comparison.summary.orderChange],
      [translate('metric_period_customers'), formatNumber(comparison.analysisA.distinct_customers, 0), formatNumber(comparison.analysisB.distinct_customers, 0), signedNumber(comparison.summary.customerChange), comparison.summary.customerChange],
      [translate('metric_period_days'), formatNumber(comparison.analysisA.active_days, 0), formatNumber(comparison.analysisB.active_days, 0), signedNumber(comparison.summary.activeDayChange), comparison.summary.activeDayChange],
      [translate('metric_period_sales'), formatSalesValue(comparison.analysisA.total_sales, comparison.analysisA.total_sales_exact) + ' · ' + translate('metric_period_row_coverage', { rows: comparison.analysisA.sales_value_rows, lines: comparison.analysisA.total_lines }), formatSalesValue(comparison.analysisB.total_sales, comparison.analysisB.total_sales_exact) + ' · ' + translate('metric_period_row_coverage', { rows: comparison.analysisB.sales_value_rows, lines: comparison.analysisB.total_lines }), signedSales(comparison.summary.salesChangeExact), Number(comparison.summary.salesChangeExact)],
      [translate('metric_period_sales_units'), formatQuantity(comparison.analysisA.total_sales_units) + ' · ' + translate('metric_period_row_coverage', { rows: comparison.analysisA.sales_unit_rows, lines: comparison.analysisA.total_lines }), formatQuantity(comparison.analysisB.total_sales_units) + ' · ' + translate('metric_period_row_coverage', { rows: comparison.analysisB.sales_unit_rows, lines: comparison.analysisB.total_lines }), signedQuantity(comparison.summary.salesUnitChange), comparison.summary.salesUnitChange]
    ].forEach(function (metric) {
      elements.comparisonMetrics.appendChild(metricComparisonCard(metric[0], metric[1], metric[2], metric[3], metric[4] > 0 ? 'positive' : metric[4] < 0 ? 'negative' : ''));
    });
    const articles = filteredComparisonArticles();
    const pageCount = Math.max(1, Math.ceil(articles.length / TABLE_PAGE_SIZE));
    state.comparisonPage = Math.min(Math.max(state.comparisonPage, 1), pageCount);
    const pageStart = (state.comparisonPage - 1) * TABLE_PAGE_SIZE;
    const visible = articles.slice(pageStart, pageStart + TABLE_PAGE_SIZE);
    elements.comparisonTableBody.replaceChildren();
    if (visible.length === 0) {
      const row = document.createElement('tr');
      row.className = 'empty-row';
      const cell = document.createElement('td');
      cell.colSpan = 12;
      setText(cell, translate('comparison_empty'));
      row.appendChild(cell);
      elements.comparisonTableBody.appendChild(row);
    } else {
      const incomplete = comparison.coverageA.status !== 'complete' || comparison.coverageB.status !== 'complete';
      visible.forEach(function (article) {
        const row = document.createElement('tr');
        appendCell(row, article.article_id);
        appendCell(row, optionalText(article.article_name), 'article-name-cell');
        appendCell(row, formatNumber(article.period_a.order_line_count, 0), 'number');
        appendCell(row, formatQuantity(article.period_a.total_quantity), 'number');
        appendCell(row, formatQuantity(article.period_a.total_sales_units), 'number');
        appendCell(row, formatNumber(article.period_b.order_line_count, 0), 'number');
        appendCell(row, formatQuantity(article.period_b.total_quantity), 'number');
        appendCell(row, formatQuantity(article.period_b.total_sales_units), 'number');
        appendCell(row, signedQuantity(article.quantity_change), 'number ' + (article.quantity_change > 0n ? 'positive' : article.quantity_change < 0n ? 'negative' : ''));
        appendCell(row, signedPercent(article.quantity_percent_change), 'number ' + (article.quantity_percent_change > 0 ? 'positive' : article.quantity_percent_change < 0 ? 'negative' : ''));
        appendComparisonQuality(row, article, incomplete);
        const actionCell = document.createElement('td');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'text-button';
        button.dataset.comparisonArticleId = article.article_id;
        setText(button, translate('open_article'));
        actionCell.appendChild(button);
        row.appendChild(actionCell);
        elements.comparisonTableBody.appendChild(row);
      });
    }
    elements.comparisonPagination.classList.toggle('hidden', articles.length <= TABLE_PAGE_SIZE);
    elements.comparisonPrevious.disabled = state.comparisonPage <= 1;
    elements.comparisonNext.disabled = state.comparisonPage >= pageCount;
    setText(elements.comparisonPageStatus, translate('comparison_page', {
      page: state.comparisonPage,
      pages: pageCount,
      count: visible.length
    }));
    elements.comparisonPanel.classList.remove('hidden');
    elements.exportComparison.disabled = comparison.articles.length === 0;
    renderComparisonDetail();
  }

  function showPeriodMessage(key, type) {
    if (!key) {
      elements.periodMessage.className = 'message hidden';
      setText(elements.periodMessage, '');
      return;
    }
    elements.periodMessage.className = 'message' + (type ? ' ' + type : '');
    setText(elements.periodMessage, translate(key));
  }

  function compareSelectedPeriods() {
    if (!state.result) {
      return;
    }
    const settings = periodSettingsFromControls();
    state.periodSettings = settings;
    if (settings.expectedWeekdays.length === 0) {
      showPeriodMessage('weekdays_required', 'warning-message');
      return;
    }
    if (!periodSettingsValid(settings)) {
      showPeriodMessage('period_invalid', 'warning-message');
      return;
    }
    state.comparison = periods.comparePeriods(state.result.rows, settings, core.analyzeRows, state.result.featureReadiness, state.articleRegistry);
    core.prepareArticleSearchProjections(state.comparison.articles, state.language);
    invalidateViewCaches();
    state.comparisonPage = 1;
    state.selectedComparisonArticleId = null;
    state.comparisonDetailPage = 1;
    showPeriodMessage(state.comparison.overlapping ? 'period_overlap' : '', 'warning-message');
    renderCoverage();
    renderComparison();
    renderWorkflow('comparison-panel');
    persistActiveWorkspace(undefined, { metadataOnly: true }).catch(function () {});
    elements.comparisonPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function sortedArticles() {
    if (!state.analysis) {
      return [];
    }
    const query = core.normalizeSearchQuery(elements.articleFilter.value, state.language);
    const sort = elements.articleSort.value;
    const cached = state.articleViewCache;
    if (cached && cached.analysis === state.analysis && cached.language === state.language &&
      cached.query === query && cached.sort === sort) {
      return cached.articles;
    }
    const articles = state.analysis.articles.filter(function (article) {
      return core.articleMatchesNormalizedQuery(article, query, state.language);
    });
    const sorted = articles.sort(function (left, right) {
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
    state.articleViewCache = {
      analysis: state.analysis,
      language: state.language,
      query: query,
      sort: sort,
      articles: sorted
    };
    return sorted;
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

  function masterStatusText(status) {
    if (status === 'matched') return translate('master_status_matched');
    if (status === 'master-only') return translate('master_status_master_only');
    return translate('master_status_movement_only');
  }

  function readinessText(status) {
    if (status === 'ready') return translate('feature_readiness_ready');
    if (status === 'partial') return translate('feature_readiness_partial');
    return translate('feature_readiness_blocked');
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

  function appendSourceInspectionCell(row, line) {
    const cell = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button source-inspection-button';
    button.dataset.sourceInspectFileId = line.source_file_id || '';
    button.dataset.sourceInspectLine = line.source_line === undefined ? '' : String(line.source_line);
    button.textContent = translate('detail_source_values_action');
    button.disabled = !line.source_file_id || !Number.isInteger(line.source_line);
    cell.appendChild(button);
    row.appendChild(cell);
  }

  function showArticleSourceValues(fileId, sourceLine) {
    elements.articleSourceInspectionBody.replaceChildren();
    elements.articleSourceInspection.classList.remove('hidden');
    elements.articleSourceInspection.open = true;
    const file = state.files.find(function (candidate) { return candidate.id === fileId; });
    let reconstructed = null;
    if (file && file.buffer) {
      try {
        const decoded = encoding.decodeBufferDetailed(file.buffer, file.activeEncoding || file.encodingMode || 'auto');
        reconstructed = core.reconstructRawSource(decoded.text, sourceLine);
      } catch (error) {
        reconstructed = null;
      }
    }
    if (!reconstructed) {
      setText(elements.articleSourceInspectionSummary, translate('detail_source_values_unavailable'));
      return;
    }
    setText(elements.articleSourceInspectionSummary, translate('detail_source_values_summary', {
      file: file.label || file.name,
      line: reconstructed.sourceLine
    }));
    reconstructed.raw_fields.forEach(function (field) {
      const row = document.createElement('tr');
      appendCell(row, field.header);
      appendCell(row, field.value === '' ? translate('empty_value') : field.value);
      elements.articleSourceInspectionBody.appendChild(row);
    });
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
    const metrics = [
      [translate('column_article_id'), article.article_id, ''],
      [translate('column_article_name'), optionalText(article.article_name), ''],
      [translate('column_master_status'), masterStatusText(article.movement_status), ''],
      [translate('metric_lines'), formatNumber(article.order_line_count, 0), translate('metric_lines_detail')],
      [translate('metric_quantity'), formatQuantity(article.total_quantity), translate('metric_quantity_detail')],
      [translate('metric_orders'), formatNumber(article.distinct_orders, 0), translate('metric_orders_detail')],
      [translate('metric_customers'), formatNumber(article.distinct_customers, 0), translate('metric_customers_detail')],
      [translate('metric_days'), formatNumber(article.active_days, 0), translate('metric_days_detail')],
      [translate('metric_sales'), formatArticleSales(article), translate('metric_sales_detail', { count: article.sales_value_rows })],
      [translate('metric_sales_units'), formatQuantity(article.total_sales_units), translate('metric_sales_units_detail', {
        rows: article.sales_unit_rows,
        partials: article.selling_unit_partial_rows,
        overages: article.selling_unit_overage_rows
      })],
      [translate('column_locations'), formatLocations(article.locations), ''],
      [translate('master_current_location'), optionalText(article.current_location), ''],
      [translate('master_quantity_per_sales_unit'), article.current_quantity_per_sales_unit === null || article.current_quantity_per_sales_unit === undefined ? translate('empty_value') : formatQuantity(article.current_quantity_per_sales_unit), ''],
      [translate('master_unit_of_measure'), optionalText(article.unit_of_measure), ''],
      [translate('master_vat_rate'), article.vat_rate === null || article.vat_rate === undefined ? translate('empty_value') : String(article.vat_rate), '']
    ];
    const fieldsById = new Map((state.customFields || []).map(function (field) { return [field.id, field]; }));
    Object.keys(article.master_custom_fields || {}).sort().forEach(function (fieldId) {
      const definition = fieldsById.get(fieldId);
      metrics.push([definition ? definition.name : fieldId, article.master_custom_fields[fieldId], '']);
    });
    renderMetricCards(elements.articleDetailMetrics, metrics);
  }

  function renderArticleDetail() {
    const article = selectedArticle();
    if (!article) {
      showArticleOverview();
      return;
    }

    const references = Array.isArray(article.order_line_refs) ? article.order_line_refs : [];
    const pageCount = Math.max(1, Math.ceil(references.length / TABLE_PAGE_SIZE));
    state.detailPage = Math.min(Math.max(state.detailPage, 1), pageCount);
    const pageStart = (state.detailPage - 1) * TABLE_PAGE_SIZE;
    const visibleLines = detailRowsForReferences(references, pageStart, pageStart + TABLE_PAGE_SIZE);

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
    elements.articleSourceInspection.classList.add('hidden');
    elements.articleSourceInspection.open = false;
    elements.articleSourceInspectionBody.replaceChildren();
    setText(elements.articleSourceInspectionSummary, '');
    if (visibleLines.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 17;
      setText(emptyCell, translate('no_detail_rows'));
      emptyRow.appendChild(emptyCell);
      elements.articleDetailTableBody.appendChild(emptyRow);
    } else {
      visibleLines.forEach(function (line) {
        const row = document.createElement('tr');
        appendCell(row, optionalText(line.source_file_label || line.source_file_name));
        appendCell(row, String(line.source_line), 'number');
        appendCell(row, optionalText(line.order_id));
        appendCell(row, line.delivery_date);
        appendCell(row, formatQuantity(line.quantity), 'number');
        appendCell(row, line.sales_unit_count === null ? translate('empty_value') : formatQuantity(line.sales_unit_count), 'number');
        appendCell(row, line.quantity_per_sales_unit === null ? translate('empty_value') : formatQuantity(line.quantity_per_sales_unit), 'number');
        appendCell(row, optionalText(line.customer_id));
        appendCell(row, optionalText(line.customer_name));
        appendCell(row, line.sales_value_net === null || line.sales_value_net === undefined ? translate('empty_value') : formatSalesValue(line.sales_value_net, line.sales_value_net_exact), 'number');
        appendCell(row, line.sales_value_gross === null || line.sales_value_gross === undefined ? translate('empty_value') : formatSalesValue(line.sales_value_gross, line.sales_value_gross_exact), 'number');
        appendCell(row, line.unit_price_net === null || line.unit_price_net === undefined ? translate('empty_value') : formatSalesValue(line.unit_price_net, line.unit_price_net_exact), 'number');
        appendCell(row, line.unit_price_gross === null || line.unit_price_gross === undefined ? translate('empty_value') : formatSalesValue(line.unit_price_gross, line.unit_price_gross_exact), 'number');
        appendCell(row, line.sales_value === null || line.sales_value === undefined ? translate('empty_value') : formatSalesValue(line.sales_value, line.sales_value_exact), 'number');
        appendCell(row, optionalText(line.location), 'location-cell');
        appendCell(row, optionalText(line.article_name), 'article-name-cell');
        appendSourceInspectionCell(row, line);
        elements.articleDetailTableBody.appendChild(row);
      });
    }

    elements.articleDetailPagination.classList.toggle('hidden', references.length <= TABLE_PAGE_SIZE);
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
      cell.colSpan = 11;
      setText(cell, translate('no_matches'));
      row.appendChild(cell);
      elements.articleTableBody.appendChild(row);
      return;
    }

    articles.forEach(function (article) {
      const row = document.createElement('tr');
      appendArticleIdCell(row, article);
      appendArticleNameCell(row, article);
      appendCell(row, masterStatusText(article.movement_status));
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
      const blocking = core.issueIsBlocking(issue);
      row.className = 'issue-row ' + (blocking ? 'blocking' : 'advisory');
      appendCell(row, optionalText(issue.sourceFileLabel || issue.sourceFileName));
      appendCell(row, issue.sourceLine === null ? translate('empty_value') : String(issue.sourceLine));
      appendCell(row, issue.field ? core.getFieldLabel(issue.field, state.language) : translate('structure_field'));
      appendCell(row, issue.code);
      appendCell(row, issue.message);
      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = 'status-badge ' + (blocking ? 'excluded' : 'warning');
      setText(status, translate(blocking ? 'issue_status_excluded' : 'issue_status_included'));
      statusCell.appendChild(status);
      row.appendChild(statusCell);
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
    state.articleRegistry = Array.isArray(result.articleRegistry)
      ? result.articleRegistry
      : core.buildArticleRegistry(result.retainedRows || result.rows || []);
    state.detailRowsByRef = Array.isArray(result.rows) ? result.rows : [];
    const movementAnalysis = options && options.analysis ? options.analysis : core.analyzeRows(result.rows);
    state.analysis = core.applyFeatureReadinessToAnalysis(movementAnalysis, result.featureReadiness);
    state.analysis = core.enrichAnalysisWithRegistry(state.analysis, state.articleRegistry, { locale: state.language });
    core.prepareArticleSearchProjections(state.analysis.articles, state.language);
    invalidateViewCaches();
    state.periodSettings = settingsForDetectedCalendarWeeks(state.periodSettings, result.rows);
    if (state.comparison) {
      state.comparison = periods.comparePeriods(result.rows, state.periodSettings, core.analyzeRows, result.featureReadiness, state.articleRegistry);
      core.prepareArticleSearchProjections(state.comparison.articles, state.language);
      invalidateViewCaches();
    }
    if (!preserveView) {
      state.articlePage = 1;
      state.selectedArticleId = null;
      state.detailPage = 1;
      state.issuePage = 1;
      state.coverageDatePage = 1;
      state.coverageDrilldown = null;
      state.selectedComparisonArticleId = null;
      state.comparisonDetailPage = 1;
    }
    const hasIssues = result.invalidRows > 0 || result.excludedFiles > 0 || result.warnings.length > 0 ||
      (Array.isArray(result.qualityFindings) && result.qualityFindings.length > 0);
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
    if (result.featureReadiness && result.featureReadiness.periodComparison) {
      summary += ' ' + readinessText(result.featureReadiness.periodComparison.status);
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
    const qualityIssues = (result.qualityFindings || []).map(function (finding) {
      return {
        sourceFileId: finding.sourceFileId,
        sourceFileLabel: finding.sourceFileLabel || finding.sourceFileId,
        sourceLine: finding.sourceLine,
        field: finding.article_id || finding.category,
        code: finding.code,
        message: finding.message,
        severity: finding.severity,
        blocking: finding.severity === 'error'
      };
    });
    renderIssues(result.issues.concat(qualityIssues));
    renderCoverage();
    renderComparison();
    elements.exportButton.disabled = !state.analysis || state.analysis.articles.length === 0;
    elements.resultsPanel.classList.remove('hidden');
    renderWorkflow(state.comparison ? 'comparison-panel' : 'coverage-panel');
  }

  function sourceContext(file) {
    return {
      id: file.id,
      name: file.name,
      label: file.label,
      sourceType: workspaceModel.normalizeSourceType(file.sourceType)
    };
  }

  function analysisRowCount(result) {
    if (!result) {
      return 0;
    }
    return Number.isInteger(result.analysisRows) ? result.analysisRows : Number(result.validRows || 0);
  }

  function resultHasRetainedData(result) {
    if (!result) {
      return false;
    }
    return Number(result.validRows || 0) > 0 || (Array.isArray(result.issues) && result.issues.length > 0);
  }

  function refreshColumnCatalogOwnership(file) {
    if (!file || !Array.isArray(file.columnCatalog)) {
      return;
    }
    file.columnCatalog.forEach(function (entry) {
      entry.sourceFileId = file.id;
      entry.sourceFileName = file.name;
      entry.sourceFileLabel = file.label;
    });
  }

  function detailRowsForReferences(references, start, end) {
    const values = Array.isArray(references) ? references : [];
    const first = Number.isInteger(start) ? Math.max(0, start) : 0;
    const last = Number.isInteger(end) ? Math.min(values.length, end) : values.length;
    return values.slice(first, last).map(function (reference) {
      if (Number.isInteger(reference) && reference >= 0) {
        return state.detailRowsByRef[reference] || null;
      }
      // Compatibility for analyses created before compact numeric references.
      if (typeof reference === 'string') {
        const separator = reference.lastIndexOf('::');
        const sourceId = separator >= 0 ? reference.slice(0, separator) : reference;
        const sourceLine = separator >= 0 ? reference.slice(separator + 2) : '';
        return state.detailRowsByRef.find(function (row) {
          const rowSourceId = row.source_file_id === undefined || row.source_file_id === null
            ? (row.source_file_label || row.source_file_name || '')
            : String(row.source_file_id);
          return rowSourceId === sourceId && String(row.source_line === undefined || row.source_line === null ? '' : row.source_line) === sourceLine;
        }) || null;
      }
      return null;
    }).filter(function (row) { return Boolean(row); });
  }

  function refreshAnalyzedResults(preserveView) {
    const analysisAccumulator = core.createAnalysisAccumulator();
    const batchFiles = state.files.map(function (file) {
      if (file.parsed && !file.errorKey) {
        const mapping = file.confirmedMapping || file.mapping;
        const customFieldMapping = file.confirmedCustomFieldMapping || file.customFieldMapping || {};
        file.result = file.content === null || file.content === undefined
          ? importBufferStreaming(file, mapping, {
            locale: state.language,
            sourceFile: sourceContext(file),
            customFields: state.customFields,
            customFieldMapping: customFieldMapping
          })
          : core.importCsvStreaming(file.content, mapping, {
            locale: state.language,
            sourceFile: sourceContext(file),
            customFields: state.customFields,
            customFieldMapping: customFieldMapping
          });
        if (file.result && Array.isArray(file.result.columnCatalog)) {
          file.columnCatalog = file.result.columnCatalog;
        }
      } else {
        file.result = null;
      }
      return file;
    });
    const result = core.combineImportResults(batchFiles, { analysisAccumulator: analysisAccumulator, locale: state.language });
    renderMapping();
    renderResults(result, { preserveView: preserveView, analysis: analysisAccumulator.finish({ locale: state.language }) });
  }

  function clearAnalysis(options) {
    const preserveMappings = Boolean(options && options.preserveMappings);
    state.result = null;
    state.articleRegistry = [];
    state.detailRowsByRef = [];
    state.analysis = null;
    state.comparison = null;
    invalidateViewCaches();
    state.comparisonPage = 1;
    state.coverageDatePage = 1;
    state.coverageDrilldown = null;
    state.selectedComparisonArticleId = null;
    state.comparisonDetailPage = 1;
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
    elements.coveragePanel.classList.add('hidden');
    elements.comparisonPanel.classList.add('hidden');
    elements.coverageDrilldown.classList.add('hidden');
    elements.comparisonDetail.classList.add('hidden');
    elements.exportButton.disabled = true;
    showPeriodMessage('');
    renderWorkflow();
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

  function decodeFileEntry(file, options) {
    const streaming = Boolean(options && options.streaming);
    function fingerprint(text) {
      let first = 2166136261;
      let second = 2246822519;
      for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        first = Math.imul(first ^ code, 16777619) >>> 0;
        second = Math.imul(second ^ (code + index), 3266489917) >>> 0;
      }
      return text.length + ':' + first.toString(16) + ':' + second.toString(16);
    }
    file.errorKey = null;
    file.content = null;
    file.contentFingerprint = null;
    file.parsed = null;
    file.headers = [];
    file.mapping = {};
    file.customFieldMapping = {};
    file.confirmedMapping = null;
    file.columnCatalog = [];
    file.dataRowCount = 0;
    file.hasParseErrors = false;
    file.result = null;
    file.activeEncoding = null;
    try {
      const decoded = streaming
        ? encoding.decodeBufferChunksDetailed(file.buffer, file.encodingMode || 'auto', { chunkSize: 64 * 1024 })
        : encoding.decodeBufferDetailed(file.buffer, file.encodingMode || 'auto');
      let parsed;
      let contentFingerprint = null;
      if (streaming) {
        let first = 2166136261;
        let second = 2246822519;
        let length = 0;
        const chunks = (function* () {
          for (const chunk of decoded.chunks) {
            for (let index = 0; index < chunk.length; index += 1) {
              const code = chunk.charCodeAt(index);
              first = Math.imul(first ^ code, 16777619) >>> 0;
              second = Math.imul(second ^ (code + length), 3266489917) >>> 0;
              length += 1;
            }
            yield chunk;
          }
        }());
        const profiled = core.profileCsvStreamingChunks(chunks, {
          sourceFile: { id: file.id, name: file.name, label: file.label, sourceType: file.sourceType }
        });
        parsed = { rows: [], headers: profiled.headers, errors: profiled.errors, dataRowCount: profiled.dataRowCount };
        file.columnCatalog = profiled.columnCatalog;
        contentFingerprint = length + ':' + first.toString(16) + ':' + second.toString(16);
      } else {
        parsed = core.parseCsv(decoded.text);
        file.columnCatalog = core.profileParsedCsv(parsed, {
          id: file.id, name: file.name, label: file.label, sourceType: file.sourceType
        }).columnCatalog;
        contentFingerprint = fingerprint(decoded.text);
      }
      const headers = streaming
        ? (parsed.headers || []).map(function (header) { return String(header).trim(); })
        : (parsed.rows.length > 0 ? parsed.rows[0].values.map(function (header) { return String(header).trim(); }) : []);
      if (headers.length === 0) {
        const emptyError = new Error('The selected CSV file is empty or has no header row.');
        emptyError.translationKey = 'empty_file';
        throw emptyError;
      }
      file.content = streaming ? null : decoded.text;
      file.contentFingerprint = contentFingerprint;
      file.activeEncoding = decoded.encoding;
      if (decoded.automatic) {
        file.detectedEncoding = decoded.encoding;
      }
      file.parsed = parsed;
      file.headers = headers;
      if (!Array.isArray(file.columnCatalog) || file.columnCatalog.length !== file.headers.length) {
        file.columnCatalog = core.buildColumnCatalog(file.headers, {
          id: file.id,
          name: file.name,
          label: file.label,
          sourceType: file.sourceType
        });
      }
      file.mapping = core.detectMapping(file.headers, file.sourceType);
      file.dataRowCount = streaming
        ? Number(parsed.dataRowCount || 0)
        : Math.max(0, parsed.rows.length - 1);
      file.hasParseErrors = parsed.errors.length > 0;
    } catch (error) {
      file.errorKey = error && error.translationKey ? error.translationKey : 'invalid_encoding';
    }
  }

  function importBufferStreaming(file, mapping, options) {
    const decoded = encoding.decodeBufferChunksDetailed(file.buffer, file.encodingMode || 'auto', { chunkSize: 64 * 1024 });
    file.activeEncoding = decoded.encoding;
    if (decoded.automatic) {
      file.detectedEncoding = decoded.encoding;
    }
    return core.importCsvStreamingChunks(decoded.chunks, mapping, options);
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
      refreshColumnCatalogOwnership(file);
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
        contentFingerprint: null,
        parsed: null,
        headers: [],
        mapping: {},
        customFieldMapping: {},
        confirmedMapping: null,
        columnCatalog: [],
        dataRowCount: 0,
        hasParseErrors: false,
        result: null,
        sourceType: workspaceModel.DEFAULT_SOURCE_TYPE
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
        decodeFileEntry(file, { streaming: true });
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
    state.files.forEach(function (file) {
      if (file.parsed && !file.errorKey) {
        file.content = null;
      }
    });
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
      file.confirmedCustomFieldMapping = Object.assign({}, file.customFieldMapping || {});
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
      normalizedRowCount: Number(record.normalizedRowCount || 0),
      customFields: workspaceModel.normalizeCustomFields(record.customFields)
    };
  }

  function runtimeFileFromStored(stored) {
    const savedMapping = Object.assign({}, stored.mapping || {});
    const savedCustomFieldMapping = workspaceModel.normalizeCustomFieldMapping(stored.customFieldMapping);
    const savedConfirmedCustomFieldMapping = stored.confirmedCustomFieldMapping === null || stored.confirmedCustomFieldMapping === undefined
      ? null
      : workspaceModel.normalizeCustomFieldMapping(stored.confirmedCustomFieldMapping);
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
      contentFingerprint: null,
      parsed: null,
      headers: [],
      mapping: {},
      customFieldMapping: {},
      confirmedCustomFieldMapping: null,
      confirmedMapping: null,
      columnCatalog: Array.isArray(stored.columnCatalog) ? stored.columnCatalog : [],
      dataRowCount: 0,
      hasParseErrors: false,
      result: null,
      sourceType: workspaceModel.normalizeSourceType(stored.sourceType)
    };
    if (file.buffer) {
      decodeFileEntry(file, { streaming: true });
      if (file.parsed && !file.errorKey) {
        file.mapping = workspaceModel.validateMappingRange(savedMapping, file.headers.length);
        file.customFieldMapping = workspaceModel.validateCustomFieldMappingRange(savedCustomFieldMapping, file.headers.length);
        file.confirmedCustomFieldMapping = savedConfirmedCustomFieldMapping
          ? workspaceModel.validateCustomFieldMappingRange(savedConfirmedCustomFieldMapping, file.headers.length)
          : null;
        file.confirmedMapping = savedConfirmedMapping
          ? workspaceModel.validateMappingRange(savedConfirmedMapping, file.headers.length)
          : null;
      } else {
        file.mapping = savedMapping;
        file.customFieldMapping = savedCustomFieldMapping;
        file.confirmedCustomFieldMapping = savedConfirmedCustomFieldMapping;
        file.confirmedMapping = savedConfirmedMapping;
      }
    }
    return file;
  }

  function persistPreparedWorkspace(prepared) {
    const files = prepared.files.map(function (file) {
      return {
        id: file.id,
        name: file.name,
        label: file.label,
        size: file.size,
        lastModified: file.lastModified,
        buffer: file.buffer,
        encodingMode: file.encodingMode,
        activeEncoding: file.activeEncoding,
        detectedEncoding: file.detectedEncoding,
        errorKey: file.errorKey,
        mapping: file.mapping,
        customFieldMapping: file.customFieldMapping,
        confirmedCustomFieldMapping: file.confirmedCustomFieldMapping,
        confirmedMapping: file.confirmedMapping,
        columnCatalog: file.columnCatalog,
        result: file.result,
        sourceType: workspaceModel.normalizeSourceType(file.sourceType)
      };
    });
    return workspaceModel.validateWorkspace(Object.assign({}, prepared.workspace, { files: files }), {
      clonePayload: false
    });
  }

  function prepareWorkspaceRecord(record, language, reportProgress) {
    function sourceContext(file) {
      return {
        id: file.id,
        name: file.name,
        label: file.label,
        sourceType: workspaceModel.normalizeSourceType(file.sourceType)
      };
    }
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
      const analysisAccumulator = core.createAnalysisAccumulator();
      const batchFiles = files.map(function (file) {
        if (file.parsed && !file.errorKey) {
          const mapping = file.confirmedMapping || file.mapping;
          const customFieldMapping = file.confirmedCustomFieldMapping || file.customFieldMapping || {};
          file.result = file.content
            ? core.importCsvStreaming(file.content, mapping, {
              locale: language,
              sourceFile: sourceContext(file),
              customFields: validated.customFields,
              customFieldMapping: customFieldMapping
            })
            : importBufferStreaming(file, mapping, {
              locale: language,
              sourceFile: sourceContext(file),
              customFields: validated.customFields,
              customFieldMapping: customFieldMapping
            });
          if (file.result && Array.isArray(file.result.columnCatalog)) {
            file.columnCatalog = file.result.columnCatalog;
          }
        }
        return file;
      });
      result = core.combineImportResults(batchFiles, { analysisAccumulator: analysisAccumulator, locale: language });
      analysis = analysisAccumulator.finish({ locale: language });
    }
    files.forEach(function (file) {
      // The source bytes remain the durable source of truth. Do not retain a
      // second decoded text copy after the worker has extracted its metadata
      // and, where applicable, built the normalized result.
      file.content = null;
      if (file.parsed && Array.isArray(file.parsed.rows)) {
        file.parsed.rows = [];
      }
    });
    return {
      workspace: {
        id: validated.id,
        schemaVersion: validated.schemaVersion,
        name: validated.name,
        createdAt: validated.createdAt,
        updatedAt: validated.updatedAt,
        language: validated.language,
        analyzed: validated.analyzed,
        periodSettings: validated.periodSettings,
        customFields: validated.customFields,
        articleRegistry: result && Array.isArray(result.articleRegistry)
          ? result.articleRegistry
          : validated.articleRegistry,
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
        const input = event.data || {};
        if (input.backupExport) {
          const sourceSchemaVersion = Number(input.backupExport.schemaVersion);
          const validatedExport = workspaceModel.migrateWorkspace(input.backupExport, { clonePayload: false });
          let backupWorkspace = validatedExport;
          if (sourceSchemaVersion < workspaceModel.WORKSPACE_SCHEMA_VERSION && validatedExport.analyzed) {
            const prepared = prepareWorkspaceRecord(input.backupExport, validatedExport.language, function (progress) {
              self.postMessage({ type: 'progress', progress: progress });
            });
            backupWorkspace = Object.assign({}, validatedExport, {
              articleRegistry: prepared.workspace.articleRegistry
            });
          }
          const backupText = workspaceModel.stringifyBackup(backupWorkspace, { validated: true });
          self.postMessage({
            type: 'backup',
            text: backupText,
            filename: workspaceModel.backupFilename(input.backupExport.name)
          });
          return;
        }
        let record = input.record;
        let language = input.language;
        if (typeof input.backupText === 'string') {
          const parsed = workspaceModel.parseBackup(input.backupText);
          record = workspaceModel.prepareRestore(parsed, input.mode === 'replace'
            ? { mode: 'replace', targetId: input.targetId }
            : { mode: input.mode, newId: input.newId });
          language = record.language;
        }
        const prepared = prepareWorkspaceRecord(record, language, function (progress) {
          self.postMessage({ type: 'progress', progress: progress });
        });
        const preparedPayload = typeof input.backupText === 'string'
          ? {
            workspace: prepared.workspace,
            persistedWorkspace: persistPreparedWorkspace(prepared),
            runtime: prepared
          }
          : prepared;
        const buffers = [];
        const seenBuffers = new Set();
        prepared.files.forEach(function (file) {
          if (file.buffer instanceof ArrayBuffer && !seenBuffers.has(file.buffer)) {
            seenBuffers.add(file.buffer);
            buffers.push(file.buffer);
          }
        });
        self.postMessage({ type: 'complete', prepared: preparedPayload }, buffers);
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
      importBufferStreaming.toString(),
      sourceContext.toString(),
      runtimeFileFromStored.toString(),
      persistPreparedWorkspace.toString(),
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

  function runWorkspaceWorker(record, language, revision, workspaceName, options) {
    const created = createWorkspaceWorker();
    const transfer = [];
    const seenBuffers = new Set();
    ((record && record.files) || []).forEach(function (file) {
      if (file.buffer instanceof ArrayBuffer && !seenBuffers.has(file.buffer)) {
        seenBuffers.add(file.buffer);
        transfer.push(file.buffer);
      }
    });
    const settings = options || {};
    ((settings.backupExport && settings.backupExport.files) || []).forEach(function (file) {
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
        if (message.type === 'backup') {
          dispose();
          resolve({ backupText: message.text, filename: message.filename });
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
        let message;
        if (settings.backupExport) {
          message = { backupExport: settings.backupExport };
        } else if (settings.backupText === undefined) {
          message = { record: record, language: language };
        } else {
          message = {
            backupText: settings.backupText,
            mode: settings.mode,
            targetId: settings.targetId,
            newId: settings.newId
          };
        }
        task.worker.postMessage(message, transfer);
      } catch (error) {
        dispose();
        reject(workspaceLoadError('worker_unavailable', error && error.message));
      }
    });
  }

  function cancelWorkspaceLoading() {
    if (!state.workspaceLoading || !state.workspaceLoadCancellable) {
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
    state.workspaceLoadCancellable = false;
    updateWorkspaceLoadProgress(null);
    setWorkspaceMessage('workspace_loading_cancelled', {}, 'warning');
    renderWorkspaceControls();
  }

  async function recoverWorkspaceSaveFailure() {
    const failure = state.workspaceSaveFailure;
    const activeId = state.activeWorkspace && state.activeWorkspace.id;
    if (!failure || !activeId || failure.workspaceId !== activeId) {
      return;
    }
    state.workspaceRecoveryAvailable = false;
    workspaceSaveRevision += 1;
    const recoveryGeneration = workspaceSaveGeneration + 1;
    const previousSaveChain = workspaceSaveChain;
    workspaceSaveGeneration = recoveryGeneration;
    const revision = workspaceLoadRevision + 1;
    workspaceLoadRevision = revision;
    state.selectedWorkspaceId = activeId;
    state.workspaceLoading = true;
    state.workspaceLoadCancellable = false;
    setWorkspaceMessage('workspace_loading_payload', { name: state.activeWorkspace.name });
    renderWorkspaceControls();
    let recovered = false;
    try {
      await previousSaveChain.catch(function () {});
      if (recoveryGeneration !== workspaceSaveGeneration || revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      workspaceSaveChain = Promise.resolve();
      await refreshWorkspaceCatalog();
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      if (!state.workspaces.some(function (workspace) { return workspace.id === activeId; })) {
        state.activeWorkspace = null;
        state.customFields = [];
        if (state.lastActiveWorkspaceId === activeId) {
          state.lastActiveWorkspaceId = null;
        }
        clearWorkspaceView();
        state.selectedWorkspaceId = state.workspaces.length > 0 ? state.workspaces[0].id : null;
        state.workspaceSaveFailure = null;
        state.workspaceRecoveryAvailable = false;
        setWorkspaceMessage('workspace_not_found', {}, 'error');
        recovered = true;
        return;
      }
      await activateWorkspace(activeId, 'workspace_opened', { cancellable: false });
      state.workspaceSaveFailure = null;
      state.workspaceRecoveryAvailable = false;
      recovered = true;
    } catch (error) {
      if (!error || error.code !== 'workspace_load_cancelled') {
        state.workspaceSaveFailure = failure;
        state.workspaceRecoveryAvailable = true;
        state.workspaceLoading = true;
        state.workspaceLoadCancellable = false;
        showWorkspaceError(error);
        renderWorkspaceControls();
      }
    } finally {
      if (recovered && revision === workspaceLoadRevision) {
        state.workspaceLoading = false;
        state.workspaceLoadCancellable = false;
        updateWorkspaceLoadProgress(null);
        renderWorkspaceControls();
      }
    }
  }

  function clearWorkspaceView() {
    state.files = [];
    state.periodSettings = periods.normalizeSettings();
    state.fileSelectionVersion += 1;
    clearAnalysis();
    elements.fileInput.value = '';
    elements.articleFilter.value = '';
    setSourceStatus('no_file_selected');
    elements.mappingGrid.replaceChildren();
    showMappingMessage('');
    elements.mappingPanel.classList.add('hidden');
    elements.resultsPanel.classList.add('hidden');
  }

  async function recoverWorkspaceCatalogAfterMissing() {
    try {
      await refreshWorkspaceCatalog();
    } catch (error) {
      return;
    }
    if (state.activeWorkspace && !state.workspaces.some(function (workspace) {
      return workspace.id === state.activeWorkspace.id;
    })) {
      if (state.lastActiveWorkspaceId === state.activeWorkspace.id) {
        state.lastActiveWorkspaceId = null;
      }
      state.activeWorkspace = null;
      state.customFields = [];
      clearWorkspaceView();
    }
    if (state.activeWorkspace) {
      state.selectedWorkspaceId = state.activeWorkspace.id;
    } else if (!state.selectedWorkspaceId || !state.workspaces.some(function (workspace) {
      return workspace.id === state.selectedWorkspaceId;
    })) {
      state.selectedWorkspaceId = state.workspaces.length > 0 ? state.workspaces[0].id : null;
    }
    renderWorkspaceControls();
  }

  async function activateWorkspace(id, successKey, options) {
    const activationOptions = options || {};
    const workspaceId = String(id || '');
    const listedWorkspace = state.workspaces.find(function (workspace) { return workspace.id === workspaceId; });
    if (!listedWorkspace) {
      await recoverWorkspaceCatalogAfterMissing();
      showWorkspaceError(workspaceLoadError('workspace_not_found'));
      return;
    }
    const revision = workspaceLoadRevision + 1;
    let needsWorkspaceMigration = Number(listedWorkspace.schemaVersion) < workspaceModel.WORKSPACE_SCHEMA_VERSION;
    const previousActiveId = state.activeWorkspace ? state.activeWorkspace.id : state.lastActiveWorkspaceId;
    workspaceLoadRevision = revision;
    state.selectedWorkspaceId = workspaceId;
    state.workspaceLoading = true;
    state.workspaceLoadCancellable = activationOptions.cancellable !== false;
    state.workspaceProgress = {
      key: 'workspace_loading_payload',
      replacements: { name: listedWorkspace.name }
    };
    setWorkspaceMessage('workspace_loading_payload', { name: listedWorkspace.name });
    renderWorkspaceControls();
    try {
      await workspaceSaveChain;
      let prepared = activationOptions.prepared || null;
      let targetStorageRevision = activationOptions.expectedRevision;
      let targetLanguage = prepared && prepared.workspace
        ? prepared.workspace.language
        : null;
      if (!prepared) {
        // Activation rebuilds analysis from the durable source bytes. Avoid
        // loading stored row/issue chunks into the browser thread; the worker
        // performs migration, validation and parsing for this path.
        let record = await workspaceRepository.loadWorkspaceRaw(workspaceId, { includeResults: false });
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        if (!record) {
          throw new storageApi.WorkspaceStorageError('workspace_not_found', 'Workspace does not exist.');
        }
        targetStorageRevision = record.storageRevision;
        needsWorkspaceMigration = Number(record.schemaVersion) < workspaceModel.WORKSPACE_SCHEMA_VERSION;
        record = omitStoredResultsForRebuild(record);
        targetLanguage = Number(record.schemaVersion) === 0
          ? (record.language === 'de' ? 'de' : 'en')
          : record.language;
        await nextBrowserPaint();
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
          record = await workspaceRepository.loadWorkspaceRaw(workspaceId, { includeResults: false });
          if (!record || revision !== workspaceLoadRevision) {
            throw workspaceLoadError('workspace_load_cancelled');
          }
          targetStorageRevision = record.storageRevision;
          needsWorkspaceMigration = Number(record.schemaVersion) < workspaceModel.WORKSPACE_SCHEMA_VERSION;
          targetLanguage = Number(record.schemaVersion) === 0
            ? (record.language === 'de' ? 'de' : 'en')
            : record.language;
          record = omitStoredResultsForRebuild(record);
          prepared = prepareWorkspaceRecord(record, targetLanguage, function (progress) {
            updateWorkspaceLoadProgress(progress, listedWorkspace.name);
          });
        }
      }
      if (!prepared || !prepared.workspace || !Number.isInteger(targetStorageRevision)) {
        throw workspaceLoadError('worker_failed', 'The workspace background processing did not return a complete payload.');
      }
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      state.workspaceLoadCancellable = false;
      renderWorkspaceControls();
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      const activationCommitOptions = { expectedRevision: targetStorageRevision };
      if (needsWorkspaceMigration) {
        activationCommitOptions.persistedWorkspace = persistPreparedWorkspace(prepared);
      }
      const committedMetadata = await workspaceRepository.commitWorkspaceActivation(workspaceId, prepared.workspace, activationCommitOptions);
      if (revision !== workspaceLoadRevision) {
        await workspaceRepository.setActiveWorkspace(previousActiveId || null);
        throw workspaceLoadError('workspace_load_cancelled');
      }
      state.lastActiveWorkspaceId = workspaceId;
      state.activeWorkspace = workspaceMetadata(Object.assign({}, prepared.workspace, {
        storageRevision: committedMetadata.storageRevision
      }));
      state.customFields = workspaceModel.normalizeCustomFields(prepared.workspace.customFields);
      state.language = targetLanguage;
      elements.languageSelect.value = targetLanguage;
      state.workspaces = state.workspaces.map(function (workspace) {
        return workspace.id === workspaceId ? Object.assign({}, workspace, state.activeWorkspace) : workspace;
      });
      clearWorkspaceView();
      state.periodSettings = periods.normalizeSettings(prepared.workspace.periodSettings);
      state.files = prepared.files;
      state.articleRegistry = workspaceModel.normalizeArticleRegistry(prepared.workspace.articleRegistry);
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
      if (error && error.code === 'workspace_not_found') {
        await recoverWorkspaceCatalogAfterMissing();
      }
      if (state.activeWorkspace) {
        state.selectedWorkspaceId = state.activeWorkspace.id;
      }
      showWorkspaceError(error);
      throw error;
    } finally {
      if (revision === workspaceLoadRevision) {
        state.workspaceLoading = false;
        state.workspaceLoadCancellable = false;
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
    state.workspaceLoading = true;
    state.workspaceLoadCancellable = false;
    renderWorkspaceControls();
    try {
      await workspaceSaveChain;
      const record = workspaceModel.createWorkspace(name, { language: state.language });
      await workspaceRepository.createWorkspace(record, { validated: true });
      state.selectedWorkspaceId = record.id;
      await refreshWorkspaceCatalog();
      scheduleStorageEstimateRefresh();
      await activateWorkspace(record.id, 'workspace_created', { cancellable: false });
    } catch (error) {
      showWorkspaceError(error);
    } finally {
      state.workspaceLoading = false;
      state.workspaceLoadCancellable = false;
      renderWorkspaceControls();
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
    state.workspaceLoading = true;
    state.workspaceLoadCancellable = false;
    renderWorkspaceControls();
    try {
      await workspaceSaveChain;
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
    } finally {
      state.workspaceLoading = false;
      state.workspaceLoadCancellable = false;
      renderWorkspaceControls();
    }
  }

  async function createCustomField() {
    if (!state.activeWorkspace) return;
    const name = window.prompt(translate('custom_field_name_prompt'));
    if (name === null) return;
    const type = window.prompt(translate('custom_field_type_prompt'), 'text');
    if (type === null) return;
    try {
      state.customFields = workspaceModel.normalizeCustomFields((state.customFields || []).concat([{
        id: workspaceModel.createId('custom'), name: name, type: type, active: true
      }]));
      state.activeWorkspace = Object.assign({}, state.activeWorkspace, { customFields: state.customFields });
      await persistActiveWorkspace(undefined, { metadataOnly: true });
      renderWorkspaceControls();
      renderMapping();
    } catch (error) {
      showWorkspaceError(error);
    }
  }

  async function createCustomFieldFromFile(fileId) {
    if (!state.activeWorkspace) return;
    const file = state.files.find(function (item) { return item.id === fileId; });
    if (!file || !Array.isArray(file.headers)) return;
    const activeCustomFieldIds = new Set((state.customFields || [])
      .filter(function (field) { return field && field.active !== false; })
      .map(function (field) { return String(field.id); }));
    const used = new Set(Object.keys(file.mapping || {}).map(function (key) { return file.mapping[key]; }).concat(
      Object.keys(file.customFieldMapping || {})
        .filter(function (key) { return activeCustomFieldIds.has(String(key)); })
        .map(function (key) { return file.customFieldMapping[key]; })
    ));
    const position = file.headers.findIndex(function (_, index) { return !used.has(index); });
    if (position < 0) return;
    const name = window.prompt(translate('custom_field_name_prompt'), file.headers[position] || 'Custom field');
    if (name === null) return;
    const type = window.prompt(translate('custom_field_type_prompt'), 'text');
    if (type === null) return;
    try {
      const created = { id: workspaceModel.createId('custom'), name: name, type: type, active: true };
      state.customFields = workspaceModel.normalizeCustomFields((state.customFields || []).concat([created]));
      file.customFieldMapping = Object.assign({}, file.customFieldMapping, { [created.id]: position });
      clearAnalysis();
      state.activeWorkspace = Object.assign({}, state.activeWorkspace, { customFields: state.customFields });
      await persistActiveWorkspace();
      renderWorkspaceControls(); renderMapping();
    } catch (error) { showWorkspaceError(error); }
  }

  async function renameCustomField(fieldId) {
    if (!state.activeWorkspace || state.workspaceLoading) return;
    const field = state.customFields.find(function (item) { return item.id === fieldId; });
    if (!field) return;
    const name = window.prompt(translate('custom_field_name_prompt'), field.name);
    if (name === null) return;
    try {
      state.customFields = workspaceModel.normalizeCustomFields(state.customFields.map(function (item) {
        return item.id === fieldId ? Object.assign({}, item, { name: name }) : item;
      }));
      state.activeWorkspace = Object.assign({}, state.activeWorkspace, { customFields: state.customFields });
      await persistActiveWorkspace(undefined, { metadataOnly: true });
      renderWorkspaceControls(); renderMapping();
      if (state.selectedArticleId && selectedArticle()) renderArticleDetail();
    } catch (error) { showWorkspaceError(error); }
  }

  async function removeCustomField(fieldId) {
    if (!state.activeWorkspace || state.workspaceLoading) return;
    const field = state.customFields.find(function (item) { return item.id === fieldId; });
    if (!field || !window.confirm(translate('custom_field_remove_confirm', { name: field.name }))) return;
    try {
      state.customFields = workspaceModel.normalizeCustomFields(state.customFields.map(function (item) {
        return item.id === fieldId ? Object.assign({}, item, { active: false }) : item;
      }));
      const activeCustomFieldIds = state.customFields.filter(function (item) {
        return item.active !== false;
      }).map(function (item) { return item.id; });
      const retainedRows = state.result && Array.isArray(state.result.retainedRows)
        ? state.result.retainedRows
        : state.files.reduce(function (rows, file) {
          return rows.concat(file.result && Array.isArray(file.result.rows) ? file.result.rows : []);
        }, []);
      state.articleRegistry = core.buildArticleRegistry(retainedRows, { activeCustomFieldIds: activeCustomFieldIds });
      if (state.result) {
        state.result.articleRegistry = state.articleRegistry;
        const activeFieldIds = new Set(activeCustomFieldIds.map(function (id) { return String(id); }));
        state.result.issues = (state.result.issues || []).filter(function (issue) {
          return !issue.customFieldId || activeFieldIds.has(String(issue.customFieldId));
        });
        state.result.qualityFindings = core.buildDataQualityFindings(state.articleRegistry, state.result.issues, state.language);
      }
      if (state.analysis) {
        state.analysis = core.enrichAnalysisWithRegistry(state.analysis, state.articleRegistry, { locale: state.language });
        core.prepareArticleSearchProjections(state.analysis.articles, state.language);
      }
      state.activeWorkspace = Object.assign({}, state.activeWorkspace, { customFields: state.customFields });
      await persistActiveWorkspace();
      renderWorkspaceControls(); renderMapping();
      renderArticles();
      if (state.selectedArticleId && selectedArticle()) renderArticleDetail();
      if (state.result) {
        const qualityIssues = (state.result.qualityFindings || []).map(function (finding) {
          return {
            sourceFileId: finding.sourceFileId,
            sourceFileLabel: finding.sourceFileLabel || finding.sourceFileId,
            sourceLine: finding.sourceLine,
            field: finding.article_id || finding.category,
            code: finding.code,
            message: finding.message,
            severity: finding.severity,
            blocking: finding.severity === 'error'
          };
        });
        renderIssues((state.result.issues || []).concat(qualityIssues));
      }
    } catch (error) { showWorkspaceError(error); }
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
    workspaceLoadRevision += 1;
    state.workspaceLoading = true;
    state.workspaceLoadCancellable = false;
    renderWorkspaceControls();
    try {
      await workspaceSaveChain;
      const current = state.workspaces.find(function (workspace) { return workspace.id === selected.id; });
      if (!current) {
        throw new storageApi.WorkspaceStorageError('workspace_not_found', 'Workspace does not exist.');
      }
      await workspaceRepository.deleteWorkspace(selected.id, {
        expectedRevision: current.storageRevision
      });
      if (state.activeWorkspace && state.activeWorkspace.id === selected.id) {
        state.activeWorkspace = null;
        state.customFields = [];
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
    } finally {
      state.workspaceLoading = false;
      state.workspaceLoadCancellable = false;
      renderWorkspaceControls();
    }
  }

  async function exportWorkspaceBackup() {
    const selected = state.workspaces.find(function (workspace) { return workspace.id === state.selectedWorkspaceId; });
    if (!selected) {
      return;
    }
    const revision = workspaceLoadRevision + 1;
    workspaceLoadRevision = revision;
    state.workspaceLoading = true;
    state.workspaceLoadCancellable = false;
    renderWorkspaceControls();
    try {
      if (state.activeWorkspace && state.activeWorkspace.id === selected.id) {
        await persistActiveWorkspace(undefined, { allowWhileLoading: true });
      } else {
        await workspaceSaveChain;
      }
      const record = await workspaceRepository.loadWorkspaceRaw(selected.id);
      if (!record) {
        throw new storageApi.WorkspaceStorageError('workspace_not_found', 'Workspace does not exist.');
      }
      await nextBrowserPaint();
      let serialized;
      try {
        serialized = await runWorkspaceWorker(null, null, revision, record.name, {
          backupExport: record
        });
      } catch (error) {
        if (!error || error.code !== 'worker_unavailable') {
          throw error;
        }
        setWorkspaceMessage('workspace_worker_fallback', {}, 'warning');
        const fallbackRecord = await workspaceRepository.loadWorkspace(selected.id);
        if (!fallbackRecord || revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        const fallbackSchemaVersion = Number(record.schemaVersion);
        let fallbackExport = fallbackRecord;
        if (fallbackSchemaVersion < workspaceModel.WORKSPACE_SCHEMA_VERSION && fallbackRecord.analyzed) {
          const prepared = prepareWorkspaceRecord(fallbackRecord, fallbackRecord.language, function (progress) {
            updateWorkspaceLoadProgress(progress, fallbackRecord.name);
          });
          fallbackExport = Object.assign({}, fallbackRecord, {
            articleRegistry: prepared.workspace.articleRegistry
          });
        }
        serialized = {
          backupText: workspaceModel.stringifyBackup(fallbackExport),
          filename: workspaceModel.backupFilename(fallbackExport.name)
        };
      }
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      downloadTextFile(serialized.filename, serialized.backupText, 'application/json;charset=utf-8');
      setWorkspaceMessage('workspace_backup_exported', { name: record.name });
    } catch (error) {
      showWorkspaceError(error);
    } finally {
      state.workspaceLoading = false;
      state.workspaceLoadCancellable = false;
      renderWorkspaceControls();
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
    const revision = workspaceLoadRevision + 1;
    workspaceLoadRevision = revision;
    state.workspaceLoading = true;
    state.workspaceLoadCancellable = true;
    state.workspaceProgress = {
      key: 'workspace_loading_validating',
      replacements: { name: file.name }
    };
    setWorkspaceMessage('workspace_loading_validating', { name: file.name });
    renderWorkspaceControls();
    try {
      const text = await readBackupFile(file);
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      let successKey;
      let replaceTarget = null;
      let restoreNewId = null;
      if (mode === 'replace') {
        const target = state.workspaces.find(function (workspace) { return workspace.id === state.selectedWorkspaceId; });
        if (!target) {
          return;
        }
        await workspaceSaveChain;
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        replaceTarget = state.workspaces.find(function (workspace) { return workspace.id === target.id; });
        if (!replaceTarget) {
          throw new storageApi.WorkspaceStorageError('workspace_not_found', 'Workspace does not exist.');
        }
        successKey = 'workspace_restored_replace';
      } else {
        await workspaceSaveChain;
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        restoreNewId = workspaceModel.createId('workspace');
        successKey = 'workspace_restored_new';
      }
      await nextBrowserPaint();
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      let preparedRestore;
      try {
        preparedRestore = await runWorkspaceWorker(null, null, revision, file.name, {
          backupText: text,
          mode: replaceTarget ? 'replace' : 'new',
          targetId: replaceTarget ? replaceTarget.id : null,
          newId: restoreNewId
        });
      } catch (error) {
        if (!error || error.code !== 'worker_unavailable') {
          throw error;
        }
        setWorkspaceMessage('workspace_worker_fallback', {}, 'warning');
        const retryParsed = workspaceModel.parseBackup(text);
        const fallbackRestored = workspaceModel.prepareRestore(retryParsed, replaceTarget ? {
          mode: 'replace',
          targetId: replaceTarget.id
        } : {
          mode: 'new',
          newId: restoreNewId
        });
        const fallbackPrepared = prepareWorkspaceRecord(fallbackRestored, fallbackRestored.language, function (progress) {
          updateWorkspaceLoadProgress(progress, fallbackRestored.name);
        });
        preparedRestore = {
          workspace: fallbackPrepared.workspace,
          persistedWorkspace: persistPreparedWorkspace(fallbackPrepared),
          runtime: fallbackPrepared
        };
      }
      if (revision !== workspaceLoadRevision) {
        throw workspaceLoadError('workspace_load_cancelled');
      }
      const restored = preparedRestore.persistedWorkspace;
      if (!restored) {
        throw workspaceLoadError('worker_failed', 'The background restore did not return a validated workspace.');
      }
      let committedRestore;
      if (replaceTarget) {
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        if (!window.confirm(translate('workspace_replace_confirm', { name: replaceTarget.name }))) {
          return;
        }
        state.workspaceLoadCancellable = false;
        renderWorkspaceControls();
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        committedRestore = await workspaceRepository.replaceWorkspace(restored, {
          validated: true,
          expectedRevision: replaceTarget.storageRevision
        });
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        if (state.activeWorkspace && state.activeWorkspace.id === replaceTarget.id) {
          state.activeWorkspace = null;
          state.customFields = [];
          clearWorkspaceView();
        }
      } else {
        state.workspaceLoadCancellable = false;
        renderWorkspaceControls();
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
        committedRestore = await workspaceRepository.createWorkspace(restored, { validated: true });
        if (revision !== workspaceLoadRevision) {
          throw workspaceLoadError('workspace_load_cancelled');
        }
      }
      state.selectedWorkspaceId = restored.id;
      await refreshWorkspaceCatalog();
      scheduleStorageEstimateRefresh();
      const committedRevision = committedRestore && committedRestore.storageRevision;
      await activateWorkspace(restored.id, successKey, {
        cancellable: false,
        prepared: preparedRestore.runtime,
        expectedRevision: committedRevision
      });
    } catch (error) {
      if (error && error.code === 'workspace_load_cancelled') {
        return;
      }
      showWorkspaceError(error);
    } finally {
      if (revision === workspaceLoadRevision) {
        elements.workspaceRestoreFile.value = '';
        state.restoreMode = null;
        state.workspaceLoading = false;
        state.workspaceLoadCancellable = false;
        updateWorkspaceLoadProgress(null);
        renderWorkspaceControls();
      }
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
      state.customFields = [];
      clearWorkspaceView();
      applyLanguage({ skipAnalysisRefresh: true });
      setWorkspaceMessage(state.workspaces.length > 0 ? 'workspace_select_status' : 'workspace_none_status', {}, state.workspaces.length > 0 ? '' : 'warning');
      renderWorkspaceControls();
      state.storageEstimate = await workspaceRepository.estimateStorage();
      renderStorageStatus();
    } catch (error) {
      state.storageReady = false;
      state.activeWorkspace = null;
      state.customFields = [];
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

  function exportPeriodComparison() {
    if (!state.comparison || state.comparison.articles.length === 0) {
      return;
    }
    downloadTextFile(
      translate('comparison_export_filename'),
      '\uFEFF' + periods.exportComparisonCsv(state.comparison, core),
      'text/csv;charset=utf-8'
    );
  }

  function handlePeriodSettingsChange() {
    state.periodSettings = periodSettingsFromControls();
    state.comparison = null;
    invalidateViewCaches();
    state.comparisonPage = 1;
    state.selectedComparisonArticleId = null;
    state.comparisonDetailPage = 1;
    if (state.periodSettings.expectedWeekdays.length === 0) {
      showPeriodMessage('weekdays_required', 'warning-message');
    } else if (!periodSettingsStorable(state.periodSettings)) {
      showPeriodMessage('period_invalid', 'warning-message');
    } else {
      showPeriodMessage('');
    }
    renderCoverage();
    renderComparison();
    renderWorkflow('coverage-panel');
    if (periodSettingsStorable(state.periodSettings)) {
      persistActiveWorkspace(undefined, { metadataOnly: true }).catch(function () {});
    }
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
  elements.customFieldCreate.addEventListener('click', createCustomField);
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
  elements.workspaceRecovery.addEventListener('click', function () {
    recoverWorkspaceSaveFailure().catch(function (error) {
      showWorkspaceError(error);
    });
  });
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
  elements.customFieldsList.addEventListener('click', function (event) {
    const rename = event.target.closest('button[data-rename-custom-field]');
    const remove = event.target.closest('button[data-remove-custom-field]');
    if (rename) renameCustomField(rename.dataset.renameCustomField);
    if (remove) removeCustomField(remove.dataset.removeCustomField);
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
    const select = event.target.closest('select[data-source-type-file-id]');
    if (!select || !elements.mappingGrid.contains(select)) {
      return;
    }
    const file = state.files.find(function (item) { return item.id === select.dataset.sourceTypeFileId; });
    if (!file) {
      return;
    }
    file.sourceType = workspaceModel.normalizeSourceType(select.value);
    file.mapping = core.detectMapping(file.headers || [], file.sourceType);
    file.confirmedMapping = null;
    file.customFieldMapping = {};
    file.confirmedCustomFieldMapping = null;
    file.result = null;
    clearAnalysis();
    renderMapping();
    updateSourceStatus();
    persistActiveWorkspace().catch(function () {});
  });
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
    decodeFileEntry(file, { streaming: true });
    renderMapping();
    updateSourceStatus();
    const replacement = elements.mappingGrid.querySelector('select[data-encoding-file-id="' + file.id + '"]');
    if (replacement) {
      replacement.focus();
    }
    file.content = null;
    const hasPreparedFile = state.files.some(function (item) { return Boolean(item.parsed); });
    elements.analyzeButton.disabled = !hasPreparedFile;
    showMappingMessage(hasPreparedFile ? '' : translate('no_prepared_files'));
    persistActiveWorkspace().catch(function () {});
  });
  elements.mappingGrid.addEventListener('change', function (event) {
    const select = event.target.closest('select[data-file-id][data-custom-field]');
    if (!select || !elements.mappingGrid.contains(select)) return;
    const file = state.files.find(function (item) { return item.id === select.dataset.fileId; });
    if (!file) return;
    file.customFieldMapping = file.customFieldMapping || {};
    file.customFieldMapping[select.dataset.customField] = select.value === '' ? null : Number(select.value);
    clearAnalysis();
    renderMapping();
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
    const create = event.target.closest('button[data-create-custom-from-file]');
    if (create && elements.mappingGrid.contains(create)) {
      createCustomFieldFromFile(create.dataset.createCustomFromFile);
      return;
    }
    const button = event.target.closest('button[data-remove-file-id]');
    if (!button || !elements.mappingGrid.contains(button)) {
      return;
    }
    clearAnalysis();
    state.files = state.files.filter(function (file) { return file.id !== button.dataset.removeFileId; });
    const relabeled = core.assignSourceFileLabels(state.files);
    relabeled.forEach(function (source, index) {
      state.files[index].label = source.label;
      refreshColumnCatalogOwnership(state.files[index]);
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
    invalidateViewCaches();
    applyLanguage();
    persistActiveWorkspace(undefined, { metadataOnly: true }).catch(function () {});
  });
  elements.analyzeButton.addEventListener('click', analyze);
  elements.exportButton.addEventListener('click', exportResults);
  elements.comparePeriods.addEventListener('click', compareSelectedPeriods);
  elements.exportComparison.addEventListener('click', exportPeriodComparison);
  elements.resetPeriods.addEventListener('click', function () {
    if (!state.result) {
      return;
    }
    state.periodSettings = periods.defaultSettings(state.result.rows);
    state.comparison = null;
    invalidateViewCaches();
    state.comparisonPage = 1;
    state.selectedComparisonArticleId = null;
    state.comparisonDetailPage = 1;
    showPeriodMessage('');
    renderCoverage();
    renderComparison();
    renderWorkflow('coverage-panel');
    persistActiveWorkspace(undefined, { metadataOnly: true }).catch(function () {});
  });
  elements.editPeriods.addEventListener('click', function () {
    renderWorkflow('coverage-panel');
    elements.coveragePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    (state.periodSettings.mode === 'weeks' ? elements.periodAWeek : elements.periodAStart).focus();
  });
  elements.periodModes.forEach(function (control) {
    control.addEventListener('change', handlePeriodSettingsChange);
  });
  [elements.periodAWeek, elements.periodBWeek].forEach(function (control) {
    control.addEventListener('change', handlePeriodSettingsChange);
  });
  [elements.periodAName, elements.periodAStart, elements.periodAEnd, elements.periodBName, elements.periodBStart, elements.periodBEnd].forEach(function (control) {
    control.addEventListener('change', handlePeriodSettingsChange);
  });
  elements.expectedWeekdays.forEach(function (control) {
    control.addEventListener('change', handlePeriodSettingsChange);
  });
  elements.workflowSteps.forEach(function (button) {
    button.addEventListener('click', function () {
      const target = document.getElementById(button.dataset.workflowTarget);
      if (button.disabled || !target || !PAGE_CONFIG[button.dataset.workflowTarget]) {
        return;
      }
      renderWorkflow(button.dataset.workflowTarget);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  elements.comparisonSearch.addEventListener('input', function () {
    state.comparisonPage = 1;
    renderComparison();
  });
  elements.comparisonFilter.addEventListener('change', function () {
    state.comparisonPage = 1;
    renderComparison();
  });
  elements.comparisonSort.addEventListener('change', function () {
    state.comparisonPage = 1;
    renderComparison();
  });
  elements.comparisonPrevious.addEventListener('click', function () {
    if (state.comparisonPage > 1) {
      state.comparisonPage -= 1;
      renderComparison();
    }
  });
  elements.comparisonNext.addEventListener('click', function () {
    state.comparisonPage += 1;
    renderComparison();
  });
  elements.comparisonTableBody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-comparison-article-id]');
    if (!button || !elements.comparisonTableBody.contains(button)) {
      return;
    }
    state.selectedComparisonArticleId = button.dataset.comparisonArticleId;
    state.comparisonDetailPage = 1;
    renderComparisonDetail();
    elements.comparisonDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elements.comparisonDetailClose.addEventListener('click', function () {
    state.selectedComparisonArticleId = null;
    state.comparisonDetailPage = 1;
    renderComparisonDetail();
  });
  elements.comparisonDetailPrevious.addEventListener('click', function () {
    if (state.comparisonDetailPage > 1) {
      state.comparisonDetailPage -= 1;
      renderComparisonDetail();
    }
  });
  elements.comparisonDetailNext.addEventListener('click', function () {
    state.comparisonDetailPage += 1;
    renderComparisonDetail();
  });
  elements.coverageDatePrevious.addEventListener('click', function () {
    if (state.coverageDatePage > 1) {
      state.coverageDatePage -= 1;
      renderCoverage();
    }
  });
  elements.coverageDateNext.addEventListener('click', function () {
    state.coverageDatePage += 1;
    renderCoverage();
  });
  [elements.coverageSourceTableBody, elements.coverageDateTableBody].forEach(function (tableBody) {
    tableBody.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-coverage-source-id], button[data-coverage-date]');
      if (!button || !tableBody.contains(button)) {
        return;
      }
      state.coverageDrilldown = button.dataset.coverageDate
        ? { type: 'date', value: button.dataset.coverageDate }
        : { type: 'source', value: button.dataset.coverageSourceId };
      renderCoverageDrilldown();
      elements.coverageDrilldown.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  elements.coverageDrilldownClose.addEventListener('click', function () {
    state.coverageDrilldown = null;
    renderCoverageDrilldown();
  });
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
  elements.articleDetailTableBody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-source-inspect-file-id]');
    if (!button || !elements.articleDetailTableBody.contains(button) || button.disabled) {
      return;
    }
    showArticleSourceValues(button.dataset.sourceInspectFileId, Number(button.dataset.sourceInspectLine));
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

  window.addEventListener('beforeunload', function (event) {
    if (workspaceSavePending > 0 || state.workspaceSaveFailure) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  applyLanguage();
  initializeWorkspaces();
}());
