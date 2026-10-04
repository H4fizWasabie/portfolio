# Living waterfall — throwaway preview

Question: does flowing-water motion plus a scroll camera make the owner-selected waterfall a useful portfolio background?

Latest review preview: https://image.wasabietech.com/portfolio-all-projects-preview/

## V7 visible eight-project collection — preview only (2026-10-04)
Owner says V6 is better, but the MAP disclosure hides portfolio breadth. Hero now says **Explore 8 projects** and links directly to a standalone **All 8 projects** card after MAP and before About. All eight names, fact-based short purpose lines and canonical case-study links are always visible; two columns on desktop, one on mobile. No new screenshots, nested cards or collapsed list. Remove unused `.index` markup/styles. Purpose lines derive from `variants/product-launch/projects.cjs`, including Hill’s self-directed/unaffiliated status. All four V6 scripts and original imagery/featured copy/resume stay byte-identical. Overview shares the readable glass treatment,16px names/14px purpose lines and44px-minimum links, with10px row padding; it fits the same short desktop viewport checks. Very short/mobile windows retain normal page scrolling.

Current QA: `node variants/waterfall-preview/compact-glass-qa.cjs` (V7/seven-card fit + discoverability; requires `/tmp/portfolio-v6-baseline.html` containing a V6 build for four-script equality), `WATERFALL_QA_CASE=desktop node variants/waterfall-preview/qa.cjs` (water/motion/navigation), `node resume/qa.cjs` (preview/download). Run the same current tests against the public URL using the existing URL/evidence environment variables. For canonical publication set `COMPACT_QA_PUBLISHED=1` to expect same-origin `/work/` links; `WATERFALL_QA_PUBLISHED=1` enables published-head handling in the motion suite. Historical `card-qa.cjs` asserts V3 treatment and `wide-glass-qa.cjs` asserts V5 geometry/mobile parity; they are deliberately not repurposed or claimed as V7 tests. See `evidence/all-projects-finish.md` and V7 JSON results.

V6 comparison is preserved: https://image.wasabietech.com/portfolio-compact-glass-preview/

## V6 clearer, viewport-fitting cards — preview only (2026-10-04)
Follow-up to issue #60 / PR #61. Owner approved clearer glass and text-left/screenshot-right project interiors after V5 project cards measured873–1005px tall in a1280×604 browser viewport. Shared desktop shell is62% moss/24px blur;28% ink protects reading without hiding media-side scenery. Three project cards now use semantic columns with contain-fit screenshot height capped at min(42svh,360px). Accessible native image viewer has named Enlarge/Close buttons, original disclosure, Escape and opener focus restore; unsupported-dialog/no-JS users retain the image and project links with no dead buttons. About/Contact also compact at short viewport heights. Mobile remains stacked with original78%/12px material and normal page scroll. Original images, copy, resume/PDF and three scripts are untouched.

Run `node variants/waterfall-preview/build.cjs`, then `node variants/waterfall-preview/compact-glass-qa.cjs` with `/tmp/portfolio-v5-baseline.html` containing the V5 built artifact for script invariants. `COMPACT_QA_URL` tests actual HTTPS and `COMPACT_EVIDENCE` isolates test outputs. The checks cover all six collapsed card rectangles against actual viewport edges at12 sizes, complete screenshot contain-fit, keyboard enlargement/Escape/Close/focus, mobile stacking, expanded index/resume, preferences and no-JS. The older V5 test below describes the historical V5 artifact only. Expanded content and very short/mobile windows deliberately use normal scrolling, not hidden overflow or internal card scrolling. Physical Safari/phone and old desktop GPU performance remain unverified.

V5 comparison preview is preserved: https://image.wasabietech.com/portfolio-wide-glass-preview/

## V5 wider desktop glass — preview only (2026-10-04)
Issue #60. Owner approved a separate preview: wider floating reading cards, slightly clearer green glass, stronger frost and readable content. Desktop cards now share `min(1120px,60vw)`, including About and large-display overrides, with responsive 32–56px padding and 18px body text. Desktop moss tint is 75%, blur 24px; worst-white oat body contrast is 4.6838:1. Mobile keeps exact V4 reading geometry, 78% tint, 12px blur and 14px body. Copy, images, three scripts, motion controls and approved resume are unchanged. Reduced-transparency/increased-contrast fallback remains 94%/no blur.

