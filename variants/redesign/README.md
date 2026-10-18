# Redesign: the Workshop (production) and two archived candidates

The live site is the **Workshop**. Its homepage tours a **House** (see GLOSSARY.md and ADR 0002; it was called the Building
before) where it once toured a small clay room: the hero sees a two-storey concrete house on the edge of a still lake at
dusk, its glass walls warm with light, and the scroll glides the camera over the water, onto the terrace, in through the
sliding glass and up the stairs. The House is the background
of the whole homepage: the canvas is fixed behind the page and the scroll flies the camera through it. The page is a run
of steps about a screen tall (the hero, the sliding glass, a doorway per service with the climb between the floors (a stop at each of the three How I work posters on the stair wall, which `room.js` draws in the page's type), the balcony for teaching, then the goodbye
where the camera lifts out over the lake; About and Contact are plain page below it), each a `[data-stop]` in `page.cjs` whose `data-look`
names what the House shows (a key of `STOPS` in `room.js`); its panel sits at the bottom on phones and to one side on
wide screens, and native scroll snapping (`y mandatory`) rests each step in place. `room.js` (`STOPS`, `measure`,
`stepTour`) keys the camera to that same scroll position, so the view on screen is the one the panel names; the
`[data-room]` block at the end of `workshop/style.css` lays it out. About and Contact are stops too: each is at least a
screen tall (`100lvh`), has `scroll-snap-stop: always`, and rests with its top at the top of the screen, the navigation bar
covering its own top padding (no `scroll-margin`: a margin would leave the end of the section above showing, most
visibly while the bar is tucked away). A section taller than the screen (About and Contact on phones) can rest anywhere
inside itself, never beside its neighbour. Without JavaScript, with reduced motion, without WebGL or in `?still=` renders
the page keeps its static layout. Until each service's Room exists (the House tickets), the doorways are closed doors
and the shelves double as the doorway stops. The camera's path between stops is a smooth curve through them, with waypoints (`via` in `STOPS`) that take it up the stairs and out through the glass; the rest of ticket #116 (a clean path everywhere) is open. The project pages still show their object from the old room model
(`workshop.glb`).

`turntable` and `workflow` are the other two candidates. They are archived: still served,
like the earlier variants, at `/variant-turntable/` and `/variant-workflow/` (plus the
`/variant-workshop/` preview), all noindex.

## Layout

- `content.cjs` site wording and project order; project facts come from `../product-launch/projects.cjs`.
- `blocks.cjs` markup shared by all variants (head with production SEO, galleries, case-study body).
- `demos.cjs` / `demos.js` the playable demos (fictional sample data), used by `workflow` and the Workshop project pages.
- `workshop/` page templates, styles, `main.js` (small entry: day/night, About columns, demos; it loads `room.js` once the page has painted), `room.js` (three.js: the House's tour, and the project pages' object viewer), `theme.js` (lamp switch).
- `workshop/model/` the House: `build_house.py` (Blender: models it from CC0 textures in `textures/`, bakes the lighting in Cycles into a second UV set: a cool CC0 overcast sky HDRI, fetched into a cache by `build-house.sh` and not shipped, outside, and 2700 K lamps (a Blackbody node) inside so warm light spills out through the glass; a second bake finds where rain runs down from the ledges, where the plinth is wet and where corners wear), `build_backdrop.py` (renders the mountain-in-cloud plate in Cycles: one broad displaced mountain flank under a thick cloud blanket, tens of thousands of real conifers, volumetric cloud and mist) and `build_water.py` (the lake's ripple normal map, from noise), run by `build-house.sh` (then gltfpack and webp), produce `house.glb`, `house-light.webp`, `house-wet.webp` (the concrete's roughness: damp where it rained), `backdrop.webp` and `water-normal.webp`, which stay under 2.5 MB together (publish-test checks), no texture over 2048 px. The sky dome shows the plate by azimuth and elevation (`BACKDROP` in `room.js` repeats its constants) and the lake is a planar reflection (three's `Reflector`) pushed about by the drifting ripple map (`WATER`), neither in the glb; the forest on the hill is part of the plate, the trees near the House (spruces and firs: a dark core of ragged skirts carrying drooping branch cards, cut out of a branch texture drawn in `branch_card`) and the boulders (moss on top, wet at the waterline) are unlit meshes shaded by vertex colours, with a leafy mottling added in `foliageMaterial`. The page renders through a short post chain in `room.js`: bloom on the lamps (desktop), then tone mapping and `GRADE` (a colour grade and a vignette; film grain on desktop). The concrete is made here in `board_formed` (boards with their own tone and grain, seams, an even grid of tie holes with runoff, the pitting of a CC0 concrete photograph in `textures/concrete-pores.jpg`), not photographed. The House names its doorways `doorway_<slug>` (stock and records on the ground floor, ai and android upstairs) and the upstairs balcony `balcony`, where Rooms and the teaching stop attach. `render-stills.cjs` renders `poster.webp` (wide) and `poster-phone.webp` from a built page. The old room model (`build_workshop.py`, `build.sh`, `workshop.glb`, the `thumb-*.webp`) stays for the project pages until the Rooms replace it. All outputs are committed.
- `workshop/photo/hafiz-portrait.webp` owner-supplied portrait, cropped, EXIF removed.

## Commands

```sh
npm ci                                   # in this directory
node build.cjs [variant...]              # noindex previews (incl. the archived candidates) into dist/<variant>/
node publish-test.cjs                    # production build into dist/site + checks (needs résumé fonts)
BLENDER=/path/to/blender workshop/model/build-house.sh            # after editing the House (HOUSE_DRAFT=1 for a quick, noisy bake; a full bake takes several minutes)
CHROME=/path/to/chrome node workshop/model/render-stills.cjs URL  # after House or camera changes, against a served preview
```

Release: `release.sh` on the VPS (see `resume/DEPLOYMENT.md`); `verify-public.cjs` checks the live site.

Pages use `static/` for their files because Caddy serves `/assets/` from the legacy app.
