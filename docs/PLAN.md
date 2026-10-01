> Written before implementation began (2026-09-29). Decisions made while building Phases 0–1 are
> recorded under "Implementation notes" at the end; where they differ, the notes win.

# CEOMaker — Build Plan

## Context

Greenfield project (`ceomaker`, empty repo). Goal: an AI-assisted website builder that lets CEOs, managers, and investors spin up a personal-brand website, edit it simply, publish it to a free subdomain (`customer.ceomaker.com`), and pay a recurring fee (~$9.99/mo) to keep it live. Later: custom domains and analytics. It must be secure, scalable to real traffic, and maintainable by a solo founder.

Verified facts (researched 2026-09-29):

- **Next.js 16.3** is the current stable/LTS line (App Router + Turbopack stable, React 19.2). Build on it.
- **Lemon Squeezy** is a merchant-of-record and now supports **bank payouts to Algeria** — so you can collect global subscriptions and get paid without incorporating. It also handles VAT/sales tax as the seller, which removes a large compliance burden. (Confirmed as the chosen billing provider.)
- **Custom-domain SSL** at scale is a solved problem (Cloudflare for SaaS: 100 hostnames free, then $0.10/hostname/mo; apex domains need Enterprise). Deferred to a later phase per your decision.

Decisions locked with you: **Lemon Squeezy** billing · **subdomains only for MVP** (`*.ceomaker.com`), custom domains later · onboarding via a **guided form (required) + optional resume upload**.

---

## Strategic reality check (read before building)

The engineering here is very doable and the plan below is production-grade. The risk is **not** the code. "AI generates a personal site from your resume" is now a commoditized category — Durable, Hostinger AI, Framer AI, Wix ADI, B12, and generic v0-style generators all do it, several free or near-free. Charging VIPs $9.99/mo against that needs a differentiator that isn't "we also use AI."

- **Analysis:** your plausible moat is positioning, not technology — VIP-grade curated templates, a done-for-you/concierge feel, and distribution into a specific niche you can reach (your network, a wedge audience). The AI is table stakes.
- **Hypothesis (needs testing):** that target users will pay monthly rather than use a free incumbent. Validate this at the **first revenue-capable milestone (Phase 3)** with real outreach before pouring weeks into Phases 4–5.
- **Operational flag:** paying USD hosting/AI bills _out_ of Algeria is a separate problem from collecting money _in_. Lemon Squeezy solves inbound. Outbound vendor bills (Vercel, Anthropic, Cloudflare) may push you toward a US LLC (Stripe Atlas + Mercury card) sooner than payments alone would. Gate that on revenue — don't incorporate before Phase 3 shows signal.

This plan is sequenced so you reach "can take a real payment" fast and cheap, then stop and measure.

---

## Objective / Constraints / Strategy

**Objective:** ship a secure, high-performance multi-tenant site builder that a paying user can self-serve end to end: sign up → generate → edit → pay → publish → view on their subdomain.

**Constraints:** solo founder, cost-sensitive (USD bills are friction), prefers to avoid interest-bearing products (not relevant to this stack — subscription and MoR fees are service fees, not riba), MVP must reach revenue quickly.

**Strategy:** one monorepo, one deployable Next.js app split into two surfaces by host, with a **single strongly-typed content contract** shared by the editor, the AI generator, and the renderer. Published sites are served from cache (near-static) so traffic spikes never touch the primary database. Security keystone: **users and the AI never emit executable markup — only validated structured data rendered by trusted components.**

---

## Architecture overview

Two surfaces, one app (split into two apps later when it pays to):

1. **Dashboard / builder** — `app.ceomaker.com` (or `ceomaker.com` root). Authenticated. Onboarding, AI generation, editor, billing, analytics.
2. **Renderer** — `*.ceomaker.com` (wildcard). Public, unauthenticated, cookieless. Resolves the tenant from the `Host` header via Next.js middleware and serves that site's **published** version from edge cache.

