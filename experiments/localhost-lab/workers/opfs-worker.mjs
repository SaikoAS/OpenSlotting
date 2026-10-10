let handle;
let root;
let namespace;
self.onmessage = async ({ data }) => {
  const { id, command } = data;
  try {
    let value = null;
    if (command === 'open') {
      if (!/^openslotting-lab-[a-f0-9-]+$/.test(data.namespace)) throw new TypeError('Invalid namespace');
      namespace = data.namespace;
      root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(namespace, { create: true });
      const file = await directory.getFileHandle('source.bin', { create: true });
      handle = await file.createSyncAccessHandle();
    } else if (command === 'write') {
      const bytes = new Uint8Array(data.bytes);
      handle.truncate(bytes.length);
      let offset = 0;
      while (offset < bytes.length) {
        const written = handle.write(bytes.subarray(offset), { at: offset });
        if (written <= 0) throw new Error('OPFS made no write progress');
        offset += written;
      }
      handle.flush();
    } else if (command === 'read') {
      const bytes = new Uint8Array(handle.getSize());
      let offset = 0;
      while (offset < bytes.length) {
        const count = handle.read(bytes.subarray(offset), { at: offset });
        if (count <= 0) throw new Error('OPFS made no read progress');
        offset += count;
      }
      value = bytes.buffer;
    } else if (command === 'cleanup') {
      handle?.close();
      handle = null;
      await root.removeEntry(namespace, { recursive: true });
    } else throw new Error('Unknown OPFS command');
    self.postMessage({ id, value }, value instanceof ArrayBuffer ? [value] : []);
  } catch (error) { self.postMessage({ id, error: error.message }); }
};
