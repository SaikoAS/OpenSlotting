'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const csv = require('../csv.js');
const workspace = require('../workspace.js');

function sourceFile(id, articleId) {
  const text = 'order_id;article_id;quantity;delivery_date\nO-1;' + articleId + ';1.25;2026-09-12\n';
  const bytes = new TextEncoder().encode(text);
  return {
    id,
    name: id + '.csv',
    label: id + '.csv',
    size: bytes.byteLength,
    lastModified: 1,
    buffer: bytes.buffer,
    encodingMode: 'auto',
    activeEncoding: 'utf-8',
    detectedEncoding: 'utf-8',
    errorKey: null,
    mapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 },
    confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 },
    result: {
      headers: ['order_id', 'article_id', 'quantity', 'delivery_date'],
      rows: [{
        source_file_id: id,
        source_file_name: id + '.csv',
        source_file_label: id + '.csv',
        source_line: 2,
        order_id: 'O-1',
        article_id: articleId,
        article_name: null,
        quantity: 12500000n,
        delivery_date: '2026-09-12',
        customer_id: null,
        sales_value: null,
        sales_value_exact: null,
        location: null
      }],
      issues: [],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      structuralRows: 0,
      mapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 },
      sourceFile: { id, name: id + '.csv', label: id + '.csv' },
      blocking: false
    }
  };
}

function articleMasterSourceFile(id, articleId) {
  const text = 'article_id;article_name;location\n' + articleId + ';Widget A;A-01\n';
  const bytes = new TextEncoder().encode(text);
  const result = csv.importCsv(text, { article_id: 0, article_name: 1, location: 2 }, {
    sourceFile: { id, name: id + '.csv', label: id + '.csv', sourceType: 'article-master' }
  });
  return {
    id,
    name: id + '.csv',
    label: id + '.csv',
    size: bytes.byteLength,
    lastModified: 1,
    buffer: bytes.buffer,
    encodingMode: 'auto',
    activeEncoding: 'utf-8',
    detectedEncoding: 'utf-8',
    errorKey: null,
    mapping: result.mapping,
    confirmedMapping: result.mapping,
    result,
    sourceType: 'article-master'
  };
}

function analyzedWorkspace(id, name, articleId) {
  const record = workspace.createWorkspace(name, {
    id,
    now: '2026-09-12T08:00:00.000Z',
    language: 'de'
  });
  record.analyzed = true;
  record.files.push(sourceFile('source-1', articleId));
  return workspace.validateWorkspace(record);
}