Build with `node variants/waterfall-preview/build.cjs`. Save a published-V4 offline baseline using the same builder before changing source, then run `WATERFALL_WIDE_BASELINE=/path/to/v4.html node variants/waterfall-preview/wide-glass-qa.cjs`. `WATERFALL_WIDE_QA_URL` targets the actual published preview; `WATERFALL_WIDE_EVIDENCE` isolates its evidence directory. Historical card/controls QA asserts V2/V3 geometry and cannot validate this intentional desktop change; the V5 scoped suite replaces those layout expectations, while the existing motion and resume suites remain applicable.

Eight browser viewports checked: 1280×720, 1440×900, 1920×1080, 1024×768, 820×1180, 390×844, 320×740, 667×375. See `evidence/wide-glass-finish.md` and `evidence/wide-glass-results.json` for exact verified scope and known limitations. No canonical homepage or Caddy changes; no merge/promotion authorized.

## Canonical publication
Owner explicitly authorised merging V4 and the resume work, opening/merging the publishing PR and showing the final main site on2026-10-03. The shared standard-Node build.cjs owns offline asset embedding; build.py remains a compatibility command. Product Launch's --publish swaps in this approved homepage while retaining canonical SEO and ten other pages. QA supports WATERFALL_QA_URL / WATERFALL_QA_PUBLISHED for actual HTTP publication, excluding typed JSON-LD from shader-source inspection. New release and scoped resume routing are verified before/after deployment; no prototype noindex metadata is promoted.

## Owner-selected résumé preview
Owner approved the edited Systems Builder/MAP résumé and requested primary preview on 2026-10-03. About now has a native Preview résumé disclosure: real, selectable, responsive text generated from ../../resume/resume-datasheet-source.html, not a browser-dependent PDF embed. The separate Download PDF link embeds the exact approved one-page PDF and works offline. Footer Résumé navigation reveals it with JavaScript; native disclosure/keyboard preview and download work without JavaScript. Scene badge is hidden only while reading, avoiding overlap; existing water/control scripts, photo, cards and motion behavior are preserved.

Build now requires standard Node as well as Python, using ../../resume/preview.cjs to enforce identical printable-source/PDF copies. `node resume/qa.cjs` from the repo root checks keyboard open/close, selected content, reading type, no overflow/errors and actual downloaded PDF hashes at1440/768/390/320, JS on/off. Physical-phone browser testing is not claimed. Public review publication is not canonical deployment or approval to merge PR55/57.

## V4 controls — owner-approved compact refinement
The201.3125×54px bottom-right bar keeps Pause water directly available. Motion opens a native disclosure with Still view and the existing simulation/fallback status.44px tap targets, safe-area-aware offsets, upward bounded panel. On the390 phone its area was0.3951 of V3 (362×76px). Keyboard Enter/Tab operate it; Escape, outside pointer or focus dismiss. The native disclosure/status remain useful with JavaScript disabled. V3 cards/main markup and the first water/camera script are byte-identical; no assets changed.

Controls checked at1440×900DPR2,390×844DPR3,320×740DPR2,667×375DPR2. Actual Chromium AX confirmed DisclosureTriangle/expanded/name semantics; an initial QA assertion incorrectly expected a button role and was corrected, not a UI defect. A broad run timed out while QA contained an unbounded RAF wait; the frame wait is now bounded/traced and a fresh full regression passed. The exact timeout trigger was not reproduced. See evidence/controls-results.json and controls-finish.md. One mechanical detector pass reported only advisories: approved incumbent type/color values and border/offset-shadow pairing for a temporary popup. No redesign/drift repair.

## V3 cards — owner-approved refinement
Reading cards use78% moss tint with the existing12px frost. Only their background is translucent; text/screenshots stay opacity1, and both primary and outlined secondary buttons have solid readable surfaces. The card borders, rounding, spacing, copy and V2 water/camera are unchanged. Supported reduced-transparency or increased-contrast preferences switch to94% moss/no blur. Browsers without backdrop-filter receive that same conservative base style.

Actual card checks: all six cards at1440/390/320, exact V2 bounding boxes, nominal body contrast5.1658:1 even over white, opaque image/text/button layers, and solid hover buttons. Actual Chromium CDP preference emulation confirmed both94%/no-blur branches. An unsupported-blur engine could not be forced: that branch is implemented but not certified. Physical-phone smoothness remains for the owner to assess; blur radius did not increase.

