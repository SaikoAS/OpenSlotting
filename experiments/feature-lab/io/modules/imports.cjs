'use strict';

const { performance } = require('node:perf_hooks');
const csv = require('../../../../csv.js');
const encoding = require('../../../../encoding.js');

const VARIANTS = Object.freeze(['baseline-64k', 'chunk-256k', 'adaptive', 'eager']);

// Nur Decoder-Zufuhr wird geändert. Normalisierung, Profilierung, Regeln,
// BigInt und Quellzeilen stammen unverändert aus der echten Importfunktion.
function importBytes(bytes, settings = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Uint8Array required');
  const variant = settings.variant || 'baseline-64k';
  if (!VARIANTS.includes(variant)) throw new RangeError('Unknown import variant');
  const start = performance.now();
  const preferred = settings.encoding || 'auto';
  let detailed;
  if (variant === 'eager') {
    const decoded = encoding.decodeBufferDetailed(bytes, preferred);
    detailed = { encoding: decoded.encoding, chunks: [decoded.text] };
  } else {
    detailed = encoding.decodeBufferChunksDetailed(bytes, preferred, {
      chunkSize: variant === 'chunk-256k' ? 256 * 1024 : 64 * 1024
    });
    if (variant === 'adaptive') detailed.chunks = adaptiveChunks(bytes, detailed.encoding);
  }
  const prepareMs = performance.now() - start;
  const options = { ...settings };
  delete options.variant;
  delete options.encoding;
  delete options.mapping;
  const result = csv.importCsvStreamingChunks(detailed.chunks, settings.mapping, options);
  return { result, encoding: detailed.encoding, prepareMs };
}

// Ein State-Decoder behält UTF-8/UTF-16-Zeichen über Chunkgrenzen.
// Ziel ist ungefähr 2048 physische Zeilen/Chunk, begrenzt auf 16..512 KiB.
// Physische Zeilen dienen nur als Durchsatzheuristik, niemals als CSV-Records.
function* adaptiveChunks(bytes, sourceEncoding) {
  const decoder = new TextDecoder(sourceEncoding, { fatal: true });
  let size = 64 * 1024;
  for (let offset = 0; offset < bytes.length;) {
    const end = Math.min(bytes.length, offset + size);
    const text = decoder.decode(bytes.subarray(offset, end), { stream: true });
    if (text.includes('\u0000')) throw new TypeError('Unsupported embedded NUL');
    offset = end;
    if (text) {
      yield text;
      let breaks = 0;
      for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) breaks += 1;
      const proposed = breaks ? size * 2048 / breaks : size * 2;
      size = Math.max(16 * 1024, Math.min(512 * 1024, Math.round(proposed)));
    }
  }
  const tail = decoder.decode();
  if (tail.includes('\u0000')) throw new TypeError('Unsupported embedded NUL');
  if (tail) yield tail;
}

module.exports = { VARIANTS, importBytes, adaptiveChunks };
