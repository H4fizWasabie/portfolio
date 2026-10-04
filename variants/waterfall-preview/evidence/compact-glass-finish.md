# V6 clearer, shorter cards — finish review

Issue #60 / PR #61. Ready for owner preview, not production promotion.

## Why V5 failed
At an actual browser viewport1280×604, the six card heights were440.3,872.9,916.3,1005.0,575.2,466.9px. Wider images retained their natural aspect ratio in a vertical stack. The V5 tests checked horizontal overflow and readable CSS, not whether whole desktop cards fit between viewport edges. Procura, Theoses and MAP all shared this cause; About also exceeded the practical reading budget at this short height.

## Complete scoped correction
- Preserve floating cards, hero arrangement, exact original imagery, factual copy, font/palette, approved resume/PDF and all three original water/control/resume scripts.
- Desktop shell62% moss with24px frost.28% ink veil protects text, uniform for reading-only cards and fading52–72% across project cards. Media disclosures get matching local text protection. Worst-all-white oat text bound4.5913:1, mobile5.1658:1. No opacity on content.
- Three project cards use semantic copy/media wrappers with1:1.05 columns,24–28px gap,24–40px padding. Text/link left; complete contain-fit screenshot right, max-height:min(42svh,360px).
- Three progressively enhanced Enlarge buttons open a native modal with original image, alt and screenshot disclosure. Escape/Close restores opener focus; background focus is blocked. Dialog image is created only with its real source when opened, rather than a broken/empty placeholder. No JS/dialog support means no dead button and retained real inline image/project link.
- Non-intro sections use100svh minimum with64/88px top/bottom spacing. Short desktop views use28px panel padding (project24px),16px body and28–36px h2. Below1101px desktop width,80vw cards keep columns readable. About/Contact are covered, not just projects.
- Mobile remains stacked, original78%/12px material, normal page flow. Project links now stay with descriptions before screenshots; mobile is not falsely claimed pixel-identical. Expanded project index/resume use normal page scrolling, no cropping or separate card scrollbar.

## Runtime proof after final UI edit
`compact-glass-qa.cjs` passed locally and against actual HTTPS across12 viewports:1280×604,1280×720,1440×640,1440×900,1920×640,1920×1080,1024×604,820×600,820×1180,390×844,320×740,667×375. Every collapsed desktop card's top/bottom was within viewport with20px minimum margin. All visible child boxes stay within card; overflow visible/no hidden content. Twelve widths/heights verify three images contained/decoded, text-left/image-right or mobile stacking, enlarged images loaded, modal background focus blocked, keyboard Enter/Escape/Close/opener focus, expanded eight-project index/resume, no horizontal overflow or browser errors, native preference fallbacks and no-JS.

At1280×604, project heights are404.3,393.4,436.0px; all six card heights391.5,404.3,393.4,436.0,471.7,394.5px. The whole-card check now catches the owner's actual complaint instead of merely detecting page overflow.

Actual-public motion QA passed decoded flow direction/speed/foam,4088 changed water samples withzero changed rock samples (exact counts in JSON), pause/resume/camera/still, normal keyboard anchors, reduced-motion, no-JS and no-WebGL. Public resume QA passed1440/768/390/320px with and without JavaScript: native keyboard preview, reader/PDF consistency, actual download, no overflow/errors. Existing script invariants compare against saved V5 built baseline.

## Visual and mechanical inspection
Inspected hero, all three desktop project cards together at1280×604, and390px stacked mobile. Text leads, media supports, full cards leave waterfall visible to the right. Closed-modal capture initially ran before the browser's compositor repainted; QA now awaits actual two-frame paint readiness instead of delivering that stale screenshot. Confirmation shows the hero text intact.

One mechanical detector pass found an initially sourceless hidden viewer img; corrected by creating the image only with its actual source at opening and verifying image decoding on all views. Remaining advisories concern incumbent border/shadow, mobile22px radius and existing/documented fluid/label sizes; preserve the owner-approved visual world. The detector JSON records the initial finding, not a falsely claimed clean post-fix scan.

## Publication and review gates
Separate HTTPS: https://image.wasabietech.com/portfolio-compact-glass-preview/
Static destination: `/var/www/portfolio-variants/compact-glass-preview/index.html`, exposed by a new image-host symlink through existing Caddy file serving. Source is self-contained/noindex. V5 comparison and original waterfall preview preserved. Canonical homepage bytes, release symlink and Caddy file confirmed unchanged. No merge or production promotion authorized.

## Limits
Chromium emulation is not physical Safari/phone testing. Unsupported-backdrop-filter engine and old-device desktop blur performance remain unverified. Native no-dialog branch is progressively hidden by construction, not an old-engine test. Very short/mobile viewports and deliberately expanded content retain page scrolling; no universal fit promise for arbitrary window heights or zoom. No generated video, motion redesign or recorded walkthrough requested. Owner desktop visual/readability judgment is next.
