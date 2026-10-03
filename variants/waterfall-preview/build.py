#!/usr/bin/env python3
"""Compatibility entry point; one Node builder owns asset and resume embedding."""
from pathlib import Path
import subprocess
subprocess.run(['node', str(Path(__file__).resolve().parent / 'build.cjs')], check=True)
