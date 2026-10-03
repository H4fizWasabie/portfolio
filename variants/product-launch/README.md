# Product Launch portfolio working preview

Approved concept B for Hafiz's custom business apps and AI automation. Review issue: https://github.com/H4fizWasabie/portfolio/issues/48.

## Open it
Open `index.html` in a browser with this directory's assets alongside it. Or, from this directory:

```
python3 -m http.server 19090 --bind 127.0.0.1
```

Then visit http://127.0.0.1:19090/. This is local-only. Do not add Caddy routing, alter live dist, run the live repo's build, promote the preview, or merge without Hafiz's separate review/approval.

A self-contained HTML export is also provided separately for Telegram review. Open it in a browser, not a document-preview renderer. Its full-size image links deliberately generate blob URLs because browsers block top-level data URL navigation.

## What actually works
- Three genuine-app screenshot showcases: Procura, PIMS, Theoses.
- App selection, keyboard arrow/Home/End navigation, manual workflow-scene selection.
- On-demand finite walkthrough with pause, app-switch cancellation and visibility cleanup.
- Reduced-motion disables automatic playback and animation; manual navigation remains.
- Full-size screenshot viewing, project-to-showcase controls, actual email contact links.
- All fonts and images local. No API client, analytics, credentials or production connection.

These are screenshot walkthroughs, NOT exposed live applications. No supplier is contacted, no order submitted, no AI request made by this preview.

## Capture honesty
Eight screenshots come from real application interfaces, never invented div dashboards or generated product images. See CAPTURE-PROVENANCE.json.

- Procura: actual Go application with native SeedDemo, a new isolated SQLite in /tmp, and loopback-only listener. Recorder verifies executable + environment, requires eight DEMO stock IDs, and proves writes return HTTP 403.
- PIMS: genuine source UI at b0c7ac5, rendering local fictional API fixtures. No production DB or public demo visited. Native dashboard refresh avoids its initial double-render race; UTF-8 response headers match normal serving.
- Theoses: exact deployed dashboard assets from runtime v1.0.116; local fixture sessions/files only. The conversation is explicitly staged sample content, not a claimed live execution.

Source UI may show sample quantities, monetary values and workflow state; all are explicitly fictional. Important production detail: an existing public demo is not necessarily synthetic and was NOT reused.

## Tests and evidence
Desktop 1440/1024, tablet 768, mobile 390/320 were exercised in Chromium. Tests run the actual exported HTML after the last source change. Evidence includes network allowlist traces, sample fixtures, isolation audit, actual control/playback tests, keyboard navigation, image geometry, reduced-motion handling, no-JS fallback and missing-asset recovery.

Text contrast: oat/moss 4.89:1; ink/oat 9.80:1; muted/oat 5.76:1; oat/terracotta 4.92:1. Moss/terracotta were darkened slightly from the selected comp for accessibility. Mobile functional text was raised to 12px. All captured application images retain their original UI styling.

Mechanical detector ran once. Its real small-text findings were corrected and checked through computed styles after the edit. Remaining heuristic findings are intentional bounded hero clipping (no menu/popover is clipped), shell padding inherited via the child with a verified >=22px inset, and nonzero-offset tinted elevation (not a zero-offset glow). Do not treat the pre-fix detector JSON as a clean final audit.

No production files were replaced. Existing dirty resume files and untracked PRODUCT.md in the live checkout are preserved. Existing legacy product context is not migrated by this variant; this directory's approved DESIGN.md records the client-facing direction.

## Font licence
Epilogue is self-hosted under SIL OFL; see OFL-Epilogue.txt. Application screenshots are Hafiz's own interfaces, populated with sample data.

## Review gate
Theoses prepared this preview locally without directly committing or pushing code. A GitHub agent can import the reviewed artifact into an implementation PR referencing issue #48. Leave issue and PR open for Hafiz; no merge, release publication or deployment is authorised.
