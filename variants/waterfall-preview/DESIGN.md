---
name: Living waterfall motion preview
description: Scoped waterfall motion treatment; not the live portfolio design system.
colors:
  oat: "#e8ddc5"
  moss: "#293321"
  ink: "#172016"
  sage: "#8b9d83"
  reading-surface: "rgba(35,46,30,.78)"
  reading-fallback: "rgba(35,46,30,.94)"
  secondary-hover: "#36432d"
typography:
  display:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "clamp(38px,4.4vw,65px)"
    fontWeight: 650
    lineHeight: 1.09
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "clamp(32px,3.1vw,48px)"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
  label:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "12px"
rounded:
  reading: "24px"
  screenshot: "16px"
  controls: "18px"
  control-action: "12px"
  motion-panel: "16px"
  button: "999px"
spacing:
  reading: "40px"
  reading-mobile: "27px"
  paragraph: "22px"
components:
  button-primary:
    backgroundColor: "{colors.oat}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "14px 21px"
  reading:
    backgroundColor: "{colors.reading-surface}"
    textColor: "{colors.oat}"
    rounded: "{rounded.reading}"
    padding: "40px"
---
# Design System: Living waterfall motion preview

## Overview
**Creative North Star: "Living waterfall"**
Owner-approved image and scroll interaction, applied only to a throwaway preview. The canonical Product Launch design record is unchanged. Existing Epilogue and oat lettering remain; the forest background is the selected new material.

**Key Characteristics:**
- Image leads; opaque-enough moss panels carry readable portfolio content.
- Camera travel and water-only movement form one continuous scene.
- Simulation is explicitly identified; this is not an image-to-video result.

## Colors
Oat lettering, dark moss reading surfaces, sage scrollbar and natural photograph colours. The CSS declares terracotta but does not use it visibly; it is not a new normative token here.

## Typography
Self-hosted Epilogue throughout. Desktop body 16px; mobile body 14px. Display contracts to clamp(34px,8vw,46px) below 761px; headings contract to clamp(30px,7vw,40px). Controls, disclosures and scene labels compute to 12px at 1440, 390 and 320 widths. The final global override follows both media blocks; earlier declarations do not describe computed size.

## Layout
Normal document scroll; six left reading passages, with full-viewport fixed background. The static photograph is rendered by the browser independently of the transparent water canvas; camera placement is shared and updates only when the view changes. Desktop camera zoom now ranges 1.18–1.02, mobile approximately 1.074–1.01. The original 1920×1280 image is unchanged, not regenerated or claimed as new 4K detail. Desktop panels max 630px (650px for about and large displays); mobile panels full available width, padded 27px. Mobile leaves forest visible above its opening reading panel and centres the upper cascades. V4 replaces the wide preview toolbar with a compact bottom-right motion bar: always-visible Pause water plus a native Motion disclosure. Measured collapsed bar201.3125×54px at1440/390/320/667 widths; the390 phone used0.3951 of V3 toolbar area. Safe-area-aware14px offsets and44px touch targets. The260px options panel opens upward with Still view and the unchanged simulation/fallback status. Main content geometry, V3 cards and first water/camera script remain byte-identical.

## Elevation & Depth
V3 reading cards use a 78% moss tint over the photograph and retain the existing 12px frost, 0 18px 50px rgba(23,32,22,.22) shadow and subtle border. Transparency applies only to the background: text, images and actions keep opacity1. The CSS base surface is 94% moss with no blur; supporting browsers opt into glass through @supports for either backdrop-filter or its WebKit-prefixed form. Reduced-transparency and increased-contrast preferences restore the 94%/no-blur surface. Those preference branches ran in actual Chromium; an unsupported-blur engine could not be forced and remains unverified. Toolbar uses a defined border with no shadow. Header gradient protects text over bright vegetation.

## Shapes
Reading corners 24px / mobile 22px; screenshot corners 16px; primary actions are pills; motion bar18px, its buttons12px and upward options panel16px.

## Components
Primary actions use oat background and dark ink. Secondary actions retain their oat outline but now use fully opaque moss and #36432d hover to prevent loss of contrast over bright water. Cream body text against the mathematical all-white backdrop bound measures5.1658:1; six cards at desktop and mobile preserve V2 bounding boxes. Focus is a 3px oat outline offset 5px. Hover background transitions last .3s, disabled under reduced motion. All eight project links lead to actual canonical case studies. Water controls retain accessible pressed state; reduced motion disables both animated water and camera. Native Motion disclosure exposes expanded/collapsed semantics (Chromium AX DisclosureTriangle), Enter opens it and Tab reaches Still view. Escape closes and returns focus to Motion; outside pointer or focus closes without trapping the visitor. Pause is always directly accessible and described by the status. Native disclosure still works without JavaScript; disabled controls and motion-unavailable status remain readable.

## Do's and Don'ts
- Do keep simulation/fallback disclosure accessible in Motion options; keep safe-screenshot descriptions visible.
- Do retain normal scrolling, pause, static fallback and reduced-motion behaviour.
- Don't animate foliage or rocks intentionally; matte derives from actual image colours.
- Don't promote this prototype or its design record to the homepage without owner review.

Water V2 uses opaque RGB tier velocity/phase data, two-phase downstream image advection, unequal moving strands and water-only landing foam in matte B. ROI gates are feathered before image-colour classification so moving curtains have no hard rectangular crop edges. The native-density water overlay is bounded by DPR3, 8 million pixels and the GPU renderbuffer limit; the underlying browser photograph is not subject to that canvas budget. Native DPR2 desktop and DPR3 phone were exercised. Do not store velocities under alpha0: browser premultiplication discards them. These are rendering rules, not a new page identity.

Not canonized: approximate water matte, illustrative flow field and preview toolbar are prototype devices, not finished cinematography. Physical-phone frame rate, battery use and a photoreal generated water loop remain unverified. Documentation used the inline fallback because a writable shipped documenter agent is unavailable in this tool surface.
