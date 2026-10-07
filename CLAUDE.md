@AGENTS.md

# CEOMaker

A website builder for busy, non-technical executives (CEOs, founders, chairs). They answer a few
questions, AI drafts a personal site in their voice from one of six templates (Meridian, Harbour, Monument,
Salon, Folio, Tempo), they edit it in place and publish. Live at `www.ceomaker.app` (the apex forwards there), customer sites at
`<name>.ceomaker.app`; previews at `preview.ceomaker.app` and `<name>.preview.ceomaker.app`.

Read before working: `README.md` (setup, deployment, env vars) and `docs/PLAN.md` (architecture,
decisions, and "Current state" at the end: what's done, parked and next).

## Working rules (from the owner)

- **A question is not a request to code.** When asked to explain, discuss or "tell me your
  thoughts", answer only. Write code only when asked to build or change something.
- **Don't add features that weren't discussed.** Propose first, build after agreement.
- **Git:** only two branches. `main` is production; all work goes on
  `claude/ai-website-builder-plan-ytr7tb` (it also feeds `preview.ceomaker.app`). This holds even
  when a session names another branch: don't create new ones. Start from the latest `main`
  (fast-forward or merge it into the work branch). Merge to `main` only when explicitly told: every
  merge deploys production and runs migrations on the production Neon database. Never force-push
  `main`. Never commit `.env`. No PRs unless asked.
- **Answers:** brief and direct, conclusion first, plain English. No em dashes. Avoid filler words
  (actually, certainly, leverage, seamless, robust, comprehensive). Long explanations get skimmed.
- **Claude Design prompts:** always one single prompt per template, which the owner runs at max
  effort with no follow-ups. Build it from the standing brief in `design/BRIEF.md` plus a short
  "This template" section, and keep its deliverables slim (only what can't be done in code).
- **Verification, sized to risk.** Default: format, lint, typecheck and the tests of the packages
  touched. Full checks (all tests, production build, screenshots at 1280px and 390px, a browser
  run) only for changes to live sites, templates, data, auth, domains or payments, or when asked.
  Usage limits matter: don't screenshot or rebuild more than needed.

## Product principles

- Simple beats powerful: the users are busy and non-technical. Not a Webflow clone.
- **A live site never changes look unless its owner publishes.** Template designs are versioned
  and frozen (`packages/templates/src/<key>/v<N>/`); only bug, accessibility and security fixes
  go into a shipped design. The design snapshots in `packages/templates/src/__snapshots__/` must
  stay identical for untouched content; a redesign is a new version.
  Until real users publish, the current templates can still change in place at version 1
  (owner, October 2026); update the snapshots and say why in the commit.
- New content fields are optional and additive, so older published versions keep rendering.
- Truthful drafts: AI never invents numbers, roles, work or quotes.

## Stack and layout

pnpm + Turborepo monorepo. Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19,
Tailwind v4, Drizzle + postgres.js on Neon (Frankfurt), Better Auth (magic link + Google), Resend,
Vercel (Hobby, `fra1`).

- `packages/schema`: zod content contract (sites, sections, theme, templates, domains, analytics).
- `packages/db`: Drizzle schema, migrations, queries, integration tests (need local Postgres).
- `packages/templates`: `buildSiteModel` (one view model for all templates) and the six
  templates: Meridian (`meridian/v1`, the quiet one), Harbour (`harbour/v1`, the warm one: a
  greeting and an arched portrait; free like Meridian), Monument (`monument/v1`, the loud one),
  Salon (`salon/v1`, the name among the owner's photographs), Folio (`folio/v1`, work as a
  carousel of projects) and Tempo (`tempo/v1`, the name parted around the portrait, moving with
  the scroll). All support in-place editing of every visible text and the contact form.
  Retired keys render as Meridian. Optional content only some templates show (gallery, quote
  photos, call to action, photo grade; the Focus section is in all six) is flagged per design in `registry.ts`
  (`shows`), so the editor offers it only there.
- `apps/web`: the app. Customer sites `src/app/(sites)`, dashboard `src/app/(app)/dashboard`,
  editor `dashboard/sites/[id]/edit`, domains `src/lib/domains`, analytics `src/lib/analytics`,
  billing `src/lib/billing.ts` and `src/lib/freemius.ts` (routes in `src/app/api/billing/freemius`),
  admin page `dashboard/admin` (gifts of Pro; access in `src/lib/admin.ts`), product analytics
  `src/lib/product-analytics` (PostHog on the product's pages only, relayed through `/relay`).
- `design/`: Claude Design handoff files (reference only).

## Environment notes

- **Node 24 is required** for pnpm here (CI and Vercel use 24). If the container has another
  version, install Node 24 into the scratchpad and put it first on `PATH`.
- Local Postgres: `pg_ctlcluster 16 main start` if it's down; `DATABASE_URL` is in `.env`.
- Checks (from the repo root): `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`. Format with `pnpm format`, not `prettier` on a folder: running Prettier on
  `packages/templates/src` directly reformats the design snapshots and breaks the template tests.
- Next.js and Turborepo here are newer than most training data: read the docs bundled in
  `node_modules` (see `AGENTS.md` files) before changing their config.
