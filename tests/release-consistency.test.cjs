'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { metadata, validateVersionState, checkCandidate, checkArtifacts } = require('../tools/check-release.cjs');

const csv = (version = '0.2.1', status = 'development', commit = 'null') =>
  `const APP_VERSION = '${version}';\nconst APP_BUILD = Object.freeze({ status: '${status}', commit: ${commit} });\n`;
const history = '## 0.2.1 - 2026-09-14\n\nPublished workspaces.\n\n## 0.2.0 — Unreleased development work (never published)\n\nHistorical work.\n\n## 0.1.0 - 2026-09-09\n';
const development = '# Changelog\n\n## Unreleased\n\nFeature changes.\n\n' + history;
const release = '# Changelog\n\n## 0.3.0 - 2026-10-15\n\nNew release.\n\n' + history;

test('normal development keeps the last published product version and independent schema numbers', () => {
  const result = validateVersionState({ csvSource: csv() + 'const WORKSPACE_SCHEMA_VERSION = 16;\nconst LAYOUT_VERSION = 4;\n', changelog: development });
  assert.equal(result.version, '0.2.1');
  assert.equal(result.status, 'development');
  assert.equal(validateVersionState({ csvSource: csv('0.3.0'), changelog: development }).version, '0.3.0');
});

test('an explicit release candidate needs matching dated changelog metadata', () => {
  assert.equal(validateVersionState({ csvSource: csv('0.3.0', 'release'), changelog: release }).status, 'release');
  assert.throws(() => validateVersionState({ csvSource: csv('0.3.0', 'release'), changelog: development }), /first changelog section/);
  assert.throws(() => validateVersionState({ csvSource: csv('0.4.0', 'release'), changelog: release }), /0.4.0.*first changelog section/);
  assert.throws(() => validateVersionState({ csvSource: csv(), changelog: release }), /Development builds.*Unreleased/);
});

test('tags cannot describe development builds or a different product version', () => {
  assert.throws(() => validateVersionState({ csvSource: csv(), changelog: development, tag: 'v0.2.1' }), /requires APP_BUILD.status release/);
  assert.throws(() => validateVersionState({ csvSource: csv('0.3.0', 'release'), changelog: release, tag: 'v0.4.0' }), /does not match APP_VERSION/);
  assert.throws(() => validateVersionState({ csvSource: csv('0.3.0', 'release'), changelog: release, tag: 'v0.3.0-rc.1' }), /canonical stable SemVer/);
});

test('malformed versions, build identities and changelog entries fail with actionable messages', () => {
  for (const version of ['01.2.3', '1.2', '1.2.3-rc.1']) assert.throws(() => metadata(csv(version)), /APP_VERSION/);
  assert.throws(() => metadata(csv() + csv()), /one canonical APP_VERSION/);
  assert.throws(() => metadata(csv('0.3.0', 'unknown')), /APP_BUILD/);
  assert.throws(() => validateVersionState({ csvSource: csv('0.3.0', 'release', "'" + 'a'.repeat(40) + "'"), changelog: release }), /only packaging stamps/);
  assert.throws(() => validateVersionState({ csvSource: csv('0.3.0', 'release'), changelog: release.replace('2026-10-15', '2026-02-30') }), /Invalid changelog release date/);
  assert.throws(() => validateVersionState({ csvSource: csv('0.3.0', 'release'), changelog: release + '\n## 0.2.1 - 2026-09-14\n' }), /Duplicate dated changelog/);
  assert.throws(() => validateVersionState({ csvSource: csv('0.3.0', 'release'), changelog: release + '\n## 0.4.0 - 2026-09-14\n' }), /must be newer/);
});

