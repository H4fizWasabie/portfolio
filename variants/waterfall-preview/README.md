# Living waterfall — throwaway preview

Question: does flowing-water motion plus a scroll camera make the owner-selected waterfall a useful portfolio background?

Preview: https://image.wasabietech.com/portfolio-waterfall-preview/

## Explicit limits
This is **procedural image motion**, not AI-generated video. No configured image-to-video provider was found. V2 replaces sinusoidal wobble with continuous tier-directed advection, variable-speed strands and restrained landing foam confined to the image-derived water matte. The motion is illustrative, not physically simulated fluid flow. The browser now renders the static photograph separately from a transparent water canvas; reduced zoom and native-density output remove the initial rendering bottleneck. The original 1920×1280 photograph remains unchanged. This does not recover missing photographic detail or claim a regenerated 4K master. Normal scrolling moves the crop through the upper cascades, rock ledges, lower falls and pool. This route does not replace the canonical portfolio.

Existing safe Procura/Theoses/MAP screenshot captures and verified copy are reused. Detailed case-study links point at the existing canonical pages. No production API, private records, analytics or credentials are used. Screenshot origin details: ../product-launch/CAPTURE-PROVENANCE.json and MAP-CAPTURE-PROVENANCE.json; source assets and matte: RASTER-PROVENANCE.json.

## Run
`python3 variants/waterfall-preview/build.py`

Open `variants/waterfall-preview/dist/index.html` in a browser. Output is one self-contained offline HTML file. The build needs only standard Python. To regenerate motion assets, install Pillow and NumPy, run `python3 variants/waterfall-preview/generate-matte.py`, then `python3 variants/waterfall-preview/generate-flow.py`, then build. The order matters: flow generation adds landing foam in matte B. Tier flow RGB is deliberately opaque; encoding velocity in transparent pixels loses channels during browser decoding. Water detail is a deterministic repeatable synthetic texture, not new scene photography.

On the authoring VPS, `/tmp/node_modules/playwright` and Chromium 1243 are available. Run:
- `node variants/waterfall-preview/qa.cjs`
- `node variants/waterfall-preview/record.cjs`
- `node variants/waterfall-preview/verify-public.cjs` (after preview publication)

Those evidence helpers name the VPS browser/package paths; adjust them on another machine. The recording is a finite actual-browser scroll demonstration, not a generated water video.

## Verified
The exact V2 delivery HTML ran in Chromium at 1440×900 DPR1 and DPR2, 390×844 DPR3 and 320×740 DPR2. The retina desktop water canvas is 2880×1800; phone canvas 1170×2532. Native photo placement and reduced source cropping passed. The canvas budget is DPR3, 8M pixels and the GPU limit; static photograph rendering is independent. Load, zero horizontal overflow, no runtime network requests, normal scroll, keyboard anchor navigation, pause/resume, still view and eight project links passed. Reduced-motion, no-JavaScript and unavailable-WebGL fallbacks retain the actual image and content. Browser-decoded field data showed all 50,665 sampled falling-water pixels pointing downward, with unequal speeds and 6,511 landing-foam pixels. Actual GPU readback showed 4,064 changing water samples and zero changing terrain samples. These checks demonstrate rendering/direction, not photoreal naturalness. Public HTTPS loaded the same bytes and ran the camera at all three widths; computed control/disclosure sizes were 12px.

Independent read-only finish review: ship at prototype scope. See evidence/finish-review.md for scope and corrections to the reviewer’s stale source/timestamp assumptions. Dedicated shipped reviewer/documenter agents are not exposed here: read-only explorer review plus inline documentation were used.

Physical-phone performance/battery and a true generated water video are **not** verified. The next owner check is whether V2 reads as more convincing on the actual phone. A proper video source remains an option if this illustrative motion is not sufficient.

## Review / deployment boundary
Issue #54; feature branch `feat/waterfall-motion-preview`. No automatic merge or canonical deployment. Existing Caddy config and canonical homepage hashes remained unchanged. Standalone noindex preview is stored at `/var/www/portfolio-variants/waterfall-preview/index.html`, exposed through an isolated link under the already-existing image file host. No Caddy change. Only the built index.html is served; development notes, source and evidence are not in that served directory.