This is the well-established Vercel "Platforms" multi-tenant pattern (host-based middleware rewrite). Keeping both in one Next.js app for MVP is simplest; the seam (separate route groups, no shared cookies) is drawn so you can split the renderer onto its own app/registrable domain later for stronger isolation.

**The core contract:** a `Site` is data — a validated tree of typed sections plus a theme — not HTML. The same Zod schema is imported by:

- the **AI generator** (emits `Section[]` as structured JSON, validated before saving),
- the **editor** (renders form controls per section type),
- the **renderer** (maps `section.type` → a trusted React component).

Get this schema right first; everything else hangs off it.

**Publishing model:** editing mutates a **draft** version. Publishing snapshots the draft into an **immutable published version** (enables rollback) and triggers cache revalidation. The renderer only ever reads published versions, and only if the site's subscription is active.

---

## Tech stack (pinned to current, senior defaults)

- **Framework:** Next.js 16.3 (App Router, Turbopack), React 19.2, TypeScript strict.
- **Monorepo:** pnpm workspaces + Turborepo. Shared packages: `@ceomaker/schema` (Zod content contract), `@ceomaker/db` (Drizzle), `@ceomaker/ui`, `@ceomaker/templates`.
- **DB:** PostgreSQL, managed (Neon or Supabase). ORM: **Drizzle** (type-safe, serverless-friendly, low cold-start). Prisma is an acceptable swap if you prefer its DX.
- **Auth:** **Better Auth** (self-hosted, free, email+password + OAuth, sessions, CSRF). Clerk is the managed alternative if you'd rather pay to de-risk auth.
- **Validation:** Zod everywhere (shared contract + all API inputs).
- **AI:** Anthropic Claude API (Messages API with **tool use / structured output** so the model returns schema-valid JSON, never prose or HTML). Use a Sonnet-class model for the content-generation cost/quality balance; confirm exact model ID and pricing via the `claude-api` skill at build time.
- **Background jobs:** Inngest (serverless, retries, step functions) for AI generation, resume parsing, publish revalidation, screenshots, later cert provisioning.
- **Object storage:** Cloudflare R2 (no egress fees) for media + resume files.
- **Rate limiting / ephemeral state:** Upstash Redis (serverless) — throttle AI and auth endpoints.
- **Hosting (MVP):** Vercel — native ISR, edge middleware, wildcard `*.ceomaker.com` (Pro plan). Custom domains added later via Cloudflare for SaaS.
- **Email:** Resend (verification, publish/billing notifications). Lemon Squeezy sends receipts itself.
- **Payments:** Lemon Squeezy hosted checkout + subscriptions + signed webhooks.
- **Observability:** Sentry (errors), structured logs, uptime monitor, AI cost tracking.
- **Styling:** Tailwind + shadcn/ui for the dashboard; templates are self-contained styled component sets.

---

## Data model (PostgreSQL / Drizzle)

- `user`, `session`, `account` — Better Auth tables.
- `profile` — canonical structured "who they are" that feeds the AI: name, headline, bio points, experiences[], skills[], achievements[], socials[]. Editable; survives regeneration.
- `site` — `id`, `user_id`, `subdomain` (unique, validated), `custom_domain` (nullable, later), `status` (draft|published|paused), `template_key`, `theme` (JSONB), `current_draft_version_id`, `current_published_version_id`, timestamps.
- `site_version` — `id`, `site_id`, `kind` (draft|published), `content` (JSONB: validated `Section[]`), `theme` (JSONB snapshot), `template_key`, `created_at`, `published_at`. **Published rows immutable** → rollback.
- `template` — registry metadata (key, name, section catalog, schema version, preview image). Templates themselves are code.
- `subscription` — `id`, `user_id`, `site_id`, `ls_subscription_id`, `ls_customer_id`, `status`, `current_period_end`, `plan`. Written only from verified LS webhooks. **This is the single source of entitlement.**
- `media_asset` — `id`, `site_id`, `r2_key`, `type`, `size`, `created_at`.
- `analytics_event` — `id`, `site_id`, `type`, `path`, `referrer`, `country`, `ua_class`, `ts` (first-party, cookieless).
- `ai_generation` — `id`, `site_id`, `status`, input snapshot, model, tokens, cost, `created_at` (cost + abuse tracking).
- `webhook_event` — processed LS event IDs for idempotency.

