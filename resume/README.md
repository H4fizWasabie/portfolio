# Résumé

One-page Internal Tools Developer résumé, approved by the owner 2026-10-20. Projects: CAVELMS, PIMS, Procura, DD Drugs Register, Theoses, MAP.

## Single source

`resume-datasheet-source.html` is the only file to edit. Everything else is derived from it at build time:

- `pdf.cjs` prints it to `Resume-Hafiz-Jamali.pdf` (gitignored) with headless Chromium, then fails unless the PDF is one page and every contact line and system title in the source appears in the PDF text.
- `preview.cjs` derives the responsive HTML reader (`/resume/` and the homepage preview) and refuses to run if the PDF is missing or older than the source.

`variants/redesign/publish.cjs` runs `pdf.cjs` first, so every production build ships a PDF that matches the source. The `/resume/` page is derived from the same source by `preview.cjs`.

```sh
npm ci
node resume/pdf.cjs
```

The one-page check depends on fonts: install Inter and IBM Plex Mono (`fonts-inter`, `fonts-ibm-plex` on Ubuntu) plus `poppler-utils`. On the VPS, set `PLAYWRIGHT_BROWSERS_PATH=/home/theoses/.cache/ms-playwright`; elsewhere run `npx playwright-core install --only-shell chromium` or set `CHROME`.

## Responsive preview

`preview.cjs` adds `reader.css`: semantic section headings, selectable 16px reading text, labels ≥12px, no PDF embed. The reader reflows on a phone instead of shrinking A4 text. `node resume/qa.cjs` checks four widths, JavaScript on/off, native open/close and that the downloaded PDF matches the built one.

## Deploy

See `DEPLOYMENT.md`.
