> Written before implementation began (2026-09-29). Decisions made while building Phases 0–1 are
> recorded under "Implementation notes" at the end; where they differ, the notes win.

# CEOMaker — Build Plan

## Context

Greenfield project (`ceomaker`, empty repo). Goal: an AI-assisted website builder that lets CEOs, managers, and investors spin up a personal-brand website, edit it simply, publish it to a free subdomain (`customer.ceomaker.com`), and pay a recurring fee (~$9.99/mo) to keep it live. Later: custom domains and analytics. It must be secure, scalable to real traffic, and maintainable by a solo founder.

Verified facts (researched 2026-09-29):

- **Next.js 16.3** is the current stable/LTS line (App Router + Turbopack stable, React 19.2). Build on it.
- **Billing provider: Paddle** (decided October 2026), replacing the original choice of Lemon Squeezy, which Stripe acquired and is winding down toward Stripe Managed Payments. Paddle is a merchant of record, works with sellers anywhere except sanctioned countries (Algeria is supported, with a case-by-case review), and handles VAT, receipts and refunds. Where this plan says Paddle below, it originally said Lemon Squeezy.
- _Original note:_ **Lemon Squeezy** is a merchant-of-record and now supports **bank payouts to Algeria** — so you can collect global subscriptions and get paid without incorporating. It also handles VAT/sales tax as the seller, which removes a large compliance burden. (Confirmed as the chosen billing provider.)
- **Custom-domain SSL** at scale is a solved problem (Cloudflare for SaaS: 100 hostnames free, then $0.10/hostname/mo; apex domains need Enterprise). Deferred to a later phase per your decision.

Decisions locked with you: **Paddle** billing · **subdomains only for MVP** (`*.ceomaker.com`), custom domains later · onboarding via a **guided form (required) + optional resume upload**.

---

## Strategic reality check (read before building)

The engineering here is very doable and the plan below is production-grade. The risk is **not** the code. "AI generates a personal site from your resume" is now a commoditized category — Durable, Hostinger AI, Framer AI, Wix ADI, B12, and generic v0-style generators all do it, several free or near-free. Charging VIPs $9.99/mo against that needs a differentiator that isn't "we also use AI."

- **Analysis:** your plausible moat is positioning, not technology — VIP-grade curated templates, a done-for-you/concierge feel, and distribution into a specific niche you can reach (your network, a wedge audience). The AI is table stakes.
- **Hypothesis (needs testing):** that target users will pay monthly rather than use a free incumbent. Validate this at the **first revenue-capable milestone (Phase 3)** with real outreach before pouring weeks into Phases 4–5.
- **Operational flag:** paying USD hosting/AI bills _out_ of Algeria is a separate problem from collecting money _in_. Paddle solves inbound. Outbound vendor bills (Vercel, Anthropic, Cloudflare) may push you toward a US LLC (Stripe Atlas + Mercury card) sooner than payments alone would. Gate that on revenue — don't incorporate before Phase 3 shows signal.

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
- **Email:** Resend (verification, publish/billing notifications). Paddle sends receipts itself.
- **Payments:** Paddle hosted checkout + subscriptions + signed webhooks.
- **Observability:** Sentry (errors), structured logs, uptime monitor, AI cost tracking.
- **Styling:** Tailwind + shadcn/ui for the dashboard; templates are self-contained styled component sets.

---

## Data model (PostgreSQL / Drizzle)

- `user`, `session`, `account` — Better Auth tables.
- `profile` — canonical structured "who they are" that feeds the AI: name, headline, bio points, experiences[], skills[], achievements[], socials[]. Editable; survives regeneration.
- `site` — `id`, `user_id`, `subdomain` (unique, validated), `custom_domain` (nullable, later), `status` (draft|published|paused), `template_key`, `theme` (JSONB), `current_draft_version_id`, `current_published_version_id`, timestamps.
- `site_version` — `id`, `site_id`, `kind` (draft|published), `content` (JSONB: validated `Section[]`), `theme` (JSONB snapshot), `template_key`, `created_at`, `published_at`. **Published rows immutable** → rollback.
- `template` — registry metadata (key, name, section catalog, schema version, preview image). Templates themselves are code.
- `subscription` — `id`, `user_id`, `site_id`, `paddle_subscription_id`, `paddle_customer_id`, `status`, `current_period_end`, `plan`. Written only from verified Paddle webhooks. **This is the single source of entitlement.**
- `media_asset` — `id`, `site_id`, `r2_key`, `type`, `size`, `created_at`.
- `analytics_event` — `id`, `site_id`, `type`, `path`, `referrer`, `country`, `ua_class`, `ts` (first-party, cookieless).
- `ai_generation` — `id`, `site_id`, `status`, input snapshot, model, tokens, cost, `created_at` (cost + abuse tracking).
- `webhook_event` — processed Paddle event IDs for idempotency.

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

