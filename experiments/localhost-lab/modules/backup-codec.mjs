// Optional transport envelope. Existing workspace JSON stays the canonical inner format.
export async function encodeBackup(bytes, format = 'gzip') {
  if (format === 'identity') return bytes.slice(0);
  if (format !== 'gzip' && format !== 'deflate') throw new TypeError('Unsupported backup envelope');
  return new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream(format))).arrayBuffer();
}

export async function decodeBackup(bytes, format = 'gzip', maxBytes = 256 * 1024 * 1024) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new TypeError('Invalid decode limit');
  if (format === 'identity') {
    if (bytes.byteLength > maxBytes) throw new RangeError('Backup exceeds decode limit');
    return bytes.slice(0);
  }
  if (format !== 'gzip' && format !== 'deflate') throw new TypeError('Unsupported backup envelope');
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format)).getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new RangeError('Backup exceeds decode limit');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output.buffer;
}
