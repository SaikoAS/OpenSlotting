"""Inventory project files without changing them or reading user workspace data."""
import argparse
import ast
import collections
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def audit():
    tracked = set(subprocess.check_output(
        ['git', '-C', str(ROOT), 'ls-files', '-z']).decode().split('\0')) - {''}
    files = []
    links = []
    for path in sorted(ROOT.rglob('*')):
        relative = path.relative_to(ROOT).as_posix()
        if relative == '.git' or relative.startswith('.git/') or relative == 'experiments/localhost-lab/results/project-inventory.json' or not path.is_file():
            continue
        data = path.read_bytes()
        category = ('experiment' if relative.startswith('experiments/') else
                    'generated' if relative.startswith(('dist/', '__pycache__/')) else
                    'documentation' if path.suffix == '.md' else
                    'test' if relative.startswith(('tests/', 'test-data/')) else
                    'tool' if relative.startswith(('tools/', '.github/')) else 'runtime')
        record = dict(path=relative, bytes=len(data), tracked=relative in tracked,
                      category=category, sha256=hashlib.sha256(data).hexdigest())
        if relative in tracked and path.suffix in ('.js', '.cjs', '.ps1', '.psm1', '.py', '.md', '.html', '.css'):
            text = data.decode('utf-8-sig')
            record['lines'] = len(text.splitlines())
            if path.suffix == '.md':
                for target in re.findall(r'\]\(([^)]+)\)', text):
                    target = target.split('#', 1)[0]
                    if not target or ':' in target or target.startswith('/'):
                        continue
                    links.append(dict(source=relative, target=target,
                                      exists=(path.parent / target).exists()))
        files.append(record)
    tree = ast.parse((ROOT / 'Start-OpenSlotting-Localhost.py').read_text('utf-8'))
    python_imports = sorted({node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)} |
                            {alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names})
    return dict(commit=subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD']).decode().strip(),
                branch=subprocess.check_output(['git', '-C', str(ROOT), 'branch', '--show-current']).decode().strip(),
                excluded='.git internals; browser IndexedDB/OPFS are outside this folder',
                files=files, counts=dict(collections.Counter(f['category'] for f in files)),
                localMarkdownLinks=links, pythonImports=python_imports)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = json.dumps(audit(), ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report, encoding='utf-8')
    else:
        print(report)