test('creates a versioned empty workspace with a stable identity', () => {
  const record = workspace.createWorkspace('  September 2026  ', {
    randomUuid: () => 'fixed-id',
    now: '2026-09-12T08:00:00.000Z',
    language: 'de'
  });

  assert.equal(record.id, 'workspace-fixed-id');
  assert.equal(record.name, 'September 2026');
  assert.equal(record.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal(record.language, 'de');
  assert.equal(record.periodSettings.mode, 'weeks');
  assert.deepEqual(record.periodSettings.expectedWeekdays, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(record.files, []);
});

test('captures source bytes, mappings, normalized rows, validation state, and exact quantities', () => {
  const metadata = workspace.createWorkspace('Warehouse', {
    id: 'workspace-1',
    now: '2026-09-12T08:00:00.000Z'
  });
  const captured = workspace.captureWorkspace(metadata, {
    language: 'en',
    analysis: { total_lines: 1 },
    periodSettings: {
      mode: 'custom',
      expectedWeekdays: [1, 2, 3, 4, 5],
      periodA: { name: 'Before', start: '2026-08-01', end: '2026-08-31' },
      periodB: { name: 'After', start: '2026-09-01', end: '2026-09-30' }
    },
    files: [sourceFile('source-1', 'SKU-1')]
  }, { now: '2026-09-12T09:00:00.000Z' });

  assert.equal(captured.updatedAt, '2026-09-12T09:00:00.000Z');
  assert.equal(captured.analyzed, true);
  assert.equal(captured.periodSettings.periodA.name, 'Before');
  assert.equal(captured.periodSettings.mode, 'custom');
  assert.deepEqual(captured.periodSettings.expectedWeekdays, [1, 2, 3, 4, 5]);
  assert.equal(captured.files[0].result.rows[0].quantity, 12500000n);
  assert.deepEqual(
    Array.from(new Uint8Array(captured.files[0].buffer)),
    Array.from(new Uint8Array(sourceFile('source-1', 'SKU-1').buffer))
  );
  assert.equal(Object.hasOwn(captured.files[0], 'browserFile'), false);
  assert.equal(captured.files[0].sourceType, workspace.DEFAULT_SOURCE_TYPE);
});

test('source types are explicit, constrained, and available for future import kinds', () => {
  const record = analyzedWorkspace('workspace-source-types', 'Source types', 'SKU-1');

  assert.deepEqual(workspace.SOURCE_TYPES, ['order-lines', 'article-master']);
  assert.equal(record.files[0].sourceType, 'order-lines');

  record.files[0].sourceType = 'article-master';
  const articleMaster = workspace.validateWorkspace(record);
  assert.equal(articleMaster.files[0].sourceType, 'article-master');

  const invalid = analyzedWorkspace('workspace-invalid-source-type', 'Invalid source type', 'SKU-2');
  invalid.files[0].sourceType = 'catalog';
  assert.throws(
    () => workspace.validateWorkspace(invalid),
    (error) => error.code === 'invalid_source_type'
  );
});

test('article-master rows validate and survive workspace backup round trips', () => {
  const record = workspace.createWorkspace('Article master', {
    id: 'workspace-article-master',
    now: '2026-09-12T08:00:00.000Z'
  });
  record.files.push(articleMasterSourceFile('source-master', 'SKU-MASTER'));
  const validated = workspace.validateWorkspace(record);
  assert.equal(validated.files[0].sourceType, 'article-master');
  assert.equal(validated.files[0].result.rows[0].article_id, 'SKU-MASTER');
  assert.equal(validated.files[0].result.rows[0].quantity, null);
  const restored = workspace.prepareRestore(workspace.parseBackup(workspace.stringifyBackup(validated, {
    now: '2026-09-12T09:00:00.000Z'
  })), { mode: 'new', newId: 'workspace-article-master-restored' });
  assert.equal(restored.files[0].sourceType, 'article-master');
  assert.equal(restored.files[0].result.rows[0].location, 'A-01');
});

test('workspace validation preserves an ordered source column catalog', () => {
  const record = analyzedWorkspace('workspace-column-catalog', 'Column catalog', 'SKU-CATALOG');
  record.files[0].result = null;
  record.files[0].columnCatalog = [
    {
      position: 0,
      header: 'Artikelnummer',
      normalizedHeader: 'artikelnummer',
      occurrence: 1,
      isDuplicate: false,
      sourceFileId: 'source-1',
      sourceFileName: 'source-1.csv',
      sourceFileLabel: 'source-1.csv',
      profile: {
        totalRows: 1,
        nonEmptyCount: 1,
        frequentValues: [{ value: 'SKU-1', truncated: false, count: 2, countIsEstimate: true }]
      }
    },
    { position: 1, header: 'Menge', normalizedHeader: 'menge', occurrence: 1, isDuplicate: false, sourceFileId: 'source-1', sourceFileName: 'source-1.csv', sourceFileLabel: 'source-1.csv' },
    { position: 2, header: 'Menge', normalizedHeader: 'menge', occurrence: 2, isDuplicate: true, sourceFileId: 'source-1', sourceFileName: 'source-1.csv', sourceFileLabel: 'source-1.csv' }
  ];

  const validated = workspace.validateWorkspace(record);
  assert.equal(validated.files[0].columnCatalog[2].position, 2);
  assert.equal(validated.files[0].columnCatalog[2].isDuplicate, true);
  assert.equal(validated.files[0].columnCatalog[0].profile.frequentValues[0].countIsEstimate, true);
  assert.throws(
    () => workspace.validateWorkspace(Object.assign({}, record, {
      files: [Object.assign({}, record.files[0], { columnCatalog: [{ position: 1, header: 'Menge', normalizedHeader: 'menge', occurrence: 1 }] })]
    })),
    (error) => error.code === 'invalid_column_catalog'
  );
});

test('trusted validation can retain large payload references without copying them', () => {
  const original = analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1');
  const originalBuffer = original.files[0].buffer;
  const originalRow = original.files[0].result.rows[0];
  const retained = workspace.validateWorkspace(original, { clonePayload: false });
  const copied = workspace.validateWorkspace(original);

  assert.equal(retained.files[0].buffer, originalBuffer);
  assert.equal(retained.files[0].result.rows[0], originalRow);
  assert.notEqual(copied.files[0].buffer, originalBuffer);
  assert.notEqual(copied.files[0].result.rows[0], originalRow);
});

test('trusted runtime capture builds an autosave snapshot without traversing payload rows', () => {
  const original = analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1');
  const registry = [{
    article_id: 'SKU-1',
    master_data: {},
    custom_fields: {},
    has_master_data: false,
    has_movement_data: true,
    movement_status: 'movement-only',
    movement_row_count: 1,
    master_row_count: 0,
    source_file_ids: ['source-1'],
    source_files: ['source-1.csv'],
    master_source_file_ids: [],
    master_source_files: [],
    movement_source_file_ids: ['source-1'],
    movement_source_files: ['source-1.csv'],
    master_row_refs: [],
    value_provenance: [{ field: 'custom:custom-zone', value: 'Cold' }],
    value_conflicts: []
  }];
  const captured = workspace.captureWorkspaceTrusted(original, {
    language: 'de',
    analysis: { total_lines: 1 },
    files: original.files,
    articleRegistry: registry
  }, { now: '2026-09-12T09:00:00.000Z' });

  assert.equal(captured.updatedAt, '2026-09-12T09:00:00.000Z');
  assert.equal(captured.language, 'de');
  assert.equal(captured.analyzed, true);
  assert.equal(captured.files[0].buffer, original.files[0].buffer);
  assert.equal(captured.files[0].result, original.files[0].result);
  assert.equal(captured.articleRegistry[0], registry[0]);
  assert.equal(captured.articleRegistry[0].value_provenance, registry[0].value_provenance);
});

test('captures and restores the real CSV importer result without changing provenance', () => {
  const text = 'order_id;article_id;quantity;delivery_date;sales_unit_count;quantity_per_sales_unit\nO-1;SKU-REAL;0.3;2026-09-12;3;0.1\n';
  const bytes = new TextEncoder().encode(text);
  const source = {
    id: 'source-real',
    name: 'real.csv',
    label: 'real.csv',
    size: bytes.byteLength,
    lastModified: 1,
    buffer: bytes.buffer,
    encodingMode: 'auto',
    activeEncoding: 'utf-8',
    detectedEncoding: 'utf-8',
    errorKey: null,
    mapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, sales_unit_count: 4, quantity_per_sales_unit: 5 },
    confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, sales_unit_count: 4, quantity_per_sales_unit: 5 }
  };
  source.result = csv.importParsedCsv(csv.parseCsv(text), source.mapping, {
    locale: 'en',
    sourceFile: { id: source.id, name: source.name, label: source.label }
  });
  const metadata = workspace.createWorkspace('Real importer', {
    id: 'workspace-real',
    now: '2026-09-12T08:00:00.000Z'
  });
  const captured = workspace.captureWorkspace(metadata, {
    language: 'en',
    analysis: { total_lines: 1 },
    files: [source]
  }, { now: '2026-09-12T09:00:00.000Z' });
  const restored = workspace.parseBackup(workspace.stringifyBackup(captured, {
    now: '2026-09-12T10:00:00.000Z'
  }));

  assert.equal(restored.files[0].result.rows[0].quantity, 3000000n);
  assert.equal(restored.files[0].result.rows[0].sales_unit_count, 30000000n);
  assert.equal(restored.files[0].result.rows[0].quantity_per_sales_unit, 1000000n);
  assert.equal(restored.files[0].result.rows[0].sales_unit_quantity_matches, true);
  assert.equal(restored.files[0].result.rows[0].sales_unit_quantity_relation, 'exact');
  assert.equal(restored.files[0].result.rows[0].source_file_id, source.id);
  assert.equal(restored.files[0].result.rows[0].source_line, 2);
  assert.equal(Object.hasOwn(restored.files[0].result.rows[0], 'raw_values'), false);
  assert.deepEqual(csv.reconstructRawSource(text, 2).raw_values, ['O-1', 'SKU-REAL', '0.3', '2026-09-12', '3', '0.1']);
});

