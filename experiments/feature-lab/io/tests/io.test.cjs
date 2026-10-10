'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const csv = require('../../../../csv.js');
const terminal = require('../../../../terminal.js');
const imports = require('../modules/imports.cjs');
const exportsApi = require('../modules/exports.cjs');
const interpretation = require('../modules/interpretation.cjs');
const fixtures = require('../benchmarks/fixtures.cjs');

function compareImports(bytes, options) {
  const expected = imports.importBytes(bytes, { ...options, variant: 'baseline-64k' });
  for (const variant of imports.VARIANTS) {
    const actual = imports.importBytes(bytes, { ...options, variant });
    assert.deepEqual(actual.result, expected.result, variant);
    assert.equal(actual.encoding, expected.encoding, variant);
    assert.ok(actual.prepareMs >= 0);
  }
  return expected.result;
}

test('all imports preserve whole normalized payload, profiles, issues, provenance and original bytes', () => {
  const fixture = fixtures.makeFixture(1000);
  const before = Buffer.from(fixture.bytes);
  const result = compareImports(fixture.bytes, { ...fixture.options, mapping: fixture.mapping });
  assert.ok(result.rows.length > 900);
  assert.ok(result.issues.some(issue => issue.code === 'source_rule_excluded'));
  assert.ok(result.issues.some(issue => issue.field === 'custom:weight'));
  assert.ok(result.issues.some(issue => issue.code === 'column_count_mismatch'));
  assert.ok(result.rawColumnCatalog.some(column => column.profile.sampleValues.some(sample => String(sample.value).includes('000000'))));
  assert.equal(result.columnCatalog[9].occurrence, 2);
  assert.equal(result.columnCatalog[9].position, 9);
  assert.ok(result.rows[0].article_id.startsWith('0000'));
  assert.ok(result.rows[0].source_line >= 3);
  assert.equal(typeof result.rows[0].quantity, 'bigint');
  assert.equal(result.rows[0].custom_fields.zone, 'COLD');
  assert.deepEqual(fixture.bytes, before);
});

test('UTF8/UTF16/Windows-1252 and record quote boundaries preserve source lines', () => {
  const text = 'article_id;quantity;delivery_date;article_name\r\n000001;100000000000,1234567;2026-09-01;"' + 'Ä'.repeat(66000) + '\r\n""Quoted"" 😀"\r\n000002;-1,2;2026-09-02;last\r\n';
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const utf16be = Buffer.from(utf16); utf16be.swap16();
  for (const bytes of [Buffer.from(text, 'utf8'), utf16, utf16be]) {
    const result = compareImports(bytes, { sourceFile: fixtures.sourceFile, locale: 'de' });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].article_id, '000001');
    assert.equal(result.rows[0].quantity, 1000000000001234567n);
    assert.ok(result.issues.some(issue => issue.code === 'quantity_must_be_positive' && issue.sourceLine === 4 && issue.rawValue === '-1,2'));
  }
  const cp1252 = Buffer.from(text.replace(' 😀', ''), 'latin1');
  const result = compareImports(cp1252, { sourceFile: fixtures.sourceFile });
  assert.ok(result.rows[0].article_name.includes('Ä'));
});

test('malformed quotes and missing columns keep identical error contract; unsupported NUL rejected', () => {
  const bad = Buffer.from('article_id;quantity;delivery_date\r\nA;1;"2026-09-01\r\nB;2;2026-09-02');
  const result = compareImports(bad, { sourceFile: fixtures.sourceFile });
  assert.ok(result.issues.length > 0);
  for (const variant of imports.VARIANTS) assert.throws(() => imports.importBytes(Buffer.from([65, 0, 66]), { variant }));
});

test('article master, typed custom values and conflicts survive alternate import paths', () => {
  const bytes = Buffer.from('article_id;article_name;quantity_per_sales_unit;vat_rate;Zone;Review\r\n000001;One;2;19;1,5;1.9.2026\r\n000001;Other;3;bad;broken;bad\r\n000002;Two;4;7;2,5;2026-09-02');
  const options = {
    sourceFile: { ...fixtures.sourceFile, id: 'master-io', sourceType: 'article-master' },
    customFields: [{ id: 'zone', name: 'Zone', type: 'number', active: true }, { id: 'review', name: 'Review', type: 'date', active: true }],
    customFieldMapping: { zone: 4, review: 5 }
  };
  const result = compareImports(bytes, options);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].custom_fields.review, '2026-09-01');
  assert.ok(result.issues.length >= 3);
  const combined = csv.combineImportResults([{ id: 'master-io', name: 'master.csv', sourceType: 'article-master', result }]);
  assert.ok(combined.dataQualityFindings.some(finding => /conflict/.test(finding.code)));
});

test('terminal generator is byte-identical with BOM, formulas, exact BigInt, quotes and provenance', () => {
  const fixture = fixtures.makeExportFixture(1000);
  fixture.lines[0].quantity = 9999999999999999991234567n;
  const expected = Buffer.from(terminal.exportLinesCsv(fixture.lines, fixture.columns, fixture.valueForColumn));
  for (const chunkRows of [1, 32, 512, 2048]) {
    const actual = exportsApi.collectUtf8(exportsApi.terminalChunks(fixture.lines, fixture.columns, fixture.valueForColumn, { chunkRows }));
    assert.deepEqual(actual, expected);
    assert.deepEqual(exportsApi.hashUtf8([expected]), exportsApi.hashUtf8(exportsApi.terminalChunks(fixture.lines, fixture.columns, fixture.valueForColumn, { chunkRows })));
  }
  assert.equal(expected.subarray(0, 3).toString('hex'), 'efbbbf');
  assert.ok(expected.toString().includes("'=CMD()"));
  assert.ok(expected.toString().includes('999999999999999999.1234567'));
  assert.ok(expected.toString().includes('source') === false); // localized column label
  assert.ok(expected.toString().includes('Quelldatei'));
});

