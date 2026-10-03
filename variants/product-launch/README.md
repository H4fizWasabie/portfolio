# Product Launch — eight-project review preview

Owner-approved static first pass, 2026-10-03. Issue: https://github.com/H4fizWasabie/portfolio/issues/50.

## Review locally

```sh
node build.cjs
python3 -m http.server 19090 --bind 127.0.0.1
```

Open `http://127.0.0.1:19090/index.html`, or extract the review ZIP and open `index.html` directly in a browser. Keep the folder structure and assets together. Do not use the obsolete single-file export from the earlier preview: eight individual project pages now require the directory bundle.

No deployment is performed by either build or tests. Do not change Caddy, live dist, production services or data. Leave the issue and feature-branch PR for Hafiz to review and merge. Main-homepage promotion remains separately gated.

## Pages and scope

- Homepage: approved Product Launch design; Procura, Theoses and MAP featured; all eight projects listed; background, résumé and email contact preserved.
- `projects/index.html`: the complete project index.
- `work/<slug>/index.html`: Procura, PIMS, DD Drugs Register, Theoses, Yen, MAP, Hill’s AI Content Lab and 89lab content automation.
- Detailed screenshot galleries live on project pages, not the homepage.
- These pages are static case studies and screenshot galleries, not interactive application installations.

The six legacy `apps/web/public/work/*` pages and legacy React/API routes remain untouched. This extension adds matching routes inside the Product Launch variant, including new Yen/89lab case studies, without redirecting or duplicating the legacy runtime. `projects.cjs` is the verified content source; `render.cjs` generates all ten variant pages.

## Evidence and truthful visuals

Procura/PIMS captures retain their native isolated fictional-data provenance. Theoses images are explicitly staged conversations in the real v1.0.116 dashboard, not a claim of current/live AI execution. See the existing `CAPTURE-PROVENANCE.json`.

MAP uses four owner-approved edited phone captures. Actual interface layout is retained; identifying text is replaced with fictional data. The homepage overview is an explicitly described three-panel composition, not an invented wide-screen MAP interface. See `MAP-CAPTURE-PROVENANCE.json`.

DD, Yen and 89lab show labelled semantic workflow/architecture outlines, not simulated dashboards. Hill’s shows its self-directed content method and authored content concept, with no client relationship, affiliation or campaign results claimed. DD source remains private; no clinical records, drug locations, quantities or staff information are published.

`RASTER-PROVENANCE.json` records source/shipping hashes and pixel preservation. The provenance tool stores WebP origins in `.webp.json` sidecars; these accompany every shipping image in the runtime manifest and review ZIP. Source image pixels are unchanged except for the documented MAP overview composition, whose input files were already approved fictional-data copies.

## Build and runtime boundary

```sh
node build.cjs
node qa.cjs
```

`build.cjs` writes static pages, combines the unchanged incumbent `base.css` with scoped `extension.css`, and writes `runtime-manifest.json`. That manifest is the **only runtime copy allowlist**: ten pages, CSS, JavaScript, local font/licence, thirteen WebP assets and their origin sidecars. Never copy source scripts, fixture files, evidence, provenance records, PRODUCT/DESIGN documents or `.impeccable` development contracts into a public preview directory.

`qa.cjs` serves the preview on a temporary loopback port and closes it on completion. It exercises all ten pages at 1440/1024/768/390/320 pixels, featured keyboard controls, every gallery and full-size image, local links, disclosure, résumé/contact presence, no-JS fallbacks, request-induced missing assets, colour contrast and normal extracted-folder `file://` review mode. No production app APIs or account connections are made. Failures are simulated by intercepting requests, not editing live/source state.

For packaged-folder validation:

```sh
PREVIEW_ROOT=/tmp/extracted-preview QA_EVIDENCE=/tmp/packaged-qa QA_CAPTURE=0 node qa.cjs
```

Browser tools default to the existing Playwright-core/Chromium installation; override `PLAYWRIGHT_MODULE` and `CHROME` as needed. Evidence under `evidence/eight-projects/` belongs to development/review only.

## Known boundaries

- Interactive application demos are deferred by the approved first-pass scope.
- New screenshot captures for DD, Yen, Hill’s or 89lab require separate safe-data preparation; no production screenshot is substituted.
- Résumé links point to the existing public PDF; the PDF opens online, and its live files were not changed.
- Original Product Launch `DESIGN.md` remains the visual authority; its earlier three-project/capture inventory is historical. Current selection and evidence are recorded here and in PRODUCT.md, without changing approved tokens or introducing a new identity.

Font: self-hosted Epilogue, SIL OFL (`OFL-Epilogue.txt`). No analytics, remote fonts, API client, credentials or live telemetry in the preview.
