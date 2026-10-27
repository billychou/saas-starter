# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Next.js SaaS starter template with email/password auth, Stripe payments, team management with RBAC, an activity logging system, and an AI Studio (text-to-image generation via Alibaba Cloud Bailian/DashScope with a credits system). Stack: Next.js (App Router, Turbopack), Postgres + Drizzle ORM, Stripe, shadcn/ui, Tailwind CSS v4, Zod. Package manager is pnpm.

## Commands

```bash
pnpm dev            # start dev server (turbopack)
pnpm build          # production build
pnpm db:setup       # interactive script: creates .env, sets up local Postgres + Stripe products/prices
pnpm db:generate    # generate Drizzle migration after schema changes in lib/db/schema.ts
pnpm db:migrate     # apply migrations
pnpm db:seed        # seed default user (test@test.com / admin123) and team
pnpm db:studio      # Drizzle Studio database browser
```

There is no test suite or linter configured.

Local Stripe webhook testing requires the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Env lives in `.env` (not `.env.local`) — see `.env.example` for format. Key vars: `POSTGRES_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BASE_URL`, `AUTH_SECRET`, `DASHSCOPE_API_KEY` (Bailian AI), `ADMIN_EMAILS` (comma-separated platform admins for `/admin/models`), `SIGNUP_BONUS_CREDITS`.

## Architecture

### Route structure

- `app/(dashboard)/` — logged-in area: marketing landing page (`page.tsx`), `/pricing` (Stripe Checkout), nested `/dashboard/*` pages (general, security, activity) which support team member CRUD and settings, plus AI pages: `/studio` (generation workbench), `/gallery` (team gallery), `/admin/models` (admin-only model CRUD, Server Actions in `app/(dashboard)/admin/actions.ts`).
- `app/(login)/` — `/sign-in` and `/sign-up` pages; shared client component `app/(login)/login.tsx` and Server Actions in `app/(login)/actions.ts`.
- `app/api/` — REST routes: `/api/user` (includes `isAdmin`), `/api/team`, `/api/stripe/checkout`, `/api/stripe/webhook`, `/api/ai/generate`, `/api/ai/generations[/{id}]`, `/api/ai/models`. API routes are outside the middleware matcher — they authenticate via `getUser()`/`getTeamForUser()` themselves.
- Protected page prefixes are listed in `middleware.ts` (`protectedRoutes` array) — add new logged-in routes there.

### Authentication (two layers of middleware)

1. **Global**: root `middleware.ts` runs on all non-API/static routes. Redirects unauthenticated users away from `/dashboard`, and refreshes the JWT `session` cookie (jose, HS256, 1-day expiry) on GET requests. Session helpers (`signToken`, `verifyToken`, `getSession`, `setSession`, password hashing) are in `lib/auth/session.ts`.
2. **Action-level**: `lib/auth/middleware.ts` provides wrappers for Server Actions — `validatedAction` (Zod schema validation of FormData), `validatedActionWithUser` (also requires authenticated user), and `withTeam` (requires user + their team). Use these instead of hand-rolling checks in actions.

Auth is cookie-based JWT, no external auth provider. RBAC: users have a global `role` ('owner' | 'member') and per-team roles via `team_members`.

### Database layer (`lib/db/`)

- `schema.ts` — Drizzle table definitions (users, teams, team_members, activity_logs, invitations, ai_models, generations, generation_images, credit_transactions) plus inferred types (`NewUser`, `TeamDataWithMembers`, `AiModel`, `Generation`, etc.) and `ActivityType` enum.
- `drizzle.ts` — db client (postgres.js driver).
- `queries.ts` — all database query functions; actions and API routes should call these rather than writing raw Drizzle queries inline.
- `setup.ts` / `seed.ts` — run via the pnpm scripts above.

Schema changes require `pnpm db:generate` to produce a migration in `lib/db/migrations/`.

### Payments (`lib/payments/`)

- `stripe.ts` — Stripe client, checkout session creation, customer portal session creation.
- `actions.ts` — Server Actions for checkout/portal flows.
- Subscription state is stored on `teams` (stripeCustomerId, stripeSubscriptionId, planName, subscriptionStatus) and kept in sync by the webhook handler at `app/api/stripe/webhook/route.ts`, which updates the team via `updateTeamSubscription` in queries.ts.

