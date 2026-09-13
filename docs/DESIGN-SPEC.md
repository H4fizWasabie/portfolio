# DESIGN-SPEC — portfolio.wasabietech.com rebuild

**Status:** approved direction, not yet built
**Audience for this document:** the scaffolding agent (Codex). Read it in full before writing code.
**Division of labour:** Codex builds a *functional scaffold*. Abah/Theo then art-direct it.
Where this document says **PLACEHOLDER**, it means "make it structurally correct and visually
boring on purpose — the art direction pass owns this." Where it says **LOCKED**, it means do not
improvise a variant.

---

## 0. One-paragraph brief

Rebuild Hafiz Jamali's portfolio as a scroll-driven, animated single-page application with a real
backend. The site's subject is *operational systems that measurably work* — procurement, inventory,
AI-assisted content operations. The design language is the language of an instrument panel, because
that is what the work actually is, not a costume borrowed from one. Motion carries information
(folio numbers, scroll depth, elapsed session time, counters over real measured results), never
decoration. It must read as **serious and proper** first and impressive second: a hiring manager
opening this link on a mid-range phone must get a fast, legible, professional page.

---

## 1. Hard constraints from the host

The VPS this serves from:

| Constraint | Value | Consequence |
| --- | --- | --- |
| Reverse proxy | **Caddy** (not nginx) | Config is a Caddy snippet, `/etc/caddy/Caddyfile` |
| Node | v22.23.2 | Fine for Vite and Fastify |
| Package manager | **npm 10.9.8 only** | No pnpm. Use npm workspaces |
| Container runtime | **none** | No Docker. Native services only |
| Postgres | running on `127.0.0.1:5432` | DBs `pims`, `pims_test` exist — add `portfolio` |
| RAM | 1.9 GB total, 5.3 GB swap | Vite/Rollup build spikes are fine; keep runtime lean anyway |
| Existing service ports | 8082 procura, 8083 pims, 8084 procura-demo | **Use 8085 for the portfolio API** |
| Existing precedent | Node app + `reverse_proxy` (procura, pims) | Follow it |

**The live site is served from `/var/www/portfolio` and this repo does not deploy to it.** Do not
assume a build output lands live. Infra wiring is §10 and is report-only.

---

## 2. Stack — LOCKED

