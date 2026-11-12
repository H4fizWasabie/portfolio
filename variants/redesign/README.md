# Redesign: the Case File (production) and archived candidates

The live site is the **Case File** (GLOSSARY.md, ADR 0003): a book of carbonless duplicate forms on a desk. The homepage is the
"Record of work" **Sheet**, whose **Register** lists the four systems in production; each of them follows on a Sheet shaped like the form it
replaced (PIMS a stock requisition slip, the DD Drugs Register a daily count ledger, Procura a purchase order, CaveLMS a course
certificate with CaveText attached), each with a **Sample demo** (fictional data, progressive enhancement). Where a system replaced a
paper process, "See the paper process underneath" lifts the top sheet to show it as a diagram on the **Copy** underneath. A Sheet on the homepage is the short version (the form, its demo, one line of what was built and the facts on record); the full case study is on the system's `/work/<slug>/` page. Theoses, 89lab, MAP and Yen follow on a
continuation Sheet, then Particulars and the Request form. Every project keeps its page under `/work/<slug>/`, `/projects/` is the
full Register and `/resume/` is the résumé reader in the same look. Without JavaScript the page reads as filled-in sample forms and
the Request form opens the visitor's mail app. The design system is `casefile/DESIGN.md`.

The **Workshop** (the House tour), `turntable` and `workflow` are archived: still in the repo and built as noindex previews, served
by the live server at `/variant-workshop/`, `/variant-turntable/` and `/variant-workflow/` (see "Archived: the Workshop" below).

## Layout

- `content.cjs` site wording and project order; project facts come from `../product-launch/projects.cjs`.
- `blocks.cjs` markup shared by all variants (head with production SEO, galleries, case-study body).
- `build.cjs` builds a variant into `dist/<variant>/`; `publish.cjs` builds the Case File as the production site into `dist/site`; `publish-test.cjs` is the production test; `verify-public.cjs` checks the live site; `release.sh` ships it.
- `casefile/` the live design:
  - `page.cjs` the page templates: homepage, the four systems' Sheets and pages, `/projects/`, `/resume/`, and what is only about a form (rows, department, status). It hands its shared Sheet pieces (`kit`) to `more.cjs`.
  - `more.cjs` the Theoses, 89lab, MAP and Yen pages, each on a form of its own.
  - `diagrams.cjs` the "Was" and workflow diagrams.
  - `main.js` the one script (bundled by the build); it loads `forms.js` (the four systems' Sample demos and the lift control), `more.js` (the demos on `more.cjs`'s pages), and `request.js` (the Request form: posts JSON to the contact API, falls back to mail). `kit.js` holds what `forms.js` and `more.js` share (typed entries, Stamp, live region, buttons, error flags).
  - `style.css` the stylesheet; `DESIGN.md` the design system.
- `photo/hafiz-portrait.webp` owner-supplied portrait, cropped, EXIF removed (used by the Case File and the Workshop).
- `fonts/` self-hosted fonts and licences; `demos.cjs` / `demos.js` the demos of the archived previews.
- Pages use `static/` for their files because Caddy serves `/assets/` from the legacy app.

## Commands

```sh
npm ci                                   # in this directory
node build.cjs [variant...]              # noindex previews (incl. the archived ones) into dist/<variant>/
node publish-test.cjs                    # production build into dist/site + checks (needs résumé fonts)
BASE_URL=http://127.0.0.1:PORT node verify-public.cjs   # the public checks against any server (default: the live site)
```

Release: `release.sh` on the VPS (see `resume/DEPLOYMENT.md`); `verify-public.cjs` checks the live site.

## Archived: the Workshop

Nothing in the production build or its checks uses it. Its homepage tours a **House** (ADR 0002): a two-storey concrete house on the edge of a still
lake at dusk, with a Room per service. The House is the background of the whole homepage: the canvas is fixed behind the page and the
scroll flies the camera through it, across a run of `[data-stop]` steps in `workshop/page.cjs` whose `data-look` names a key of `STOPS`
in `room.js`, snapped by native scroll snapping. Without JavaScript, with reduced motion or without WebGL the page keeps its static
layout. `?probe` (`houseProbe()`) checks the camera never passes through or close to a wall, floor, ceiling or pane. Each project page
shows its object from its Room's asset in the same baked light.

- `workshop/` page templates, styles, `main.js` (small entry; it loads `room.js` once the page has painted), `room.js` (three.js: the House's tour and the project pages' object viewer), `theme.js` (day/night lamp switch).
- `workshop/model/` the House, all outputs committed: `build_house.py` (Blender: models it from CC0 textures in `textures/` and bakes the lighting in Cycles into a second UV set), `room_<slug>.py` (a Room each, baked day and night), `build_backdrop.py` (the mountain-in-cloud plate) and `build_water.py` (the lake's ripple normal map), run by `build-house.sh` (then gltfpack and webp). They produce `house.glb`, the `house-light*.webp` and `house-wet.webp` bakes, `backdrop.webp`, `water-normal.webp` and `room-<slug>*.glb` / `-light*.webp`. `HOUSE_ROOMS=ai ./build-house.sh` rebuilds only the named Rooms. `render-stills.cjs` renders `poster.webp`, `poster-phone.webp` and every project's day and night thumbnail from a built page.

```sh
BLENDER=/path/to/blender workshop/model/build-house.sh            # after editing the House (HOUSE_DRAFT=1 for a quick, noisy bake)
CHROME=/path/to/chrome node workshop/model/render-stills.cjs URL  # after House or camera changes, against a served preview
```

`turntable` (a photo-studio sweep with a turntable of devices) and `workflow` are the other two archived candidates. The archived previews predate CaveLMS: `build.cjs` leaves it out of them.