Consider Postgres RLS (if on Supabase) as defense-in-depth; regardless, **every query is scoped by the authenticated `user_id`** in application code.

---

## The content contract (build this first)

`@ceomaker/schema`, defined with Zod:

- `Theme` = `{ colors: {primary, bg, fg, accent}, fontPair, radius, mode }`.
- `Section` = discriminated union on `type`: `hero`, `about`, `experience`, `achievements`, `portfolio`, `testimonials`, `contact`, `cta`. Each with typed, bounded fields (max lengths, item counts).
- `Site` = `{ theme: Theme, sections: Section[] }` (single-page for MVP; extend to multi-page later via `pages[]`).
- Rich text limited to a **safe allowlist** (bold/italic/link); links pass a protocol allowlist and render with `rel="noopener nofollow"`. No arbitrary HTML, ever.
- Renderer ignores unknown `type` values (forward-compat). Schema is **versioned**; write an upcaster so old published versions keep rendering after schema changes.

---

## Key subsystems

**Onboarding + AI generation:** guided multi-step form (required, sufficient alone) builds a `Profile`; optional resume upload (PDF/DOCX) is parsed server-side (size/timeout-bounded), text handed to Claude to structure into the same `Profile`. User picks a template + theme seed. An Inngest job calls Claude with the profile and the chosen template's section catalog, using tool use to emit a valid `Section[]`; validate with Zod; one repair pass on failure; save as the draft version. Per-user rate limits and token/cost ceilings via Upstash; every run logged to `ai_generation`.

**Editor:** side panel lists sections; click to edit fields (text, image upload, theme color pickers, font pair); reorder with dnd-kit; toggle visibility; add/remove from the template's allowed section catalog. Live preview renders the draft. Debounced autosave writes the draft version. Deliberately constrained — a structured content editor, not a freeform canvas. Not another WordPress.

**Publish + serve:** publishing snapshots draft → immutable published version, sets `current_published_version_id`, and calls `revalidateTag(site:<id>)`. The renderer resolves tenant by `Host`, reads the published version (cached, ISR with tag invalidation), and renders trusted components. Steady-state reads hit the edge cache, not the DB — so a VIP's traffic spike costs nothing extra.

**Subdomains:** validated on claim (regex, length, reserved blocklist: `app`, `api`, `www`, `admin`, `mail`, `dashboard`, etc.); impersonation review matters for a VIP brand. Custom domains are a later phase (Cloudflare for SaaS: DNS/TXT verification → automatic SSL).

**Billing (Lemon Squeezy):** hosted checkout for the subscription; signed webhooks (`subscription_created/updated/cancelled`, payment events) update the `subscription` table idempotently. **Entitlement is derived only from stored subscription status** — never from the client. Publishing is gated on an active subscription; on lapse (after LS dunning/grace) the site flips to `paused` and the renderer serves a lightweight "site paused" page.

**Analytics:** first-party, cookieless pageview events from the renderer to `analytics_event`, aggregated for a simple dashboard (privacy matters to VIPs). Scale path: offload to Tinybird/ClickHouse if volume warrants — don't build a pipeline for MVP.

**Media:** uploads to R2 with random keys, type/size limits, EXIF stripped, served via CDN, never executed.

---

## Security design (explicit — it's a priority)

