(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenSlottingWorkerSession = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function failure(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  // One sequential task, one local worker. Idle workers are released so a
  // session never keeps an unused engine alive indefinitely.
  function createSession(createWorker, options) {
    const settings = options || {};
    const idleMs = settings.idleMs === undefined ? 30000 : settings.idleMs;
    const timeoutMs = settings.timeoutMs === undefined ? 300000 : settings.timeoutMs;
    let worker = null;
    let active = null;
    let idleTimer = null;
    let serial = 0;
    let closed = false;

    function dispose() {
      clearTimeout(idleTimer);
      idleTimer = null;
      if (worker) {
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        worker.terminate();
        worker = null;
      }
    }

    function run(input, options) {
      if (closed) return Promise.reject(failure('worker_unavailable', 'Worker session is closed.'));
      if (active) return Promise.reject(failure('worker_busy', 'A workspace task is already running.'));
      const taskOptions = options || {};
      try {
        if (taskOptions.isCurrent && !taskOptions.isCurrent()) return Promise.reject(failure('workspace_load_cancelled'));
      } catch (error) { return Promise.reject(error); }
      clearTimeout(idleTimer);
      idleTimer = null;
      try { if (!worker) worker = createWorker(); }
      catch (error) { return Promise.reject(failure('worker_unavailable', error && error.message)); }
      const currentWorker = worker;
      const taskId = ++serial;
      return new Promise(function (resolve, reject) {
        let timer;
        let finished = false;
        function finish(error, result) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          active = null;
          currentWorker.onmessage = currentWorker.onerror = currentWorker.onmessageerror = null;
          if (error) dispose();
          else {
            idleTimer = setTimeout(dispose, idleMs);
            if (idleTimer && typeof idleTimer.unref === 'function') idleTimer.unref();
          }
          if (error) reject(error); else resolve(result);
        }
        function heartbeat() {
          clearTimeout(timer);
          timer = setTimeout(function () {
            finish(failure('worker_timeout', 'Workspace processing timed out.'));
          }, timeoutMs);
        }
        active = { cancel: function () { finish(failure('workspace_load_cancelled')); } };
        currentWorker.onmessage = function (event) {
          if (finished) return;
          const message = event.data || {};
          if (message.taskId !== taskId) return; // a late reply cannot complete another task
          try {
            if (taskOptions.isCurrent && !taskOptions.isCurrent()) {
              finish(failure('workspace_load_cancelled'));
              return;
            }
          } catch (error) { finish(error); return; }
          heartbeat();
          if (message.type === 'progress') {
            try { if (taskOptions.onProgress) taskOptions.onProgress(message.progress); }
            catch (error) { finish(error); }
          } else if (message.type === 'complete' || message.type === 'backup') finish(null, message);
          else if (message.type === 'error') finish(failure(message.code || 'worker_failed', message.message));
          else finish(failure('worker_failed', 'Unexpected workspace worker response.'));
        };
        currentWorker.onerror = function (event) {
          finish(failure('worker_unavailable', event && event.message));
        };
        currentWorker.onmessageerror = function () {
          finish(failure('worker_unavailable', 'Workspace response could not be decoded.'));
        };
        heartbeat();
        try { currentWorker.postMessage(Object.assign({}, input, { taskId: taskId }), taskOptions.transfer || []); }
        catch (error) { finish(failure('worker_unavailable', error && error.message)); }
      });
    }

    function cancel() {
      if (active) active.cancel();
      else dispose();
    }
    function close() { closed = true; cancel(); }
    return Object.freeze({ run: run, cancel: cancel, close: close });
  }

  return Object.freeze({ createSession: createSession });
}));
