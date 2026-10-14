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
    LOCALHOST: 'localhost',
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
    if ((protocol === 'http:' || protocol === 'https:') && isLoopbackHostname(hostname)) {
      return RUNTIME_MODES.LOCALHOST;
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

  function detectOrigin(locationLike) {
    const origin = String(locationLike && locationLike.origin || '');
    return origin && origin !== 'null' ? origin : '—';
  }

  function describeBuild(core, workspace, warehouse) {
    const build = core.APP_BUILD || {};
    const commit = typeof build.commit === 'string' && /^[a-f0-9]{40}$/.test(build.commit)
      ? build.commit : null;
    return Object.freeze({
      version: core.APP_VERSION,
      status: build.status === 'release' && commit ? 'release' : 'development',
      commit,
      workspaceSchema: workspace.WORKSPACE_SCHEMA_VERSION,
      layoutSchema: warehouse.LAYOUT_VERSION,
      backupFormat: workspace.BACKUP_FORMAT_VERSION
    });
  }

  function detectRuntime(environment) {
    const scope = environment || {};
    const mode = detectMode(scope.location || {});
    const capabilities = detectCapabilities(scope);
    const localFile = String(scope.location && scope.location.protocol || '').toLowerCase() === 'file:' &&
      (!scope.location.hostname || isLoopbackHostname(scope.location.hostname));
    const reason = mode === RUNTIME_MODES.LOCALHOST ? null : (localFile ? 'portable-paused' : 'unsupported-origin');
    return Object.freeze({
      mode,
      reason,
      origin: detectOrigin(scope.location || {}),
      capabilities,
      startupNotice: function (language) {
        const german = String(language || '').toLowerCase().startsWith('de');
        return {
          language: german ? 'de' : 'en',
          title: german ? 'OpenSlotting lokal starten' : 'Start OpenSlotting locally',
          message: reason === 'portable-paused'
            ? (german ? 'Der Portable Mode ist auf unbestimmte Zeit pausiert. Dieser Entwicklungsstand wird über Localhost gestartet.'
              : 'Portable Mode is paused indefinitely. This development version starts through localhost.')
            : (german ? 'OpenSlotting benötigt eine lokale Loopback-Adresse, damit Nutzerdaten auf diesem Gerät bleiben.'
              : 'OpenSlotting requires a local loopback address to keep user data on this device.'),
          instruction: german
            ? 'Starte Start-OpenSlotting.cmd im Anwendungsordner. Python 3.8 oder neuer muss vorhanden sein. Bestehende Portable-Arbeitsbereiche lassen sich im bisherigen Stand als Sicherung exportieren und hier wiederherstellen.'
            : 'Run Start-OpenSlotting.cmd in the application folder. Python 3.8 or newer must be available. Export existing Portable workspaces as backups in the previous version, then restore them here.'
        };
      },
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
    describeBuild,
    isLoopbackHostname
  });
}));
