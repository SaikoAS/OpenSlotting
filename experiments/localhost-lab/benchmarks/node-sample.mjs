import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { encodeBackup, decodeBackup } from '../modules/backup-codec.mjs';
import { makeWorkspace, populateImportResults, sha256, summarize } from './fixtures.mjs';

const require = createRequire(import.meta.url);
const workspace = require('../../../workspace.js');
const [format, rowText, repeatText] = process.argv.slice(2);
const rows = Number(rowText);
const repeats = Number(repeatText);
if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(repeats) || repeats < 3) throw new Error('Invalid benchmark arguments');
const fixture = populateImportResults(makeWorkspace(rows, workspace), require('../../../csv.js'), require('../../../encoding.js'));
const bytes = new TextEncoder().encode(workspace.stringifyBackup(fixture, { now: '2026-10-04T12:00:00.000Z' })).buffer;
const hash = await sha256(bytes);
const encodeTimes = [];
const decodeTimes = [];
let encodedBytes;
for (let round = 0; round < repeats + 1; round++) {
  const start = performance.now();
  const encoded = await encodeBackup(bytes, format);
  const middle = performance.now();
  const decoded = await decodeBackup(encoded, format, bytes.byteLength);
  const end = performance.now();
  if (await sha256(decoded) !== hash) throw new Error('Backup bytes differ');
  workspace.parseBackup(new TextDecoder().decode(decoded));
  encodedBytes = encoded.byteLength;
  if (round > 0) { encodeTimes.push(middle - start); decodeTimes.push(end - middle); }
}
console.log(JSON.stringify({ engine: 'Node native CompressionStream', format, rows, repeats, warmup: 1,
  fixtureState: 'analyzed; original bytes, normalized rows, issues, profiles, registry',
  inputBytes: bytes.byteLength, encodedBytes, ratio: encodedBytes / bytes.byteLength,
  encode: summarize(encodeTimes), decode: summarize(decodeTimes), integrity: 'SHA-256 and production parseBackup passed',
  peakRssMiB: process.resourceUsage().maxRSS / 1024,
  peakScope: 'whole process including fixture, validation and codec; not codec-only allocation' }));
