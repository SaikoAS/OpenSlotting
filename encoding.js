(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OpenSlottingEncodingFactory = factory;
    root.OpenSlottingEncoding = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function detectBomlessUtf16(bytes) {
    const sampleLength = Math.min(bytes.length - (bytes.length % 2), 4096);
    if (sampleLength < 4) {
      return null;
    }

    const pairCount = sampleLength / 2;
    const candidates = [
      { encoding: 'utf-16le', textIndex: 0, nullIndex: 1 },
      { encoding: 'utf-16be', textIndex: 1, nullIndex: 0 }
    ];
    for (const candidate of candidates) {
      let candidateSampleLength = sampleLength;
      if (candidateSampleLength + 2 <= bytes.length) {
        const lastCodeUnit = candidate.encoding === 'utf-16le'
          ? bytes[candidateSampleLength - 2] | (bytes[candidateSampleLength - 1] << 8)
          : (bytes[candidateSampleLength - 2] << 8) | bytes[candidateSampleLength - 1];
        if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) {
          candidateSampleLength += 2;
        }
      }

      let nullPairs = 0;
      let asciiTextBytes = 0;
      let structuralBytes = 0;
      for (let index = 0; index < candidateSampleLength; index += 2) {
        const textByte = bytes[index + candidate.textIndex];
        const nullByte = bytes[index + candidate.nullIndex];
        if (nullByte === 0) {
          nullPairs += 1;
        }
        if (textByte >= 0x09 && textByte <= 0x7E) {
          asciiTextBytes += 1;
        }
        if (textByte === 0x0A || textByte === 0x0D || textByte === 0x3B) {
          structuralBytes += 1;
        }
      }

      const threshold = Math.max(2, Math.ceil(pairCount * 0.3));
      const asciiPattern = nullPairs >= threshold && asciiTextBytes >= threshold;
      const structuralPattern = nullPairs >= 2 && structuralBytes >= 2;
      if (!asciiPattern && !structuralPattern) {
        continue;
      }

      try {
        const sample = new TextDecoder(candidate.encoding, { fatal: true }).decode(bytes.slice(0, candidateSampleLength));
        if (sample.indexOf('\u0000') === -1 && /[;\r\n]/.test(sample)) {
          return candidate.encoding;
        }
      } catch (error) {
        // Continue with the other byte order when the sample is not valid UTF-16.
      }
    }
    return null;
  }

  const SUPPORTED_ENCODINGS = Object.freeze(['utf-8', 'utf-16le', 'utf-16be', 'windows-1252']);

  function decodeBytes(bytes, encoding) {
    if (SUPPORTED_ENCODINGS.indexOf(encoding) < 0) {
      throw new RangeError('Unsupported encoding selection.');
    }
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    if (text.indexOf('\u0000') >= 0) {
      throw new TypeError('The decoded text contains unsupported embedded NUL characters.');
    }
    return text;
  }

  function decodeBufferDetailed(buffer, preferredEncoding) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (preferredEncoding && preferredEncoding !== 'auto') {
      return {
        text: decodeBytes(bytes, preferredEncoding),
        encoding: preferredEncoding,
        automatic: false
      };
    }

    let encoding = null;
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      encoding = 'utf-8';
    } else if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
      encoding = 'utf-16le';
    } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
      encoding = 'utf-16be';
    } else {
      encoding = detectBomlessUtf16(bytes);
    }

    if (encoding) {
      return {
        text: decodeBytes(bytes, encoding),
        encoding: encoding,
        automatic: true
      };
    }
    if (bytes.some(function (byte) { return byte === 0; })) {
      throw new TypeError('The byte sequence contains unsupported embedded NUL bytes.');
    }

    try {
      return {
        text: decodeBytes(bytes, 'utf-8'),
        encoding: 'utf-8',
        automatic: true
      };
    } catch (error) {
      return {
        text: decodeBytes(bytes, 'windows-1252'),
        encoding: 'windows-1252',
        automatic: true
      };
    }
  }

  function decodeBuffer(buffer) {
    return decodeBufferDetailed(buffer, 'auto').text;
  }

  return {
    SUPPORTED_ENCODINGS: SUPPORTED_ENCODINGS,
    decodeBuffer: decodeBuffer,
    decodeBufferDetailed: decodeBufferDetailed,
    detectBomlessUtf16: detectBomlessUtf16
  };
}));
