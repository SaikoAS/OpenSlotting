const assert = require('node:assert/strict');
const test = require('node:test');
const workspaces = require('../workspace.js');

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('workspaces persist independently and retain bigint analysis values', () => {
  const storage = memoryStorage();
  const repository = new workspaces.Repository(storage);
  const first = repository.create('First', { files: [{ name: 'a.csv' }], analysis: { quantity: 7n } });
  const second = repository.create('Second', { files: [{ name: 'b.csv' }] });
  repository.save(first.id, { files: [{ name: 'changed.csv' }], analysis: { quantity: 9n } });

  const reopened = new workspaces.Repository(storage).load();
  assert.equal(reopened.selectedId, second.id);
  assert.deepEqual(reopened.workspaces.find((item) => item.id === first.id).data,
    { files: [{ name: 'changed.csv' }], analysis: { quantity: 9n } });
  assert.deepEqual(reopened.workspaces.find((item) => item.id === second.id).data, { files: [{ name: 'b.csv' }] });
});

test('backup round trip restores as new without changing existing workspaces', () => {
  const repository = new workspaces.Repository(memoryStorage());
  const original = repository.create('Period A', { mappings: { article: 2 }, issues: [{ line: 4 }] });
  const untouched = repository.create('Untouched', { marker: true });
  const restored = repository.restore(repository.export(original.id), {});
  const store = repository.load();

  assert.notEqual(restored.id, original.id);
  assert.deepEqual(restored.data, original.data);
  assert.deepEqual(store.workspaces.find((item) => item.id === untouched.id).data, { marker: true });
  assert.equal(store.workspaces.length, 3);
});

test('replacement restore affects only the explicit target and never merges data', () => {
  const repository = new workspaces.Repository(memoryStorage());
  const source = repository.create('Source', { onlySource: true });
  const target = repository.create('Target name', { stale: true });
  const other = repository.create('Other', { untouched: true });
  repository.restore(repository.export(source.id), { replaceId: target.id });
  const store = repository.load();

  const replaced = store.workspaces.find((item) => item.id === target.id);
  assert.equal(replaced.name, 'Target name');
  assert.deepEqual(replaced.data, { onlySource: true });
  assert.deepEqual(store.workspaces.find((item) => item.id === other.id).data, { untouched: true });
  assert.equal(store.workspaces.length, 3);
});

test('invalid, truncated and unsupported backups leave storage unchanged', () => {
  const repository = new workspaces.Repository(memoryStorage());
  repository.create('Safe', { safe: true });
  const before = repository.export(repository.load().selectedId);
  assert.throws(() => repository.restore('{', {}), /INVALID_BACKUP/);
  assert.throws(() => repository.restore(JSON.stringify({ kind: workspaces.BACKUP_KIND, schemaVersion: 99 }), {}), /UNSUPPORTED_BACKUP/);
  assert.equal(repository.export(repository.load().selectedId).replace(/"exportedAt": ".*?"/, '"exportedAt": "x"'), before.replace(/"exportedAt": ".*?"/, '"exportedAt": "x"'));
});

test('schema zero storage migrates in place and quota failures are explicit', () => {
  const storage = memoryStorage();
  storage.setItem(workspaces.STORAGE_KEY, JSON.stringify({ schemaVersion: 0, selectedId: 'old', workspaces: [{ id: 'old', name: 'Legacy', data: { value: 1 } }] }));
  const migrated = new workspaces.Repository(storage).load();
  assert.equal(migrated.schemaVersion, workspaces.SCHEMA_VERSION);
  assert.ok(migrated.workspaces[0].createdAt);

  const quota = new workspaces.Repository({ getItem: () => null, setItem: () => { const error = new Error(); error.name = 'QuotaExceededError'; throw error; } });
  assert.throws(() => quota.create('Full', {}), /STORAGE_QUOTA/);
});
