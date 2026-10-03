# Résumé preview deployment boundary

Owner-approved document: Systems Builder/MAP one-page PDF. PR57 is stacked on V4 preview PR55; leave both for owner review/merge. No general canonical deploy permission is implied by a review-preview update.

## Safe review build

Run `node variants/product-launch/publish-test.cjs`, `python3 variants/waterfall-preview/build.py`, `node resume/qa.cjs`, and `node variants/product-launch/qa.cjs`. Publish only the self-contained V4 `dist/index.html` to the existing isolated review location after backing up its current file, checking the complete temp copy, then atomic replacement. No app API, live DB, timer or canonical routing changes needed.

## Canonical publication after explicit merge/deploy approval

1. Build the exact merged source with Product Launch `--publish`. Copy only its runtime manifest allowlist into a new immutable release: eleven HTML pages and46 runtime assets. Verify the PDF equals the approved source.
2. Back up current complete Caddy config and current release pointer. `python3 resume/prepare-routing.py /etc/caddy/Caddyfile /tmp/resume-Caddyfile-proposed` writes a proposal only, refusing live/input replacement. Its edits are confined to the portfolio site: /resume and /resume.html resolve to /resume/; /resume/index.html canonicalizes; remove resume/ from legacy interception so the reader/PDF come from the release root. All other domains/private routes remain unchanged.
3. Stage the release and proposed portfolio rules on isolated loopback with admin disabled and separate XDG storage. Run `verify-public.cjs` against that root/URL. Caddy validate/adapt the complete proposal. Only then perform an approved, backed-up atomic release/config switch and reload.
4. Verify the actual HTTPS /resume/ reader, preview buttons, redirects, approved PDF bytes/MIME/download, eleven-page crawl and46 release hashes at the public host. Never substitute a source edit or stage pass for this check.

The existing nightly printer is not modified here. It reads legacy checkout resume.html and writes legacy/public/dist copies. With the new routing, it cannot overwrite the approved immutable release PDF; a later résumé edit must build a new release from approved source. Keep printable source copies synchronized. Archived design variants and historical résumé backups are intentionally not promoted or rewritten.
