# CEOMaker

Personal websites for founders, executives and investors. A visitor taps through five guided questions (optionally adding a CV), signs in without a password, picks one of six templates (Meridian, Harbour, Monument, Salon, Folio or Tempo), gets an AI-drafted site, edits it, and publishes it at `yourname.ceomaker.com`. Billing ($9.99 a month or $99 a year) comes in Phase 3; publishing is free during the beta.

The full build plan and phase roadmap live in [`docs/PLAN.md`](docs/PLAN.md).

## Status

| Phase                                        | State                         |
| -------------------------------------------- | ----------------------------- |
| 0. Foundation (monorepo, auth, DB, CI)       | Done                          |
| 1. Content contract + multi-tenant renderer  | Done                          |
| 2. Onboarding, AI generation, editor         | Done                          |
| 3. Publish + billing (Paddle)                | Publishing done, billing next |
| 4. Analytics, more templates, SEO            | Analytics done                |
| 5. Custom domains, renderer isolation, scale | Custom domains done           |

## Architecture

One Next.js 16 app serves the product (landing page, auth, dashboard) and every customer site. [`apps/web/src/proxy.ts`](apps/web/src/proxy.ts) decides which one a request is for and rewrites customer requests to the internal `/s/[subdomain]` route, which renders the site's published version from cache.

| Where      | Product                | Customer site                 |
| ---------- | ---------------------- | ----------------------------- |
| Production | `www.ceomaker.app`     | `amelia.ceomaker.app`         |
| Preview    | `preview.ceomaker.app` | `amelia.preview.ceomaker.app` |
| Local      | `localhost:3000`       | `demo.localhost:3000`         |