- **Keystone:** users and the AI produce **data, not markup**. All content is Zod-validated structured data rendered by trusted components. No `dangerouslySetInnerHTML` of user/AI content. This closes stored-XSS-across-the-wildcard, which is the main multi-tenant risk.
- **Cookie isolation:** auth cookies are **host-only** on the dashboard host — never `Domain=.ceomaker.com`. Published sites are cookieless. This prevents a subdomain from reaching dashboard sessions.
- **CSP + headers:** strict CSP on rendered sites (no inline scripts except hashed), HSTS, `X-Content-Type-Options`, frame protections.
- **Tenant authorization:** every mutation and query scoped to the authenticated `user_id`; never trust client-supplied IDs; optional Postgres RLS as backstop.
- **Payments:** verify LS webhook HMAC signatures; idempotent processing via `webhook_event`; entitlement never client-trusted.
- **AI abuse/cost:** per-user rate limits, input length caps, max tokens, cost ceilings. AI output is treated as untrusted data and validated — prompt injection can't execute anything because nothing the model returns is executed.
- **Uploads:** strict type/size limits, isolated resume-parsing path with timeouts, random storage keys.
- **Secrets:** host secret store, least-privilege separate keys (LS, Anthropic, R2), rotation. CSRF via same-site cookies + origin checks (Better Auth). Dependency scanning (pnpm audit + Renovate).
- **Audit trail:** log publish, subdomain claim, domain, and billing events.

---

## Scalability, performance, maintenance

- **Renderer reads never hit the primary DB in steady state** — published versions served from edge cache with tag-based revalidation on publish. This is what makes it "ready for real traffic."
- Stateless app; managed Postgres with pooling (Neon serverless driver / PgBouncer).
- All expensive work off the request path via Inngest (AI gen, resume parse, screenshots, analytics rollups, later certs).
- Media on R2 + CDN; rate limiting on costly endpoints.
- **Maintainability:** the shared `@ceomaker/schema` package is the single source of truth for editor, AI, and renderer — prevents drift. End-to-end types (TS + Zod + Drizzle-inferred). Templates are versioned code modules in a registry; content schema versioned with an upcaster.
- **Tests:** unit (schema validation, entitlement logic, webhook idempotency), integration (publish pipeline, AI output validation + repair), e2e Playwright (signup → generate → edit → pay → publish → view subdomain). CI (GitHub Actions): typecheck, lint, test, build. Renovate for deps. Sentry + uptime + AI cost dashboards in prod.

---

## Build phases (sequenced for fast, cheap time-to-revenue)

- **Phase 0 — Foundation.** Monorepo (pnpm + Turborepo), Next.js 16.3 + TS strict, Drizzle + Postgres, Better Auth, Tailwind + shadcn/ui, CI, secrets, Sentry. One deployable app with host-based middleware skeleton (dashboard vs renderer).
- **Phase 1 — Content contract + renderer (highest technical risk, do it early).** Define `@ceomaker/schema` (sections + theme). Build **one polished template** + renderer components. Serve a seeded site on `{sub}.ceomaker.com` via middleware + ISR + tag revalidation. Proves the multi-tenant serving path.
- **Phase 2 — Onboarding + AI + editor.** Guided form (+ optional resume parse) → `Profile`; Claude generation → validated draft; editor (side panel, inline edit, reorder, theme, live preview, autosave).
- **Phase 3 — Publish + billing (first revenue-capable milestone).** Lemon Squeezy checkout + signed webhooks + entitlement; publish flow (draft → immutable published version → revalidate); subdomain claim + reserved list; "site paused" on lapse. **Stop here and validate demand with real users before building more.**
- **Phase 4 — Analytics + polish + more templates.** First-party cookieless analytics dashboard; 2–3 more VIP-grade templates; media uploads; SEO (meta/OG/sitemap/robots); mobile/responsive polish (a stated priority).
- **Phase 5 — Scale + BYO custom domains.** Cloudflare for SaaS custom domains (verification + auto-SSL); move renderer to its own registrable domain for full isolation; load test; harden; revisit US-LLC/Atlas incorporation if revenue signal is real.

---

## Metrics & stop conditions

