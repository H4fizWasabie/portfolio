# V2 finish evidence — prototype scope

Owner-approved scope: preserve the image/layout/content; improve sharpness by fixing rendering scale and reducing excessive zoom; replace wobble with directional, variable-speed streams and restrained landing foam. Not a real generated water video.

Final source edits preceded the passing actual-artifact QA and finite browser recording. Documentation/provenance updates do not modify the delivered HTML. Native browser photo placement is independent of transparent WebGL water; no image generation, source-image resizing or sharpening was claimed.

## Actual changed-code evidence
- DPR1 and DPR2 desktop; DPR3 phone; DPR2 small phone: canvas/native pixel targets equal; source crop and photo placement checked.
- Browser-decoded tier texture: 50,665 falling-water pixels; all downward; unequal speeds; 6,511 foam pixels confined to water.
- Real GPU readback: 4,064 changing water samples; zero changing terrain samples.
- Normal scroll, camera transitions, pause/resume, still, keyboard, no overflow/runtime errors/network, eight links; reduced-motion/no-JS/no-WebGL fallbacks passed.
- A 21.16-second actual-browser recording holds upper/middle/pool views and travels between them. It is not image-to-video output.

## Cause fixes
Initial canvas capped DPR at1.25 and zoomed the source1.55x. V2 leaves the static scene to native browser image rendering, bounds only the water overlay (DPR3/8M/GPU limit), and reduces zoom. Repeating sine wobble becomes local downstream advection and distinct moving strands. Feathered ROI gates eliminate artificial hard curtain cut boundaries.

The first field test caught RGB velocity channels lost beneath PNG alpha0 during browser premultiplication. All field data is now opaque RGB; foam lives in opaque matte B. Generator, shader, browser-decoded test, docs and provenance use this same contract. The complete final pipeline ran after that fix.

## Independent review
Read-only explorer: ship at prototype scope. It repeated stale V1 finish-note wording and incorrectly said runtime edits came after QA. Command order and final QA above show the opposite; no new runtime edit followed the passing commands. It also called the small-medium DPR1 canvas a DPR2 result; the actual retina case is2880×1800 at1440×900 DPR2. Source is committed for review; built HTML stays intentionally ignored, not committed to main. Public serves only built index.html, so dev notes/provenance are source-review artifacts, not a public docs defect.

## Limits
Physical-phone frame rate/battery, supported-browser coverage beyond Chromium and photoreal naturalness are unverified. Image remains1920×1280 and cannot gain true detail from rendering alone. Owner must judge motion on the phone. Dedicated writable documenter unavailable; scoped existing DESIGN.md/sidecar updated inline, with no canonical design changes. Main homepage and Caddy must stay byte-identical; check after publication.