`ROOT_DOMAIN` names the domain customer sites live under (unset: the app's own host, which is what local development uses). The product answers on that domain or its `www`, following `APP_URL`. Customer addresses expose no API, auth or dashboard routes.

An owner can also connect their own domain (Settings › Site). The proxy looks up unknown hosts in `site_domain` (cached in memory for 30 seconds) and serves that site; `www.` forwards to the domain, and once the domain is live the site's own address forwards there too, so only one address is indexed.

A site is data, not HTML. The Zod contract in [`packages/schema`](packages/schema) defines colours, section types, site content and the guided answers, and every layer uses it: the database layer validates writes against it, the renderer parses stored JSON through it, and the editor and the AI drafting step emit it.

```
apps/web            Next.js app: landing, guided questions, sign-in, builder, editor, dashboard,
                    AI drafting (lib/ai), media uploads, proxy routing, tenant renderer route
packages/schema     Zod contract: sections, colours, rich text, answers, subdomains, fixtures
packages/db         Drizzle schema, migrations, owner-scoped queries, seed
packages/templates  The site templates (Meridian, Harbour, Monument, Salon, Folio, Tempo), their shared view model,
                    the shared contact form and the registry
```

### Publishing and caching

- Each site has one mutable **draft** and an append-only history of **published** versions. A database trigger makes published versions immutable, which gives rollback and an audit trail.
- The renderer reads the published version through a `'use cache'` function tagged `site:<subdomain>`. After the first visit, the page is served fully static (`x-nextjs-cache: HIT`, long `s-maxage`). Publishing calls `updateTag`, so the owner sees changes immediately.

### Security model

- **Content is data.** User and AI content is validated structured data rendered as escaped text. There is no `dangerouslySetInnerHTML`. Links are restricted to `https`, `http`, `mailto:`, `tel:` and in-page anchors. Theme colors must be `#rrggbb`, so they can't inject CSS.
- **Tenant isolation.** Queries that touch a site take the acting `userId` and scope to it. A composite foreign key means a site can only point at its own versions, so one tenant's content can never be served on another tenant's domain. Subdomain format is enforced in both the schema and a database `CHECK`.
- **Sessions.** Sign-in is passwordless: a single-use email link (stored hashed, valid 15 minutes) or Google. Better Auth cookies are host-only on the product domain and are never shared with `*.ceomaker.com`. Customer sites set no cookies. Sign-in requests are rate limited, with counters stored in Postgres.
- **Uploads and AI.** Portraits are resized and re-encoded in the browser (which drops EXIF data such as GPS position), then checked again on the server by their bytes (JPEG, PNG or WebP only). CVs are sent once to the model to draft the site and never stored. AI drafts and rewrites are rate limited per user, and the model is told to use only facts from the answers and the CV: sections that need numbers, past roles or quotes start hidden and empty instead of invented.
- **Headers.** CSP, HSTS (with `includeSubDomains`), `nosniff`, `frame-ancestors 'none'`, COOP and Permissions-Policy on every response. Inline scripts are allowed because cached pages can't carry per-request nonces (see `src/lib/security-headers.ts`). The structural guarantee above is the primary XSS defence.

## Local development (Windows, macOS, Linux)

Requirements: **Node 24 or newer** (CI and Vercel use 24 LTS; 26 also works), **pnpm 10.33**, and a Postgres database (the setup below uses Neon's free tier, so there's nothing to install).

### 1. Node and pnpm

```powershell
node -v                          # needs v24 or newer; install with: winget install OpenJS.NodeJS.LTS
npm install -g pnpm@10.33.0      # Node 25+ no longer ships Corepack, so install pnpm directly
pnpm -v                          # 10.33.0
```

If PowerShell says _"running scripts is disabled on this system"_, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then open a new terminal.

### 2. Database (Neon)

1. Create a free account at [neon.com](https://neon.com) and a project named `ceomaker` in **AWS Europe Central (Frankfurt)**. The project starts with a `main` branch (production) and a database named `neondb`. Rename it to `ceomaker`, or create a `ceomaker` database.
2. Create a branch named `dev`, for your laptop and Vercel previews. On `dev`, add a second database named `ceomaker_test` for the integration tests.
3. For each branch, open **Connect** and copy two connection strings: **pooled** (host contains `-pooler`) and **direct** (connection pooling turned off).

### 3. Environment and first run

```powershell
pnpm install
copy .env.example .env
```

Fill `.env`:

| Variable                                   | Value                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | `dev` branch, `ceomaker` database, **pooled**                                           |
| `DATABASE_URL_UNPOOLED`                    | `dev` branch, `ceomaker` database, **direct**                                           |
| `TEST_DATABASE_URL`                        | `dev` branch, `ceomaker_test` database, **direct**                                      |
| `BETTER_AUTH_SECRET`                       | Output of `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `ANTHROPIC_API_KEY`                        | Optional locally. See [AI drafting](#ai-drafting-claude)                                |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional. See [Google sign-in](#google-sign-in)                                         |

Paste Neon's strings as they are. They may include `channel_binding=require`, which the app strips because the Postgres driver doesn't support it, and `sslmode=require`, which the app upgrades to `verify-full` so the server certificate is actually checked.

Signing in locally needs no email setup: click "Email me a sign-in link" and the link prints in the terminal running `pnpm dev`.

```powershell
pnpm db:migrate
pnpm db:seed          # publishes the demo site
pnpm dev
```

- Product: http://localhost:3000
- Demo customer site: http://demo.localhost:3000 (browsers resolve `*.localhost` to your machine)

### Scripts

| Command            | What it does                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `pnpm dev`         | Run the app                                                              |
| `pnpm build`       | Production build                                                         |
| `pnpm lint`        | ESLint across the monorepo                                               |
| `pnpm typecheck`   | TypeScript in every package                                              |
| `pnpm test`        | Unit tests, plus DB integration tests when `TEST_DATABASE_URL` is set    |
| `pnpm db:generate` | Generate a migration after changing `packages/db/src/schema`             |
| `pnpm db:migrate`  | Apply migrations (uses `DATABASE_URL_UNPOOLED` when set)                 |
| `pnpm db:seed`     | Create/refresh the demo site (refuses to run when `NODE_ENV=production`) |

Prefer Docker? `docker compose up -d` starts a local Postgres with `ceomaker` and `ceomaker_test` databases; see `docker-compose.yml` for the URLs.

## Deployment (Vercel, free address)

[`apps/web/vercel.json`](apps/web/vercel.json) runs database migrations before every build, and pins functions to Frankfurt (`fra1`), next to the Neon database.

1. **Import** the GitHub repo in Vercel:
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js
   - **Node.js version** (Settings → Build and Deployment): **24.x**
   - **Production branch** (Settings → Environments → Production): `main`
2. **Environment variables** (Settings → Environment Variables):

   | Variable                       | Production          | Preview                  |
   | ------------------------------ | ------------------- | ------------------------ |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1`                 | `1`                      |
   | `DATABASE_URL`                 | Neon `main`, pooled | Neon `dev`, pooled       |
   | `DATABASE_URL_UNPOOLED`        | Neon `main`, direct | Neon `dev`, direct       |
   | `BETTER_AUTH_SECRET`           | new random value    | a different random value |
   | `RESEND_API_KEY`               | Resend key          | Resend key               |
   | `EMAIL_FROM`                   | see below           | see below                |
   | `GOOGLE_CLIENT_ID`             | optional            | (leave unset)            |
   | `GOOGLE_CLIENT_SECRET`         | optional            | (leave unset)            |
   | `ANTHROPIC_API_KEY`            | Claude key          | Claude key               |
   | `VERCEL_API_TOKEN`             | see Custom domains  | (leave unset)            |
   | `VERCEL_PROJECT_ID`            | see Custom domains  | (leave unset)            |
   | `VERCEL_TEAM_ID`               | see Custom domains  | (leave unset)            |
   | `CRON_SECRET`                  | new random value    | (leave unset)            |
   | `ADMIN_EMAILS`                 | your email          | your email               |
   | `NEXT_PUBLIC_POSTHOG_KEY`      | PostHog project key | (leave unset)            |
   | `FREEMIUS_*` (4 variables)     | see Payments        | same (sandbox)           |
   | `R2_*` (4 variables)           | see Image storage   | same                     |
   - `ENABLE_EXPERIMENTAL_COREPACK=1` makes Vercel use the pnpm version pinned in `package.json`. Without it, Vercel builds with pnpm 9.
   - Set `ROOT_DOMAIN` and `APP_URL` as described in "Domain setup" below. Without a domain, customer sites can't be reached on a `*.vercel.app` address.

3. **Deploy.** The build log shows `Migrations applied` before `next build`.
4. **Check:**
   - `https://<project>.vercel.app/api/health` returns `{"ok":true}`.
   - Sign in, answer the questions, write a draft and publish it.
   - To show the demo site in production, run `pnpm db:seed` once from your machine with the production `DATABASE_URL`.
5. **Monitor:** point a free uptime monitor at `/api/health`.

Vercel's Hobby plan is for **non-commercial use only**. It's fine while building and testing; upgrade to Pro before taking payments.

### Sign-in email (Resend)

Production refuses to start an email sign-in without a key, so sign-in links are never written to logs.

1. Create a free account at [resend.com](https://resend.com) (100 emails a day, 3,000 a month) and create an API key with sending access. Set it as `RESEND_API_KEY`.
2. **Until you verify a domain**, Resend only delivers from `onboarding@resend.dev` to the address you signed up to Resend with. That's enough to test, not for other people. Leave `EMAIL_FROM` unset for this.
3. **To let anyone sign in by email**, add a domain you own in Resend (Domains → Add domain), add the DNS records it shows, wait for "Verified", then set `EMAIL_FROM=CEOMaker <signin@yourdomain.com>`. Until then, Google sign-in is the way in for other people.

### Google sign-in

"Continue with Google" appears once both variables are set. In the [Google Cloud console](https://console.cloud.google.com):

1. Create a project (for example `CEOMaker`).
2. **Google Auth Platform → Branding**: app name `CEOMaker`, support email, developer contact email. Leave the logo empty: a logo triggers Google's brand verification.
3. **Audience**: user type **External**. While the status is **Testing**, only the test users you add here can sign in. Click **Publish app** to open it to everyone. CEOMaker only asks for name, email and profile picture (`openid`, `email`, `profile`), which need no Google review.
4. **Clients → Create client** → **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` and `https://<project>.vercel.app`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<project>.vercel.app/api/auth/callback/google`
5. Copy the **Client ID** and **Client secret** right away (or download the JSON). Google shows the secret only once; if you lose it, add a new secret on the client and delete the old one.
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and in Vercel (Production), then redeploy. Changes on Google's side can take a few minutes to apply.

Production is `https://www.ceomaker.app` and previews `https://preview.ceomaker.app`: each needs its origin and `/api/auth/callback/google` redirect URI on the same client.

A Google account and an email sign-in with the same address end up as one CEOMaker account. The exception is an account created before passwordless sign-in: its email was never verified, so Google asks for one email-link sign-in first, and the sign-in page says so.

### AI drafting (Claude)

Drafts use Claude Opus 5.5 (`claude-opus-5-5`) with structured output, streamed so the "Writing your first draft" screen follows real progress. Requests opt into Anthropic's server-side refusal fallbacks (`fallbacks: "default"`): if a request is declined by a safety classifier, the API retries it on a recommended fallback model in the same call.

1. Create a key at [console.anthropic.com](https://console.anthropic.com) and add credit to the account.
2. Set `ANTHROPIC_API_KEY` locally and in Vercel.
3. Expect roughly $0.05 to $0.20 per first draft (more with a long PDF CV) and well under a cent per headline rewrite. Limits per user per day: 10 drafts, 60 rewrites (`AI_LIMITS` in `apps/web/src/lib/ai/client.ts`). Every request is logged in the `ai_usage` table with its token counts.

Without a key the product still works end to end: the first draft is built from the answers alone, and the editor says so.

### Custom domains (customers' own)

Owners connect a domain they bought elsewhere in Settings › Site: they get the DNS records to add, a step-by-step guide for their registrar and a link they can send to an assistant. CEOMaker checks DNS itself (public resolvers) and asks Vercel to serve and secure the domain. Everything Vercel-specific is in [`apps/web/src/lib/domains/provider.ts`](apps/web/src/lib/domains/provider.ts), so another host means another implementation of that file.

1. **Token:** Vercel → Account Settings → Tokens → Create, scoped to the team that owns the project, no expiry or a long one. Set it as `VERCEL_API_TOKEN` (Production only).
2. **Project:** Project → Settings → General → Project ID (`prj_…`) as `VERCEL_PROJECT_ID`. If the project belongs to a team, Team Settings → General → Team ID (`team_…`) as `VERCEL_TEAM_ID`.
3. **Background check:** set `CRON_SECRET` to a long random value. [`apps/web/vercel.json`](apps/web/vercel.json) calls `/api/cron/domains` once a day, the most the Hobby plan allows (a more frequent schedule makes every deployment fail). Owners with Settings open are checked every 30 seconds from the page anyway. On Pro, change the schedule to `*/10 * * * *`; on Hobby, an outside scheduler (for example cron-job.org) can call `https://<app>/api/cron/domains` with the header `Authorization: Bearer <CRON_SECRET>` every 10 minutes.
4. **Redeploy.** Until the token and project are set, production shows "Not available yet" on the card. Preview deployments never touch the production project's domains. Locally, leave all three unset: development shows Vercel's standard records and checks real DNS, so you can try the whole flow with a domain you control (it just can't go live on localhost).
5. **Optional, before many customers:** set `CUSTOM_DOMAIN_CNAME` to a hostname of yours (e.g. `sites.ceomaker.app`, itself a CNAME to `cname.vercel-dns.com`). Customers then point `www` at your hostname, so a future move of hosting needs one record changed by you instead of one per customer. Test it with one domain first: Vercel must still recognise the domain as pointed at it.

Unconnected domains are released after 7 days, so nobody can hold a domain they never point here. When the domain goes live, the owner gets an email (once Resend is set up).

### Image storage (Cloudflare R2)

Uploaded images live in a Cloudflare R2 bucket; Postgres keeps only a row per image (owner, type, size). Sites still link to `/media/<id>`, which reads the file from R2 and is cached for a year by browsers and Vercel's CDN.

1. In Cloudflare, open R2, enable it (it asks for a payment method; the free tier covers 10 GB and a few million requests a month) and create a bucket, for example `ceomaker-media`, location hint Western Europe. Leave public access off.
2. R2 › Manage API tokens › Create API token: permission **Object Read & Write**, applied to that bucket only. Copy the Access Key ID and Secret Access Key (shown once).
3. In Vercel, set `R2_ACCOUNT_ID` (on the R2 overview page), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET` for Production and Preview. Sharing the bucket is safe: every file is named by a random id, and the cleanup below only deletes files its own database recorded.

Without these, production says uploads aren't available, and local development keeps files in `.media/` at the repository root. Every day at 03:43 UTC, `/api/cron/media` (with `CRON_SECRET`) deletes images over a day old that no version of any site uses; images in older published versions are kept. Deleting a site or an account deletes its images at once.

### Analytics

Live sites send anonymous page views and clicks on email, phone, LinkedIn and website links to `/api/collect` (no cookies, no stored addresses; a visitor is a keyed hash that changes every day). Country and city come from Vercel's request headers, so they only appear on deployments: locally every visit shows as "Unknown location". Signed-in CEOMaker users and known bots aren't counted.

The product's own pages (landing, sign-in, dashboard, editor) also load Vercel Web Analytics and Speed Insights (`@vercel/analytics`, `@vercel/speed-insights` in the `(app)` layout); enable both in the Vercel project. They only collect on Vercel deployments, and customer sites don't load them.

### Product analytics (PostHog)

PostHog shows how people use the product: the sign-up funnel, editor usage, publishing and upgrades, and errors. It runs on the product's own pages only (customer sites never load it), stores nothing in the browser (no cookies, no local storage, so no consent banner), and uses PostHog's EU servers. Code: `apps/web/src/lib/product-analytics`.

- **Anonymous visitors** get an id that lasts one page load. The steps before signing in (`questions_started`, `questions_completed`, `sign_in_requested`) happen within one page load, so they stay together.
- **Sign-up joins them to the account.** The sign-in link (and Google) send a new account to `/api/welcome` with that id and where the visit came from (referrer, `utm_*` tags, landing page). It saves the source on the account (`user.signup_source`), merges the visit into the account in PostHog and counts `signed_up` with the source.
- **Signed-in pages** link each page load to the account id (never the email). Admins (`ADMIN_EMAILS`) get the person property `internal: true`.
- **Server events** (they can't be blocked): `site_created`, `draft_written`, `template_chosen`, `site_published`, `ai_rewrite_used`, `photo_uploaded`, `domain_added`, `device_preview_changed`, `checkout_started`, `plan_changed` (cause: billing, gift or gift_ended). Server errors are reported from `instrumentation.ts`, browser errors by PostHog itself, and page speed (web vitals: LCP, CLS, FCP, INP) by PostHog too.
- **Session recordings**, with everything personal hidden in the browser (`recording.ts`): every text and input is masked, images, canvases and frames are blocked, and attributes that carry content (captions, link addresses, labels) are masked. These settings win over the project's own privacy settings. Console logs and network requests aren't recorded. Recordings start once session replay is switched on in the PostHog project.
- **Privacy:** no clicks are captured automatically (they would carry what people type into their site), no heatmaps, and URLs are cleaned before they leave the browser: our own keep their path (ids masked) and `utm_*` tags only, other sites only their origin. The browser sends to `/relay` on our own domain, which `proxy.ts` forwards to PostHog without cookies. Because PostHog's paths end in a slash, Next's trailing-slash redirect is off (`skipTrailingSlashRedirect`) and `proxy.ts` does the same redirect for every other path.

Setup:

1. Create a PostHog account in the **EU** region and one project for CEOMaker.
2. In the project's settings, turn on **Discard client IP data**, and switch on **session replay** (Record user sessions) for recordings. Leave surveys and heatmaps off (the code disables them anyway). Accept PostHog's data processing agreement.
3. In Vercel, set `NEXT_PUBLIC_POSTHOG_KEY` to the project's API key (`phc_…`; it can only send events, so it's safe in the browser) for **Production**, and redeploy (the key is built into the pages). Leave it unset for Preview, or use a second project for testing, so test traffic stays out of the real numbers.
4. In PostHog, filter out our own accounts: Settings › Product analytics › Filter out internal and test users, with the person property `internal` not equal to `true`.
5. The funnel: page view of `/` → `questions_started` → `questions_completed` → `sign_in_requested` → `signed_up` → `site_created` → `site_published` → `checkout_started` → `plan_changed` (plan `pro`, cause `billing`). Break `signed_up` down by `source`.

### Plans (Free and Pro)

Every account starts on the free plan: a site on Meridian or Harbour at `<name>.ceomaker.app`, reached by email and links, one AI draft and 5 AI rewrites a day, and a "Made with CEOMaker" badge. Pro adds Monument, Salon, Folio and Tempo (and future premium templates), a custom domain, the contact form and Messages inbox, analytics, more AI and drafting from a CV, and removes the badge. The rules live in `packages/schema/src/plans.ts`; the plan is `user.plan` (`free` or `pro`).

Free accounts can try Pro templates in the draft but not publish them. When an account isn't Pro, its live site is shown as Meridian, its form is off, its custom domain forwards to its own address and the badge appears; nothing stored changes, so Pro brings it all back.

**Billing.** Pro is sold through Freemius (see [Payments](#payments-freemius)). Its webhook hands each change to `syncSubscription` (`apps/web/src/lib/billing.ts`), which records it in the `subscription` table and sets `user.plan` from all of the account's subscriptions: Pro while any is active or its payment is being retried (the provider's retry schedule is the grace period), free once it's paused or canceled. Events arriving out of order or twice change nothing. When the plan changes, the owner's live pages are rebuilt on their next visit, so nobody has to republish. Accounts without a subscription are never touched by billing.

**Gifts and the admin page.** `/dashboard/admin` is for the emails in `ADMIN_EMAILS` (separated by commas); anyone else sees a page that doesn't exist. It lists every account, newest first, with a search: sign-up date, last activity, plan, and their site (the live address or Draft, the template, page views in the last 30 days, their own domain). "Gift Pro" gives Pro for 1, 3, 6 or 12 months, added to a gift that hasn't ended, with a note only admins see; "End gift" ends it at once. Live pages show the change straight away.

A gift is an end date on the account (`user.pro_until`). The plan is Pro while a subscription pays for it or the gift hasn't ended, so billing and gifts never overwrite each other. A gifted owner can subscribe from Billing at any time (checkout only turns away accounts that already pay): paying starts that day and overlaps the rest of the gift. Every day at 04:29 UTC, `/api/cron/gifts` (with `CRON_SECRET`) moves accounts whose gift has ended to the free plan unless they pay, refreshes their live site, and emails owners whose gift ends within 7 days, once, unless they pay.

Pro set by hand (`update "user" set plan = 'pro' where email = '…'`) still works for an account without a subscription; the admin page shows it as "set by hand" and can end it. After a change by hand the owner should publish once, since live pages are cached.

### Payments (Freemius)

Freemius is the merchant of record: it takes the payment, charges VAT and sales tax, sends receipts and handles refunds. Settings › Billing sends the owner to Freemius's hosted checkout (monthly or yearly, with their account email fixed). Everything after that stays in the app: Billing shows the cycle, price and renewal or end date (read live from Freemius), cancels renewal, and lists invoices as PDF downloads. Only typing a new card leaves the app, for Freemius's secure page, which returns to Billing; card details never reach our servers. Production takes real payments; previews and local development use Freemius's sandbox (test cards), and each ignores the other's licenses.

1. **Freemius product:** one paid plan, Pro, at $9.99 monthly and $99 yearly (the prices shown in the app live in `apps/web/src/lib/plan-copy.ts`), one license, no trial, a 14-day refund policy, and the terms URL `https://www.ceomaker.app/terms`.
2. **Keys:** from the product's (not the store's) Settings › API & Keys, set `FREEMIUS_PRODUCT_ID`, `FREEMIUS_PUBLIC_KEY`, `FREEMIUS_SECRET_KEY` and `FREEMIUS_API_KEY` (the API bearer token) in Vercel. Without all four, the Upgrade button says payments are coming soon.
3. **Webhook** (Settings › Webhooks): `https://<app>/api/billing/freemius/webhook`, with the events `license.created`, `license.extended`, `license.shortened`, `license.updated`, `license.cancelled`, `license.expired`, `license.plan.changed`, `license.deleted` and `subscription.cancelled`. Every event is checked against the secret key and the license is read again from Freemius, so an event can't grant anything by itself.
4. **Redirect after purchase** (Plans › Customization, toggle "Redirect Checkout to a custom URL"): `https://<app>/api/billing/freemius/return`. It applies the purchase at once and returns the owner to Billing; without it the webhook still does, moments later.

5. **Branding** (all in the Freemius dashboard; Freemius stays the seller on receipts and invoices, as merchant of record):
   - Product title `CEOMaker` and icon `design/brand/ceomaker-app-icon-512.png` (Settings › Information): shown on checkout, emails, invoices.
   - Checkout and card-update pages: Plans › Customization › Custom Checkout CSS file, `https://<app>/brand/freemius-checkout.css` (our colours and Barlow; the fonts next to it are served with a CORS header).
   - Emails: Emails › Styling with the logo `https://<app>/brand/ceomaker-lockup-600.png`, tone Professional, and the colours in `freemius-checkout.css`. Sender address on our domain (Emails), verified with DKIM (CNAME records added in Vercel's DNS for `ceomaker.app`), or Freemius falls back to its own address.

`<app>` is `preview.ceomaker.app` while testing with the sandbox and `www.ceomaker.app` for real payments. A purchase is matched to the account with the buyer's email, which checkout doesn't let them change. Deleting an account cancels its subscription first.

### Domain setup

The product domain is `ceomaker.app`, with customer sites at `<name>.ceomaker.app`.

1. **DNS at Vercel.** Wildcard certificates need Vercel to answer DNS challenges, so move the domain to Vercel's nameservers (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) at the registrar. Re-create any other records you need (email, verification) in Vercel's DNS first.
2. **Domains** (Vercel → Project → Domains):
   - `www.ceomaker.app` → Production (the product's address), and `ceomaker.app` → redirect (308) to `www.ceomaker.app`. The app follows `APP_URL`: with it on `www`, the app also sends the apex to `www`, so the two agree. (With `APP_URL` on the apex it does the reverse; never let Vercel and `APP_URL` disagree, or the two redirects loop.)
   - `*.ceomaker.app` → Production.
   - Previews: `preview.ceomaker.app` and `*.preview.ceomaker.app`, both assigned to the Git branch you preview.
3. **Environment variables**, then redeploy:
   - Production: `ROOT_DOMAIN=ceomaker.app`, `APP_URL=https://www.ceomaker.app`.
   - Preview: `ROOT_DOMAIN=preview.ceomaker.app`, `APP_URL=https://preview.ceomaker.app`.
4. **Google sign-in:** add `https://www.ceomaker.app` (and the preview address, if you sign in there with Google) to the authorised origins and `/api/auth/callback/google` redirect URIs.
5. Upgrade to Vercel Pro before charging customers.

Buying the domain also unblocks email sign-in for everyone (Resend needs a domain you own) and lets Google show your own domain on its consent screen.

If you ever self-host behind a CDN instead of Vercel, the CDN honours the long `s-maxage` on customer pages. Publishing must then also purge the CDN cache for that address, or edits won't show until the cache expires.

### Search engines (Google Search Console)

Only production is open to search engines (`isIndexable` in `src/lib/seo.ts`): previews and local runs send `X-Robots-Tag: noindex` and a closed `robots.txt`.

- **The product** (`www.ceomaker.app`): `/robots.txt` (keeps `/dashboard` and `/api/` out), `/sitemap.xml` (landing, privacy, terms), a canonical address, a share image (`(app)/opengraph-image.tsx`) and structured data describing CEOMaker on the landing page.
- **Each customer site**, on its own host (subdomain or custom domain): `/robots.txt` pointing to its own `/sitemap.xml` (its one page, dated by the last publish), and structured data about the person (name, role, organisation, portrait, LinkedIn and other profiles). Drafts and paused sites stay closed. Customer sites aren't listed in the product's sitemap: each host is its own site to search engines.

Setup, once: in [Google Search Console](https://search.google.com/search-console), add a **Domain** property for `ceomaker.app` and verify it with the TXT record it gives you (Vercel › Domains › ceomaker.app › DNS records). One property covers www and every `*.ceomaker.app` customer site. Then submit `https://www.ceomaker.app/sitemap.xml` under Sitemaps. Optionally import the property into Bing Webmaster Tools.

## Tooling notes

- **TypeScript 6.0**, not 7. TS 7 (the native Go port) drops the JS API that Next's build type-check and typescript-eslint use.
- **ESLint 9**. `eslint-config-next` 16.3 bundles plugins that don't support ESLint 10 yet.
