---
name: Living waterfall motion preview
description: Scoped waterfall motion treatment; not the live portfolio design system.
colors:
  oat: "#e8ddc5"
  moss: "#293321"
  ink: "#172016"
  sage: "#8b9d83"
  reading-surface: "rgba(35,46,30,.91)"
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
Normal document scroll; six left reading passages, with full-viewport fixed background. Desktop panels max 630px (650px for about and large displays); mobile panels full available width, padded 27px. Mobile leaves forest visible above its opening reading panel and centres the upper cascades. The fixed preview toolbar is development UI, not a proposed production element.

## Elevation & Depth
Reading panel uses 0 18px 50px rgba(23,32,22,.22), a low-opacity border and 12px backdrop blur for separation from the photograph. Toolbar uses a defined border with no shadow. Header gradient protects text over bright vegetation.

## Shapes
Reading corners 24px / mobile 22px; screenshot corners 16px; primary actions are pills; preview toolbar 18px and its buttons 12px.

## Components
Primary actions use oat background and dark ink. Secondary actions are transparent with oat border. Focus is a 3px oat outline offset 5px. Hover background transitions last .3s, disabled under reduced motion. All eight project links lead to actual canonical case studies. Water controls have accessible pressed state; reduced motion disables both animated water and camera.

## Do's and Don'ts
- Do keep simulation disclosure and safe-screenshot descriptions visible.
- Do retain normal scrolling, pause, static fallback and reduced-motion behaviour.
- Don't animate foliage or rocks intentionally; matte derives from actual image colours.
- Don't promote this prototype or its design record to the homepage without owner review.

Not canonized: approximate water matte, sinusoidal shader motion and preview toolbar are prototype devices, not finished cinematography. Physical-phone frame rate, battery use and a photoreal generated water loop remain unverified. Documentation used the inline fallback because a writable shipped documenter agent is unavailable in this tool surface.