test('backup round trip preserves original bytes, reconstructable source fields, mappings, and BigInt quantities', () => {
  const original = analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1');
  original.files[0].sourceType = 'article-master';
  const text = workspace.stringifyBackup(original, { now: '2026-09-12T10:00:00.000Z' });
  const restored = workspace.parseBackup(text);

  assert.equal(restored.id, original.id);
  assert.equal(restored.files[0].result.rows[0].quantity, 12500000n);
  assert.equal(restored.files[0].sourceType, 'article-master');
  assert.equal(Object.hasOwn(restored.files[0].result.rows[0], 'raw_fields'), false);
  assert.deepEqual(
    Array.from(new Uint8Array(restored.files[0].buffer)),
    Array.from(new Uint8Array(original.files[0].buffer))
  );
});

test('restore-as-new changes only the workspace identity', () => {
  const original = analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1');
  const restored = workspace.prepareRestore(original, {
    mode: 'new',
    randomUuid: () => 'restored',
    now: '2026-09-12T11:00:00.000Z'
  });

  assert.equal(restored.id, 'workspace-restored');
  assert.equal(restored.name, original.name);
  assert.equal(restored.files[0].result.rows[0].article_id, 'SKU-1');
});

test('replace restore uses the explicit target workspace identity', () => {
  const original = analyzedWorkspace('workspace-backup', 'Imported backup', 'SKU-1');
  const restored = workspace.prepareRestore(original, {
    mode: 'replace',
    targetId: 'workspace-target',
    now: '2026-09-12T11:00:00.000Z'
  });

  assert.equal(restored.id, 'workspace-target');
  assert.equal(restored.name, 'Imported backup');
  assert.throws(
    () => workspace.prepareRestore(original, { mode: 'replace' }),
    (error) => error.code === 'restore_target_required'
  );
});

