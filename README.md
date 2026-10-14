# portfolio

Personal portfolio site for Hafiz Jamali — [portfolio.wasabietech.com](https://portfolio.wasabietech.com).

## Status

This repo currently holds the **deployed static site as a baseline**, committed so the
site has version history and a rollback point. It was previously unversioned: the live
files existed only at `/var/www/portfolio` on the VPS, with no way to revert a change.

The React/Three.js rebuild scaffold follows `docs/DESIGN-SPEC.md`. It is not deployed;
the live `/var/www/portfolio` remains the static baseline.

## Development

Run `npm install`, then `npm run dev`. The web app runs on `5173`; the API runs on `8085`.
Create the `portfolio` Postgres database and apply `infra/schema.sql` before using live API data.
`npm run build` and `npm run typecheck` are run by `.github/workflows/ci.yml`. Nothing in `infra/` is applied by this repo.

## Current site (baseline)

Three static pages plus assets, no build step:

| File | Page |
| --- | --- |
| `index.html` | Landing — selected work, working loop, contact |
| `ai-content-lab.html` | Hill's AI Content Lab practice project |
| `ai-lab-prototypes.html` | Prototype index |

Design system: Swiss editorial — Helvetica Neue, Swiss Red `#E4002B` accent, hairline
rules, tight display tracking.

### Résumé

`resume/resume-datasheet-source.html` is the single source. The PDF is printed from it at
build time (`resume/pdf.cjs`) and is not committed. See `resume/README.md`.

## Deploy

The canonical site is served from `/var/www/portfolio-releases/current`, a symlink to an
immutable release built from `variants/redesign` (the Workshop design). Ship with
`variants/redesign/release.sh` on the VPS; see `resume/DEPLOYMENT.md`.