function fixture(t) {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'openslotting-version-'));
  t.after(() => fs.rmSync(repository, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', repository, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'core.autocrlf', 'false');
  git('config', 'user.name', 'Synthetic Release Test');
  git('config', 'user.email', 'release@example.invalid');
  const commit = (source, log) => {
    fs.writeFileSync(path.join(repository, 'csv.js'), source);
    fs.writeFileSync(path.join(repository, 'CHANGELOG.md'), log);
    git('add', '.'); git('commit', '-qm', 'Synthetic candidate');
    return git('rev-parse', 'HEAD');
  };
  return { repository, git, commit };
}

test('Git candidates are read from their explicit commit, not a later dirty checkout', (t) => {
  const f = fixture(t);
  const commit = f.commit(csv(), development);
  f.commit(csv('0.3.0', 'release'), release);
  fs.writeFileSync(path.join(f.repository, 'csv.js'), 'dirty invalid source');
  const result = checkCandidate({ repository: f.repository, ref: commit });
  assert.equal(result.version, '0.2.1');
  assert.equal(result.commit, commit);
});

test('annotated and lightweight tags must identify the candidate; existing versions cannot move', (t) => {
  const f = fixture(t);
  const old = f.commit(csv(), development);
  f.git('tag', 'v0.2.1');
  const commit = f.commit(csv('0.3.0', 'release'), release);
  f.git('tag', '-a', 'v0.3.0', '-m', 'Synthetic release tag', commit);
  assert.equal(checkCandidate({ repository: f.repository, ref: commit, tag: 'v0.3.0' }).commit, commit);
  f.git('tag', '-f', 'v0.3.0', old);
  assert.throws(() => checkCandidate({ repository: f.repository, ref: commit, tag: 'v0.3.0' }), /published versions must not be reused/);
  f.git('tag', '-f', 'v0.3.0', commit);
  assert.equal(checkCandidate({ repository: f.repository, ref: commit, tag: 'v0.3.0' }).commit, commit);
  f.git('tag', '-d', 'v0.3.0');
  f.git('tag', 'v0.4.0', old);
  assert.throws(() => checkCandidate({ repository: f.repository, ref: commit }), /older than existing tag/);
});

test('CLI reports release inconsistencies and does not create tags or change files', (t) => {
  const f = fixture(t);
  const commit = f.commit(csv('0.3.0', 'release'), development);
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../tools/check-release.cjs'), '--repository', f.repository, '--commit', commit],
    { encoding: 'utf8', env: { ...process.env, GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'synthetic-test' } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Version consistency failed:.*first changelog section/);
  assert.equal(f.git('status', '--porcelain'), '');
  assert.equal(f.git('tag', '--list'), '');
});

test('CLI automatically validates the release tag supplied by GitHub Actions', (t) => {
  const f = fixture(t);
  const commit = f.commit(csv('0.3.0', 'release'), release);
  f.git('tag', 'v0.3.0', commit);
  const args = [path.resolve(__dirname, '../tools/check-release.cjs'), '--repository', f.repository, '--commit', commit];
  const env = { ...process.env, GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v0.3.0' };
  const success = spawnSync(process.execPath, args, { encoding: 'utf8', env });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /v0.3.0/);
  const mismatch = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...env, GITHUB_REF_NAME: 'v0.4.0' } });
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /Tag v0.4.0 does not match APP_VERSION/);
});

test('artifact validation checks manifest identity, actual ZIP hash and archived build metadata', (t) => {
  const f = fixture(t);
  const commit = f.commit(csv(), development);
  const candidate = checkCandidate({ repository: f.repository, ref: commit });
  const stem = `OpenSlotting-v${candidate.version}-${commit}`;
  const archive = path.join(f.repository, stem + '.zip');
  const manifestPath = path.join(f.repository, stem + '.candidate.json');
  const python = process.env.OPENSLOTTING_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const writeArchive = (source) => {
    execFileSync(python, ['-c', 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],"w") as z: z.writestr(sys.argv[2],sys.argv[3])', archive, 'OpenSlotting-v0.2.1/csv.js', source]);
    return createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  };
  const manifest = { candidateCommit: commit, productVersion: candidate.version, buildStatus: candidate.status,
    archive: stem + '.zip', archiveSha256: writeArchive(csv('0.2.1', 'development', "'" + commit + "'")) };
  const save = (data) => fs.writeFileSync(manifestPath, JSON.stringify(data));
  save(manifest);
  assert.equal(checkArtifacts(candidate, f.repository).candidateCommit, commit);
  for (const [key, wrong] of Object.entries({ candidateCommit: 'a'.repeat(40), productVersion: '0.3.0', buildStatus: 'release', archive: '../wrong.zip', archiveSha256: '0'.repeat(64) })) {
    save({ ...manifest, [key]: wrong });
    assert.throws(() => checkArtifacts(candidate, f.repository), new RegExp(key));
  }
  for (const source of [csv('0.3.0', 'development', "'" + commit + "'"), csv('0.2.1', 'release', "'" + commit + "'"), csv('0.2.1', 'development', "'" + 'b'.repeat(40) + "'")]) {
    save({ ...manifest, archiveSha256: writeArchive(source) });
    assert.throws(() => checkArtifacts(candidate, f.repository), /Archived APP_VERSION\/APP_BUILD/);
  }
});