test('invalid, truncated, and unsupported backups are rejected', () => {
  assert.throws(() => workspace.parseBackup('{'), (error) => error.code === 'invalid_backup_json');
  assert.throws(
    () => workspace.parseBackup(JSON.stringify({
      format: workspace.BACKUP_FORMAT,
      formatVersion: 99,
      exportedAt: '2026-09-12T10:00:00.000Z',
      workspace: {}
    })),
    (error) => error.code === 'unsupported_backup_version'
  );

  const valid = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  valid.workspace.schemaVersion = 99;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(valid)),
    (error) => error.code === 'unsupported_workspace_version'
  );

  const invalidLanguage = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  invalidLanguage.workspace.language = 'fr';
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(invalidLanguage)),
    (error) => error.code === 'invalid_workspace_language'
  );

  const missingLanguage = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  delete missingLanguage.workspace.language;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(missingLanguage)),
    (error) => error.code === 'invalid_workspace_language'
  );

  const coercedFlag = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  coercedFlag.workspace.analyzed = 'false';
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(coercedFlag)),
    (error) => error.code === 'invalid_workspace_flag'
  );

  const missingFlag = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  delete missingFlag.workspace.analyzed;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(missingFlag)),
    (error) => error.code === 'invalid_workspace_flag'
  );

  const unsupportedEncoding = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  unsupportedEncoding.workspace.files[0].encodingMode = 'bogus';
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(unsupportedEncoding)),
    (error) => error.code === 'invalid_source_encoding'
  );

  const truncatedSource = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  truncatedSource.workspace.files[0].buffer.base64 = truncatedSource.workspace.files[0].buffer.base64.slice(0, -4);
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(truncatedSource)),
    (error) => error.code === 'invalid_source_size'
  );

  const unsafeSourceId = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  unsafeSourceId.workspace.files[0].id = 'source"]';
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(unsafeSourceId)),
    (error) => error.code === 'invalid_source_id'
  );

  const mappingOutsideHeaders = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  mappingOutsideHeaders.workspace.files[0].mapping.order_id = 4;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(mappingOutsideHeaders)),
    (error) => error.code === 'invalid_mapping'
  );

  const confirmedMappingOutsideHeaders = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  confirmedMappingOutsideHeaders.workspace.files[0].confirmedMapping.quantity = 99;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(confirmedMappingOutsideHeaders)),
    (error) => error.code === 'invalid_mapping'
  );

  const missingMapping = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  delete missingMapping.workspace.files[0].mapping;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(missingMapping)),
    (error) => error.code === 'invalid_mapping'
  );

  const primitiveMapping = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  primitiveMapping.workspace.files[0].mapping = false;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(primitiveMapping)),
    (error) => error.code === 'invalid_mapping'
  );

  const primitiveConfirmedMapping = JSON.parse(workspace.stringifyBackup(analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1')));
  primitiveConfirmedMapping.workspace.files[0].confirmedMapping = 0;
  assert.throws(
    () => workspace.parseBackup(JSON.stringify(primitiveConfirmedMapping)),
    (error) => error.code === 'invalid_mapping'
  );
});