**Billing (Paddle):** hosted checkout for the subscription; signed webhooks (`subscription_created/updated/cancelled`, payment events) update the `subscription` table idempotently. **Entitlement is derived only from stored subscription status** — never from the client. Publishing is gated on an active subscription; on lapse (after Paddle dunning/grace) the site flips to `paused` and the renderer serves a lightweight "site paused" page.

**Analytics:** first-party, cookieless pageview events from the renderer to `analytics_event`, aggregated for a simple dashboard (privacy matters to VIPs). Scale path: offload to Tinybird/ClickHouse if volume warrants — don't build a pipeline for MVP.

**Media:** uploads to R2 with random keys, type/size limits, EXIF stripped, served via CDN, never executed.

---

## Security design (explicit — it's a priority)

- **Keystone:** users and the AI produce **data, not markup**. All content is Zod-validated structured data rendered by trusted components. No `dangerouslySetInnerHTML` of user/AI content. This closes stored-XSS-across-the-wildcard, which is the main multi-tenant risk.
- **Cookie isolation:** auth cookies are **host-only** on the dashboard host — never `Domain=.ceomaker.com`. Published sites are cookieless. This prevents a subdomain from reaching dashboard sessions.
- **CSP + headers:** strict CSP on rendered sites (no inline scripts except hashed), HSTS, `X-Content-Type-Options`, frame protections.
- **Tenant authorization:** every mutation and query scoped to the authenticated `user_id`; never trust client-supplied IDs; optional Postgres RLS as backstop.
- **Payments:** verify Paddle webhook HMAC signatures; idempotent processing via `webhook_event`; entitlement never client-trusted.
- **AI abuse/cost:** per-user rate limits, input length caps, max tokens, cost ceilings. AI output is treated as untrusted data and validated — prompt injection can't execute anything because nothing the model returns is executed.
- **Uploads:** strict type/size limits, isolated resume-parsing path with timeouts, random storage keys.
- **Secrets:** host secret store, least-privilege separate keys (Paddle, Anthropic, R2), rotation. CSRF via same-site cookies + origin checks (Better Auth). Dependency scanning (pnpm audit + Renovate).
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
- **Phase 3 — Publish + billing (first revenue-capable milestone).** Paddle checkout + signed webhooks + entitlement; publish flow (draft → immutable published version → revalidate); subdomain claim + reserved list; "site paused" on lapse. **Stop here and validate demand with real users before building more.**
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
- `apps/web/` — Next.js app: `middleware.ts` (host-based routing), `app/(dashboard)/…`, `app/(site)/[...]` renderer route group, `lib/auth`, `lib/billing` (Paddle adapter), `lib/ai` (Claude generation), `app/api/webhooks/paddle/route.ts`.

---

## Verification (end to end)

