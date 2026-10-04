// Experimental lifecycle adapter. Business calculations come from unchanged production code.
import { installKernel } from '../generated/preparation-kernel.mjs';

export const WORKER_VARIANTS = ['blob-fresh', 'module-fresh', 'module-reused'];

function makeWorker(variant, environment) {
  if (variant !== 'blob-fresh') {
    return { worker: new Worker(new URL('../workers/workspace-worker.mjs', import.meta.url), { type: 'module' }), url: null };
  }
  const source = [
    'const encoding=(' + environment.OpenSlottingEncodingFactory.toString() + ')();',
    'const core=(' + environment.OpenSlottingCsvFactory.toString() + ')();',
    'const warehouseModel=(' + environment.OpenSlottingWarehouseFactory.toString() + ')();',
    'const workspaceModel=(' + environment.OpenSlottingWorkspaceFactory.toString() + ')(warehouseModel);',
    '(' + installKernel.toString() + ')({encoding,core,warehouseModel,workspaceModel});'
  ].join('\n');
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try { return { worker: new Worker(url), url }; }
  catch (error) { URL.revokeObjectURL(url); throw error; }
}

export class WorkspaceSession {
  constructor(variant, environment = globalThis) {
    if (!WORKER_VARIANTS.includes(variant)) throw new TypeError('Unknown worker variant');
    this.variant = variant;
    this.environment = environment;
    this.active = null;
    this.pending = false;
    this.closed = false;
  }

  run(message, { timeoutMs = 60000, onProgress = () => {} } = {}) {
    if (this.closed || this.pending) return Promise.reject(new Error('Session closed or busy'));
    if (!this.active) this.active = makeWorker(this.variant, this.environment);
    this.pending = true;
    const { worker } = this.active;
    const buffers = [...new Set((message.record?.files || message.backupExport?.files || [])
      .map(file => file.buffer).filter(buffer => buffer instanceof ArrayBuffer))];
    return new Promise((resolve, reject) => {
      const finish = (error, value) => {
        clearTimeout(timer);
        this.pending = false;
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        this.cancelPending = null;
        if (error || this.variant !== 'module-reused') this.disposeWorker();
        if (error) reject(error); else resolve(value);
      };
      const timer = setTimeout(() => finish(new Error('Worker timeout')), timeoutMs);
      this.cancelPending = () => finish(new Error('Session cancelled'));
      worker.onmessage = event => {
        const result = event.data;
        if (result.type === 'progress') { onProgress(result.progress); return; }
        if (result.type === 'error') {
          const error = new Error(result.message);
          error.code = result.code;
          finish(error);
        } else if (result.type === 'complete' || result.type === 'backup') finish(null, result);
        else finish(new Error('Unexpected worker message'));
      };
      worker.onerror = event => finish(new Error(event.message || 'Worker load failed'));
      worker.onmessageerror = () => finish(new Error('Worker message could not be decoded'));
      try { worker.postMessage(message, buffers); } catch (error) { finish(error); }
    });
  }

  disposeWorker() {
    if (!this.active) return;
    this.active.worker.terminate();
    if (this.active.url) URL.revokeObjectURL(this.active.url);
    this.active = null;
  }

  close() {
    this.closed = true;
    if (this.cancelPending) this.cancelPending();
    this.disposeWorker();
  }
}
