---
name: Casefile
description: The portfolio as a book of carbonless duplicate forms on a dark green-grey desk.
colors:
  desk: "#2f3b33"
  desk-ink: "#ebebdf"
  copy-white: "#fbfbf6"
  copy-pink: "#f4c3cf"
  copy-canary: "#f3e38a"
  copy-blue: "#c9ddef"
  copy-green: "#cfe6c8"
  printed-navy: "#1b2a6b"
  numbering-red: "#c4262e"
  numbering-red-on-copy: "#a81d25"
  typed-black: "#16181c"
  approval-violet: "#5b3fa8"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, .9rem + 3.1vw, 4.1rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: ".005em"
    fontVariation: "'wdth' 70"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1rem + 2.2vw, 2.6rem)"
    fontWeight: 900
    lineHeight: .96
    letterSpacing: ".01em"
    fontVariation: "'wdth' 70"
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(1.6rem, 1.2rem + 1.1vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: ".01em"
    fontVariation: "'wdth' 72"
  serial:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.2rem, 1rem + .9vw, 1.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: ".03em"
    fontFeature: "tnum"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1rem, .96rem + .2vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: ".74rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: ".07em"
  typed:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: "Archivo, sans-serif"
    fontSize: ".9rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: ".06em"
  stamp:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.2rem, .9rem + 1vw, 1.7rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: ".06em"
    fontVariation: "'wdth' 72"
rounded:
  none: "0"
spacing:
  gutter: "10px"
  gutter-wide: "20px"
  sheet-gap: "clamp(34px, 5vw, 60px)"
  sheet-pad: "clamp(14px, 3vw, 36px)"
  cell: ".4rem .7rem .6rem"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.printed-navy}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: ".65rem 1rem .7rem"
  button-hover:
    backgroundColor: "{colors.printed-navy}"
    textColor: "{colors.copy-white}"
  nav-request:
    backgroundColor: "transparent"
    textColor: "{colors.desk-ink}"
    rounded: "{rounded.none}"
    padding: ".3rem .75rem"
  nav-request-hover:
    backgroundColor: "{colors.desk-ink}"
    textColor: "{colors.desk}"
  sheet:
    backgroundColor: "{colors.copy-white}"
    textColor: "{colors.printed-navy}"
    rounded: "{rounded.none}"
    padding: "{spacing.sheet-pad}"
  cell:
    textColor: "{colors.typed-black}"
    typography: "{typography.typed}"
    padding: "{spacing.cell}"
  chip:
    textColor: "{colors.typed-black}"
    typography: "{typography.typed}"
    rounded: "{rounded.none}"
    padding: ".1rem .55rem"
  stamp:
    backgroundColor: "transparent"
    textColor: "{colors.approval-violet}"
    typography: "{typography.stamp}"
    padding: ".2em .7em .25em"
---

# Design System: Casefile

## Overview

**Creative North Star: "Carbon-copy Form"**

The portfolio is a book of carbonless duplicate forms laid on a dark green-grey desk. Each system is filed on the kind of form it replaced (a stock requisition slip, a daily count ledger, a purchase order, a course certificate), so the before and the after share one sheet. Everything printed on the form is navy ink in a condensed grotesque; everything filled in is typed black in a typewriter face; serial numbers come from a red numbering machine; approval arrives as one violet rubber stamp per sheet.

Density is that of a real office form: boxed fields that share their rules, line-item registers, signature lines, a "for office use" box. Corners are square, rules run from hairline to 1.5px, and the only depth is paper lifting off the desk. The world refuses the dark developer portfolio and the grid of screenshot cards; the work is the form, not a card about the form.

Motion on load is a single authored moment: the first sheet settles onto its copies, and its stamp lands a beat later. The Sample demos add their own (below). Content is fully visible without any of it.