1. **Local:** `pnpm dev`; add `*.ceomaker.localhost` / hosts entries or use a wildcard tunnel to exercise host-based middleware; seed a site and confirm `sub.localhost` renders the published version while `app.localhost` shows the dashboard.
2. **Content contract:** unit tests feed malformed AI output through Zod and assert reject + repair; assert renderer ignores unknown section types.
3. **Publish pipeline:** integration test — edit draft, publish, assert a new immutable published version and that `revalidateTag` refreshes the rendered subdomain.
4. **Billing:** replay Paddle test webhooks; assert entitlement flips publish on/off and that duplicate events are idempotent (signature verified).
5. **e2e (Playwright):** signup → fill form → generate → edit → checkout (Paddle test mode) → publish → load `{sub}.ceomaker.com` and see the live site; cancel subscription → site shows "paused".
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
- **Publishing is free in the beta.** The publish dialog states it plainly instead of showing a checkout. Paddle, entitlements and the "paused on lapse" switch are the rest of Phase 3. The paused page exists and is driven by `site.status`.
- **Versions.** Every publish is an immutable snapshot. The dashboard lists them; **View** opens one at full size (`/dashboard/sites/[id]/versions/[versionId]`, owner only) with two separate ways back: **Open in editor** replaces the draft with it and leaves the live site alone; **Make live now** puts it live at once and leaves the draft alone (the editor then shows the newer edits as unpublished). Both ask first, through the shared `ConfirmDialog`.
- **One query per page for the site.** The dashboard and editor load a site with its draft, live version and version history in a single query (only the draft and live version carry their content); the dashboard used to make six. Both pages paint a skeleton from the static shell while data loads. Known remaining cost: postgres.js describes parameter types before each query (Drizzle passes `prepare: false` per query), so each query is two round trips, and Better Auth's session check (after its 5-minute cookie cache) is two more queries. In production, next to the database in Frankfurt, these cost about a millisecond each; revisit with Better Auth's `advanced.database.joins` and a driver that skips the describe step if they ever matter.
- **Saved answers expire.** The questions flow keeps answers in the browser so "Save and exit" can resume. They expire a week after the last change, are cleared on sign-out and once the user has a site, and a resumed flow says so with a "Start over" button.
- **Deleting a site.** The dashboard's "Delete site" asks for the address typed out, and the server checks it again. It removes the site, every version and the user's uploaded images (one site per account); AI usage rows stay, so starting over doesn't reset drafting limits. If the site was ever published, its address is held for 90 days (`retired_address`): links to it may still be out there, so only the owner can claim it in that time. Never-published addresses are freed at once.
- **The landing header knows who's signed in.** The page stays prerendered; only the header buttons are dynamic (Suspense), showing Dashboard and Sign out instead of Sign in and Start free. A same-size invisible placeholder holds their space, so no one sees the wrong buttons first.
- **Editing text on the page.** In the editor's preview, templates mark each text that shows exactly one content field with its path (`data-field="experience.items.2.role"`, editor preview only). Clicking one makes it a plain-text editor; Enter or clicking away commits, Escape cancels, links don't navigate. The browser's changes are undone before the edit goes into the draft, so React stays in charge of the DOM. Emphasis in the about paragraphs survives edits to the surrounding text. In Meridian every visible text is editable this way: section titles (stored in the section's `heading`, also used in the navigation), experience dates, link names, form topics, and the template's own wording ("Boards & affiliations", form labels, "Send message", "Back to top"), stored by key in the optional `meta.labels`. Emptying one brings back the template's wording. The live site renders the same HTML as before for content that doesn't use these. Images, link addresses, the email address and the seal's ring text stay in the side panel, and so does any section whose current input doesn't validate. The other five templates don't show custom titles or labels yet. A template test checks every marked element shows exactly the field it names.
- **Meridian redesign** (the handoff calls it "Meridian v2": `design/Meridian.dc.html`, every frame in `Meridian Board.dc.html`; in code it is Meridian design version 1, see "Template designs are versioned" below). The name is the H1, sized so its longest word fits the text column (CSS `clamp()` over container width, with the word's width computed per name); the headline becomes the statement under it. The seal is an SVG ring of name and location, sized to go once round, with the initials or photo inside. Layout lives in `meridian/meridian.css` with container queries (phone below 700px, wider margins from 960px, full seal from 1100px), so the same markup is right live, in the 1280px editor and in thumbnails. Its colour roles (secondary text, accent text, field borders, text on accent) are mixes computed per site to clear 4.5:1 or 3:1 against the background, so any palette the owner picks stays readable; a test checks every preset. Entrances and the hover turn are CSS animations, off under reduced motion and in thumbnails.
- **Contact form and messages.** Meridian's contact section has a form (on unless the owner turns it off in the editor's Contact panel; topics are seeded from the onboarding goals). On live sites it posts through a server action bound to the site's address: the site must be live with its form on, input is validated with the shared schema, a hidden honeypot field drops bots silently, and each sender (a keyed hash of their network address, never the address) is limited to 5 messages an hour, each site to 100 a day. Messages land in `contact_message` and show under **Messages** on the dashboard (see "Dashboard" below); they go when the site is deleted. In previews (editor, version view) the form walks through its states without sending. After a message is saved, the owner gets an email about it (sent after the sender's answer, never failing the send) unless they turned that off in Settings. Publishing is blocked when a site offers no way in (no email, no links and no form).
- **Dashboard** (`design/Dashboard.dc.html`). Three tabs under one header (`dashboard/(home)/`): **Overview** (site card with status and preview, plan and custom-domain cards, the three newest messages, published versions), **Messages** and **Settings**. The header's account menu links to Account and Billing and signs out; the Messages tab shows the unread count. Confirmations ("Message deleted", "Address saved") are toasts under the header.
  - **Messages:** 15 at a time, newest first, with **Load older messages** (cursor paging). New messages stay marked until opened, replied to or marked read; they can be marked unread again. Topic filters appear when there's more than one message. Long messages fold to three lines. Delete asks first. Each empty state says why the inbox is empty and what to do (not live yet, paused, template without a form, form off, nothing yet).
  - **Settings › Site:** the address (editable with a live availability check until the first publish, then locked with the date), custom domain (coming soon), the message-email switch, and Delete site (type the address to confirm).
  - **Settings › Account:** name, Change email (a link to the new address, valid 24 hours; the email changes only when it's opened, and an address that already has an account gets the same answer and no email), sign-in methods, **Sign out on all devices** (other devices' 5-minute session cookie cache can keep them in for up to five minutes), and Delete account (type the email). Deleting an account removes everything it owns; addresses of sites that were ever live stay held for 90 days, for nobody.
  - **Settings › Billing:** the beta plan only. The paid states in the design (active, cancelling, payment failed, paused) come with Paddle.
  - **Until Resend is set up:** in production, Change email is disabled and the message-email switch says "Not available yet" (the choice is still saved and message emails are skipped). In development every email is printed to the server console instead, so all of it can be tried locally.
