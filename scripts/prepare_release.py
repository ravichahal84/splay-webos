#!/usr/bin/env python3
"""Build a Homebrew Channel manifest for an officially packaged webOS IPK."""
import argparse
import hashlib
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--ipk', required=True, type=Path)
parser.add_argument('--repo', required=True)
parser.add_argument('--tag')
args = parser.parse_args()

info = json.loads(Path('app/appinfo.json').read_text())
appid = info['id']
version = info['version']
assert args.ipk.is_file(), f'IPK not found: {args.ipk}'
assert args.ipk.name == f'{appid}_{version}_all.ipk', f'Unexpected package filename: {args.ipk.name}'
assert re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo), 'Invalid GitHub repository name'
tag = args.tag or f'v{version}'
assert tag == f'v{version}', f'Tag must match app version: v{version}'

data = args.ipk.read_bytes()
manifest = {
    'id': appid,
    'version': version,
    'type': 'web',
    'title': info['title'],
    'appDescription': 'Experimental Alder-inspired Stremio client. HTTPS direct play only. Hardware testing required.',
    'iconUri': f'https://raw.githubusercontent.com/{args.repo}/main/app/largeIcon.png',
    'sourceUrl': f'https://github.com/{args.repo}',
    'rootRequired': False,
    'ipkUrl': f'https://github.com/{args.repo}/releases/download/{tag}/{args.ipk.name}',
    'ipkHash': {'sha256': hashlib.sha256(data).hexdigest()},
    'ipkSize': len(data)
}

out = args.ipk.parent / f'{appid}.manifest.json'
out.write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Created {out} for {appid} v{version}')