**Key Characteristics:**
- Dark desk ground; sheets in the five carbonless copy colours.
- Printed vs typed: navy Archivo for what the form prints, black Courier Prime for what a person filled in.
- Boxed field grids with shared 1.5px navy rules.
- Perforated tear line at the top of every sheet after the first.
- One uneven violet stamp per sheet, rotated.
- Square corners everywhere; soft paper lift as the only shadow.

## Colors

Office stationery under desk light: five pastel copy grounds, three inks, and one stamp pad.

### Primary
- **Pre-printed Navy** (printed-navy): the form's own ink. Form titles, the statement, field labels, every rule and border, register links, button borders and the hover fill, diagram strokes. Also the text colour of every sheet.

### Secondary
- **Numbering-machine Red** (numbering-red): serial numbers ("No. 0004") on white sheets, and validation (error text, invalid-field outline and label, send failure). Never decoration.
- **Numbering Red on Copy** (numbering-red-on-copy): the same red darkened for pink, canary, blue and green copies, so it holds 4.5:1 or better on every coloured ground. Sheets swap it in automatically with their ground.

### Tertiary
- **Approval Violet** (approval-violet): the rubber stamp, every focus ring (3px outline, 3px offset), and text selection. Its rarity on the page is what makes the stamp read as an act.

### Neutral
- **Desk Green-grey** (desk): the page ground behind all sheets, the perforation slits (desk showing through), the browser theme colour.
- **Desk Ink** (desk-ink): wordmark, navigation and footer set directly on the desk; footer at 85% opacity.
- **White Copy** (copy-white): the top sheet, the continuation sheet and the request form; also the paper fill inside diagrams.
- **Pink, Canary, Blue, Green Copies** (copy-pink, copy-canary, copy-blue, copy-green): grounds for the case sheets and the offset copies under the first sheet. One ground per sheet; pink and canary also sit as the two copies under the first sheet.
- **Typed Black** (typed-black): every filled-in entry: field values, register cells, list items, input text.

### Named Rules
**The Three Inks Rule.** Navy is printed, black is typed, red is numbered. A colour never crosses roles: a label is never black, an entry is never navy, red never decorates.

**The Copy Ground Rule.** A sheet takes exactly one copy colour as its ground and re-derives its red from it. Never tint a sheet outside the five copy colours.

## Typography

**Display Font:** Archivo variable, width axis (with system-ui, sans-serif)
**Body Font:** Archivo (with system-ui, sans-serif)
**Label/Mono Font:** Courier Prime 400/700 (with ui-monospace, monospace) for typed entries

**Character:** A condensed heavy grotesque sets what the printer put on the form; a typewriter face sets what a clerk typed into it. The pairing is the world's printed-versus-filled distinction made legible.

### Hierarchy
- **Display** (900, 70% width, uppercase, fluid 1.75 to 4.1rem, line-height 1): the single statement on the first sheet.
- **Headline** (900, 70% width, uppercase, fluid 1.5 to 2.6rem, line-height .96, word-spacing .14em, balanced): form titles, one per sheet ("Stock request — PIMS"). Also the "Was / Now" markers at 1.5rem and the certificate heading.
- **Title** (800, 72% width, fluid 1.6 to 2rem, underlined 2px): system names in registers; the whole row is the link target.
- **Serial** (800, tabular, red, fluid 1.2 to 1.75rem): the form's number in the title band's right corner, with a small 600 caption under it.
- **Body** (400, fluid 1 to 1.0625rem, line-height 1.55): printed sentences on the desk and the sheet (subtitles at .88rem/500, captions at .82rem).
- **Label** (700, .74rem, .07em tracking, uppercase): printed field labels at the head of every cell, register column heads, signature-line captions.
- **Typed** (Courier Prime 400, 1rem, line-height 1.55, black, 68ch max): every entry inside a field, register cells (.92rem/1.35), list items, form inputs.

### Named Rules
**The Printed vs Typed Rule.** If a person would have written it on the form, it is Courier Prime in typed black. If the printer put it there, it is Archivo in navy. Never set an entry in Archivo or a label in Courier.