- **Custom domains** (`design/Dashboard.dc.html`, Settings › Site). One domain per site, apex (`ameliahart.com`, with `www` forwarding to it) or subdomain (`me.ameliahart.com`). Flow: type the domain → records to add, with a guide per registrar and a page to send to an assistant (`/dns/<token>`) → "I've added the records" → checks until DNS points here → the certificate is issued → live, with an email. Checks run from the open Settings page (every 30 s), from "Check now", and from `/api/cron/domains` (daily on Vercel Hobby; see README). Problems are diagnosed from public DNS in plain words: an old record left next to ours, only one of the two hosts pointed here, or (from Vercel) the domain in use on another account, which needs one TXT record. Once live, the site's own address forwards to the domain (production only), the canonical URL is the domain. The proxy finds sites by host with a 30-second in-memory cache. Unconnected claims expire after 7 days. Deleting the site or account removes the domain from Vercel.
  - **Provider:** Vercel's domain API, behind `DomainProvider` (`lib/domains/provider.ts`). Development without credentials simulates the hosting side and checks real DNS. Production without credentials shows "Not available yet".
  - **Not built:** registrar screenshots for the guides (the design has slots for them; the steps work without), and a hostname of our own for the `www` CNAME until it's been tested with Vercel (`CUSTOM_DOMAIN_CNAME`).
- **Analytics** (Analytics tab, Overview card). First-party and cookieless: live sites post page views and clicks on email, phone, LinkedIn and the owner's websites to `/api/collect`. Stored per event: page, source (LinkedIn, Google, direct, email, other site), device type, country and city with approximate coordinates (from Vercel's headers), and a visitor hash (keyed, changes daily). Visitors are counted once per day; a visit's place, source and device come from its first page view, so breakdowns add up. The page shows 7, 30 or 90 days against the period before; below 10 visitors ever it lists each visit instead of charts. The world map is a dot grid generated once from Natural Earth (`scripts/world-dots.mjs`), with no map library in the browser. Signed-in CEOMaker users and bots aren't counted.
  - **Not built yet:** data retention limits, and per-visitor rate limits on `/api/collect` (it only accepts events for live sites).
