#!/usr/bin/env python3
"""Prepare a complete Caddy proposal. Never reload or replace the input config."""
from pathlib import Path
import sys


def portfolio_span(text):
    marker = '\nportfolio.wasabietech.com {'
    start = text.index(marker) + 1
    depth = 0
    for i in range(text.index('{', start), len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1
    raise ValueError('Portfolio site block is incomplete')


def prepare(text):
    start, end = portfolio_span(text)
    block = text[start:end]
    edits = [
        ('^/(|projects/|work/', '^/(|projects/|resume/|work/'),
        ('@canonicalDirectories path /projects ', '@canonicalDirectories path /resume /projects '),
        ('redir /resume.html /resume 301', 'redir /resume.html /resume/ 301'),
        ('\tredir /resume /resume/Resume-Hafiz-Jamali.pdf 302\n', ''),
        ('assets/|fonts/|img/|resume/|favicon', 'assets/|fonts/|img/|favicon'),
    ]
    for old, new in edits:
        if block.count(old) != 1:
            raise ValueError('Expected one old routing rule: ' + old)
        block = block.replace(old, new)
    return text[:start] + block + text[end:]


if __name__ == '__main__':
    source, output = map(Path, sys.argv[1:])
    if source.resolve() == output.resolve() or output.resolve() == Path('/etc/caddy/Caddyfile'):
        raise ValueError('Output must be a proposal, never live state')
    output.write_text(prepare(source.read_text()))
    print(f'Prepared {output}; input untouched, no reload')