- **Time-to-signal:** at Phase 3, put it in front of ~10–20 target users (CEOs/managers in your network). Measure activation (generate → publish) and willingness to pay.
- **KPIs:** paid conversion of published sites; monthly churn; generation quality (how much editing before publish); AI cost per generated site.
- **Stop / pivot condition:** if after Phase 3 + genuine outreach you can't convert a handful of paying VIPs, the blocker is positioning/distribution, not features — do **not** proceed to Phases 4–5. Fix the wedge or the pitch first.
- **Review point:** reassess after Phase 3 launch and again after the first 10 paying users (or 6 weeks post-launch, whichever first).

---

## Critical files/packages to create (Phase 0–1)

- `pnpm-workspace.yaml`, `turbo.json`, root `package.json`.
- `packages/schema/` — Zod `Site`, `Theme`, `Section` union + version/upcaster. (Build first.)
- `packages/db/` — Drizzle schema (tables above) + migrations.
- `packages/templates/` — template registry + first template's components.
- `apps/web/` — Next.js app: `middleware.ts` (host-based routing), `app/(dashboard)/…`, `app/(site)/[...]` renderer route group, `lib/auth`, `lib/billing` (LS adapter), `lib/ai` (Claude generation), `app/api/webhooks/lemonsqueezy/route.ts`.

---

## Verification (end to end)

1. **Local:** `pnpm dev`; add `*.ceomaker.localhost` / hosts entries or use a wildcard tunnel to exercise host-based middleware; seed a site and confirm `sub.localhost` renders the published version while `app.localhost` shows the dashboard.
2. **Content contract:** unit tests feed malformed AI output through Zod and assert reject + repair; assert renderer ignores unknown section types.
3. **Publish pipeline:** integration test — edit draft, publish, assert a new immutable published version and that `revalidateTag` refreshes the rendered subdomain.
4. **Billing:** replay Lemon Squeezy test webhooks; assert entitlement flips publish on/off and that duplicate events are idempotent (signature verified).
5. **e2e (Playwright):** signup → fill form → generate → edit → checkout (LS test mode) → publish → load `{sub}.ceomaker.com` and see the live site; cancel subscription → site shows "paused".
6. **Security checks:** confirm no `Domain=.ceomaker.com` auth cookie; CSP present on rendered pages; a second user cannot read/mutate the first user's site; webhook rejects bad signatures.
7. **Load smoke (pre-Phase 5):** hit a published subdomain under load and confirm reads are served from cache with no primary-DB query per request.

---

## Implementation notes (Phases 0–1)

- **Dashboard on the apex.** The product lives at `ceomaker.com` (not `app.ceomaker.com`). Session cookies are host-only there, so they are never sent to `*.ceomaker.com`. `www` redirects to the apex. `app`, `api` and other infrastructure names are reserved subdomains.
- **Middleware is `proxy.ts`.** Next.js 16 renamed middleware to proxy; it runs on the Node runtime.
- **Caching uses Cache Components.** `'use cache'` + `cacheTag('site:<subdomain>')` + `cacheLife('max')`. Unknown sites get an instant shell on first visit, then the page is upgraded to fully static. Publishing calls `updateTag` (read-your-own-writes); billing webhooks will use `revalidateTag(tag, { expire: 0 })`.
- **CSP allows inline scripts.** Cached pages can't carry per-request nonces, and the App Router emits inline bootstrap scripts. Every other directive is strict. The structural guarantee (content is validated data, never HTML) is the primary XSS defence. Revisit a nonce-based CSP for the authenticated dashboard when the editor lands.
- **Unclaimed subdomains** render a "not live" page with `noindex`. Browsers get a streamed 200 status; crawlers get a real 404 (Next renders bots blocking).
- **Published versions are immutable at the database level** (trigger), and a composite foreign key stops a site from pointing at another site's version.
- **Site metadata is versioned content.** `meta.name/title/description` live in the site JSON, so publishing updates SEO data atomically with the page.
- **Theme contrast is enforced.** Body and secondary text must reach WCAG AA (4.5:1) against the background, or the theme is rejected.
- **Customer sites don't inherit the CEOMaker favicon.** Per-site monogram icons are a Phase 4 item.
- **Follow-ups found during the build:** per-tenant `robots.txt`/`sitemap.xml` and favicons (P4); edge rate limiting against random-subdomain cache floods (P5); email verification before first publish (P3); CDN purge on publish if we ever self-host behind a CDN.