- **Questions preview.** The questions screen renders Meridian in draft mode with only the person's answers (title, name, initials, form topics from goals) and grey lines for everything not yet written. It always shows the top of the page (the design glided to the contact form on the goals step; the owner preferred the top).
- **Template designs are versioned, so a redesign never changes a live site on its own.** Every saved version records its template key and design version (`site_version.template_version`); the catalogue is `TEMPLATE_VERSIONS` in `packages/schema/src/templates.ts`, the code lives in `packages/templates/src/<key>/v<N>/`. A live site keeps the design it was published with whatever ships later. Publishing writes the colours out in full, so changing a default palette can't recolour it either. When a newer design exists, the dashboard and the editor say so; the owner tries it in the draft (Template tab) and it goes live only when they publish. **Back to the current design** undoes the trial, and **Make live now** on an older version restores its look exactly. Picking a template the site already uses keeps its design; any other starts on the newest. Stored values we no longer have render the template's oldest design, never the newest. Retired keys map to one fixed design (`executive` → Meridian 1).
  - **To redesign a template:** add the next number to `TEMPLATE_VERSIONS[key]`; add its six presets under that number in `TEMPLATE_PALETTES`; build it in `src/<key>/v<N+1>/` with its own CSS class prefix (copying v<N> is a fine start); register it in `registry.ts`. Don't touch `v<N>`. New sites get the new design; existing ones see the offer.
  - **Shipped designs are frozen.** Bug, accessibility and security fixes are fine; visual changes are not. The template tests render every design to HTML and compare it with `src/__snapshots__/designs/`, so a shared-code change (model, shared helpers) that alters a frozen design fails CI. For a deliberate fix, update with `vitest -u` and say why in the commit. Shared CSS (`styles.css`) isn't covered by the snapshots: check old designs by eye when it changes.
  - **Retiring a design** (not built): keep every design while any live site uses it. If one must go, give owners at least 90 days' notice by email (needs Resend) and never switch a live site without it.
- **Deviations from the design, on purpose:**
  - The landing page's testimonials band is hidden until there are real customer quotes; the design shipped placeholders.
  - Bento's "Download CV" button became "View experience" (there's no CV file to download), and its demo-only "Available across Europe" line is gone.
  - Two design-file colour bugs were resolved to their intent: Bento's pull-quote text (invisible in the mock) and template figcaptions.
  - The editor's Hero panel gained "Profile details" (name, title, organisation, location, availability, affiliations, keywords): the templates show these, and the mock had no way to edit them.
  - Headline rewrite options follow the mock's logic (Sharper, More formal, Shorter) rather than the README's list.
  - Meridian follows the owner's section order. The Meridian mock puts About before Impact; new sites keep Impact first because the other five templates are designed that way, and one order serves all six.
  - The questions preview shows the address the person will be offered (from the full name), not just the first name.
- **Follow-ups:** Paddle checkout and webhooks; delete unreferenced media; email verification before first publish is covered by passwordless sign-in; per-tenant OG images; an "add CV later" import in the editor; claimed-but-never-published addresses could expire after N days.

## Current state (October 2026)

**Live in production** (`main`): guided questions and AI draft, two templates (Meridian, Monument), in-place editor, publishing with versions, contact form and Messages inbox, Settings (site, account, billing beta), custom domains on Vercel (tested end to end with a real domain on Hostinger), and analytics with the world map.