## Explicit limits
This is **procedural image motion**, not AI-generated video. No configured image-to-video provider was found. V2 replaces sinusoidal wobble with continuous tier-directed advection, variable-speed strands and restrained landing foam confined to the image-derived water matte. The motion is illustrative, not physically simulated fluid flow. The browser now renders the static photograph separately from a transparent water canvas; reduced zoom and native-density output remove the initial rendering bottleneck. The original 1920×1280 photograph remains unchanged. This does not recover missing photographic detail or claim a regenerated 4K master. Normal scrolling moves the crop through the upper cascades, rock ledges, lower falls and pool. This route does not replace the canonical portfolio.

Existing safe Procura/Theoses/MAP screenshot captures and verified copy are reused. Detailed case-study links point at the existing canonical pages. No production API, private records, analytics or credentials are used. Screenshot origin details: ../product-launch/CAPTURE-PROVENANCE.json and MAP-CAPTURE-PROVENANCE.json; source assets and matte: RASTER-PROVENANCE.json.

## Run
`python3 variants/waterfall-preview/build.py`

Open `variants/waterfall-preview/dist/index.html` in a browser. Output is one self-contained offline HTML file. The build needs only standard Python and Node. To regenerate motion assets, install Pillow and NumPy, run `python3 variants/waterfall-preview/generate-matte.py`, then `python3 variants/waterfall-preview/generate-flow.py`, then build. The order matters: flow generation adds landing foam in matte B. Tier flow RGB is deliberately opaque; encoding velocity in transparent pixels loses channels during browser decoding. Water detail is a deterministic repeatable synthetic texture, not new scene photography.

On the authoring VPS, `/tmp/node_modules/playwright` and Chromium 1243 are available. Run:
- `node variants/waterfall-preview/qa.cjs`
- `node variants/waterfall-preview/controls-qa.cjs` (V3 baseline at `/tmp/waterfall-v3-delivery.html`, overridable via `WATERFALL_V3_BASELINE`)
- `node variants/waterfall-preview/card-qa.cjs` (compares local V2 baseline at `/tmp/waterfall-v2-delivery.html`)
- `node variants/waterfall-preview/record.cjs`
- `node variants/waterfall-preview/verify-public.cjs` (after preview publication)

Those evidence helpers name the VPS browser/package paths; adjust them on another machine. The recording is a finite actual-browser scroll demonstration, not a generated water video.

## Verified
The exact latest V4-control/V3-card/V2-water delivery HTML ran in Chromium at 1440×900 DPR1 and DPR2, 390×844 DPR3 and 320×740 DPR2. The retina desktop water canvas is 2880×1800; phone canvas 1170×2532. Native photo placement and reduced source cropping passed. The canvas budget is DPR3, 8M pixels and the GPU limit; static photograph rendering is independent. Load, zero horizontal overflow, no runtime network requests, normal scroll, keyboard anchor navigation, pause/resume, still view and eight project links passed. Reduced-motion, no-JavaScript and unavailable-WebGL fallbacks retain the actual image and content. Browser-decoded field data showed all 50,665 sampled falling-water pixels pointing downward, with unequal speeds and 6,511 landing-foam pixels. Actual GPU readback showed 4,100 changing water samples and zero changing terrain samples. These checks demonstrate rendering/direction, not photoreal naturalness. Public HTTPS loaded the same bytes and ran the camera at all three widths; computed control/disclosure sizes were 12px.

Independent read-only finish review: ship at prototype scope. See evidence/finish-review.md for scope and corrections to the reviewer’s stale source/timestamp assumptions. Dedicated shipped reviewer/documenter agents are not exposed here: read-only explorer review plus inline documentation were used.

Physical-phone performance/battery and a true generated water video are **not** verified. Hafiz visually approved V2 water and V3 cards; the next owner check is whether V4 compact controls are clear and comfortably reachable. V4 was visually reviewed inline against actual desktop/mobile screenshots; the earlier independent motion review above is historical. The earlier recorded walkthrough is V2, not a newly recorded V4 video. A proper video source remains an option if this illustrative motion is not sufficient.

## Review / deployment boundary
Issue #54; feature branch `feat/waterfall-motion-preview`. No automatic merge or canonical deployment. Existing Caddy config and canonical homepage hashes remained unchanged. Standalone noindex preview is stored at `/var/www/portfolio-variants/waterfall-preview/index.html`, exposed through an isolated link under the already-existing image file host. No Caddy change. Only the built index.html is served; development notes, source and evidence are not in that served directory.
