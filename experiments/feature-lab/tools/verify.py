"""Read-only lab scope/link/source verification; creates only its report."""
import ast
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[3]
LAB = ROOT / 'experiments' / 'feature-lab'
BASELINE = '59525a447004396b47747f587c7ba14511357719'


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args]).decode('utf-8').strip()


def verify():
    tracked = git('ls-files').splitlines()
    extensions = {'.js', '.css', '.html', '.ico', '.cmd', '.ps1', '.psm1', '.py'}
    runtime = [name for name in tracked if '/' not in name and Path(name).suffix in extensions]
    assert len(runtime) == 37, 'Update the expected production scope explicitly if it changes'
    source_hashes = {}
    comparison = {}
    for name in runtime:
        worktree = (ROOT / name).read_bytes()
        baseline = subprocess.check_output(['git', '-C', str(ROOT), 'show', BASELINE + ':' + name])
        exact = worktree == baseline
        assert exact or (Path(name).suffix != '.ico' and worktree.replace(b'\r\n', b'\n') == baseline.replace(b'\r\n', b'\n')), name
        comparison[name] = 'byte-equal' if exact else 'line-endings-only'
        source_hashes[name] = hashlib.sha256(worktree).hexdigest()
    allowed_changes = {'docs/architecture.md', 'docs/project-structure-plan.md', 'experiments/localhost-lab/README.md'}
    changed = git('diff', '--name-only', BASELINE).splitlines()
    assert all(name in allowed_changes or name.startswith('experiments/feature-lab/') for name in changed), changed
    html = (ROOT / 'index.html').read_text('utf-8-sig')
    assert 'feature-lab' not in html and 'localhost-lab' not in html
    tree = ast.parse((ROOT / 'Start-OpenSlotting-Localhost.py').read_text('utf-8-sig'))
    allowed_assets = next(ast.literal_eval(node.value.args[0]) for node in tree.body
                          if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'RUNTIME_FILES' for t in node.targets))
    assert all(not name.startswith('experiments/') for name in allowed_assets)
    package = (ROOT / 'tools' / 'package-release.ps1').read_text('utf-8-sig')
    section = package.split('$releaseFiles = @(', 1)[1].split('foreach ($relativePath in $releaseFiles)', 1)[0]
    package_files = re.findall(r"^\s*'([^']+)'", section, re.MULTILINE)
    assert len(package_files) == 55
    assert all(not name.startswith('experiments/') and not name.lower().endswith('.exe') for name in package_files)
    docs = {ROOT / name for name in tracked if name.endswith('.md')}
    docs.update(LAB.rglob('*.md'))
    links = []
    for path in sorted(docs):
        for target in re.findall(r'\]\(([^)]+)\)', path.read_text('utf-8-sig')):
            target = target.split('#', 1)[0]
            if not target or ':' in target or target.startswith('/'):
                continue
            resolved = path.parent / unquote(target)
            links.append({'source': path.relative_to(ROOT).as_posix(), 'target': target, 'exists': resolved.exists()})
    assert all(link['exists'] for link in links), [link for link in links if not link['exists']]
    lab_sources = {}
    for path in sorted(LAB.rglob('*')):
        if path.is_file() and path.suffix in {'.cjs', '.mjs', '.py', '.html', '.css'} and '__pycache__' not in path.parts:
            lab_sources[path.relative_to(LAB).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return {'verifiedUtc': datetime.now(timezone.utc).isoformat(), 'baselineCommit': BASELINE,
            'branch': git('branch', '--show-current'), 'productionFilesUnchanged': len(runtime),
            'comparison': comparison,
            'productionWorktreeSha256': source_hashes, 'productionHttpAssets': len(allowed_assets),
            'packageFileCount': len(package_files), 'experimentsServedByProduction': False,
            'experimentsPackaged': False, 'newExecutableOrPackageDependency': False,
            'localMarkdownLinks': links, 'labSourceSha256': lab_sources,
            'scope': 'isolated experiments; no application integration or data migration'}


if __name__ == '__main__':
    result = verify()
    destination = LAB / 'results' / 'scope-verification.json'
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'productionFilesUnchanged': result['productionFilesUnchanged'],
                      'packageFileCount': result['packageFileCount'],
                      'checkedLinks': len(result['localMarkdownLinks']), 'report': str(destination)}))
