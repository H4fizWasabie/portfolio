# Deployment

The canonical site is served by Caddy from `/var/www/portfolio-releases/current`, a symlink to an immutable release directory. Résumé changes ship like any other site change: merge to `main`, then release.

## Release

On the VPS, as root, from a clean checkout of the merged `main`:

```sh
variants/product-launch/release.sh [release-name]
```

It runs `npm ci` and `publish-test.cjs` (which prints the résumé PDF and builds both review and production output), refuses to continue if the checkout is dirty, copies the production runtime manifest into `/var/www/portfolio-releases/<name>-<timestamp>-<commit>`, verifies every file hash, switches `current` atomically, then runs `verify-public.cjs` against `https://portfolio.wasabietech.com`. If public verification fails it switches `current` back to the previous release.

## Review build

`node variants/product-launch/publish-test.cjs`, `node variants/waterfall-preview/build.cjs`, `node resume/qa.cjs` and `node variants/product-launch/qa.cjs` build and check everything locally without touching the live site.

## Rollback

Earlier releases stay on disk. Point `current` back at one:

```sh
cd /var/www/portfolio-releases && ln -sfn <release> current.next && mv -T current.next current
```