- **Frontend:** Vite + React 19 + TypeScript, static build output (`dist/`)
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` token config — no `tailwind.config.js`)
- **3D:** three.js + `@react-three/fiber` + `@react-three/drei`
- **Scroll/scroll animation:** Lenis (smooth scroll) for page feel; **do not** add GSAP. Scroll
  choreography is IntersectionObserver + R3F `useFrame` + CSS transitions, driven by a single
  scroll-progress store. One animation engine, not two.
- **Routing:** React Router (client-side, SPA)
- **Backend:** Fastify + TypeScript, `pg` driver
- **DB:** Postgres, database `portfolio`
- **Shared types:** a workspace package consumed by both apps

Pin exact versions at install time and commit the lockfile. Do not use `latest`.

---

## 3. Repository layout

npm workspaces monorepo:

```
portfolio/
├── apps/
│   ├── web/                  # Vite + React + TS + Tailwind + R3F
│   └── api/                  # Fastify + Postgres
├── packages/
│   └── shared/               # shared TS types (CaseStudy, Metric, ContactPayload)
├── infra/
│   ├── Caddyfile.snippet     # SPA root + SPA fallback + cache headers + /api proxy
│   ├── portfolio-api.service # systemd unit template
│   └── schema.sql            # DDL, or migrations/ directory
├── docs/
│   └── DESIGN-SPEC.md        # this file
├── package.json              # workspaces: ["apps/*", "packages/*"]
└── README.md
```

A monorepo is justified by two apps plus shared types. Keep the root `package.json` scripts thin:
`dev`, `build`, `typecheck`, `lint`.

---

## 4. Design anchor — Industrial (LOCKED)

Committed to the **Industrial** anchor. Token fidelity is the pass/fail criterion: if tokens appear
that this anchor does not allow, the direction did not hold.

### 4.1 Tokens (LOCKED)

```css
--bg:         #0B0C0A;  /* warm black */
--bg-raised:  #101208;
--fg:         #E8E8E4;
--fg-dim:     #8A8A84;
--rule:       #2A2C24;  /* 1px hairlines */
--signal:     #C6FF4A;  /* acid lime — the single semantic accent */
--signal-dim: #5A7A22;
```

`--signal` is reserved for: active/current state, real measured values, and the current scroll
position indicator. It is **not** a general hover colour and never a background wash.

### 4.2 Typography (LOCKED)

**IBM Plex Mono only** — 400 / 500 / 600. Display, body, and numerals are all the same family.

- Body: 15–16px, line-height 1.6, max measure 68ch
- Display: `clamp()` scaling, weight 500–600, tight tracking (`-0.01em` to `-0.03em`)
- Numerals: `font-variant-numeric: tabular-nums` on **every** numeric element, globally

Mono body copy is a deliberate readability tax paid for distinctiveness. Compensate with generous
line-height and measure — never by substituting a proportional face.

### 4.3 Structure (LOCKED)

- 12-column grid with visible 1px rules
- **`border-radius: 0` everywhere** — no exceptions
- **No box-shadows.** Separation is 1px borders on `--rule`
- **No gradients.** Flat surfaces only
- Left-aligned typography throughout
- Numerals used as composition elements (folio numbers, indices, page markers)

### 4.4 Motion character (LOCKED)

Industrial motion is **precise and mechanical**, not springy. This is the single most common way a
build drifts off-anchor.

- Easing: `cubic-bezier(0.2, 0, 0, 1)` for UI; slight ease-out for reveals. **No bounce, no elastic,
  no spring physics** — that belongs to a different anchor.
- UI transitions: 120–260ms
- Scroll reveals: 600–900ms
- Counters: ~1400ms, ease-out, monotonic

---

## 5. The differentiator (the one memorable move)

**The instrument rail.** A fixed left column, 56px wide, 1px right border, present on every section.

It reports **real measured state**, continuously:

| Zone | Content | Source |
| --- | --- | --- |
| Top | Current section folio — `02 / 05` | IntersectionObserver on section landmarks |
| Middle | Vertical scroll-depth trace — a 1px rule with a filled `--signal` segment proportional to scroll progress, plus a small tabular `%` readout | scroll progress store |
| Bottom | Elapsed session time on page, `mm:ss`, tabular | timer started on mount |

This is the whole thesis of the design in one component: the animation **is** the information. It is
not a progress bar decoration; every value is genuinely measured and none of it is fabricated.

Rules:
- Hidden below 900px viewport width
- Under `prefers-reduced-motion: reduce`: static, no trace animation, values still real
- The rail must never overlap content — reserve its width in the layout at ≥900px
- Section landmarks are the same ones it reports, so the two can never disagree

---

## 6. Content architecture and routes

### 6.1 Pages

| Route | Page |
| --- | --- |
| `/` | Landing — hero, metrics, selected work, working loop, contact |
| `/work/:slug` | Case study detail, content fetched from the API |
| `/resume` | Resume page (links the existing PDF) |
| `*` | 404, in-anchor, calm |

Section folios on `/`: `01` hero, `02` metrics, `03` selected work, `04` working loop, `05` contact.

### 6.2 Section-by-section

**01 — Hero.** Full viewport. Left: headline and sub-copy, mono. Right/behind: the R3F wireframe
field (see §7). Static layout is correct in the scaffold; terrain *form* is polish.

**02 — Metrics.** Four counters, tabular, count up once on enter. Real numbers, §8. Each sits on a
1px rule baseline, folio-indexed.

**03 — Selected Work.** Four real projects as **full-width rows, not cards** — cards imply shadow and
radius, both disallowed. Each row: folio, title, one-line description, tags, link. Hover: a
`--signal` underline sweep. In the scaffold, rows render from API data.

**04 — Working Loop.** Four steps, `01`–`04`. Left column sticky, steps scroll past, active step
takes `--signal`. Scaffold: sticky layout correct, motion timing is polish.

**05 — Contact.** Email, resume link, footer with the existing copyright line.

---

## 7. Three.js scope (deliberately small)

One 3D moment: the hero wireframe field. Not 3D anywhere else.

- Content: an instanced, low-density **line-segment field** (wireframe terrain / topological mesh).
  Lines only — no fills, no materials with shading, no textures.
- Colour: `--signal` at low opacity, `--signal-dim` for depth falloff. It must never compete with
  the headline for attention.
- Reacts to: scroll progress (primary) and pointer position (subtle, desktop only).
- **Scaffold requirement:** a functional placeholder — correct component structure, correct
  geometry pipeline, correct perf settings, plainly ugly. The art direction pass reshapes the field,
  tunes density/amplitude/falloff, and choreographs it against the scroll timeline.

Performance requirements (LOCKED — these are correctness, not polish):

- Dynamically imported after first paint; hero only. Never in the initial bundle.
- `<Suspense>` boundary with a static SVG/CSS **poster fallback** that is acceptable on its own.
- `frameloop="demand"` + `invalidate()` on scroll/pointer change — do not run a free 60fps loop.
- Pause rendering entirely when the hero leaves the viewport.
- Cap DPR at 1.5.
- **Below 900px width, or on `prefers-reduced-motion: reduce`, or without WebGL: render the poster
  and never initialise three.js at all.**

---

## 8. Content — source of truth (do not invent anything)

**All strings and figures below are real and come from the existing live site.** Use them verbatim.
Do not add, embellish, round, or generate any metric, testimonial, client name, or statistic that is
not on this list. If a slot needs content that is not here, leave the slot out — do not fill it.

### 8.1 Hero

- Kicker: `AI-assisted marketing / systems / operations`
- Headline: `I make useful things move.`
- Sub: `I turn messy product information, operational problems, and half-formed ideas into clear
  content, practical systems, and workflows that people can actually use.`
- CTAs: `See the work`, `View resume`, `Start a conversation`
- Footline: `Based in Malaysia · building with AI every day`

### 8.2 Metrics (four, real, measured)

| Value | Label |
| --- | --- |
| `76.5%` | less manual PRF creation |
| `90%` | automated ordering accuracy |
| `71%` | fewer critical stock incidents |
| `24/7` | self-hosted AI workflows |

`24/7` is not a countable number — render it statically, no count-up.

### 8.3 Projects (four)

1. **Theoses** — `Personal system · always on` — tags `AI agents · automation · content systems · VPS`
   — `A self-hosted AI agent I use for research, planning, content drafts, repeatable workflows,
   documentation, and daily digital operations. It is the system behind the work on this page.`
   — link `https://github.com/H4fizWasabie/theoses2`