**Merged (PR #2):** the Overview's site preview fills the height beside the side cards; smooth section links on live sites; every visible text in Meridian editable in place.

**Merged since (all live):** Monument rebuilt from the Claude Design round 2 board, Free and Pro plans, device preview and sharing, and the new brand (symbol, lockup, favicons, email header; PR #4).

**Parked, revisit around launch:**

- DNS friction for non-technical users. Registrars ship a default `www` record, so adding ours fails (seen on Hostinger) until the old one is deleted. Options, cheapest first: show "change this record" using what's already on their DNS and detect the registrar from nameservers; Domain Connect one-click setup (GoDaddy, Cloudflare, IONOS, NameSilo; not Hostinger or Namecheap as far as we found); selling domains in-app. Measure where users stall before choosing.
- Resend in production.

**Template direction (agreed October 2026):** fewer, stronger templates. Meridian is the quiet one; Monument (rebuilt) is the loud one. Round 1 also produced "Index" (1a: a precise, specification-sheet layout) as a candidate third template, not designed yet. Aurora, Obsidian, Bento and Chronicle were removed (only test accounts used them). Their keys stay as aliases of Meridian 1, so any stored site or version still renders, and saved colours for them are dropped when a draft is saved.

**Monument redesign** (Claude Design round 2, direction 1b "Field"). Replaced Monument v1 in place instead of adding v2, because no real user has a Monument site yet; the freeze rule applies from launch.

- Big Shoulders (Google renamed "Big Shoulders Display"; set at its display optical size) and Public Sans. The name is fitted without a browser measurement: `monument/v1/measure.ts` holds the font's measured letter widths.
- Three owner colours, everything else mixed per site to clear 4.5:1 (3:1 for field borders) on paper, on the inverse field and on the accent field. Text on the accent picks the background or the text colour, whichever contrasts more. New presets: Signal, Cobalt, Forest, Oxblood, Acid night, Ember night.
- The contact form, custom section titles and template wording now work in Monument. The form moved to `src/contact-form.tsx` and is shared with Meridian through a class prefix (Meridian's output unchanged).
- Motion: the name entrance, marquee, row flood and form states are CSS. The design's section wipe needs to know which sections were off screen at load, so a small client component marks them after the page has loaded; without it, or under reduced motion and in thumbnails, nothing is hidden. Phone menu is a client component.
- Deviations: photos are greyscale multiplied into the accent as designed (open question: owners may want natural colour); the eyebrow is hidden when it only repeats the role and organisation shown on the field; dates use an en dash.
- Not built: the board's proposed "Speaking topics" and "In the press" sections (new content, needs a decision).

**Product domain: ceomaker.app** (bought October 2026). Customer sites move to `<name>.ceomaker.app` by setting `ROOT_DOMAIN` (see README, "Domain setup"). The product is on `www.ceomaker.app` (Vercel forwards the apex there; the app follows `APP_URL`, so the two agree). Previews use `preview.ceomaker.app` with sites at `<name>.preview.ceomaker.app`, because subdomains of `*.vercel.app` can't be created. The `/sites/<name>` path mode was removed once the domain worked: sites only live on subdomains (or the owner's own domain), and local development uses `demo.localhost:3000`.

**Free and Pro plans (October 2026).** Free to sign up and publish; Pro for the extras. Free: Meridian, `<name>.ceomaker.app`, email and links, one AI draft per account and 5 rewrites a day, a "Made with CEOMaker" badge (rendered by the app around the template, so frozen designs are untouched). Pro: Monument and future premium templates, custom domain, contact form and inbox (the form can only be switched on with Pro), analytics, more AI and CV import, no badge. Rules in `packages/schema/src/plans.ts`, plan in `user.plan`, granted by hand until Paddle sets it. Gating is applied when rendering and in every server action, never only in the UI. When Pro ends the site stays live on the free plan (premium template shown as Meridian, form off, custom domain forwards to the subdomain, badge on); nothing stored changes. Billing now sets the plan (see "Billing" below); by hand, the owner republishes to refresh the live site.

**Device preview and sharing (October 2026, Claude Design editor round 1).** The editor canvas has a Desktop / Tablet / Phone switch (1280, 820, 390): templates lay out by container width, so the page is drawn at the device's real width inside an outline and only scales down when the canvas is too narrow; the readout says so. The selected section is ringed (found by its anchor or its editable fields, so templates stay untouched) and scrolled into view on every switch; clicking the page selects a section. The last size is stored on the account (`user.editor_device`). A fourth tab, Sharing, edits the search title and description (empty means automatic; warnings use Google's width limit, measured in Arial), the share image and the favicon (cropped in the browser to 1200 × 630 JPEG or 512 × 512 PNG; `/api/media` checks the exact size). Without an upload, live sites use a generated card (`ShareCard` in `packages/templates`, drawn by `next/og` at `<site>/share-card.png` with fonts from `apps/web/assets/share-fonts`) and the monogram; an uploaded favicon is served through `<site>/site-icon.png`, which falls back to the monogram.

**Billing (October 2026).** Merchant of record, because selling to buyers worldwide means VAT and sales tax from the first sale. The seller is an individual in Algeria, which rules out most providers:

- **Paddle**: applied, verification in review. Algeria isn't on its list of refused seller countries; individuals skip business verification; payouts by SWIFT wire (the Dukascopy IBAN, not its 12-digit account number) or Payoneer. Kept as the alternative if Freemius falls through.
- **Freemius** (chosen, October 2026): merchant of record that lists Algeria as supported and pays by wire, Payoneer, Wise or PayPal; about 4.7% plus card fees. Chosen over waiting for Paddle because the account and its sandbox work today. Still open: its support's written answer on Algeria and a Swiss IBAN, any seller review before live sales, and the payout method (editable from 11 October: Bank Wire, USD, Dukascopy IBAN with BIC DUBACHGG; Payoneer as backup). The Freemius agent skills package was not installed (the session's safety check refused third-party agent instructions); the integration follows the SDK and the docs instead.
- **Polar and Lemon Squeezy** pay out through Stripe Connect, which pays Algeria residents only into an Algerian bank, in dinars. That is why the Dukascopy BIC is refused ("couldn't find the bank": the form looks it up among Algerian banks). A Lemon Squeezy application with an Algerian EUR account is in review, but the owner won't use it; Lemon Squeezy is also being folded into Stripe Managed Payments.
- **Dodo and Creem** don't support Algeria. FastSpring (sales call, slow first payout, high fees at $9.99), PayPro Global and Verifone are not pursued unless both Paddle and Freemius fail.
- Fallback for the first customers: invoice by bank transfer and grant Pro by hand.

