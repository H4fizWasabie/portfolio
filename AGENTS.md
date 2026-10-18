# Portfolio

Hafiz Jamali's portfolio, live at https://portfolio.wasabietech.com.

## What is live

- `variants/redesign/` is the live site (the Workshop). Its README covers the layout; `resume/DEPLOYMENT.md` covers releases.
  The other `variants/*` folders are archived previews, as is `variants/redesign`'s `turntable` and `workflow`.
- `apps/web`, `apps/api`, `packages/shared`, `infra/` are the React/Fastify rebuild scaffold. Not deployed.
  `apps/api` already has `POST /api/contact` and the `contact_messages` table (`infra/schema.sql`).
- `resume/resume-datasheet-source.html` is the single résumé source; the PDF is printed at build time.
- `PRODUCT.md` and `.impeccable/` hold the design context for the `impeccable` skill.

Verify behaviour in the source, not in this file or a README: status lines drift.

## Commands

- Live site: `npm ci --prefix variants/redesign`, then `node variants/redesign/build.cjs workshop` for a noindex
  preview in `variants/redesign/dist/workshop/`, or `node variants/redesign/publish-test.cjs` for the production
  build and its checks (needs the résumé fonts; CI runs it).
- Rebuild scaffold: `npm run typecheck`, `npm run build`, `npm run lint` from the root.
- Release runs on the VPS (`ssh vps`): `variants/redesign/release.sh`. Never release unless asked.
  `node variants/redesign/verify-public.cjs` checks the live site.
- Run the checks the change touches; leave the full `publish-test.cjs` to CI unless asked.
- Ad-hoc scripts go in a temp directory and are removed when done.
- Never commit unless asked.

## Code quality

- Read files in full before wide-ranging changes or before editing a file you haven't inspected. Don't rely on search snippets.
- Match the idioms of the code you're in. The live site is plain CommonJS templates, CSS and browser JS with no framework.
- Check installed packages for real API shapes before guessing at a signature.
- Never remove or downgrade code to route around an outdated dependency; upgrade the dependency.
- Ask before removing functionality or code that looks intentional.
- Don't preserve backward compatibility unless asked.
- No abstractions, error handling or config for cases that can't happen.

## Code navigation (Graft)

This repo is indexed by Graft (`graft/`, gitignored). Use it before grepping or reading files:

- `graft ask "<task>" --source` to locate and understand code
- `graft grep "<regex>"` for every occurrence, grouped by enclosing symbol (escape parens in the regex)
- `graft skeleton <file>` for a file's API
- `graft callers <symbol> [--depth all]` before changing or renaming a symbol
- `graft map` for orientation

If `graft/` is missing, run `graft build`. Never commit `graft/`. Don't use graphify here.

## Agent skills

### Workflow

Route every task that changes this repo's code or docs through Matt Pocock's skills. `ask-matt` is the router:
read it before starting, pick the stage the task sits at, then run that stage's skill.

- **Running a skill**: the ones Hafiz normally types (`ask-matt`, `grill-with-docs`, `to-spec`, `to-tickets`,
  `implement`, `implement-spec`, `triage`, `wayfinder`, `improve-codebase-architecture`, `handoff`): read
  `~/.claude/plugins/cache/mattpocock/mattpocock-skills/<highest version>/skills/*/<name>/SKILL.md` and follow it
  as if he had typed the command. All others: load them through your agent's skill mechanism.
- **Entry point by size**: small fix, one file, obvious behaviour: `tdd` (or `diagnosing-bugs` for a bug), then
  `code-review`. Multi-file feature or design change: `grill-with-docs`, then the main flow. Foggy effort spanning
  sessions: `wayfinder`.
- **Visual work**: layout, styling and copy changes on the live site also go through `impeccable`, and are checked
  by rendering the page at phone (390x844) and desktop (1440x900) sizes, not only by reading the CSS.
- **Overrides** (this file wins where a skill disagrees):
  - `implement` / `implement-spec`: commit only when Hafiz asks; run the affected checks, leave the full suite to CI.
  - `to-spec`, `to-tickets`, `triage`: draft each issue, show it, publish after Hafiz approves.
  - Between tickets, dispatch each one to a subagent (`implement-spec`) in place of `/clear`.
  - `retro` runs only when Hafiz types it.
- **Shared checkout**: when another agent may be using this checkout, work in your own `git worktree` off
  `origin/main` and leave its uncommitted changes in place.
- **Attribution**: Hafiz is the sole author of commits, PRs, issues and comments; add no agent credit lines.

### Issue tracker

Issues and specs live as GitHub issues (`H4fizWasabie/portfolio`), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` + `docs/adr/`, despite the npm workspaces. See `docs/agents/domain.md`.
