'use strict';

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function createFakeIndexedDB() {
  const databases = new Map();
  let nextWriteError = null;

  class FakeTransaction {
    constructor(databaseState, storeNames, mode) {
      this.databaseState = databaseState;
      this.storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
      this.mode = mode;
      this.pending = 0;
      this.completed = false;
      this.aborted = false;
      this.error = null;
      this.oncomplete = null;
      this.onerror = null;
      this.onabort = null;
      this.snapshots = new Map();
      if (mode === 'readwrite') {
        this.storeNames.forEach((name) => {
          const store = databaseState.stores.get(name);
          if (store) {
            this.snapshots.set(name, new Map(Array.from(store.records.entries(), ([key, value]) => [key, clone(value)])));
          }
        });
      }
      this.scheduleCompletion();
    }

    scheduleCompletion() {
      setTimeout(() => {
        if (!this.completed && !this.aborted && this.pending === 0) {
          this.completed = true;
          if (this.oncomplete) {
            this.oncomplete();
          }
        }
      }, 0);
    }

    request(action, write) {
      if (this.completed || this.aborted) {
        const error = new Error('Transaction is inactive.');
        error.name = 'TransactionInactiveError';
        throw error;
      }
      const request = { result: undefined, error: null, onsuccess: null, onerror: null };
      this.pending += 1;
      setTimeout(() => {
        if (this.aborted) {
          return;
        }
        try {
          if (write && nextWriteError) {
            const errorName = nextWriteError;
            nextWriteError = null;
            const error = new Error(errorName);
            error.name = errorName;
            throw error;
          }
          request.result = action();
          if (request.onsuccess) {
            request.onsuccess();
          }
        } catch (error) {
          request.error = error;
          this.error = error;
          if (request.onerror) {
            request.onerror();
          }
          if (this.onerror) {
            this.onerror();
          }
          this.abort();
        } finally {
          this.pending -= 1;
          this.scheduleCompletion();
        }
      }, 0);
      return request;
    }

    objectStore(name) {
      if (!this.storeNames.includes(name) || !this.databaseState.stores.has(name)) {
        const error = new Error('Object store not found.');
        error.name = 'NotFoundError';
        throw error;
      }
      const storeState = this.databaseState.stores.get(name);
      return {
        put: (value) => this.request(() => {
          if (this.mode !== 'readwrite') {
            const error = new Error('Read-only transaction.');
            error.name = 'ReadOnlyError';
            throw error;
          }
          const key = value[storeState.keyPath];
          if (key === undefined || key === null || key === '') {
            const error = new Error('Missing key.');
            error.name = 'DataError';
            throw error;
          }
          storeState.records.set(String(key), clone(value));
          return key;
        }, true),
        get: (key) => this.request(() => clone(storeState.records.get(String(key))), false),
        getAll: () => this.request(() => Array.from(storeState.records.values(), clone), false),
        delete: (key) => this.request(() => {
          if (this.mode !== 'readwrite') {
            const error = new Error('Read-only transaction.');
            error.name = 'ReadOnlyError';
            throw error;
          }
          storeState.records.delete(String(key));
        }, true)
      };
    }

    abort() {
      if (this.completed || this.aborted) {
        return;
      }
      this.aborted = true;
      this.snapshots.forEach((records, name) => {
        this.databaseState.stores.get(name).records = records;
      });
      setTimeout(() => {
        if (this.onabort) {
          this.onabort();
        }
      }, 0);
    }
  }

  class FakeDatabase {
    constructor(state) {
      this.state = state;
      this.onversionchange = null;
      this.objectStoreNames = {
        contains: (name) => this.state.stores.has(name)
      };
    }

    createObjectStore(name, options) {
      this.state.stores.set(name, { keyPath: options.keyPath, records: new Map() });
      return {};
    }

    transaction(storeNames, mode) {
      return new FakeTransaction(this.state, storeNames, mode);
    }

    close() {}
  }

  return {
    open(name, version) {
      const request = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onblocked: null,
        onerror: null,
        onsuccess: null
      };
      setTimeout(() => {
        let state = databases.get(name);
        const oldVersion = state ? state.version : 0;
        if (!state) {
          state = { version: version, stores: new Map() };
          databases.set(name, state);
        }
        if (version < oldVersion) {
          const error = new Error('Requested version is older.');
          error.name = 'VersionError';
          request.error = error;
          if (request.onerror) {
            request.onerror();
          }
          return;
        }
        request.result = new FakeDatabase(state);
        if (version > oldVersion) {
          state.version = version;
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ oldVersion: oldVersion, newVersion: version });
          }
        }
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
      }, 0);
      return request;
    },
    failNextWrite(errorName) {
      nextWriteError = errorName;
    },
    inspect(name, storeName) {
      const state = databases.get(name);
      const store = state && state.stores.get(storeName);
      return store ? Array.from(store.records.values(), clone) : [];
    },
    seedRecord(name, storeName, value) {
      const state = databases.get(name);
      const store = state && state.stores.get(storeName);
      if (!store) {
        throw new Error('Object store not found.');
      }
      store.records.set(String(value[store.keyPath]), clone(value));
    }
  };
}

module.exports = { createFakeIndexedDB };
