# Redesign: the Workshop (production) and two archived candidates

The live site is the **Workshop**: a small clay room, modelled in Blender, where every object is a
project. The room is also the background of the whole homepage: the canvas is fixed behind the page and
the scroll flies the camera through it (hero, each project, services, the framed portrait for About,
the writing desk for Contact, a pull-back at the foot) while each section sits on a solid panel over it.
`room.js` (`STOPS`, `measure`, `stepTour`) and the `[data-room]` block at the end of `workshop/style.css`
do this; without JavaScript, with reduced motion, without WebGL or in `?still=` renders the page keeps its
static layout. `turntable` and `workflow` are the other two candidates. They are archived: still served,
like the earlier variants, at `/variant-turntable/` and `/variant-workflow/` (plus the
`/variant-workshop/` preview), all noindex.

## Layout

- `content.cjs` site wording and project order; project facts come from `../product-launch/projects.cjs`.
- `blocks.cjs` markup shared by all variants (head with production SEO, galleries, case-study body).
- `demos.cjs` / `demos.js` the playable demos (fictional sample data), used by `workflow` and the Workshop project pages.
- `workshop/` page templates, styles, `main.js` (small entry: day/night, contact brief, demos; it loads `room.js` once the page has painted), `room.js` (three.js room, tour, animations), `theme.js` (lamp switch), `brief.js` (contact brief).
- `workshop/model/` `build_workshop.py` (Blender) and `build.sh` produce `workshop.glb`; `render-stills.cjs` renders `poster.webp` and the `thumb-*.webp` from a built page. All three outputs are committed.
- `workshop/photo/hafiz-portrait.webp` owner-supplied portrait, cropped, EXIF removed.

## Commands

```sh
npm ci                                   # in this directory
node build.cjs [variant...]              # noindex previews (incl. the archived candidates) into dist/<variant>/
node publish-test.cjs                    # production build into dist/site + checks (needs résumé fonts)
BLENDER=/path/to/blender workshop/model/build.sh                  # after editing the model
CHROME=/path/to/chrome node workshop/model/render-stills.cjs URL  # after model or camera changes, against a served preview
```

Release: `release.sh` on the VPS (see `resume/DEPLOYMENT.md`); `verify-public.cjs` checks the live site.

Pages use `static/` for their files because Caddy serves `/assets/` from the legacy app.