### AI Studio (`lib/ai/`) — full record in `docs/ai-studio.md`

- `bailian.ts` — DashScope async text-to-image client (create task with `X-DashScope-Async: enable`, poll task by id). Credentials resolve per-model (`ai_models.apiKey`/`apiBase`) with env fallback (`DASHSCOPE_API_KEY`/`DASHSCOPE_BASE_URL`).
- `credits.ts` — `deductCredits`/`addCredits` run inside a transaction with `SELECT ... FOR UPDATE` on the team row; never mutate `teams.creditBalance` directly. Every balance change writes a `credit_transactions` ledger row (append-only). Also holds `CREDIT_PACKS` and `SIGNUP_BONUS_CREDITS`.
- `generations.ts` — orchestration: create (validate → insert → deduct → submit; refund on submit failure), sync (poll; on success download images to `public/generated/` because provider URLs expire in ~24h; on failure refund), list, delete (detach ledger rows, remove local files, cascade DB rows).
- Generation flow is server-polled: `GET /api/ai/generations` syncs all unfinished team tasks before returning; the Studio/Gallery SWR clients just re-fetch on an interval while tasks are pending/running.
- Credit packs are one-time Stripe Checkouts (`mode: 'payment'`, `metadata.type='credit_pack'`); the webhook's `checkout.session.completed` handler `handleCreditPackCheckout` is idempotent via `stripeSessionId`.
- Admin: `lib/auth/admin.ts` (`isAdminUser` checks `ADMIN_EMAILS`). Always guard admin actions/routes with it. Never expose `ai_models.apiKey` to the client (admin page selects `hasCustomKey: Boolean(apiKey)`).
- Generated images live on the local filesystem — fine for dev; serverless deployments need `downloadImage` swapped for object-storage upload.

### Activity logging

User events (sign-in, sign-up, invites, settings changes) are recorded to `activity_logs` via `logActivity` helpers in the actions files, using `ActivityType` values from the schema. Add logging when introducing new user-facing mutations.

### UI

shadcn/ui components live in `components/ui/` (configured via `components.json`, alias `@/components`). `cn()` utility is in `lib/utils.ts`.

The UI follows a ShipAny-style design (full record in `docs/ui-shipany-overhaul.md`):

- All colors come from oklch CSS-variable tokens in `app/globals.css` (shadcn zinc base + violet `--brand` token, plus `text-gradient`/`bg-brand-gradient` utilities). Never use hardcoded `gray-*`/`orange-*` classes — use tokens (`text-foreground`, `text-muted-foreground`, `bg-card`, `bg-brand`, `text-destructive`, …) so dark mode works.
- Dark mode toggles the `dark` class on `<html>`: inline anti-flash script in `app/layout.tsx` + `components/theme-toggle.tsx` (localStorage `theme` key).
- Landing page sections live in `app/(dashboard)/page.tsx`; header/footer are `app/(dashboard)/header.tsx` and `footer.tsx`.

### i18n (next-intl, en/zh)

Cookie-based locale switching (`NEXT_LOCALE` cookie), no URL prefixes — see `docs/i18n.md`. Rules:

- All user-facing copy lives in `messages/en.json` + `messages/zh.json` (namespaces: Header, Footer, Home, Pricing, Login, DashboardNav, Team, General, Security, Activity, NotFound, Metadata, Studio, Credits, Gallery, Admin). Add strings to both files. Escape apostrophes as `''` (ICU).
- Client components: `useTranslations('Ns')`. Sync server components: `useTranslations`. Async server components: `await getTranslations('Ns')` from `next-intl/server`. Rich text: `t.rich`. Arrays: `t.raw` (icons/components stay in code, paired by index).
- `i18n/config.ts` holds shared constants (locales, LOCALE_COOKIE) and is imported by client components — never add `next/headers` or other server-only imports to it; `i18n/request.ts` is server-only.
- To add a locale: copy `messages/en.json`, translate, register in `i18n/config.ts`.
- Server Action error/success strings (in `lib/` and `app/(login)/actions.ts`) are still English-only by design.
