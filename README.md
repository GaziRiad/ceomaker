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

One Next.js 16 app serves two surfaces, split by the `Host` header in [`apps/web/src/proxy.ts`](apps/web/src/proxy.ts):

- **Product**: `ceomaker.com`. Landing page, auth, dashboard.
- **Customer sites**: `<subdomain>.ceomaker.com`. Rewritten to the internal `/s/[subdomain]` route, which renders the site's published version from cache. Tenant hosts expose no API, auth or dashboard routes.

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
- **Sessions.** Better Auth cookies are host-only on the product domain and are never shared with `*.ceomaker.com`. Customer sites set no cookies. Sign-in and sign-up are rate limited, with counters stored in Postgres.
- **Headers.** CSP, HSTS (with `includeSubDomains`), `nosniff`, `frame-ancestors 'none'`, COOP and Permissions-Policy on every response. Inline scripts are allowed because cached pages can't carry per-request nonces (see `src/lib/security-headers.ts`). The structural guarantee above is the primary XSS defence.

## Local development

Requirements: Node 22+, pnpm 10, Postgres 16 (or Docker).

```bash
pnpm install
cp .env.example .env               # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d               # Postgres with ceomaker + ceomaker_test databases
pnpm db:migrate
pnpm db:seed                       # publishes demo.localhost:3000
pnpm dev
```

- Product: http://localhost:3000
- Demo customer site: http://demo.localhost:3000 (browsers resolve `*.localhost` to your machine)

### Scripts

| Command            | What it does                                                          |
| ------------------ | --------------------------------------------------------------------- |
| `pnpm dev`         | Run the app                                                           |
| `pnpm build`       | Production build                                                      |
| `pnpm lint`        | ESLint across the monorepo                                            |
| `pnpm typecheck`   | TypeScript in every package                                           |
| `pnpm test`        | Unit tests, plus DB integration tests when `TEST_DATABASE_URL` is set |
| `pnpm db:generate` | Generate a migration after changing `packages/db/src/schema`          |
| `pnpm db:migrate`  | Apply migrations                                                      |
| `pnpm db:seed`     | Create/refresh the demo site (refuses to run in production)           |

## Deployment (Vercel)

1. Create a project with root directory `apps/web`.
2. Add domains `ceomaker.com`, `www.ceomaker.com` and the wildcard `*.ceomaker.com`. Wildcard certificates use a DNS-01 challenge, so either move the domain to Vercel's nameservers or delegate `_acme-challenge.ceomaker.com` to Vercel and add a wildcard CNAME at your DNS provider.
3. Set `DATABASE_URL` (pooled), `BETTER_AUTH_SECRET`, `APP_URL=https://ceomaker.com` and `ROOT_DOMAIN=ceomaker.com`.
4. Run `pnpm db:migrate` against production before promoting a deploy that includes new migrations.
5. Point an uptime monitor at `/api/health`.

If you self-host behind a CDN instead of Vercel, the CDN honours the long `s-maxage` on customer pages. Publishing must then also purge the CDN cache for that host, or edits won't show until the cache expires.

## Tooling notes

- **TypeScript 6.0**, not 7. TS 7 (the native Go port) drops the JS API that Next's build type-check and typescript-eslint use.
- **ESLint 9**. `eslint-config-next` 16.3 bundles plugins that don't support ESLint 10 yet.
