'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const periods = require('../periods.js');
function fixture() {
  let reads = 0;
  const rows = ['2026-08-03', '2026-08-10', '2026-08-10', 'invalid'].map((date, index) => ({
    get delivery_date() { reads++; return date; }, source_file_id: 'source-' + index
  }));
  const result = { rows }, cache = periods.createPeriodViewCache();
  const range = { start: '2026-08-03', end: '2026-08-09' }, weekdays = [1, 2, 3, 4, 5, 6];
  return { rows, result, cache, range, weekdays, reads: () => reads, reset: () => { reads = 0; } };
}

test('cached week and coverage projections match the uncached period calculations', () => {
  const f = fixture();
  assert.deepEqual(f.cache.weeks(f.result, 'one'), periods.detectedCalendarWeeks(f.rows));
  assert.equal(f.cache.hasDates(f.result, 'one'), true);
  assert.deepEqual(f.cache.defaultSettings(f.result, 'one'), periods.defaultSettings(f.rows));
  assert.deepEqual(f.cache.coverage(f.result, 'one', f.range, f.weekdays), periods.coverageForPeriod(f.rows, f.range, f.weekdays));
  const settings = f.cache.defaultSettings(f.result, 'one'); settings.periodA.start = null;
  assert.notEqual(f.cache.defaultSettings(f.result, 'one').periodA.start, null, 'defaults must remain independently editable');
});

test('unchanged data, renamed periods and equivalent weekdays reuse projections without reading rows', () => {
  const f = fixture(), first = f.cache.coverage(f.result, 'one', f.range, f.weekdays);
  f.reset();
  f.cache.weeks(f.result, 'one'); f.cache.hasDates(f.result, 'one'); f.cache.defaultSettings(f.result, 'one');
  const again = f.cache.coverage(f.result, 'one', { ...f.range, name: 'Renamed' }, [6, 5, 4, 3, 2, 1, 1]);
  assert.equal(again, first); assert.equal(f.reads(), 0);
});

test('only a changed range or expected weekdays recomputes its coverage', () => {
  const f = fixture(), first = f.cache.coverage(f.result, 'one', f.range, f.weekdays);
  f.reset();
  const other = f.cache.coverage(f.result, 'one', { start: '2026-08-10', end: '2026-08-16' }, f.weekdays);
  assert.ok(f.reads() > 0); assert.notEqual(other, first);
  f.reset(); assert.equal(f.cache.coverage(f.result, 'one', f.range, f.weekdays), first); assert.equal(f.reads(), 0);
  f.cache.coverage(f.result, 'one', f.range, [1]); assert.ok(f.reads() > 0);
});

test('workspace switches, new analysis results and replaced/growing rows invalidate projections', () => {
  const f = fixture(); f.cache.weeks(f.result, 'one'); f.reset();
  f.cache.weeks(f.result, 'two'); assert.ok(f.reads() > 0);
  f.reset(); f.cache.weeks({ rows: f.rows }, 'two'); assert.ok(f.reads() > 0);
  f.result.rows = [{ delivery_date: '2026-09-01' }];
  assert.equal(f.cache.weeks(f.result, 'two')[0].id, '2026-W36');
  f.result.rows.push({ delivery_date: '2026-09-08' });
  assert.equal(f.cache.weeks(f.result, 'two').length, 2);
  assert.deepEqual(f.cache.weeks(null, 'two'), []); assert.equal(f.cache.hasDates(null, 'two'), false);
});

test('clearing releases the old projection and lets an explicitly refreshed record be prepared again', () => {
  const cache = periods.createPeriodViewCache(), result = { rows: [{ delivery_date: '2026-08-03' }] };
  cache.weeks(result, 'one'); result.rows[0].delivery_date = '2026-09-01'; cache.clear();
  assert.equal(cache.weeks(result, 'one')[0].id, '2026-W36');
});

test('recent range coverage stays bounded and evicts old projections', () => {
  const f = fixture(), first = f.cache.coverage(f.result, 'one', f.range, f.weekdays);
  for (let day = 10; day < 18; day++) f.cache.coverage(f.result, 'one', { start: '2026-08-' + day, end: '2026-08-20' }, f.weekdays);
  f.reset();
  assert.notEqual(f.cache.coverage(f.result, 'one', f.range, f.weekdays), first);
  assert.ok(f.reads() > 0, 'the ninth distinct range must evict the least recently used entry');
});

test('empty and invalid-only datasets retain their no-dates state without repeated scans', () => {
  const cache = periods.createPeriodViewCache(); let reads = 0;
  const result = { rows: [{ get delivery_date() { reads++; return 'invalid'; } }] };
  assert.equal(cache.hasDates(result, 'one'), false); reads = 0;
  assert.equal(cache.hasDates(result, 'one'), false); assert.deepEqual(cache.weeks(result, 'one'), []); assert.equal(reads, 0);
});
