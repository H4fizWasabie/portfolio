# Deployment

The canonical site is served by Caddy from `/var/www/portfolio-releases/current`, a symlink to an immutable release directory. Résumé changes ship like any other site change: merge to `main`, then release.

## Release

On the VPS, as root, from a clean checkout of the merged `main`:

```sh
variants/redesign/release.sh [release-name]
```

It runs `npm ci` (repo root and `variants/redesign`) and `variants/redesign/publish-test.cjs` (which prints the résumé PDF and builds both the noindex preview and the production site), refuses to continue if the checkout is dirty, copies the production runtime manifest into `/var/www/portfolio-releases/<name>-<timestamp>-<commit>`, verifies every file hash, switches `current` atomically, then runs `variants/redesign/verify-public.cjs` against `https://portfolio.wasabietech.com`. If public verification fails it switches `current` back to the previous release.

## API release

The portfolio API (`apps/api`, `POST /api/contact` and friends) is released separately from the static site. It runs as the systemd unit `portfolio-api` (User=theoses, WorkingDirectory=`/var/www/portfolio`, `ExecStart=/usr/bin/node /var/www/portfolio/apps/api/dist/server.js`, `EnvironmentFile=/var/www/portfolio/apps/api/.env`), and Caddy proxies `/api/*` to `127.0.0.1:8085`. `/var/www/portfolio` is a symlink to `/var/www/portfolio-app`, a git clone of this repo (owned by `theoses`) that is built in place. `release.sh` does not touch it, and its rollback covers only the static site.

On the VPS, as root, after the change is merged to `main`:

```sh
cd /var/www/portfolio-app \
  && test -z "$(sudo -u theoses git status --short)" \
  && sudo -u theoses git pull --ff-only origin main \
  && sudo -u theoses npm ci \
  && sudo -u theoses npm run build --workspace=packages/shared \
  && sudo -u theoses npm run build --workspace=apps/api \
  && systemctl restart portfolio-api \
  && sleep 3 && curl -sf http://127.0.0.1:8085/api/health \
  && curl -s -o /dev/null -w '%{http_code}\n' -H 'content-type: application/json' \
       --data "{\"name\":\"release-check\",\"email\":\"check@example.com\",\"message\":\"$(printf 'x%.0s' $(seq 5001))\"}" \
       https://portfolio.wasabietech.com/api/contact   # 400: an over-long Enquiry is rejected, nothing saved
```

If any step fails, the chain stops before the restart and the running API is untouched: fix the cause and run it again. Never restart `portfolio-api` after a failed `npm ci` or build; the service would start without its dependencies. Don't pipe these steps through `tail` or `head`, which hides their exit codes. `npm ci` needs `/home/theoses/.npm` to belong to `theoses`; root-owned files there make it fail with EACCES (`chown -R theoses:theoses /home/theoses/.npm` fixes it).

Build only `packages/shared` and `apps/api`. Do not run the root `npm run build`: it also rebuilds `apps/web/dist`, which Caddy still serves for the legacy `/assets/`, `/fonts/`, `/img/` and dated `.mp4` paths.

**Order matters.** Release the API before any static release whose public checks exercise new API behaviour. `verify-public.cjs` sends an over-long Enquiry and expects 400; against an API that has not been released, that request would be saved and alerted as a real Enquiry, and the check would fail.

There is no automatic rollback for the API. To roll back, check out the previous commit in the clone (`sudo -u theoses git checkout <previous-commit>`), rebuild `packages/shared` and `apps/api` as above, and restart `portfolio-api`. Check out `main` again before the next release.

## Review build

`node variants/redesign/publish-test.cjs` builds and checks the production site locally without touching the live one (it needs the résumé fonts; see `resume/README.md`). `node variants/redesign/build.cjs` builds the noindex previews.

The previous design (`variants/product-launch` with the waterfall homepage) is archived; its `release.sh`, `publish-test.cjs`, `qa.cjs` and `resume/qa.cjs` still describe that design and are not part of the current release.

## Rollback

Earlier releases stay on disk. Point `current` back at one:

```sh
cd /var/www/portfolio-releases && ln -sfn <release> current.next && mv -T current.next current
```