**The Condensed Display Rule.** Heavy display text is always narrowed through the width axis (70 to 72%) and uppercased; it is never set at normal width.

## Layout

Sheets stack in a single column centred on the desk at up to 1100px wide (880px for the continuation, particulars and request sheets), with a 10px desk gutter on phones and 20px from 600px. Sheets are separated by a fluid gap (34 to 60px) and padded fluidly (14 to 36px). The first sheet is narrower (80% of the column) so its two offset copies show at the right and bottom edges; the offsets shrink from 9/18px to 8/14px under 1100px and 3/6px under 600px.

Inside a sheet the grid is the form's own: a title band (title and subtitle left, serial right) closed by a 4px double navy rule, then rows of boxed cells in one or two columns that share borders, then registers, then a foot row with the action button and the stamp. Case sheets place their fields by named areas (problem, built, how, limits, stack, facts, diagram) and collapse to one column at 760px. A homepage Sheet is the short version: the title band, the fields, the form with its Sample demo, one line of what was built beside the facts on record (CaveText is one line under CaveLMS), and the foot. The problem, the full account, how it works, the limits, the stack, the screens and the implementation notes are only on the system's `/work/<slug>/` page, where the cell labels are h2 under the page's h1 (h3 under a homepage Sheet's h2, so no heading level is skipped). Registers become stacked label/value rows under 760px, with the column head printed as a small label beside each value.

The wordmark and navigation sit on the desk above the first sheet, not on a sheet; the footer sits on the desk below the last.

## Elevation & Depth

