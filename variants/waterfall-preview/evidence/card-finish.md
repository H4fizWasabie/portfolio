# V3 glass cards — bounded finish check

Approved narrow refinement: translucent moss reading backgrounds, gentle frost, opaque content/actions. The actual source main markup and entire water/camera script are byte-identical to V2. Cards keep the same measured desktop/mobile bounding boxes; no copy/layout/asset changes.

Built/source-grounded treatment:78% moss/12px frost through standard or prefixed @supports. The CSS base and reduced-transparency/increased-contrast modes are94% moss/no blur. Secondary buttons keep oat outlines but become solid moss with dark-moss hover; cream text, screenshots and buttons never inherit reduced opacity. Existing shadows/borders/rounding retained.

Actual artifact checks: all six cards at1440DPR2,390DPR3,320DPR2. Worst possible white photographic backdrop yields nominal body contrast5.165812395461318:1. Solid secondary hover contrast checked. Both real CDP media preference branches passed. Full V2 water/controls/fallbacks re-ran on the V3 delivery;4100 sampled water pixels changed and0 terrain samples changed.

Visual inspection: desktop and phone hero plus white-backdrop phone render were inspected together. Background detail shows softly through the card without obscuring cream body text; no material gap requiring another UI edit.

Unverified: disabling CSSBackdropFilter via Chromium flag did not actually remove engine support, so unsupported-engine @supports base is SKIP (not PASS). Preference-based no-blur rendering is verified. Physical-phone battery/frame-rate and WebKit browser rendering unverified. Existing12px blur was not increased.

Source-scoping explorer incorrectly said old91% tint already met78% request; actual computed-style assertions demonstrate the change instead. Scoped design docs/sidecar updated inline; canonical design record not modified. Public browser checks follow atomic preview publication. Main homepage/Caddy must remain identical. PR55 stays draft for owner review; no merge/promotion authorised.
