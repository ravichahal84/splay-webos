#!/usr/bin/env python3
"""Local webOS build helper; does not publish anything."""
import subprocess
from pathlib import Path

Path('dist').mkdir(exist_ok=True)
subprocess.run(['node', 'tests/api.test.js'], check=True)
subprocess.run(['node', '--check', 'app/api.js'], check=True)
subprocess.run(['node', '--check', 'app/app.js'], check=True)
subprocess.run(['ares-package', '-o', 'dist', 'app'], check=True)
