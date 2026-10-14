# Deployment

The canonical site is served by Caddy from `/var/www/portfolio-releases/current`, a symlink to an immutable release directory. Résumé changes ship like any other site change: merge to `main`, then release.

## Release

On the VPS, as root, from a clean checkout of the merged `main`:

```sh
variants/redesign/release.sh [release-name]
```

It runs `npm ci` (repo root and `variants/redesign`) and `variants/redesign/publish-test.cjs` (which prints the résumé PDF and builds both the noindex preview and the production site), refuses to continue if the checkout is dirty, copies the production runtime manifest into `/var/www/portfolio-releases/<name>-<timestamp>-<commit>`, verifies every file hash, switches `current` atomically, then runs `variants/redesign/verify-public.cjs` against `https://portfolio.wasabietech.com`. If public verification fails it switches `current` back to the previous release.

## Review build

`node variants/redesign/publish-test.cjs` builds and checks the production site locally without touching the live one (it needs the résumé fonts; see `resume/README.md`). `node variants/redesign/build.cjs` builds the noindex previews.

The previous design (`variants/product-launch` with the waterfall homepage) is archived; its `release.sh`, `publish-test.cjs`, `qa.cjs` and `resume/qa.cjs` still describe that design and are not part of the current release.

## Rollback

Earlier releases stay on disk. Point `current` back at one:

```sh
cd /var/www/portfolio-releases && ln -sfn <release> current.next && mv -T current.next current
```