2. **Hill's AI Content Lab** — `Practice project` — tags `hooks · content strategy · AI-assisted`
   — `A self-directed pet-food promotion concept built from supplied product material.`
   — has a full case study page
3. **Procura** — `Production system` — tags `research · reporting · Go`
   — `Product, supplier, and purchasing information turned into a connected workflow for better
   decisions.` — link `https://procura.wasabietech.com`
4. **PIMS** — `Production system` — tags `data · operations · monitoring`
   — `Inventory visibility and alerts that keep a real veterinary operation moving.`
   — link `https://pims.wasabietech.com`

### 8.4 Section copy

- Selected work heading: `Work that has a pulse.`
  Sub: `Real systems and honest practice projects—showing how I think, make, test, and improve.`
- Bridge: `One idea, packaged for action.` / `The same thinking travels from a live business system
  to a marketing concept: understand the signal, make it clear, then decide what to do next.`
- Loop heading: `My working loop.`
  Sub: `The same habits carry from procurement to marketing: get close to the facts, make the work
  visible, and learn from the response.`
- Steps: `Find the signal` · `Shape the message` · `Automate the repeat` · `Review the evidence`
  (keep their existing one-line descriptions)
- Contact: `Bring me a messy problem. I'll help make it legible.`
  `Marketing support, content operations, AI-assisted workflows, or a practical system that saves a
  team time.`
- Email: `kisame350@gmail.com`
- Footer: `© Mohammad Hafiz Bin Jamali`

### 8.5 Open content question — flag, do not fill

The four metrics currently ship with **no stated basis** (what was measured, over what period, in
which system). As stated they read as claims. The spec does **not** answer this — it is abah's to
answer. Scaffold: give each metric an optional `basis` field in the schema, render it when present.
Do not author basis text.

### 8.6 Content that must not appear

No invented client names, no fabricated uptime/telemetry strings, no `BUILD 8.2.0-rc3`-style fake
status readouts, no lorem ipsum, no placeholder testimonials, no "trusted by" logos.

---

## 9. Backend

### 9.1 Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | DB connectivity included |
| `GET` | `/api/case-studies` | List: slug, title, kind, summary, tags, links |
| `GET` | `/api/case-studies/:slug` | Full record + body sections |
| `POST` | `/api/contact` | Validate, store, notify |

`POST /api/contact` must: validate (name, email, message, honeypot field), rate-limit per IP, insert
into `contact_messages`, then send a Telegram notification on a best-effort basis — a notification
failure must not fail the request or lose the message.

### 9.2 Schema

`case_studies` (slug unique, title, kind, summary, tags text[], links, sort order), `case_study_blocks`
(ordered body sections), `metrics` (value, label, optional basis, sort order), `contact_messages`
(fields + created_at + ip hash), plus a local **private analytics** table for section-reach events.

Seed entirely from §8. The seed is the test of whether §8 was followed.

### 9.3 Shape