## Implementation notes (pre-launch setup)

- **Hosting before the domain exists.** The product runs on Vercel's free `*.vercel.app` address. Customer subdomains are impossible there, so the app has a **path mode**, selected when `ROOT_DOMAIN` is unset: sites live at `/sites/<name>`, and the internal `/s/*` route stays unreachable directly. Setting `ROOT_DOMAIN` switches to subdomain mode, and the `/sites/` addresses then return 404, so no site ever has two public URLs.
- **Path-mode trade-offs.**
  - Customer pages share the product's origin. That's acceptable pre-launch, because content can't run scripts and session cookies are HttpOnly, but it's a reason to buy the domain before real customers.
  - Path-mode pages are `noindex`, so the temporary addresses don't compete in search after launch.
- **App URL is derived.** `appUrl()` uses `APP_URL` if set. Otherwise it uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` in production and `VERCEL_BRANCH_URL`/`VERCEL_URL` in previews. Better Auth trusts both preview URLs, so sign-in works on preview deployments.
- **Database: Neon in Frankfurt**, with Vercel functions pinned to `fra1` next to it.
  - Branch `main` is production. Branch `dev` serves local development and previews, with a `ceomaker_test` database for integration tests.
  - Migrations run in the Vercel build over the direct (unpooled) connection. The app uses the pooled one.
- **Neon connection strings** include `channel_binding=require`, which postgres.js forwards to the server as an unknown setting, and the connection is rejected. `createDatabase` strips it. postgres.js also treats `sslmode=require` as "encrypt but accept any certificate", so remote connections are upgraded to `verify-full`; local hosts are left alone.
- **Windows.**
  - The migrate and seed scripts detected "run directly" by comparing a `file://` URL with a `D:\` path, so on Windows they silently did nothing. They now compare real paths.
  - `.gitattributes` forces LF line endings so the formatting check passes on Windows checkouts.
- **Node 24 LTS everywhere** (local, CI, Vercel). pnpm is installed directly (`npm i -g pnpm@10.33.0`), because Node 25+ no longer bundles Corepack. On Vercel, `ENABLE_EXPERIMENTAL_COREPACK=1` makes the build use the pinned pnpm version instead of pnpm 9.
- **Vercel Hobby is non-commercial.** Upgrade to Pro before Phase 3 billing goes live.

## Implementation notes (Phase 2: the Claude Design build)

The app follows the handoff in `design/` (see `design/README.md`): the Industry design system for the product, and six templates matched to `PortfolioTemplate.dc.html` at 1280px.

