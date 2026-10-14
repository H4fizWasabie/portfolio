#!/usr/bin/env bash
# Ships the committed Workshop site to portfolio.wasabietech.com.
# Run on the VPS as root from a clean checkout of main: variants/redesign/release.sh [release-name]
# Builds and tests (publish-test.cjs prints the résumé PDF), copies the manifest into a new
# immutable release, switches /var/www/portfolio-releases/current to it, then verifies the public
# site and switches back if verification fails. Older releases stay on disk as rollback points.
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -z "$(git status --porcelain)" ] || { echo "Uncommitted changes; release committed source only." >&2; exit 1; }
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/home/theoses/.cache/ms-playwright}"
releases=/var/www/portfolio-releases
name="${1:-workshop}-$(TZ=Asia/Kuala_Lumpur date +%Y%m%d-%H%M%S)-$(git rev-parse --short=12 HEAD)"
dist=variants/redesign/dist/site

npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix variants/redesign --ignore-scripts --no-audit --no-fund
node variants/redesign/publish-test.cjs
[ -z "$(git status --porcelain)" ] || { echo "Build changed committed files; commit them first." >&2; exit 1; }

mkdir "$releases/$name"
(cd "$dist" && node -p "require('./runtime-manifest.json').map(e=>e.file).join('\n')" | xargs cp --parents -t "$releases/$name")
(cd "$dist" && node -p "require('./runtime-manifest.json').map(e=>e.sha256+'  '+e.file).join('\n')") | (cd "$releases/$name" && sha256sum --check --quiet)

point_current() { ln -sfn "$1" "$releases/current.next" && mv -T "$releases/current.next" "$releases/current"; }
previous=$(readlink "$releases/current")
point_current "$name"
echo "Switched current: $previous -> $name"
if ! node variants/redesign/verify-public.cjs; then
  point_current "$previous"
  echo "Public verification failed; rolled back to $previous" >&2
  exit 1
fi
