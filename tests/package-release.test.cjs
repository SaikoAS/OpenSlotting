'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const repository = path.resolve(__dirname, '..');
const pwsh = process.env.OPENSLOTTING_PWSH || 'pwsh';
const hasPowerShell = spawnSync(pwsh, ['-NoProfile', '-Command', 'exit 0']).status === 0;

test('packaging stamps the selected commit, preserves assets and creates fresh acceptance evidence',
  { skip: !hasPowerShell && 'PowerShell 7 unavailable; packaging is also required in CI' }, async (t) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'openslotting-package-'));
    t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const fixture = path.join(temporary, 'repository');
    fs.mkdirSync(fixture);
    const source = fs.readFileSync(path.join(repository, 'tools/package-release.ps1'), 'utf8');
    const fileList = source.match(/\$releaseFiles = @\(([\s\S]*?)\n\)/)[1];
    const files = [...fileList.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    files.push('tools/package-release.ps1');
    for (const name of files) {
      fs.mkdirSync(path.dirname(path.join(fixture, name)), { recursive: true });
      fs.copyFileSync(path.join(repository, name), path.join(fixture, name));
    }
    const csvPath = path.join(fixture, 'csv.js');
    fs.writeFileSync(csvPath, fs.readFileSync(csvPath, 'utf8').replace(/const APP_VERSION = '[^']+';/, "const APP_VERSION = '9.8.7';"));
    const git = (...args) => execFileSync('git', ['-C', fixture, ...args], { encoding: 'utf8' }).trim();
    git('init', '-q');
    git('config', 'user.name', 'Synthetic Packaging Test');
    git('config', 'user.email', 'packaging@example.invalid');
    git('add', '.');
    git('commit', '-qm', 'Synthetic development candidate');
    const candidate = git('rev-parse', 'HEAD');
    const candidateCsv = fs.readFileSync(csvPath, 'utf8');
    // A later commit and dirty working tree must never leak into CandidateCommit.
    fs.appendFileSync(path.join(fixture, 'index.html'), '\n<!-- synthetic later commit -->\n');
    git('add', '.');
    git('commit', '-qm', 'Synthetic later commit');
    const laterCandidate = git('rev-parse', 'HEAD');
    fs.writeFileSync(csvPath, 'invalid dirty working tree');
    const output = path.join(temporary, 'output');
    const result = execFileSync(pwsh, ['-NoProfile', '-File', path.join(fixture, 'tools/package-release.ps1'),
      '-CandidateCommit', candidate, '-OutputDirectory', output], { encoding: 'utf8' });
    assert.match(result, new RegExp(candidate));
    const candidateName = `OpenSlotting-v9.8.7-${candidate}`;
    const archivePath = path.join(output, `${candidateName}.zip`);
    const manifest = JSON.parse(fs.readFileSync(path.join(output, `${candidateName}.candidate.json`), 'utf8'));
    assert.equal(manifest.candidateCommit, candidate);
    assert.equal(manifest.productVersion, '9.8.7');
    assert.equal(manifest.buildStatus, 'development');
    assert.equal(manifest.archiveSha256, require('node:crypto').createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex'));
    const extractScript = path.join(temporary, 'extract.ps1');
    fs.writeFileSync(extractScript, 'param($Archive, $Destination)\nExpand-Archive -LiteralPath $Archive -DestinationPath $Destination\n');
    const extracted = path.join(temporary, 'extracted');
    execFileSync(pwsh, ['-NoProfile', '-File', extractScript, archivePath, extracted]);
    const root = path.join(extracted, 'OpenSlotting-v9.8.7');
    const packagedCsv = fs.readFileSync(path.join(root, 'csv.js'), 'utf8');
    assert.equal(packagedCsv, candidateCsv.replace('commit: null', `commit: '${candidate}'`));
    const context = { module: { exports: {} } };
    vm.runInNewContext(packagedCsv, context);
    assert.equal(context.module.exports.APP_VERSION, '9.8.7');
    assert.equal(context.module.exports.APP_BUILD.commit, candidate);
    assert.equal(context.module.exports.APP_BUILD.status, 'development');
    for (const name of files.filter((name) => name !== 'csv.js' && name !== 'tools/package-release.ps1')) {
      const expected = execFileSync('git', ['-C', fixture, 'show', `${candidate}:${name}`]);
      assert.deepEqual(fs.readFileSync(path.join(root, name)), expected, name);
    }
    assert.equal(fs.readFileSync(csvPath, 'utf8'), 'invalid dirty working tree');
    assert.equal(fs.existsSync(path.join(root, 'tools')), false);
    const recordPath = path.join(output, `${candidateName}.acceptance.md`);
    const record = fs.readFileSync(recordPath, 'utf8');
    assert.ok(record.includes(candidate));
    assert.ok(record.includes(manifest.archiveSha256));
    assert.match(record, /Decision: PENDING/);
    assert.match(record, /Python version and path \| NOT RECORDED/);
    assert.match(record, /Create a shelf rack.*\| NOT RUN/);
    assert.match(record, /External network access is disabled.*\| NOT RUN/);
    assert.doesNotMatch(record, /Historical source-branch evidence|257 passed/);
    const warehouseChecks = fs.readFileSync(path.join(root, 'docs/acceptance-warehouse-workflow.md'), 'utf8')
      .split('## Required manual checks in the current localhost runtime')[1].split('\n## ')[0];
    const expectedChecks = ['acceptance-localhost.md', 'acceptance-workspaces.md', 'acceptance-period-comparison.md']
      .reduce((sum, name) => sum + (fs.readFileSync(path.join(root, 'docs', name), 'utf8').match(/^(?:-|\d+\.) \[ \] /gm) || []).length,
        (warehouseChecks.match(/^\d+\. /gm) || []).length);
    assert.equal((record.match(/\| NOT RUN \|/g) || []).length, expectedChecks);
    fs.appendFileSync(recordPath, '\nSynthetic tester annotation: retain this record.\n');
    execFileSync(pwsh, ['-NoProfile', '-File', path.join(fixture, 'tools/package-release.ps1'),
      '-CandidateCommit', candidate, '-OutputDirectory', output]);
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex'), manifest.archiveSha256);
    assert.match(fs.readFileSync(recordPath, 'utf8'), /Synthetic tester annotation/);

    const packageCandidate = (commit, directory) => execFileSync(pwsh,
      ['-NoProfile', '-File', path.join(fixture, 'tools/package-release.ps1'),
        '-CandidateCommit', commit, '-OutputDirectory', directory], { encoding: 'utf8', stdio: 'pipe' });
    const fileHash = (name) => createHash('sha256').update(fs.readFileSync(name)).digest('hex');
    const snapshot = (directory) => Object.fromEntries(fs.readdirSync(directory).sort()
      .map((name) => [name, fileHash(path.join(directory, name))]));

    await t.test('two commits with the same version retain their own archives and evidence', () => {
      const directory = path.join(temporary, 'multiple-candidates');
      packageCandidate(candidate, directory);
      const firstFiles = snapshot(directory);
      const firstManifest = JSON.parse(fs.readFileSync(path.join(directory, `${candidateName}.candidate.json`), 'utf8'));
      packageCandidate(laterCandidate, directory);
      const secondManifest = JSON.parse(fs.readFileSync(path.join(directory,
        `OpenSlotting-v9.8.7-${laterCandidate}.candidate.json`), 'utf8'));
      assert.notEqual(firstManifest.archive, secondManifest.archive);
      assert.equal(firstManifest.archive, `${candidateName}.zip`);
      assert.equal(secondManifest.archive, `OpenSlotting-v9.8.7-${laterCandidate}.zip`);
      for (const [name, checksum] of Object.entries(firstFiles)) {
        assert.equal(fileHash(path.join(directory, name)), checksum, name);
      }
      for (const manifest of [firstManifest, secondManifest]) {
        assert.equal(require('node:crypto').createHash('sha256')
          .update(fs.readFileSync(path.join(directory, manifest.archive))).digest('hex'), manifest.archiveSha256);
      }
    });

    await t.test('a changed ZIP checksum preserves every existing artifact before failing', () => {
      const directory = path.join(temporary, 'checksum-mismatch');
      packageCandidate(candidate, directory);
      const acceptancePath = path.join(directory, `${candidateName}.acceptance.md`);
      fs.appendFileSync(acceptancePath, '\nSynthetic accepted evidence: must not be changed.\n');
      const originalFiles = snapshot(directory);
      const scriptPath = path.join(fixture, 'tools/package-release.ps1');
      const originalScript = fs.readFileSync(scriptPath, 'utf8');
      const compressionCall = '$archive.CreateEntry($entryName)';
      assert.ok(originalScript.includes(compressionCall));
      fs.writeFileSync(scriptPath, originalScript.replace(compressionCall,
        '$archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::NoCompression)'));
      try {
        const changedOutput = path.join(temporary, 'changed-compression');
        packageCandidate(candidate, changedOutput);
        const changedManifest = JSON.parse(fs.readFileSync(path.join(changedOutput, `${candidateName}.candidate.json`), 'utf8'));
        assert.notEqual(changedManifest.archiveSha256, manifest.archiveSha256, 'Fixture must actually change the ZIP checksum');
        assert.throws(() => packageCandidate(candidate, directory), /different ZIP checksum/);
        assert.deepEqual(snapshot(directory), originalFiles, 'ZIP, manifest, evidence and directory contents must remain intact');

        // If publishing the manifest fails after the ZIP replacement, restore
        // the previous ZIP and leave the blocking path and absent record intact.
        const blockedOutput = path.join(temporary, 'blocked-publication');
        const oldArchive = path.join(blockedOutput, `${candidateName}.zip`);
        const blockedManifest = path.join(blockedOutput, `${candidateName}.candidate.json`);
        fs.mkdirSync(blockedOutput);
        fs.copyFileSync(archivePath, oldArchive);
        fs.mkdirSync(blockedManifest);
        fs.writeFileSync(path.join(blockedManifest, 'synthetic-marker'), 'preserve this directory');
        const originalArchiveHash = fileHash(oldArchive);
        assert.throws(() => packageCandidate(candidate, blockedOutput));
        assert.equal(fileHash(oldArchive), originalArchiveHash);
        assert.equal(fs.readFileSync(path.join(blockedManifest, 'synthetic-marker'), 'utf8'), 'preserve this directory');
        assert.deepEqual(fs.readdirSync(blockedOutput).sort(), [`${candidateName}.candidate.json`, `${candidateName}.zip`]);
      } finally {
        fs.writeFileSync(scriptPath, originalScript);
      }
    });
  });