- **Templates render one view model.** `buildSiteModel` (packages/templates) derives names, dates, initials, the pull-quote and section order from validated content once; each template only lays it out. Sizes use container-query units (`fluid()`), so the same component is correct live, in the 1280px editor canvas and in 0.25x thumbnails. Every template was screenshot-compared with the design at 1280px (page heights within 3px) and checked at 390px and 820px.
- **Colours are per template.** A version stores `{ palettes: { [template]: { bg, ink, accent } } }`; everything else derives through `color-mix`. Switching templates keeps each template's colours. Drafts may hold any colours; publishing requires 4.5:1 text contrast (database layer and editor both check).
- **Order and visibility.** Hero is pinned first, contact last; the middle sections render in the order the user drags them. Hidden or empty sections never render. Bento is the exception the design calls for: one grid in a fixed order, with spans that fill rows whatever is present.
- **Truthful drafts.** The AI writes positioning copy from the answers. Numbers, past roles, work and quotes only come from an attached CV; otherwise those sections start hidden and empty. The answers-only draft is saved first, so a failed or rate-limited AI call still leaves something to edit.
- **CVs** (PDF or .docx, up to 4 MB, under Vercel's 4.5 MB body limit) are attached on the template screen, sent once to the model and not stored. The questions screen only records the intent, so the flow works when the sign-in link opens on another device. The answers themselves travel inside the sign-in link for the same reason.
- **Passwordless auth.** Magic links (single use, hashed at rest, 15 minutes) via Resend, plus Google. Email and password sign-in is off.
- **Images in Postgres** (`media` table, bytea, max 3 MB, served at `/media/<id>` with a one-year immutable cache, allowed through the proxy on customer hosts). Fine for portraits at beta volume; move to object storage when storage cost or volume justifies it.
- **Publishing is free in the beta.** The publish dialog states it plainly instead of showing a checkout. Lemon Squeezy, entitlements and the "paused on lapse" switch are the rest of Phase 3. The paused page exists and is driven by `site.status`.
- **Versions.** Every publish is an immutable snapshot. The dashboard lists them; **View** opens one at full size (`/dashboard/sites/[id]/versions/[versionId]`, owner only) with two separate ways back: **Open in editor** replaces the draft with it and leaves the live site alone; **Make live now** puts it live at once and leaves the draft alone (the editor then shows the newer edits as unpublished). Both ask first, through the shared `ConfirmDialog`.
- **One query per page for the site.** The dashboard and editor load a site with its draft, live version and version history in a single query (only the draft and live version carry their content); the dashboard used to make six. Both pages paint a skeleton from the static shell while data loads. Known remaining cost: postgres.js describes parameter types before each query (Drizzle passes `prepare: false` per query), so each query is two round trips, and Better Auth's session check (after its 5-minute cookie cache) is two more queries. In production, next to the database in Frankfurt, these cost about a millisecond each; revisit with Better Auth's `advanced.database.joins` and a driver that skips the describe step if they ever matter.
- **Saved answers expire.** The questions flow keeps answers in the browser so "Save and exit" can resume. They expire a week after the last change, are cleared on sign-out and once the user has a site, and a resumed flow says so with a "Start over" button.
- **Deleting a site.** The dashboard's "Delete site" asks for the address typed out, and the server checks it again. It removes the site, every version and the user's uploaded images (one site per account); AI usage rows stay, so starting over doesn't reset drafting limits. If the site was ever published, its address is held for 90 days (`retired_address`): links to it may still be out there, so only the owner can claim it in that time. Never-published addresses are freed at once.
- **The landing header knows who's signed in.** The page stays prerendered; only the header buttons are dynamic (Suspense), showing Dashboard and Sign out instead of Sign in and Start free. A same-size invisible placeholder holds their space, so no one sees the wrong buttons first.
- **Editing text on the page.** In the editor's preview, templates mark each text that shows exactly one content field with its path (`data-field="experience.items.2.role"`, editor preview only). Clicking one makes it a plain-text editor; Enter or clicking away commits, Escape cancels, links don't navigate. The browser's changes are undone before the edit goes into the draft, so React stays in charge of the DOM. Emphasis in the about paragraphs survives edits to the surrounding text. Lists, links, images and composite lines (dates, "organisation, location · dates") stay in the side panel, and so does any section whose current input doesn't validate. A template test checks every marked element shows exactly the field it names.
- **Deviations from the design, on purpose:**
  - The landing page's testimonials band is hidden until there are real customer quotes; the design shipped placeholders.
  - Bento's "Download CV" button became "View experience" (there's no CV file to download), and its demo-only "Available across Europe" line is gone.
  - Two design-file colour bugs were resolved to their intent: Bento's pull-quote text (invisible in the mock) and template figcaptions.
  - The editor's Hero panel gained "Profile details" (name, title, organisation, location, availability, affiliations, keywords): the templates show these, and the mock had no way to edit them.
  - Headline rewrite options follow the mock's logic (Sharper, More formal, Shorter) rather than the README's list.
- **Follow-ups:** Lemon Squeezy checkout and webhooks; delete unreferenced media; email verification before first publish is covered by passwordless sign-in; per-tenant OG images; an "add CV later" import in the editor; claimed-but-never-published addresses could expire after N days.
