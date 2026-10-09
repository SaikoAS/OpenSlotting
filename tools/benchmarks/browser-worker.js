(function () {
  'use strict';

  const preparation = window.OpenSlottingWorkspacePreparation;
  const sessionApi = window.OpenSlottingWorkerSession;
  const baseline = window.OpenSlottingBrowserBaseline;
  const elements = {
    start: document.getElementById('start'), cancel: document.getElementById('cancel'),
    download: document.getElementById('download'), output: document.getElementById('output'),
    status: document.getElementById('status'), responsiveness: document.getElementById('responsiveness')
  };
  const SIZES = [1000, 10000];
  const SAMPLE_COUNT = 5;
  const sessions = new Set();
  let cancelled = false;
  let running = false;
  let report = null;
  let latestJson = '';

  function error(message, code) {
    return Object.assign(new Error(message), { code: code || 'benchmark_failed' });
  }

  function assert(condition, message) {
    if (!condition) throw error(message, 'contract_mismatch');
  }

  function publish(status) {
    if (status) elements.status.textContent = status;
    if (report) {
      latestJson = JSON.stringify(report, null, 2);
      elements.output.textContent = latestJson;
    }
  }

  function requireForeground() {
    if (cancelled) throw error('Abgebrochen.', 'workspace_load_cancelled');
    if (document.visibilityState !== 'visible') throw error('Seite war nicht im Vordergrund; Messung ungültig.', 'background_tab');
  }

  function quote(value) {
    const text = String(value);
    return /[;"\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function fixture(count) {
    const started = performance.now();
    const rows = ['order_id;article_id;quantity;delivery_date;customer_id;customer_city;article_name;note;note'];
    for (let index = 0; index < count; index += 1) {
      rows.push([
        '000' + index, '000' + (index % 211), index % 101 === 0 ? '18446744073709551616.0000001' : '0.1234567',
        index % 97 === 0 ? '' : '2026-09-' + String(index % 28 + 1).padStart(2, '0'),
        'C-00' + (index % 37), index % 2 ? 'Köln' : 'İstanbul',
        'Artikel ' + (index % 211) + ' Straße Ω', index % 89 === 0 ? 'Synthetisch; "mehrzeilig"\nzweite Zeile' : 'Synthetisch',
        index % 113 === 0 ? 'SKIP' : 'raw-' + index
      ].map(quote).join(';'));
    }
    const bytes = new TextEncoder().encode(rows.join('\r\n') + '\r\n');
    const record = window.OpenSlottingWorkspace.createWorkspace('Browser synthetic ' + count, {
      id: 'workspace-browser-' + count, language: 'en', now: '2026-10-04T12:00:00.000Z'
    });
    const mapping = { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3, customer_id: 4, customer_city: 5, article_name: 6 };
    record.analyzed = true;
    record.files.push({
      id: 'source-browser-' + count, name: 'synthetic-' + count + '.csv', label: 'synthetic-' + count + '.csv',
      size: bytes.byteLength, lastModified: 1, buffer: bytes.buffer, encodingMode: 'auto',
      activeEncoding: 'utf-8', detectedEncoding: 'utf-8', errorKey: null,
      mapping: mapping, confirmedMapping: Object.assign({}, mapping),
      preparationRules: { article_name: [{ type: 'trim', enabled: true }] },
      sourceRules: [{ sourcePosition: 8, type: 'exclude-equals', value: 'SKIP', name: 'Synthetic exclusion',
        description: 'Explicit fixture rule, not an inferred ERP rule.', enabled: true, includeInProfile: true }],
      customFieldMapping: {}, confirmedCustomFieldMapping: {}, sourceType: 'order-lines', result: null
    });
    return { count: count, record: record, sourceBytes: bytes.byteLength, fixtureBuildMs: performance.now() - started };
  }

  function productionCalculationFile(file) {
    // Same narrow calculation snapshot as app.js; no persisted row results,
    // original source buffers remain attached and unchanged.
    return {
      id: file.id, name: file.name, label: file.label, size: file.size, lastModified: file.lastModified,
      buffer: file.buffer ? file.buffer.slice(0) : null,
      encodingMode: file.encodingMode, activeEncoding: file.activeEncoding, detectedEncoding: file.detectedEncoding,
      sourceType: file.sourceType, errorKey: file.errorKey, content: null,
      parsed: file.parsed, headers: file.headers, mapping: file.mapping, confirmedMapping: file.confirmedMapping,
      customFieldMapping: file.customFieldMapping, confirmedCustomFieldMapping: file.confirmedCustomFieldMapping,
      preparationRules: file.preparationRules, sourceRules: file.sourceRules, columnCatalog: file.columnCatalog,
      dataRowCount: file.dataRowCount, hasParseErrors: file.hasParseErrors, result: null
    };
  }

  function createSession() {
    const session = sessionApi.createSession(function () {
      return new Worker('/src/workers/workspace-worker.mjs', { type: 'module' });
    });
    sessions.add(session);
    return session;
  }

  function closeSession(session) {
    session.close();
    sessions.delete(session);
  }

  async function runCurrent(session, input) {
    const files = input.record ? input.record.files : input.profileFile ? [input.profileFile] : input.analysisFiles || [];
    const transfer = Array.from(new Set(files.map(function (file) { return file.buffer; })
      .filter(function (buffer) { return buffer instanceof ArrayBuffer; })));
    const message = await session.run(input, { transfer: transfer, isCurrent: function () { return !cancelled; } });
    return message.prepared;
  }

  async function sha256(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
  }

  async function canonicalValue(input) {
    const buffers = new WeakMap();
    async function visit(value, ancestors) {
      if (typeof value === 'bigint') return { $bigint: value.toString() };
      if (value === undefined) return { $undefined: true };
      if (typeof value === 'number' && !Number.isFinite(value)) return { $number: String(value) };
      if (value === null || typeof value !== 'object') {
        assert(typeof value !== 'function' && typeof value !== 'symbol', 'Unexpected non-data output');
        return value;
      }
      if (value instanceof ArrayBuffer) {
        if (!buffers.has(value)) buffers.set(value, { $arrayBufferBytes: value.byteLength, sha256: await sha256(value) });
        return buffers.get(value);
      }
      assert(!ancestors.has(value), 'Unexpected cyclic output');
      const next = new Set(ancestors); next.add(value);
      if (Array.isArray(value)) {
        const array = [];
        for (const item of value) array.push(await visit(item, next));
        return array;
      }
      if (value instanceof Map) {
        const entries = [];
        for (const pair of value) entries.push([await visit(pair[0], next), await visit(pair[1], next)]);
        return { $map: entries };
      }
      if (value instanceof Set) {
        const entries = [];
        for (const item of value) entries.push(await visit(item, next));
        return { $set: entries };
      }
      if (ArrayBuffer.isView(value)) return { $typedArray: value.constructor.name, values: Array.from(value, String) };
      if (value instanceof Date) return { $date: value.toISOString() };
      const object = {};
      for (const key of Object.keys(value).sort()) object[key] = await visit(value[key], next);
      return object;
    }
    const text = JSON.stringify(await visit(input, new Set()));
    const bytes = new TextEncoder().encode(text);
    return { text: text, sha256: await sha256(bytes), canonicalBytes: bytes.byteLength };
  }

  function sourceFiles(value) {
    return value.files || (value.file ? [value.file] : []);
  }

  async function verifyOutput(value, template, expected) {
    const started = performance.now();
    for (const file of sourceFiles(value)) {
      const source = template.record.files.find(function (candidate) { return candidate.id === file.id; });
      assert(Boolean(source), 'Unknown output source ' + file.id);
      assert(file.buffer instanceof ArrayBuffer, 'Missing output source bytes');
      const actual = new Uint8Array(file.buffer), original = new Uint8Array(source.buffer);
      assert(actual.length === original.length && source.buffer.byteLength === source.size, 'Detached/missing original source');
      for (let index = 0; index < actual.length; index += 1) {
        assert(actual[index] === original[index], 'Source byte mismatch at ' + index);
      }
    }
    const canonical = await canonicalValue(value);
    if (expected) {
      assert(canonical.text === expected.text, 'Whole prepared output differs: ' + canonical.sha256 + ' != ' + expected.sha256);
    }
    return {
      canonical: canonical,
      check: { matched: true, sha256: canonical.sha256, canonicalBytes: canonical.canonicalBytes,
        sourceBytesEqual: true, fullCanonicalEquality: Boolean(expected), verificationMs: performance.now() - started }
    };
  }

  function frame() {
    return new Promise(function (resolve) { requestAnimationFrame(resolve); });
  }

  async function measure(operation, responsiveness) {
    requireForeground();
    const frameGaps = [], timerDelays = [], longTasks = [];
    let frameId = null, interval = null, observer = null, lastFrame = null, lastTick = null;
    let observedHidden = false;
    const visibility = function () { if (document.visibilityState !== 'visible') observedHidden = true; };
    document.addEventListener('visibilitychange', visibility);
    if (responsiveness) {
      const observeFrame = function (now) {
        if (lastFrame !== null) frameGaps.push({ at: performance.now(), gapMs: now - lastFrame });
        lastFrame = now; frameId = requestAnimationFrame(observeFrame);
      };
      frameId = requestAnimationFrame(observeFrame);
      lastTick = performance.now();
      interval = setInterval(function () {
        const now = performance.now();
        timerDelays.push({ at: now, delayMs: Math.max(0, now - lastTick - 16) }); lastTick = now;
      }, 16);
      if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        observer = new PerformanceObserver(function (list) {
          for (const entry of list.getEntries()) longTasks.push({ at: entry.startTime, durationMs: entry.duration });
        });
        observer.observe({ entryTypes: ['longtask'] });
      }
      await frame(); await frame();
    } else {
      await frame();
    }
    const started = performance.now();
    let finished, output;
    try {
      output = await operation();
      finished = performance.now();
      if (responsiveness) { await frame(); await frame(); }
    } finally {
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (interval !== null) clearInterval(interval);
      if (observer) {
        for (const entry of observer.takeRecords()) longTasks.push({ at: entry.startTime, durationMs: entry.duration });
        observer.disconnect();
      }
      document.removeEventListener('visibilitychange', visibility);
    }
    requireForeground();
    assert(!observedHidden, 'Background tab invalidated sample');
    const frames = frameGaps.filter(function (item) { return item.at >= started; });
    const timers = timerDelays.filter(function (item) { return item.at >= started; });
    const tasks = longTasks.filter(function (item) { return item.at >= started && item.at <= finished; });
    return {
      value: output.value, elapsedMs: finished - started, sourceCopyMs: output.sourceCopyMs,
      responsiveness: responsiveness ? {
        observedWindowMs: performance.now() - started, includesTwoDrainFrames: true,
        rafObservedFrames: frames.length, rafMaxGapMs: frames.length ? Math.max.apply(null, frames.map(function (item) { return item.gapMs; })) : null,
        timerTicks: timers.length, timerMaxDelayMs: timers.length ? Math.max.apply(null, timers.map(function (item) { return item.delayMs; })) : null,
        longTaskSupported: Boolean(observer), longTaskCount: tasks.length,
        longTaskTotalMs: tasks.reduce(function (sum, item) { return sum + item.durationMs; }, 0)
      } : null
    };
  }

  function statistics(samples, key) {
    const values = samples.map(function (sample) { return sample[key]; }).sort(function (left, right) { return left - right; });
    return { min: values[0], median: values[Math.floor(values.length / 2)], max: values[values.length - 1] };
  }

  async function compareCase(options) {
    const { name, template, methods, responsiveness } = options;
    const row = { case: name, rows: template.count, sourceBytes: template.sourceBytes, methods: {}, sampleOrder: [] };
    report.cases.push(row);
    let expected = null;
    async function execute(method, phase, sampleIndex) {
      publish(name + ' · ' + template.count + ' Zeilen · ' + method.name + ' · ' + phase + (sampleIndex === undefined ? '' : ' ' + (sampleIndex + 1) + '/' + SAMPLE_COUNT));
      const measured = await measure(method.run, responsiveness);
      const verified = await verifyOutput(measured.value, template, expected);
      if (!expected) expected = verified.canonical;
      row.sampleOrder.push({ method: method.name, phase: phase, sampleIndex: sampleIndex });
      return { elapsedMs: measured.elapsedMs, sourceCopyMs: measured.sourceCopyMs,
        responsiveness: measured.responsiveness, contract: verified.check };
    }
    for (const method of methods) {
      row.methods[method.name] = { firstCall: await execute(method, 'first-call'), warmup: null, samples: [] };
    }
    for (const method of methods.slice().reverse()) row.methods[method.name].warmup = await execute(method, 'warmup');
    for (let round = 0; round < SAMPLE_COUNT; round += 1) {
      const rotated = methods.slice(round % methods.length).concat(methods.slice(0, round % methods.length));
      if (round % 2) rotated.reverse();
      for (const method of rotated) row.methods[method.name].samples.push(await execute(method, 'sample', round));
    }
    for (const method of methods) {
      const entry = row.methods[method.name];
      entry.elapsedMs = statistics(entry.samples, 'elapsedMs');
      entry.sourceCopyMs = statistics(entry.samples, 'sourceCopyMs');
    }
    row.contractsMatched = true;
    publish();
  }

  async function prepareComparison(template) {
    const reusable = createSession();
    function method(name, run) {
      return { name: name, run: async function () {
        const started = performance.now();
        const record = structuredClone(template.record);
        const copied = performance.now() - started;
        return { value: await run(record), sourceCopyMs: copied };
      } };
    }
    try {
      await compareCase({ name: 'record-prepare', template: template, responsiveness: false, methods: [
        method('baseline-blob-fresh', function (record) { return baseline.run(record); }),
        method('current-module-fresh', async function (record) {
          const session = createSession();
          try { return await runCurrent(session, { record: record, language: record.language }); }
          finally { closeSession(session); }
        }),
        method('current-module-reused', function (record) { return runCurrent(reusable, { record: record, language: record.language }); })
      ] });
    } finally { closeSession(reusable); }
  }

  async function responsivenessComparison(template) {
    const started = performance.now();
    const files = template.record.files.map(function (stored) { return preparation.runtimeFileFromStored(stored); });
    report.fixtureSetup.push({ rows: template.count, purpose: 'profile inputs for analysis', setupMs: performance.now() - started });
    for (const name of ['profile-file', 'analyze-files']) {
      const session = createSession();
      function method(kind) {
        return { name: 'current-' + kind, run: async function () {
          const copyStarted = performance.now();
          const copied = files.map(productionCalculationFile);
          const sourceCopyMs = performance.now() - copyStarted;
          let value;
          if (name === 'profile-file') {
            if (kind === 'direct') { preparation.decodeFileEntry(copied[0], { streaming: true }); value = { file: copied[0] }; }
            else value = await runCurrent(session, { profileFile: copied[0] });
          } else {
            if (kind === 'direct') value = preparation.analyzeFiles(copied, 'en', template.record.customFields);
            else value = await runCurrent(session, { analysisFiles: copied, language: 'en', customFields: template.record.customFields });
          }
          return { value: value, sourceCopyMs: sourceCopyMs };
        } };
      }
      try {
        await compareCase({ name: name, template: template, responsiveness: true, methods: [method('direct'), method('worker-reused')] });
      } finally { closeSession(session); }
    }
  }

  async function start() {
    if (running) return;
    running = true; cancelled = false;
    elements.start.disabled = true; elements.cancel.disabled = false; elements.download.disabled = true;
    elements.responsiveness.disabled = true;
    report = {
      format: 'openslotting-production-browser-benchmark-v1', status: 'running', startedAt: new Date().toISOString(),
      environment: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemoryGiB: navigator.deviceMemory || null, origin: location.origin, timeOrigin: performance.timeOrigin,
        crossOriginIsolated: window.crossOriginIsolated, visibility: document.visibilityState },
      protocol: {
        syntheticOnly: true, sizes: SIZES, samplesAfterWarmup: SAMPLE_COUNT, warmups: 1,
        firstCallSeparate: true, order: 'rotate methods each round, reverse alternating rounds',
        timing: 'source copy + actual production worker construction/session + postMessage transfer + processing + complete response',
        prepareCopy: 'structuredClone of same fixture included for every method; IndexedDB loading not measured',
        profileAnalyzeCopy: 'same narrow production calculation snapshot and ArrayBuffer.slice copy, included for both direct and worker',
        baseline: 'historical db39ffa Blob construction/runWorkspaceWorker with the same current shared domain factories; fresh worker every call; not the full historical application',
        current: 'actual src/workers/workspace-worker.mjs and src/application/worker-session.js; fresh/reused differentiated',
        cache: 'HTTP cache active with ETag revalidation; cold means new worker, not cleared browser/OS cache',
        verification: 'entire canonical output string equality, BigInt tagged exactly, array order preserved; each returned source byte compared to retained original',
        exclusions: 'fixture generation, explicit analysis-input profile setup, output hashing/equality, progress rendering, rAF probe setup/drain',
        responsiveness: 'rAF maximum observed gap, 16ms timer delay and optional Long Tasks; not a DOM/layout/application benchmark',
        memory: 'no claim: browser GC and per-worker peak memory are not controlled',
        download: 'local JSON only; no network submission or workspace storage'
      }, fixtureSetup: [], cases: []
    };
    publish('Lade Quellmanifest.');
    try {
      requireForeground();
      const response = await fetch('/dist/performance-browser/manifest.json');
      if (!response.ok) throw error('Quellmanifest konnte nicht geladen werden.');
      report.sources = await response.json();
      for (const count of SIZES) {
        requireForeground();
        const template = fixture(count);
        report.fixtureSetup.push({ rows: count, purpose: 'synthetic CSV and record generation', setupMs: template.fixtureBuildMs,
          sourceBytes: template.sourceBytes, sourceSha256: await sha256(template.record.files[0].buffer) });
        await prepareComparison(template);
        if (elements.responsiveness.checked) await responsivenessComparison(template);
      }
      report.status = 'complete'; report.contractsMatched = true;
      publish('Fertig. Alle vollständigen Ergebnisse und ursprünglichen Quellbytes stimmen überein.');
    } catch (failure) {
      report.status = cancelled ? 'cancelled' : 'failed';
      report.contractsMatched = false;
      report.error = { code: failure.code || 'benchmark_failed', message: failure.message };
      publish('Messung beendet: ' + failure.message);
    } finally {
      for (const session of Array.from(sessions)) closeSession(session);
      baseline.cancel(); running = false;
      report.finishedAt = new Date().toISOString(); publish();
      elements.start.disabled = false; elements.cancel.disabled = true; elements.download.disabled = false;
      elements.responsiveness.disabled = false;
    }
  }

  function cancel() {
    if (!running) return;
    cancelled = true; baseline.cancel();
    for (const session of sessions) session.cancel();
  }

  elements.start.addEventListener('click', start);
  elements.cancel.addEventListener('click', cancel);
  elements.download.addEventListener('click', function () {
    if (!latestJson) return;
    const url = URL.createObjectURL(new Blob([latestJson], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = 'OpenSlotting-production-browser-benchmark.json'; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  window.addEventListener('pagehide', cancel);
}());
