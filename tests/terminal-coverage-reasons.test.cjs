'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const terminal = require('../terminal.js');

test('reasons distinguish expected missing days from recorded, nonexpected and out-of-range days', () => {
  const expected = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'];
  const observed = ['2026-08-01'];
  const notes = [
    { date: '2026-08-03', reason: 'Feiertag' }, { date: '2026-08-01', reason: 'Already observed' },
    { date: '2026-08-05', reason: 'Not expected' }, { date: '2026-08-02', reason: 'Betriebsruhe' }
  ];
  const snapshot = structuredClone(notes);
  const result = terminal.coverageReasons(expected, observed, notes, '2026-08-02', '2026-08-04');
  assert.deepEqual(result.notes.map(note => note.date), ['2026-08-02', '2026-08-03']);
  assert.equal(result.unknown, 1);
  assert.deepEqual(notes, snapshot);
  assert.deepEqual(terminal.coverageCounts(expected, observed), { expected: 4, observed: 1, unknown: 3 });
  assert.deepEqual(terminal.coverageReasons(expected, observed, [], '2026-08-02', '2026-08-04'), { notes: [], unknown: 3 });
  assert.deepEqual(terminal.coverageReasons([], observed, notes), { notes: [], unknown: 0 });
  assert.deepEqual(terminal.coverageReasons(expected, observed, notes, '2026-08-04', '2026-08-02'), { notes: [], unknown: 0 });
});
