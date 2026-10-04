# V7 visible eight-project collection — finish review

Issue60 / PR61; owner-approved preview only, no production promotion.

## Why breadth was hidden
The full collection was a small native disclosure inside MAP. It was both visually subordinate and semantically grouped with one featured project. Making that button larger would not fix the hidden collection or its placement.

## Shipped scope
Hero primary label is Explore8projects (rendered with spaces) and targets #projects. After MAP/before About, a standalone All8projects card shows the complete approved eight-project collection without expansion. Flat semantic list: two desktop columns/one mobile column, names16px, purpose14px, 10px row padding,24px column gap and links at least44px tall. SVG arrows signal direct canonical case studies. No additional screenshots/nested cards. Remove MAP disclosure and all dead .index styles.

Purpose copy is sourced from variants/product-launch/projects.cjs. It distinguishes Hill’s self-directed/unaffiliated concept; does not invent Yen parity, project adoption, commissioned client work or performance. All four original V6 scripts, featured copy, original imagery, approved resume/PDF and glass treatment stay unchanged. The existing Work navigation still leads to featured projects; hero count action offers a direct collection route.

## Checks actually run against public preview
- compact-glass-qa.cjs on https://image.wasabietech.com/portfolio-all-projects-preview/:1280×604,1280×720,1440×640,1440×900,1920×640,1920×1080,1024×604,820×600,820×1180,390×844,320×740,667×375. All seven cards fully fit tested desktop viewport edges; mobile stacks and scrolls normally. Names/purpose lines/direct links are visible without any details ancestor. No image or accordion in overview, no MAP disclosure, exact eight approved names, correct hero text/anchor, no horizontal overflow/errors. Original three screenshot viewers still open/load the complete real image, block background focus, close by Escape/Close and restore focus. Expanded resume retains normal page scrolling.
- At1280×604 overview height424.84375px. At820×600 it is502.9375px. Initial narrower desktop test caught2.94px of insufficient bottom clearance; reducing row padding12→10px fixed the structure without shrinking typography.
- Native no-JS collection/hero anchor/resume verified. Reduced-motion context avoids smooth-scroll races and waitForFunction RAF polling in no-JS; anchor top is directly asserted. JS motion navigation separately exercises actual smooth navigation.
- Public qa.cjs desktop: actual decoded tier flow, actual transparent GPU water changes (4095 of4311 water samples) with zero changed rock samples, scroll camera, pause/resume/still, keyboard featured navigation, eight visible links, reduced-motion, no-JS and no-WebGL fallbacks.
- Public resume/qa.cjs:1440,768,390,320px with and withoutJS; native preview/keyboard/visible readable paper, exact approved PDF download, no overflow/errors.
- All eight canonical case-study URLs return200 with the matching project-specific title (not generic SPA fallback).
- Detector ran once: no warnings/errors, only inherited/pre-existing design advisories (border/shadow, parser type/radius/color ramp limitations). No unrelated redesign/drift repair. Sidecar JSON parses.
- Source investigation ruled out archived card-qa.cjs (V3-specific six-card treatment) and wide-glass-qa.cjs (V5-specific geometry/parity) as current V7 tests. The active motion test’s obsolete .index selector is updated. No seven-project-count mistake: eight project links, seven page cards.

## Publication safety
New /var/www/portfolio-variants/all-projects-preview/index.html, atomic checked temp-file swap in fresh destination, image-host symlink /home/theoses/instagram/images/portfolio-all-projects-preview. Build3261381bytes, SHA256 e19ced137ce2210138c6c9266f5d35432c8fd6167cefe54e4306bbb1f3a3d53e; exact HTTPS bytes match. V6 preview remains unchanged. Canonical homepage matches before/after; Caddy and canonical release symlink unchanged.

## Deferred
Physical phones/Safari, older desktop GPU blur performance and unsupported blur/dialog engines remain unverified. The collection’s long mobile layout deliberately scrolls normally, never uses card-internal scrolling or clipped text. Owner visual review is next; no merge or promotion authorized.