- Fastify, TypeScript, `pg`, listening on **127.0.0.1:8085**
- Config via environment variables, with `.env.example` committed and `.env` ignored
- Structured request logging; no secrets in logs
- Graceful shutdown on SIGTERM
- CORS: same-origin only via the Caddy proxy — do not open `*`

### 9.4 Private analytics

Counts of section reach and case-study views, stored in Postgres, exposed only on a
non-linked admin route. No third-party trackers, no cookies, no PII beyond a hashed IP for contact
rate-limiting. This exists because the site claims self-hosted measurement — ship the mechanism or
drop the claim.

---

## 10. Infra (produce the files, do NOT apply them)

Committed under `infra/`, reported to abah, applied only on his say-so:

- **`Caddyfile.snippet`** — `portfolio.wasabietech.com` with `bind 149.28.146.30`, `root *` pointing
  at the built output, **SPA fallback** (`try_files {path} /index.html`) so client routes resolve,
  `file_server`, `reverse_proxy /api/* 127.0.0.1:8085`, plus cache headers: hashed assets
  `immutable, max-age=31536000`; `index.html` `no-cache`.
- **`portfolio-api.service`** — systemd unit modelled on the existing services, `User=theoses`,
  `Restart=always`, env file, hardening flags.
- **DB setup** — `createdb portfolio` and role/grant steps as documented commands, not run silently.

---

## 11. Accessibility and performance budgets (correctness, not polish)

- `prefers-reduced-motion: reduce` honoured end to end: no R3F scene, no count-ups (final values
  render immediately), no scroll-linked transforms, rail static
- Semantic landmarks, skip-to-content link, one `h1` per page, rail sections keyboard-reachable
- All interactive elements have a visible `--signal` focus ring; never remove focus outlines
- Initial route JS ≤ 250 KB gzip **excluding** the deferred three chunk; three chunk ≤ 180 KB gzip
- Lighthouse mobile: performance ≥ 90, accessibility ≥ 95
- No layout shift from fonts: `font-display: swap` plus a size-adjusted fallback

---

## 12. Division of labour

### Codex produces (functional scaffold)

- Monorepo, workspaces, TS config, Tailwind v4 `@theme` with §4 tokens wired as CSS variables
- Router + layout shell + instrument rail **structure** (real values, plain rendering)
- All sections from §6 laid out correctly, fed by the API
- R3F hero: correct structure, perf settings, poster fallback — **placeholder geometry**
- Postgres schema + migration + seed from §8
- Fastify API, all four endpoints, validation, rate limit, Telegram notify (env-gated)
- `infra/` files, README with run instructions
- Must pass: `npm run build`, `npm run typecheck`, and the §11 budgets at a baseline level

### Theo polishes (art direction pass)

- Terrain form, density, amplitude, depth falloff, and its choreography against scroll
- Typography rhythm, optical spacing, rail micro-detail, folio composition
- Reveal timing and easing curves, hover/focus/transition states
- Empty, loading, and error states
- Mobile fallback quality, full reduced-motion pass
- Lighthouse and bundle tuning

**Codex: stop at functional.** Where this spec says PLACEHOLDER, do not art-direct it. A plain,
correct, obviously-unstyled implementation is the deliverable; inventing a look here costs a
rewrite.

---

## 13. Do-not list

- No rounded corners, no box-shadows, no gradients, no glow
- No serif faces, no proportional faces — IBM Plex Mono only
- No spring/bounce/elastic easing, no parallax on text
- No emoji or unicode glyphs as icons (`▣`, `◊`, `→` as an icon) — use a real icon set or nothing
- No fabricated metrics, dates, telemetry, testimonials, or logos
- No `//`-style mono-caps kickers used as decoration
- No purple, violet, or neon-blue palette drift — that is a different anchor
- No lorem ipsum anywhere, including comments-facing copy
- No 3D outside the hero
- No third-party analytics

---

## 14. Definition of done

- [ ] `npm run build` and `npm run typecheck` clean from a fresh clone
- [ ] Every string on screen traces to §8 — verified line by line
- [ ] Rendered CSS contains no token outside §4.1–4.3 (search for `border-radius`, `box-shadow`,
      `linear-gradient` — all must be absent or `0`/`none`)
- [ ] `prefers-reduced-motion` path verified: no canvas initialised, final values shown
- [ ] Below 900px: rail hidden, poster shown, no three.js loaded
- [ ] Rail values verifiably real, not simulated
- [ ] API health check green against the `portfolio` database
- [ ] Contact POST stores a row and notifies; notification failure does not lose the message
- [ ] `infra/` files present and reviewable, **not applied** to the live server
- [ ] Live site untouched: `/var/www/portfolio` still serves the baseline
