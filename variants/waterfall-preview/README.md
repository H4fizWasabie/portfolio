# Living waterfall — throwaway preview

Question: does flowing-water motion plus a scroll camera make the owner-selected waterfall a useful portfolio background?

Preview: https://image.wasabietech.com/portfolio-waterfall-preview/

## Explicit limits
This is **procedural image motion**, not AI-generated video. No configured image-to-video provider was found. The shader applies small displacement and brightness changes to an image-derived water matte; the motion is illustrative, not physically simulated fluid flow. Normal scrolling moves the crop through the upper cascades, rock ledges, lower falls and pool. This route does not replace the canonical portfolio.

Existing safe Procura/Theoses/MAP screenshot captures and verified copy are reused. Detailed case-study links point at the existing canonical pages. No production API, private records, analytics or credentials are used. Screenshot origin details: ../product-launch/CAPTURE-PROVENANCE.json and MAP-CAPTURE-PROVENANCE.json; source assets and matte: RASTER-PROVENANCE.json.

## Run
`python3 variants/waterfall-preview/build.py`

Open `variants/waterfall-preview/dist/index.html` in a browser. Output is one self-contained offline HTML file. The build needs only standard Python. To regenerate the matte, install Pillow and NumPy and run `python3 variants/waterfall-preview/generate-matte.py`.

On the authoring VPS, `/tmp/node_modules/playwright` and Chromium 1243 are available. Run:
- `node variants/waterfall-preview/qa.cjs`
- `node variants/waterfall-preview/record.cjs`

Those evidence helpers name the VPS browser/package paths; adjust them on another machine. The recording is a finite actual-browser scroll demonstration, not a generated water video.

## Verified
The exact delivery HTML ran in real Chromium at 1440×900, 390×844 and 320×740. Load, zero horizontal overflow, no runtime network requests, normal scroll, keyboard anchor navigation, pause/resume, still view and eight project links passed. Reduced-motion, no-JavaScript and unavailable-WebGL fallbacks retain the actual image and content. GPU readback showed moving water pixels with effectively unchanged rock pixels. Public HTTPS loaded the same bytes and ran the camera at all three widths; computed control/disclosure sizes were 12px.

Independent read-only finish review: ship at prototype scope. Its three stale detector follow-ups were scored resolved against actual public computed styles; see evidence/finish-review.md. Dedicated shipped reviewer/documenter agents are not exposed here: read-only explorer review plus inline documentation were used.

Physical-phone performance/battery and a true generated water video are **not** verified. The next owner decision is whether to keep this scroll treatment, and whether the final water should use a proper video-generation service.

## Review / deployment boundary
Issue #54; feature branch `feat/waterfall-motion-preview`. No automatic merge or canonical deployment. Existing Caddy config and canonical homepage hashes remained unchanged. Standalone noindex preview is stored at `/var/www/portfolio-variants/waterfall-preview/index.html`, exposed through an isolated link under the already-existing image file host. No Caddy change. Only the built index.html is served; development notes, source and evidence are not in that served directory.
