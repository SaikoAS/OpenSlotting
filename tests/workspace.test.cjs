'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const csv = require('../csv.js');
const workspace = require('../workspace.js');

function sourceFile(id, articleId) {
  const text = 'order_id;article_id;quantity;order_date\nO-1;' + articleId + ';1.25;2026-09-12\n';
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
    mapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 },
    confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 },
    result: {
      headers: ['order_id', 'article_id', 'quantity', 'order_date'],
      rows: [{
        source_file_id: id,
        source_file_name: id + '.csv',
        source_file_label: id + '.csv',
        source_line: 2,
        raw_values: ['O-1', articleId, '1.25', '2026-09-12'],
        raw_fields: [
          { position: 1, header: 'order_id', value: 'O-1' },
          { position: 2, header: 'article_id', value: articleId },
          { position: 3, header: 'quantity', value: '1.25' },
          { position: 4, header: 'order_date', value: '2026-09-12' }
        ],
        order_id: 'O-1',
        article_id: articleId,
        article_name: null,
        quantity: 12500000n,
        order_date: '2026-09-12',
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
      mapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 },
      sourceFile: { id, name: id + '.csv', label: id + '.csv' },
      blocking: false
    }
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
    files: [sourceFile('source-1', 'SKU-1')]
  }, { now: '2026-09-12T09:00:00.000Z' });

  assert.equal(captured.updatedAt, '2026-09-12T09:00:00.000Z');
  assert.equal(captured.analyzed, true);
  assert.equal(captured.files[0].result.rows[0].quantity, 12500000n);
  assert.deepEqual(
    Array.from(new Uint8Array(captured.files[0].buffer)),
    Array.from(new Uint8Array(sourceFile('source-1', 'SKU-1').buffer))
  );
  assert.equal(Object.hasOwn(captured.files[0], 'browserFile'), false);
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

test('captures and restores the real CSV importer result without changing provenance', () => {
  const text = 'order_id;article_id;quantity;order_date\nO-1;SKU-REAL;0.3;2026-09-12\n';
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
    mapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 },
    confirmedMapping: { order_id: 0, article_id: 1, quantity: 2, order_date: 3 }
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
  assert.equal(restored.files[0].result.rows[0].source_file_id, source.id);
  assert.equal(restored.files[0].result.rows[0].source_line, 2);
  assert.deepEqual(restored.files[0].result.rows[0].raw_values, ['O-1', 'SKU-REAL', '0.3', '2026-09-12']);
});

test('backup round trip preserves original bytes, raw fields, mappings, and BigInt quantities', () => {
  const original = analyzedWorkspace('workspace-1', 'Warehouse', 'SKU-1');
  const text = workspace.stringifyBackup(original, { now: '2026-09-12T10:00:00.000Z' });
  const restored = workspace.parseBackup(text);

  assert.equal(restored.id, original.id);
  assert.equal(restored.files[0].result.rows[0].quantity, 12500000n);
  assert.deepEqual(restored.files[0].result.rows[0].raw_fields, original.files[0].result.rows[0].raw_fields);
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
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.language, 'en');
  assert.equal(migrated.analyzed, false);
  assert.equal(migrated.files[0].result.rows[0].article_id, 'SKU-OLD');
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
