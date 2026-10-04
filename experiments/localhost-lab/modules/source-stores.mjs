// Raw-byte storage candidates only. Not a replacement for atomic workspace persistence.
function assertNamespace(namespace) {
  if (!/^openslotting-lab-[a-f0-9-]+$/.test(namespace)) throw new TypeError('Invalid laboratory namespace');
}

function transaction(database, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction('bytes', mode);
    const request = action(tx.objectStore('bytes'));
    let value;
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(tx.error || request.error || new Error('Storage transaction aborted'));
    tx.onerror = () => {};
  });
}

export async function openIndexedDBSourceStore(namespace) {
  assertNamespace(namespace);
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(namespace, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('bytes');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Laboratory database blocked'));
  });
  return {
    write: bytes => transaction(database, 'readwrite', store => store.put(bytes, 'source')),
    read: () => transaction(database, 'readonly', store => store.get('source')),
    async cleanup() {
      database.close();
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(namespace);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Laboratory cleanup blocked'));
      });
    }
  };
}

export async function openAsyncOpfsSourceStore(namespace) {
  assertNamespace(namespace);
  const root = await navigator.storage.getDirectory();
  const directory = await root.getDirectoryHandle(namespace, { create: true });
  const file = await directory.getFileHandle('source.bin', { create: true });
  return {
    async write(bytes) {
      const stream = await file.createWritable();
      try { await stream.write(bytes); await stream.close(); }
      catch (error) { await stream.abort().catch(() => {}); throw error; }
    },
    async read() { return (await file.getFile()).arrayBuffer(); },
    cleanup: () => root.removeEntry(namespace, { recursive: true })
  };
}

export async function openSyncOpfsSourceStore(namespace) {
  assertNamespace(namespace);
  const worker = new Worker(new URL('../workers/opfs-worker.mjs', import.meta.url), { type: 'module' });
  let serial = 0;
  const pending = new Map();
  const failAll = error => {
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
    worker.terminate();
  };
  worker.onmessage = event => {
    const result = event.data;
    const entry = pending.get(result.id);
    if (!entry) return;
    pending.delete(result.id);
    clearTimeout(entry.timer);
    if (result.error) entry.reject(new Error(result.error)); else entry.resolve(result.value);
  };
  worker.onerror = event => failAll(new Error(event.message || 'OPFS worker failed'));
  const call = (command, bytes) => new Promise((resolve, reject) => {
    if (command === 'write' && !(bytes instanceof ArrayBuffer)) { reject(new TypeError('Source bytes must be an ArrayBuffer')); return; }
    const id = ++serial;
    const timer = setTimeout(() => failAll(new Error('OPFS timeout')), 60000);
    pending.set(id, { resolve, reject, timer });
    // Transfer a caller-owned copy; never detach a workspace's durable source bytes.
    const copy = bytes?.slice(0);
    try { worker.postMessage({ id, command, namespace, bytes: copy }, copy ? [copy] : []); }
    catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
  });
  try { await call('open'); }
  catch (error) { worker.terminate(); throw error; }
  return {
    write: bytes => call('write', bytes),
    read: () => call('read'),
    async cleanup() { try { await call('cleanup'); } finally { worker.terminate(); } }
  };
}