Depth is paper on a desk and nothing else. Sheets carry a soft two-layer lift; the copies under the first sheet carry a slightly shallower one and are offset and rotated a fraction of a degree. There are no raised buttons, no hover lifts and no hard offset shadows; interaction is shown with ink (fills, underline weight), never elevation.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 1px 2px rgb(0 0 0/.3), 0 14px 34px rgb(0 0 0/.34)`): every sheet on the desk.
- **Copy lift** (`box-shadow: 0 1px 2px rgb(0 0 0/.3), 0 8px 22px rgb(0 0 0/.25)`): the pink and canary copies under the first sheet.

### Named Rules
**The Paper Lift Rule.** Only paper casts a shadow, and only the soft lift of a sheet off the desk. Nothing on a sheet is elevated.

## Shapes

Every corner is square (0 radius), including buttons, inputs, chips and the photo box. Form language is ruled: cells share 1.5px navy rules so a grid reads as one printed box; registers use 1.5px outer and header rules with 1px row and column rules; the title band and the certificate use a 4px double rule. Sheets after the first open with a perforation: a row of 7px cut slits every 13px, 2px tall, with the desk showing through. Tilt is native to the paper world: stamps rotate between about -9 and 6 degrees, the copies rotate a third of a degree, the portrait sits at -1.5 degrees inside its printed photo box.

## Components

### Buttons
Buttons are fields too: a ruled box with a printed label.
- **Shape:** square (0), 1.5px navy border.
- **Primary:** transparent on the sheet, navy uppercase label (700, .9rem, .06em tracking), padded .65rem 1rem .7rem, followed by a 16px inline-SVG arrow.
- **Hover / Focus:** fills navy and the label turns the sheet's own ground colour; focus is the violet 3px ring. Disabled (sending) drops to 60% opacity with a progress cursor.
- **Plain link:** a 600-weight underlined text link beside the button for the secondary action ("Read the résumé").

### Chips
- **Style:** typed black Courier entries in a 1px navy box, square, padded .1rem .55rem, wrapped with .4rem gaps. Used for "Built with".

### Cards / Containers
- **Sheet:** square, copy-colour ground, navy text, sheet lift, fluid padding; perforated top on every sheet after the first.
- **Cell:** a boxed field; label at the top, typed entry under it; cells in a grid share their 1.5px rules.
- **Internal Padding:** cells .4rem .7rem .6rem; register cells .5rem .7rem.

### Inputs / Fields
- **Style:** the whole cell is the field. Input and textarea are borderless and transparent inside the cell, typed black Courier 1rem, navy caret; the textarea starts at 7.5rem and resizes vertically.
- **Fill-in entries in the demos** (the DD count, the CaveLMS exam name) read as something to write in: a faint white fill, a dotted 2px navy writing line under the typed value, and a navy 1.5px box on hover and focus; once the entry is locked, the box and line go.
- **Focus:** violet 3px outline around the whole cell, 2px offset.
- **Error:** the cell takes a 2px red inset outline, its label turns red, and a red 600-weight message appears under the input. Focus still wins over error with the violet ring.

### Navigation
- **Style:** on the desk in desk ink, Archivo 600 at .95rem. Links underline with a 1px rule on hover; "Request work" is a boxed field-button with a 1.5px desk-ink border that fills desk ink on hover. Focus rings on the desk are canary, not violet. On phones the links wrap under the wordmark.

### Register
A line-item table printed on the form: uppercase label heads, typed Courier rows, a navy item number, and the system name as a condensed underlined link whose hit area covers the whole row. Rows tint navy at 7% on hover; a flagged row in a sample slip keeps that tint and rings its value with a 1.5px navy outline and a small uppercase note.

### Stamp
The violet rubber stamp: a condensed 900 uppercase word, never under 1.2rem so it stays large text (3:1 is enough, and the violet holds 4:1 or better on every copy), in a 3px border with a 1px inner border, at 92% opacity, rotated per instance and masked with fractal noise so the ink lands unevenly. One per sheet, placed in the foot row or over the register; decorative and hidden from assistive tech. The request form's "Received" stamp appears only when the request is sent.

### Signature Lines and Office Box
Printed captions with a 1px navy line to sign on, initials typed in Courier; and a dashed "For office use" box that receives the stamp.

### Sample demos (forms.js and more.js)
With JavaScript each case sheet becomes a small working demo on fictional data; without it the sheet shows its filled-in sample. Controls are field vocabulary: boxed `.btn` buttons, the request form's boxed inputs, square tick-boxes for choices, a text "Start again" link. Entries are typed on in Courier Prime (about 25ms a character); each completed step changes the sheet's stamp word and thunks it; every change is announced in a visually hidden `aria-live` region. Each demo says how to play in a one-line printed `.hint` (Procura, PIMS, DD), shown only when the script runs. PIMS and Procura keep their "Was" diagram on a pink carbon copy under the top form: "See the paper process underneath" ("Put it back" once lifted) hinges the form at its top edge and tilts it back about 64 degrees under a 1200px perspective, so it stays a foreshortened trapezoid of paper that casts a soft shadow on the copy (inert while lifted). The stage closes up around the copy, which lays the diagram out horizontally on desktop and as a vertical stack on phones, below the sheet's footprint. On Procura the Reorder check sits above the purchase order, as it drafts the order lines; only the purchase order form lifts. All of it is instant under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** file each piece of work on the kind of form it replaced, with its sample entries labelled "Sample entries, fictional".
- **Do** set printed text in navy Archivo and filled-in text in black Courier Prime, with no exceptions.
- **Do** give every sheet one copy-colour ground, one serial or title band, and at most one violet stamp.
- **Do** box related fields in a shared-rule cell grid (1.5px navy) instead of spacing them apart.
- **Do** use the darker red (numbering-red-on-copy) on every coloured copy.
- **Do** keep motion to the load settle, the stamp landing and the Sample demos' own motion (typed entries, the stamp thunk on each step, the lift tilt), all gated on prefers-reduced-motion.

### Don't:
- **Don't** round a corner anywhere.
- **Don't** add shadows beyond the paper's own lift, and never a hard offset shadow.
- **Don't** use red for anything but serial numbers and validation.
- **Don't** use violet for anything but the stamp, focus and selection.
- **Don't** set display text at normal width or in a system face.
- **Don't** lay work out as a grid of screenshot cards; screenshots sit inside a cell with a 1.5px navy rule and a caption.
