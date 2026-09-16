(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.OpenSlottingRuntimeFactory = api;
    root.OpenSlottingRuntime = api.detectRuntime(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RUNTIME_MODES = Object.freeze({
    PORTABLE: 'portable',
    ENHANCED_LOCAL: 'enhanced-local',
    UNSUPPORTED: 'unsupported'
  });

  const CAPABILITY_KEYS = Object.freeze([
    'indexedDb',
    'webWorkers',
    'persistentStorage',
    'webLocks',
    'broadcastChannel',
    'opfs',
    'folderAccess',
    'sqlite'
  ]);

  function hasFunction(owner, propertyName) {
    return Boolean(owner && typeof owner[propertyName] === 'function');
  }

  function isLoopbackHostname(hostname) {
    const normalized = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    const ipv4Loopback = ['127', '0', '0', '1'].join('.');
    const localName = ['local', 'host'].join('');
    return normalized === ipv4Loopback || normalized === localName || normalized === '::1';
  }

  function detectMode(locationLike) {
    const protocol = String(locationLike && locationLike.protocol || '').toLowerCase();
    const hostname = String(locationLike && locationLike.hostname || '');
    if (protocol === 'file:') {
      const normalizedFileHost = hostname.toLowerCase().replace(/^\[|\]$/g, '');
      const localFileHost = ['local', 'host'].join('');
      return normalizedFileHost === '' || normalizedFileHost === localFileHost
        ? RUNTIME_MODES.PORTABLE
        : RUNTIME_MODES.UNSUPPORTED;
    }
    if ((protocol === 'http:' || protocol === 'https:') && isLoopbackHostname(hostname)) {
      return RUNTIME_MODES.ENHANCED_LOCAL;
    }
    return RUNTIME_MODES.UNSUPPORTED;
  }

  function detectCapabilities(environment) {
    const scope = environment || {};
    const navigatorLike = scope.navigator || {};
    const storage = navigatorLike.storage || null;
    return Object.freeze({
      indexedDb: Boolean(scope.indexedDB),
      webWorkers: hasFunction(scope, 'Worker'),
      persistentStorage: hasFunction(storage, 'persist'),
      webLocks: Boolean(navigatorLike.locks && hasFunction(navigatorLike.locks, 'request')),
      broadcastChannel: hasFunction(scope, 'BroadcastChannel'),
      opfs: hasFunction(storage, 'getDirectory'),
      folderAccess: hasFunction(scope, 'showOpenFilePicker') || hasFunction(scope, 'showDirectoryPicker'),
      sqlite: false
    });
  }

  function detectOrigin(locationLike, mode) {
    if (mode === RUNTIME_MODES.PORTABLE) {
      return 'file:///';
    }
    const origin = String(locationLike && locationLike.origin || '');
    return origin && origin !== 'null' ? origin : '—';
  }

  function detectRuntime(environment) {
    const scope = environment || {};
    const mode = detectMode(scope.location || {});
    const capabilities = detectCapabilities(scope);
    return Object.freeze({
      mode,
      origin: detectOrigin(scope.location || {}, mode),
      capabilities,
      supports: function (capabilityName) {
        return CAPABILITY_KEYS.indexOf(capabilityName) >= 0 && capabilities[capabilityName] === true;
      }
    });
  }

  return Object.freeze({
    CAPABILITY_KEYS,
    RUNTIME_MODES,
    detectCapabilities,
    detectMode,
    detectRuntime,
    isLoopbackHostname
  });
}));
