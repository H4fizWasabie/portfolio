#!/usr/bin/env python3
"""Build a self-contained, offline motion prototype. No production reads."""
import base64
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = {
    'FONT': ('epilogue.ttf', 'font/ttf'),
    'WATERFALL': ('waterfall.webp', 'image/webp'),
    'MASK': ('water-matte.png', 'image/png'),
    'FLOW': ('tier-flow.png', 'image/png'),
    'DETAIL': ('water-detail.png', 'image/png'),
    'PROCURA': ('procura-inventory.webp', 'image/webp'),
    'THEOSES': ('theoses-report.webp', 'image/webp'),
    'MAP': ('map-overview.webp', 'image/webp'),
}
html = (ROOT / 'preview.html').read_text()
resume = json.loads(subprocess.check_output(['node', str(ROOT.parents[1] / 'resume' / 'preview.cjs')], text=True))
for token, value in [('RESUME_CSS', resume['css']), ('RESUME_HTML', resume['html']), ('RESUME_PDF', resume['pdfData'])]:
    marker = '__' + token + '__'
    assert marker in html, marker
    html = html.replace(marker, value)
for token, (name, mime) in ASSETS.items():
    marker = '__' + token + '__'
    assert marker in html, marker
    encoded = base64.b64encode((ROOT / 'assets' / name).read_bytes()).decode()
    html = html.replace(marker, f'data:{mime};base64,{encoded}')
assert '__WATERFALL__' not in html
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
(out / 'index.html').write_text(html)
print(f'Built {out / "index.html"}: {len(html.encode()):,} bytes')
