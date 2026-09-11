const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const encoding = require('../encoding.js');

const SAMPLE = 'AuftrNr;ArtNr;Bezeichnung;GMenge;LfDat\r\nA-1;Ä-1;Größe Öl;2,5;10.09.2026\r\n';

function utf16be(text, withBom) {
  const littleEndian = Buffer.from(text, 'utf16le');
  const bytes = Buffer.alloc(littleEndian.length + (withBom ? 2 : 0));
  let offset = 0;
  if (withBom) {
    bytes[0] = 0xFE;
    bytes[1] = 0xFF;
    offset = 2;
  }
  for (let index = 0; index < littleEndian.length; index += 2) {
    bytes[offset + index] = littleEndian[index + 1];
    bytes[offset + index + 1] = littleEndian[index];
  }
  return bytes;
}

test('decodes UTF-8 with and without a byte-order mark', () => {
  assert.equal(encoding.decodeBuffer(Buffer.from(SAMPLE, 'utf8')), SAMPLE);
  assert.equal(encoding.decodeBuffer(Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(SAMPLE)])), SAMPLE);
});

test('reports detected encoding and supports an explicit per-file override', () => {
  const utf8 = new TextEncoder().encode('order_id;article_id\nO1;Ä-1\n');
  const windows1252 = Uint8Array.from([0x6f, 0x72, 0x64, 0x65, 0x72, 0x5f, 0x69, 0x64, 0x3b, 0xc4]);
  const detected = encoding.decodeBufferDetailed(utf8.buffer, 'auto');
  const overridden = encoding.decodeBufferDetailed(windows1252.buffer, 'windows-1252');

  assert.equal(detected.encoding, 'utf-8');
  assert.equal(detected.automatic, true);
  assert.match(detected.text, /Ä-1/);
  assert.equal(overridden.encoding, 'windows-1252');
  assert.equal(overridden.automatic, false);
  assert.equal(overridden.text, 'order_id;Ä');
  assert.throws(() => encoding.decodeBufferDetailed(windows1252.buffer, 'utf-8'));
});

test('decodes BOM-aware and BOM-less UTF-16 in both byte orders', () => {
  const utf16le = Buffer.from(SAMPLE, 'utf16le');
  assert.equal(encoding.decodeBuffer(Buffer.concat([Buffer.from([0xFF, 0xFE]), utf16le])), SAMPLE);
  assert.equal(encoding.decodeBuffer(utf16le), SAMPLE);
  assert.equal(encoding.decodeBuffer(utf16be(SAMPLE, true)), SAMPLE);
  assert.equal(encoding.decodeBuffer(utf16be(SAMPLE, false)), SAMPLE);
});

test('falls back to Windows-1252 when strict UTF-8 decoding fails', () => {
  const bytes = Buffer.from(fs.readFileSync(path.join(__dirname, '..', 'test-data', 'compact-german-windows-1252.csv.hex'), 'ascii').replace(/\s/g, ''), 'hex');
  const text = encoding.decodeBuffer(bytes);

  assert.match(text, /Größe Ölbehälter/);
  assert.match(text, /Fach-Ä1/);
});

test('does not hide unsupported embedded NUL data behind the Windows-1252 fallback', () => {
  assert.throws(() => encoding.decodeBuffer(Uint8Array.from([0x41, 0x00, 0x42, 0xFF, 0x43])), /NUL/);
});

test('manual mapping remains independent of input encoding', () => {
  const csv = require('../csv.js');
  const text = encoding.decodeBuffer(Uint8Array.from([0x58, 0x3B, 0x59, 0x3B, 0x5A, 0x3B, 0x44, 0x0A, 0x4F, 0x31, 0x3B, 0xC4, 0x31, 0x3B, 0x31, 0x3B, 0x32, 0x30, 0x32, 0x36, 0x2D, 0x30, 0x39, 0x2D, 0x31, 0x30]));
  const result = csv.importCsv(text, { order_id: 0, article_id: 1, quantity: 2, order_date: 3 });

  assert.equal(result.validRows, 1);
  assert.equal(result.rows[0].article_id, 'Ä1');
});