test('batched analysis exporter is byte-identical; exact sales/nested fields/source text protected', () => {
  const fixture = fixtures.makeExportFixture(1000);
  const first = fixture.articles[0];
  first.master_custom_fields = { adversarial: '=COMMAND()', measure: 1234567890123456789n };
  first.total_sales_exact = '999999999999999999999999.99';
  first.source_files = ['=SOURCE.csv', 'Übersicht;\r\n"Details".csv'];
  for (const delimiter of [';', '|']) {
    const expected = Buffer.from(csv.exportAnalysisCsv(fixture.articles, { delimiter }));
    for (const chunkRows of [1, 32, 512, 2048]) assert.deepEqual(exportsApi.collectUtf8(exportsApi.analysisChunks(fixture.articles, { chunkRows, delimiter })), expected);
    assert.ok(expected.toString().includes('999999999999999999999999.99'));
    assert.ok(expected.toString().includes("'=COMMAND()"));
  }
});

test('empty exporters, invalid chunk sizes and import variant fail explicitly', () => {
  const f = fixtures.makeExportFixture(0);
  assert.deepEqual(exportsApi.collectUtf8(exportsApi.terminalChunks([], f.columns, f.valueForColumn)), Buffer.from(terminal.exportLinesCsv([], f.columns, f.valueForColumn)));
  assert.deepEqual(exportsApi.collectUtf8(exportsApi.analysisChunks([])), Buffer.from(csv.exportAnalysisCsv([])));
  assert.throws(() => exportsApi.collectUtf8(exportsApi.analysisChunks([], { chunkRows: 0 })));
  assert.throws(() => imports.importBytes(Buffer.from(''), { variant: 'guess' }));
});

test('profile interpretation disambiguates incompatible duplicate header while retaining identities', () => {
  const item = fixtures.interpretationCases()[1];
  const catalog = fixtures.caseCatalog(item);
  const rule = interpretation.suggestByRules(catalog).find(x => x.targetField === 'quantity');
  assert.equal(rule.uncertain, true);
  assert.deepEqual(rule.conflictingPositions, [1, 2]);
  const profile = interpretation.suggestWithProfiles(catalog).find(x => x.targetField === 'quantity');
  assert.equal(profile.topK[0].position, 2);
  assert.equal(profile.topK[0].occurrence, 2);
  assert.equal(profile.topK[0].sourceFileId, fixtures.sourceFile.id);
  assert.ok(profile.topK[1].reasons.includes('value_type_conflicts_with_header'));
  assert.equal(profile.uncertain, false);
  assert.equal(profile.automaticApplicationSafe, false);
  assert.equal(profile.requiresUserConfirmation, true);
});

test('unknown/empty/ambiguous columns stay review cases and leading-zero IDs are untouched', () => {
  for (const item of fixtures.interpretationCases()) {
    if (item.name === 'fachlich-taeuschender-header') continue; // separate limitation assertion below
    const proposals = interpretation.suggestWithProfiles(fixtures.caseCatalog(item));
    for (const [field, expected] of Object.entries(item.expected)) {
      const proposal = proposals.find(value => value.targetField === field);
      if (expected === null) assert.equal(proposal.uncertain, true, item.name + ':' + field);
      else { assert.equal(proposal.topK[0].position, expected, item.name + ':' + field); assert.equal(proposal.uncertain, false); }
      assert.equal(proposal.automaticApplicationSafe, false);
    }
  }
  const leading = fixtures.caseCatalog(fixtures.interpretationCases()[0]);
  assert.equal(leading[1].profile.sampleValues[0].value, '000001');
  assert.equal(interpretation.suggestWithProfiles(leading).find(x => x.targetField === 'article_id').topK[0].position, 1);
});

test('correct formats cannot reveal wrong source semantics; suggestions always need confirmation', () => {
  const item = fixtures.interpretationCases().find(value => value.name === 'fachlich-taeuschender-header');
  const proposals = interpretation.suggestWithProfiles(fixtures.caseCatalog(item));
  for (const field of Object.keys(item.expected)) {
    const proposal = proposals.find(value => value.targetField === field);
    assert.equal(proposal.uncertain, false); // intentional measured counterexample
    assert.equal(proposal.requiresUserConfirmation, true);
    assert.equal(proposal.automaticApplicationSafe, false);
  }
});

test('article-master interpretation uses only applicable fields and reports profile sampling', () => {
  const catalog = csv.profileCsvStreamingChunks(['ArtNr;Inhalt;Mwst\n00001;2;19\n00002;3;7'], { sourceFile: { ...fixtures.sourceFile, sourceType: 'article-master' } }).columnCatalog;
  const suggestions = interpretation.suggestWithProfiles(catalog, 'article-master', { topK: 2, profileIsSample: true });
  assert.equal(suggestions.some(x => x.targetField === 'quantity'), false);
  assert.equal(suggestions.find(x => x.targetField === 'quantity_per_sales_unit').topK[0].position, 1);
  assert.equal(suggestions.find(x => x.targetField === 'vat_rate').topK[0].profileIsSample, true);
});
