# V5 wider reading cards — finish review

Verdict: ready for owner preview, not approved for production. Issue #60.

## Cause and complete scope
The published desktop card's 630px cap gave the bright waterfall visual priority and forced the headline into four lines. Two further caps existed: About at 650px and a ≥1600px media rule at 650px. All three now use one width token, min(1120px,60vw). Desktop padding follows clamp(32px,3.6vw,56px); body text increases from 16px to 18px. The heading's authored line break now produces two lines on typical desktop viewports. No copy changed.

Owner requested clearer floating glass while keeping the scenery legible outside the reading area. Desktop tint drops from 78% to 75% moss; backdrop blur rises from 12px to 24px. This exposes atmosphere rather than competing sharp details. Text, images and actions retain opacity 1. Mobile keeps its exact V4 card geometry, typography, 78% tint and 12px blur. Reduced-transparency/increased-contrast and unsupported-blur base remain 94% moss with no blur.

This is a refinement of the approved organic waterfall/Epilogue/oat world, not an identity replacement. The owner's explicit glass brief overrides the older root PRODUCT.md generic-glass warning. Controls, photograph, flow assets, all three scripts, links and approved resume payload remain unchanged.

## Actual rendered inspection
Inspected moving-water desktop hero (1440×900), 1280×720 hero, 1440×900 Procura passage and 390×844 phone hero. Desktop reading panel is now the obvious first group, with two-line headline and separate action group; the waterfall remains clearly visible on the right. Larger screenshots use the extra space. Long cards retain ordinary document scrolling rather than clipping. Phone composition remains incumbent. No UI repair was needed after this batched inspection.

## Executed verification
- Scoped suite passed against the actual HTTPS preview at 1280×720, 1440×900, 1920×1080, 1024×768, 820×1180, 390×844, 320×740 and 667×375. Checks all six cards, shared desktop widths, exact mobile geometry against V4, no horizontal/child overflow, opaque content, computed tint/blur/body size, eight project links and expanded resume. Keyboard Motion, Escape/focus dismissal, bounded options panel and 44px targets pass at all eight sizes.
- Worst physically possible white backdrop: desktop oat body contrast 4.6837921725:1; mobile 5.1658123955:1. White-backdrop screenshot captured. Native Chromium preference emulation verifies both 94%/no-blur fallback branches.
- Existing motion suite ran on the real HTTPS artifact at desktop: native image/water geometry, downward tier field, unequal speeds, foam, moving-water pixels and zero moving terrain samples; pause/resume, scroll camera, still, keyboard anchors, reduced-motion, no-JS and no-WebGL all pass. See separate public motion results. Full old multi-DPR motion matrix was not repeated because rendering/scripts/assets did not change.
- Existing resume suite passed offline at 1440/768/390/320 with JS on/off: native keyboard open/close, selectable readable text, correct PDF hash on actual download, no overflow/errors. Public scoped suite verifies expanded reader/no overflow, and HTTP byte comparison confirms the exact same payload is served.
- All JavaScript byte-identical to published V4 source. Preview HTTPS body byte-identical to the tested offline build. Canonical homepage body, canonical release pointer and Caddy config hash unchanged. Previous preview untouched.

## Test correction
Initial new body-size assertion accidentally sampled `.project-title` (intentionally 17px), not body copy. Corrected selector to `p:not(.project-title)` and reran successfully; this was a test bug, not a UI defect.

## Detector
One manual mechanical scan after UI edits: advisory findings only. New 18px desktop body is now documented. Remaining advisories concern preserved incumbent mobile radius/type sizes, palette usage and popup border/shadow treatment; no unrelated design-system repair or visual changes. No second scan, per refinement guidance.

## Delivery
Separate noindex preview: https://image.wasabietech.com/portfolio-wide-glass-preview/
Static directory: /var/www/portfolio-variants/wide-glass-preview/
Existing image-host link: /home/theoses/instagram/images/portfolio-wide-glass-preview
Built HTML SHA256: 8f9476451469f3e1a4382372d97761cb80b4972aa52084a48306437d256b3205
Built HTML bytes: 3254302
Feature branch: feat/waterfall-wide-glass. PR for owner review; no merge or production promotion authorized.

## Unverified / deferred
Physical phone/Safari rendering, battery impact and actual unsupported-backdrop-filter engine remain unverified. Browser-size emulation is not hardware testing. Stronger desktop blur may affect performance on older machines; mobile blur is unchanged. No new recorded walkthrough, generated water video, further motion tuning, global dimming or production deployment requested. Owner's desktop reading/focus judgment is the next gate.
