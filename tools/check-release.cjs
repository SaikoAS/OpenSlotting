'use strict';

// Contributor/CI tool only. It is neither shipped nor required by the app or packager.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const VERSION = '(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)';
const versionPattern = new RegExp('^' + VERSION + '$');
const tagPattern = new RegExp('^v(' + VERSION + ')$');

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function metadata(source) {
  const versions = [...source.matchAll(/^\s*const APP_VERSION = '([^']+)';/gm)];
  const builds = [...source.matchAll(/^\s*const APP_BUILD = Object\.freeze\(\{ status: '([^']+)', commit: (null|'[^']+') \}\);/gm)];
  requireCondition(versions.length === 1 && versionPattern.test(versions[0][1]),
    'csv.js must define one canonical APP_VERSION (stable SemVer X.Y.Z, without leading zeros).');
  requireCondition(builds.length === 1 && ['development', 'release'].includes(builds[0][1]),
    'csv.js must define one APP_BUILD with development or release status.');
  const commit = builds[0][2] === 'null' ? null : builds[0][2].slice(1, -1);
  return { version: versions[0][1], status: builds[0][1], commit };
}

function compareVersions(left, right) {
  const a = left.split('.').map(BigInt);
  const b = right.split('.').map(BigInt);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function validateVersionState({ csvSource, changelog, tag = '', commit, releasedTags = [] }) {
  const build = metadata(csvSource);
  requireCondition(build.commit === null, 'Committed APP_BUILD.commit must be null; only packaging stamps CandidateCommit.');
  const headings = [...changelog.matchAll(/^## ([^\r\n]+)\r?$/gm)].map((match) => match[1]);
  const dated = new RegExp('^(' + VERSION + ') - ([0-9]{4}-[0-9]{2}-[0-9]{2})$');
  const releases = headings.map((heading) => heading.match(dated)).filter(Boolean);
  const versions = new Set();
  for (const release of releases) {
    requireCondition(!versions.has(release[1]), 'Duplicate dated changelog version: ' + release[1]);
    versions.add(release[1]);
    const date = new Date(release[2] + 'T00:00:00Z');
    requireCondition(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === release[2],
      'Invalid changelog release date: ' + release[2]);
  }
  if (tag) {
    requireCondition(tagPattern.test(tag), 'Release tag must be vX.Y.Z with a canonical stable SemVer version.');
    requireCondition(tag === 'v' + build.version, `Tag ${tag} does not match APP_VERSION ${build.version}.`);
    requireCondition(build.status === 'release', 'A release tag requires APP_BUILD.status release, not development.');
  }
  for (const published of releasedTags) {
    requireCondition(compareVersions(build.version, published.version) >= 0,
      `Product version ${build.version} is older than existing tag v${published.version}.`);
  }
  if (build.status === 'development') {
    requireCondition(headings[0] === 'Unreleased', 'Development builds must keep Unreleased as the first changelog section.');
  } else {
    const current = headings[0]?.match(dated);
    requireCondition(current && current[1] === build.version,
      `Release build ${build.version} requires the first changelog section to be "## ${build.version} - YYYY-MM-DD", not Unreleased.`);
    for (const release of releases.slice(1)) {
      requireCondition(compareVersions(build.version, release[1]) > 0,
        `Release version ${build.version} must be newer than changelog release ${release[1]}.`);
    }
    for (const published of releasedTags) {
      requireCondition(build.version !== published.version || commit === published.commit,
        `Existing tag v${build.version} points to another commit; published versions must not be reused.`);
    }
  }
  return build;
}

function git(repository, ...args) {
  return execFileSync('git', ['-C', repository, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}

function checkCandidate({ repository, ref = 'HEAD', tag = '' }) {
  const commit = git(repository, 'rev-parse', '--verify', '--end-of-options', ref + '^{commit}').trim();
  const csvSource = git(repository, 'show', commit + ':csv.js');
  const changelog = git(repository, 'show', commit + ':CHANGELOG.md');
  const releasedTags = git(repository, 'tag', '--list', 'v*').trim().split(/\r?\n/).filter((name) => tagPattern.test(name))
    .map((name) => ({ version: name.slice(1), commit: git(repository, 'rev-parse', 'refs/tags/' + name + '^{commit}').trim() }));
  const build = validateVersionState({ csvSource, changelog, commit, tag, releasedTags });
  if (tag) {
    const taggedCommit = git(repository, 'rev-parse', '--verify', 'refs/tags/' + tag + '^{commit}').trim();
    requireCondition(taggedCommit === commit, `Tag ${tag} does not point to CandidateCommit ${commit}.`);
  }
  return { ...build, commit };
}

function findPython({ platform = process.platform, override = process.env.OPENSLOTTING_PYTHON, exec = execFileSync } = {}) {
  // Match the Windows launcher's preference and minimum supported version.
  // An explicit override names one executable, never a shell command string.
  const candidates = override
    ? [{ command: override, prefix: platform === 'win32' && /^py(?:\.exe)?$/i.test(path.win32.basename(override)) ? ['-3'] : [] }]
    : platform === 'win32'
      ? [{ command: 'py.exe', prefix: ['-3'] }, { command: 'python.exe', prefix: [] }]
      : [{ command: 'python3', prefix: [] }];
  for (const candidate of candidates) {
    try {
      exec(candidate.command, [...candidate.prefix, '-c', 'import sys; raise SystemExit(0 if sys.version_info >= (3, 8) else 1)'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // Missing launchers, Store aliases and unsupported versions may fall back.
    }
  }
  throw new Error('Python 3.8 or newer was not found for ZIP inspection. Tried ' +
    candidates.map(({ command, prefix }) => [command, ...prefix].join(' ')).join(', ') +
    '. Set OPENSLOTTING_PYTHON to an approved Python executable path.');
}

function checkArtifacts(candidate, directory) {
  const stem = `OpenSlotting-v${candidate.version}-${candidate.commit}`;
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, stem + '.candidate.json'), 'utf8'));
  for (const [key, expected] of Object.entries({ candidateCommit: candidate.commit, productVersion: candidate.version,
    buildStatus: candidate.status, archive: stem + '.zip' })) {
    requireCondition(manifest[key] === expected, `Candidate manifest ${key} must equal ${expected}.`);
  }
  const archivePath = path.join(directory, manifest.archive);
  const hash = createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
  requireCondition(manifest.archiveSha256 === hash, 'Candidate manifest archiveSha256 does not match the ZIP bytes.');
  const entryName = `OpenSlotting-v${candidate.version}/csv.js`;
  const script = 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n' +
    ' assert z.namelist().count(sys.argv[2]) == 1, "ZIP must contain one csv.js entry"\n' +
    ' sys.stdout.buffer.write(z.read(sys.argv[2]))\n';
  const python = findPython();
  const source = execFileSync(python.command,
    [...python.prefix, '-c', script, archivePath, entryName], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const archived = metadata(source);
  requireCondition(archived.version === candidate.version && archived.status === candidate.status && archived.commit === candidate.commit,
    'Archived APP_VERSION/APP_BUILD does not match CandidateCommit and its manifest.');
  return manifest;
}

function main(args) {
  const options = { repository: path.resolve(__dirname, '..'), ref: 'HEAD', tag: '' };
  let artifacts;
  for (let index = 0; index < args.length; index += 2) {
    const key = { '--commit': 'ref', '--repository': 'repository', '--tag': 'tag', '--artifacts': 'artifacts' }[args[index]];
    requireCondition(key && args[index + 1], 'Usage: node tools/check-release.cjs [--commit REF] [--tag vX.Y.Z] [--artifacts DIRECTORY] [--repository PATH]');
    if (key === 'artifacts') artifacts = args[index + 1];
    else options[key] = args[index + 1];
  }
  if (!options.tag && process.env.GITHUB_REF_TYPE === 'tag') options.tag = process.env.GITHUB_REF_NAME || '';
  const candidate = checkCandidate(options);
  if (artifacts) checkArtifacts(candidate, artifacts);
  process.stdout.write(`Version consistency OK: ${candidate.version}, ${candidate.status}, ${candidate.commit}${options.tag ? ', ' + options.tag : ''}${artifacts ? ', ZIP/manifest verified' : ''}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write('Version consistency failed: ' + error.message + '\n'); process.exitCode = 1; }
}
module.exports = { metadata, compareVersions, validateVersionState, checkCandidate, checkArtifacts, findPython };