Built, the same for any provider: `subscription` table (migration 0010), `applySubscriptionEvent` in `packages/db` and `syncSubscription` in `apps/web/src/lib/billing.ts`. The plan is Pro while any of the account's subscriptions is active or past due (the provider's payment retries are the grace period; this replaces the earlier idea of a separate grace period on lapsed premium templates), free once paused or canceled. Cancelling keeps Pro to the end of the paid period because Paddle keeps the subscription active until then (another provider's mapping must do the same). Older or repeated events change nothing. When the plan changes, every live page of the owner is invalidated with `revalidateTag(tag, { expire: 0 })` (checked on a production build: the first visit after the change shows it) and this server's domain routing is forgotten. No trial: the free plan is the trial.

**Freemius integration** (`apps/web/src/lib/freemius.ts`, routes under `apps/web/src/app/api/billing/freemius/`): hosted checkout with the account email fixed (`checkout`), the signed redirect back (`return`), the signed webhook (`webhook`), a new card through Freemius's card-update page (`card`) and invoice PDFs (`invoice/[paymentId]`, only the owner's own payments). Managing Pro happens on Settings › Billing, not in Freemius's customer portal (the owner wants everything in the app): cycle, price, renewal or end date and invoices are read live from Freemius; cancelling switches renewal off and Pro lasts to the end of the paid period. Card entry stays on Freemius's page: an in-page overlay would need `frame-src` and `payment` opened in our security headers and can break PayPal and wallet payments. Not in the app yet: switching monthly to yearly, and billing address or VAT details after purchase. Branding of what stays at Freemius: `public/brand/freemius-checkout.css` restyles the checkout and card pages through Freemius's documented CSS variables (accent, states, backgrounds) and Barlow; written from their docs without seeing the live page (the session can't reach checkout.freemius.com), so check it there. Emails are styled in Freemius's Email Styler (logo `public/brand/ceomaker-lockup-600.png`) and sent from our domain once DKIM is set. Invoices stay Freemius's documents: as merchant of record it is the seller, so we can't issue our own; its product title and icon appear on them. Every event reads the license again from Freemius; `freemius-state.ts` maps it: a cancelled license (refund) ends Pro at once; an unexpired one is active even after renewal is switched off; an expired one whose subscription isn't cancelled is past due (Freemius retries the payment); otherwise canceled. Purchases find the account by email. Production sells for real, previews and local use the sandbox, and each ignores the other's licenses. Deleting an account cancels its subscription first, and refuses if that fails. Terms and privacy name Freemius. Setup steps in README, "Payments (Freemius)".

Not built yet: a way to refresh live pages after a plan change by hand (the owner asked not to). If Freemius's `license.expired` webhook is ever lost, the account stays Pro until the next event. Before the first real payment: Vercel Pro (Hobby is non-commercial only), the four FREEMIUS_* variables in Production, and the webhook and redirect URLs switched to `www.ceomaker.app`.

**Next:** decide the next template objectives with the owner before building anything. Earlier ideas the owner raised: sub-pages and a simple blog, menu links to sub-pages, bringing custom titles to the other templates. The constraint stands: easy for busy non-technical people, not a Webflow clone.