test('baseline schema migration upgrades a schema-zero workspace without losing sources', () => {
  const legacy = analyzedWorkspace('workspace-legacy', 'Legacy', 'SKU-OLD');
  legacy.schemaVersion = 0;
  delete legacy.language;
  delete legacy.analyzed;

  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.deepEqual(migrated.periodSettings.expectedWeekdays, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(migrated.language, 'en');
  assert.equal(migrated.analyzed, false);
  assert.equal(migrated.files[0].result.rows[0].article_id, 'SKU-OLD');
});

test('schema-one migration adds period settings without changing source data', () => {
  const legacy = analyzedWorkspace('workspace-v1', 'Version one', 'SKU-V1');
  legacy.schemaVersion = 1;
  delete legacy.periodSettings;

  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.deepEqual(migrated.periodSettings, {
    mode: 'weeks',
    expectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    periodA: { name: 'Period A', start: null, end: null },
    periodB: { name: 'Period B', start: null, end: null }
  });
  assert.equal(migrated.files[0].result.rows[0].article_id, 'SKU-V1');
});

test('schema-two migration removes redundant raw row payloads', () => {
  const legacy = analyzedWorkspace('workspace-v2', 'Version two', 'SKU-V2');
  legacy.schemaVersion = 2;
  legacy.files[0].result.rows[0].raw_values = ['O-1', 'SKU-V2', '1.25', '2026-09-12'];
  legacy.files[0].result.rows[0].raw_fields = [
    { position: 1, header: 'order_id', value: 'O-1' },
    { position: 2, header: 'article_id', value: 'SKU-V2' }
  ];

  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal(Object.hasOwn(migrated.files[0].result.rows[0], 'raw_values'), false);
  assert.equal(Object.hasOwn(migrated.files[0].result.rows[0], 'raw_fields'), false);
});

test('schema-three migration adds the explicit default source type', () => {
  const legacy = analyzedWorkspace('workspace-v3', 'Version three', 'SKU-V3');
  legacy.schemaVersion = 3;
  delete legacy.files[0].sourceType;

  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal(migrated.files[0].sourceType, 'order-lines');

  legacy.files[0].sourceType = 'article-master';
  const preserved = workspace.migrateWorkspace(legacy);
  assert.equal(preserved.files[0].sourceType, 'article-master');
});

test('schema-four migration adds an empty source column catalog', () => {
  const legacy = analyzedWorkspace('workspace-v4', 'Version four', 'SKU-V4');
  legacy.schemaVersion = 4;
  delete legacy.files[0].columnCatalog;

  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.deepEqual(migrated.files[0].columnCatalog, []);
});

test('schema-five migration keeps source catalogs and adds empty profiles', () => {
  const legacy = analyzedWorkspace('workspace-v5', 'Version five', 'SKU-V5');
  legacy.schemaVersion = 5;
  legacy.files[0].columnCatalog = ['order_id', 'article_id', 'quantity', 'delivery_date'].map((header, position) => ({
    position,
    header,
    normalizedHeader: header,
    occurrence: 1,
    isDuplicate: false,
    sourceFileId: 'source-1',
    sourceFileName: 'source-1.csv',
    sourceFileLabel: 'source-1.csv'
  }));

  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.deepEqual(migrated.files[0].columnCatalog[0].profile.sampleValues, []);
});

test('period settings without a mode preserve existing dated ranges as custom', () => {
  const normalized = workspace.normalizePeriodSettings({
    expectedWeekdays: [1, 2, 3, 4, 5],
    periodA: { name: 'Before', start: '2026-08-01', end: '2026-08-31' },
    periodB: { name: 'After', start: '2026-09-01', end: '2026-09-30' }
  });

  assert.equal(normalized.mode, 'custom');
  assert.equal(normalized.periodA.name, 'Before');
  assert.equal(normalized.periodB.end, '2026-09-30');
});

test('workspace validation rejects invalid period ranges and empty weekday sets', () => {
  const invalidRange = analyzedWorkspace('workspace-period', 'Period', 'SKU-1');
  invalidRange.periodSettings.periodA = { name: 'A', start: '2026-09-10', end: '2026-09-01' };
  assert.throws(() => workspace.validateWorkspace(invalidRange), (error) => error.code === 'invalid_period_range');

  const noWeekdays = analyzedWorkspace('workspace-weekdays', 'Weekdays', 'SKU-1');
  noWeekdays.periodSettings.expectedWeekdays = [];
  assert.throws(() => workspace.validateWorkspace(noWeekdays), (error) => error.code === 'invalid_expected_weekdays');
});

test('duplicate source IDs and cross-source normalized rows are rejected', () => {
  const duplicate = analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1');
  duplicate.files.push(sourceFile('source-1', 'SKU-2'));
  assert.throws(
    () => workspace.validateWorkspace(duplicate),
    (error) => error.code === 'duplicate_source_id'
  );

  const crossed = analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1');
  crossed.files[0].result.rows[0].source_file_id = 'source-other';
  assert.throws(
    () => workspace.validateWorkspace(crossed),
    (error) => error.code === 'invalid_normalized_row'
  );
});

test('workspace names and portable filenames are validated', () => {
  assert.throws(() => workspace.createWorkspace('   '), (error) => error.code === 'workspace_name_required');
  assert.throws(() => workspace.createWorkspace('x'.repeat(121)), (error) => error.code === 'workspace_name_too_long');
  assert.equal(workspace.backupFilename(' September / Nord '), 'OpenSlotting-September-Nord.workspace.json');
});

test('custom field definitions keep stable IDs through rename, removal, and backup round trip', () => {
  let current = workspace.createWorkspace('Custom fields', { randomUuid: () => 'workspace-id' });
  current = workspace.createCustomField(current, 'Zone', 'text', { id: 'custom-zone' });
  current = workspace.renameCustomField(current, 'custom-zone', 'Pick zone');
  assert.equal(current.customFields[0].id, 'custom-zone');
  assert.equal(current.customFields[0].name, 'Pick zone');
  current = workspace.removeCustomField(current, 'custom-zone');
  assert.equal(current.customFields[0].active, false);
  const restored = workspace.parseBackup(workspace.stringifyBackup(current));
  assert.deepEqual(restored.customFields, current.customFields);
});

test('article registry is validated and survives workspace backup round trips', () => {
  const current = workspace.createWorkspace('Article registry', { id: 'workspace-registry' });
  current.articleRegistry = [{
    article_id: 'SKU-1',
    article_name: 'Widget',
    master_data: { location: 'A-01' },
    custom_fields: { 'custom-zone': 'Cold' },
    has_master_data: true,
    has_movement_data: true,
    movement_status: 'matched',
    master_row_count: 1,
    movement_row_count: 2,
    source_file_ids: ['source-master', 'source-orders'],
    source_files: ['master.csv', 'orders.csv'],
    master_source_file_ids: ['source-master'],
    master_source_files: ['master.csv'],
    movement_source_file_ids: ['source-orders'],
    movement_source_files: ['orders.csv'],
    master_row_refs: [{ source_file_id: 'source-master', source_line: 2 }],
    value_provenance: [{ field: 'location', value: 'A-01', source_file_id: 'source-master', source_line: 2 }],
    value_conflicts: []
  }];
  const validated = workspace.validateWorkspace(current);
  assert.equal(validated.articleRegistry[0].movement_status, 'matched');
  const restored = workspace.parseBackup(workspace.stringifyBackup(validated));
  assert.deepEqual(restored.articleRegistry, validated.articleRegistry);
});

test('workspace validation checks confirmed custom-field mappings against the registry', () => {
  const current = analyzedWorkspace('workspace-custom-confirmed', 'Custom confirmed', 'SKU-1');
  current.customFields = [{ id: 'custom-zone', name: 'Zone', type: 'text', active: true }];
  current.files[0].customFieldMapping = {};
  current.files[0].confirmedCustomFieldMapping = { 'custom-missing': 3 };
  assert.throws(
    () => workspace.validateWorkspace(current),
    (error) => error.code === 'unknown_custom_field'
  );
});

test('schema-six migration adds an empty custom-field registry', () => {
  const legacy = workspace.createWorkspace('Legacy', { id: 'workspace-legacy' });
  legacy.schemaVersion = 6;
  delete legacy.customFields;
  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.deepEqual(migrated.customFields, []);
});

test('schema-seven migration adds an empty article registry', () => {
  const legacy = workspace.createWorkspace('Legacy registry', { id: 'workspace-legacy-registry' });
  legacy.schemaVersion = 7;
  delete legacy.articleRegistry;
  const migrated = workspace.migrateWorkspace(legacy);
  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.deepEqual(migrated.articleRegistry, []);
});

test('schema-eight migration renames order date and preserves legacy sales value semantics', () => {
  const legacy = analyzedWorkspace('workspace-v8', 'Version eight', 'SKU-V8');
  legacy.schemaVersion = 8;
  legacy.customFields = [{ id: 'custom-zone', name: 'Zone', type: 'text', active: true }];
  const file = legacy.files[0];
  file.customFieldMapping = { 'custom-zone': 4 };
  file.confirmedCustomFieldMapping = { 'custom-zone': 4 };
  file.mapping = { article_id: 1, quantity: 2, order_date: 3, sales_value: null };
  file.confirmedMapping = { article_id: 1, quantity: 2, order_date: 3, sales_value: null };
  file.result.mapping = { article_id: 1, quantity: 2, order_date: 3, sales_value: null };
  file.result.rows[0].order_date = file.result.rows[0].delivery_date;
  delete file.result.rows[0].delivery_date;
  file.result.rows[0].sales_value = 12.5;
  file.result.rows[0].sales_value_exact = '12.5';
  file.result.issues = [{
    sourceLine: 2,
    sourceFileId: file.id,
    field: 'order_date',
    code: 'legacy_note',
    orderDate: '2026-09-12',
    message: 'Legacy note',
    severity: 'warning',
    blocking: false
  }];

  const migrated = workspace.migrateWorkspace(legacy);

  assert.equal(migrated.schemaVersion, workspace.WORKSPACE_SCHEMA_VERSION);
  assert.equal(migrated.files[0].mapping.delivery_date, 3);
  assert.equal(Object.hasOwn(migrated.files[0].mapping, 'order_date'), false);
  assert.equal(migrated.files[0].result.rows[0].delivery_date, '2026-09-12');
  assert.equal(Object.hasOwn(migrated.files[0].result.rows[0], 'order_date'), false);
  assert.equal(migrated.files[0].result.issues[0].field, 'delivery_date');
  assert.equal(migrated.files[0].result.issues[0].deliveryDate, '2026-09-12');
  assert.equal(migrated.files[0].result.rows[0].sales_value, 12.5);
  assert.equal(migrated.files[0].result.rows[0].sales_value_net, undefined);
  assert.equal(migrated.files[0].result.rows[0].sales_value_gross, undefined);
  assert.deepEqual(migrated.files[0].customFieldMapping, {});
  assert.equal(migrated.files[0].confirmedCustomFieldMapping, null);
});
