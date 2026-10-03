# Systems Builder résumé

Owner approved the edited Systems Builder/MAP document and requested a preview button, 2026-10-03. Procure Pilot is Procura, not a separate project. MAP replaces that duplicate entry; supplier achievements remain under Procura. Other profile, metrics, employment and skills are preserved.

## Single content source

`resume-datasheet-source.html` and `../resume.html` must be byte-identical. The existing nightly printer reads the latter and replaces legacy/public/dist PDFs; never run it as a draft test. `Resume-Hafiz-Jamali.pdf` and `../apps/web/public/resume/Resume-Hafiz-Jamali.pdf` must match.

The selected PDF used wkhtmltopdf0.12.6.1. Safe draft build from repository root:

```sh
wkhtmltopdf --quiet --enable-local-file-access resume/resume-datasheet-source.html /tmp/Hafiz-Jamali-Systems-Builder-MAP.pdf
pdfinfo /tmp/Hafiz-Jamali-Systems-Builder-MAP.pdf
```

The print-only rule keeps Chromium's nightly print path on one page too. Both renderer outputs were generated and checked for all four projects, corrected names, preserved metrics and footer; both visually inspected. No live generator was run.

## Responsive preview

`preview.cjs` derives scoped HTML from the same source and adds `reader.css`: semantic section headings, selectable16px reading text, labels≥12px, no PDF embed/viewer dependency. The screen reader reflows rather than shrinking A4 text on a phone. PDF remains unchanged/one-page.

V4 uses a native About disclosure and exact embedded PDF download, including offline/no-JS/keyboard. Product Launch builds /resume/ and that exact PDF into its46-file/eleven-page production manifest. `node resume/qa.cjs` checks four widths, JavaScript on/off, native open/close and actual download hashes.

PR57 is stacked on V4 PR55; neither PR/main is automatically merged. Isolated V4 review publication is not canonical deployment. See DEPLOYMENT.md; do not claim the public canonical download changed before real release/routing verification.
