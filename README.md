# CEOMaker

Personal websites for founders, executives and investors. A user signs up, describes their background (or uploads a CV), gets an AI-drafted site, edits it, and publishes it at `yourname.ceomaker.com` on a monthly subscription.

The full build plan and phase roadmap live in [`docs/PLAN.md`](docs/PLAN.md).

## Status

| Phase                                        | State   |
| -------------------------------------------- | ------- |
| 0. Foundation (monorepo, auth, DB, CI)       | Done    |
| 1. Content contract + multi-tenant renderer  | Done    |
| 2. Onboarding, AI generation, editor         | Next    |
| 3. Publish + billing (Lemon Squeezy)         | Planned |
| 4. Analytics, more templates, SEO            | Planned |
| 5. Custom domains, renderer isolation, scale | Planned |

## Architecture

One Next.js 16 app serves the product (landing page, auth, dashboard) and every customer site. [`apps/web/src/proxy.ts`](apps/web/src/proxy.ts) decides which one a request is for and rewrites customer requests to the internal `/s/[subdomain]` route, which renders the site's published version from cache. There are two routing modes:

| Mode                                       | Customer site address              | When                                    |
| ------------------------------------------ | ---------------------------------- | --------------------------------------- |
| **Path** (`ROOT_DOMAIN` unset)             | `ceomaker.vercel.app/sites/amelia` | Now: free Vercel address, before launch |
| **Subdomain** (`ROOT_DOMAIN=ceomaker.com`) | `amelia.ceomaker.com`              | After buying the domain                 |

Only one mode is active at a time, so a site never has two public URLs. Path-mode pages are marked `noindex`, so the temporary addresses never compete in search with the real domain. Customer addresses expose no API, auth or dashboard routes in either mode.

A site is data, not HTML. The Zod contract in [`packages/schema`](packages/schema) defines themes, section types and site content, and every layer uses it: the database layer validates writes against it, the renderer parses stored JSON through it, and the editor and AI generator will emit it.

```
apps/web            Next.js app: proxy routing, dashboard, auth, tenant renderer route
packages/schema     Zod content contract: sections, theme, rich text, subdomains, fixtures
packages/db         Drizzle schema, migrations, owner-scoped queries, seed
packages/templates  Server-rendered site templates (Executive) and the template registry
```

### Publishing and caching

- Each site has one mutable **draft** and an append-only history of **published** versions. A database trigger makes published versions immutable, which gives rollback and an audit trail.
- The renderer reads the published version through a `'use cache'` function tagged `site:<subdomain>`. After the first visit, the page is served fully static (`x-nextjs-cache: HIT`, long `s-maxage`). Publishing calls `updateTag`, so the owner sees changes immediately.

### Security model

- **Content is data.** User and AI content is validated structured data rendered as escaped text. There is no `dangerouslySetInnerHTML`. Links are restricted to `https`, `http`, `mailto:`, `tel:` and in-page anchors. Theme colors must be `#rrggbb`, so they can't inject CSS.
- **Tenant isolation.** Queries that touch a site take the acting `userId` and scope to it. A composite foreign key means a site can only point at its own versions, so one tenant's content can never be served on another tenant's domain. Subdomain format is enforced in both the schema and a database `CHECK`.
- **Sessions.** Better Auth cookies are host-only on the product domain and are never shared with `*.ceomaker.com`. Customer sites set no cookies. Sign-in and sign-up are rate limited, with counters stored in Postgres. In path mode, customer pages share the product's origin until the domain exists. That's acceptable pre-launch because site content can't run scripts and session cookies are HttpOnly, but it's one reason to move to subdomains before real customers arrive.
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

| Variable                | Value                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `dev` branch, `ceomaker` database, **pooled**                                           |
| `DATABASE_URL_UNPOOLED` | `dev` branch, `ceomaker` database, **direct**                                           |
| `TEST_DATABASE_URL`     | `dev` branch, `ceomaker_test` database, **direct**                                      |
| `BETTER_AUTH_SECRET`    | Output of `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

Neon's strings may include `channel_binding=require`. That's fine: the app strips it, because the Postgres driver we use doesn't support it.

```powershell
pnpm db:migrate
pnpm db:seed          # publishes the demo site
pnpm dev
```

- Product: http://localhost:3000
- Demo customer site: http://localhost:3000/sites/demo

To try subdomain mode locally, set `ROOT_DOMAIN=localhost:3000` and open http://demo.localhost:3000. Browsers resolve `*.localhost` to your machine.

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
   - `ENABLE_EXPERIMENTAL_COREPACK=1` makes Vercel use the pnpm version pinned in `package.json`. Without it, Vercel builds with pnpm 9.
   - Leave `APP_URL` and `ROOT_DOMAIN` unset: the app derives its address from Vercel's system variables and serves customer sites at `/sites/<name>`.

3. **Deploy.** The build log shows `Migrations applied` before `next build`.
4. **Check:**
   - `https://<project>.vercel.app/api/health` returns `{"ok":true}`.
   - Sign up, claim an address.
   - To show the demo site in production, run `pnpm db:seed` once from your machine with the production `DATABASE_URL`.
5. **Monitor:** point a free uptime monitor at `/api/health`.

Vercel's Hobby plan is for **non-commercial use only**. It's fine while building and testing; upgrade to Pro before taking payments.

### When you buy the domain

1. In Vercel, add `ceomaker.com`, `www.ceomaker.com` and `*.ceomaker.com`. Wildcard certificates use a DNS-01 challenge: either move the domain to Vercel's nameservers, or delegate `_acme-challenge.ceomaker.com` to Vercel and add a wildcard CNAME at your DNS provider.
2. Set `ROOT_DOMAIN=ceomaker.com` and `APP_URL=https://ceomaker.com` for Production, then redeploy. Customer sites move to `<name>.ceomaker.com`, and the `/sites/` addresses stop resolving.
3. Upgrade to Vercel Pro before charging customers.

If you ever self-host behind a CDN instead of Vercel, the CDN honours the long `s-maxage` on customer pages. Publishing must then also purge the CDN cache for that address, or edits won't show until the cache expires.

## Tooling notes

- **TypeScript 6.0**, not 7. TS 7 (the native Go port) drops the JS API that Next's build type-check and typescript-eslint use.
- **ESLint 9**. `eslint-config-next` 16.3 bundles plugins that don't support ESLint 10 yet.
