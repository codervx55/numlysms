# Numlysms

Virtual phone number & SMS verification platform. Next.js App Router + Prisma on
Supabase Postgres, Supabase Auth, Paystack for deposits, XeroSMS for numbers.

## Stack decisions (and why)

- **Supabase Auth**, not NextAuth — you already had Supabase wired up; no reason
  to run two auth systems side by side.
- **Prisma** on top of Supabase's Postgres — gives you a typed schema, migrations,
  and the transaction/row-locking primitives the wallet needs. Supabase's own
  client is still used, but only for auth (`signIn`, `signUp`, `getUser`) — every
  table read/write goes through Prisma so there's exactly one code path that
  touches money.
- **Supabase Realtime is not wired in yet** — the SMS inbox currently uses polling
  (5s interval) against `/api/orders/[id]/sms`, which also does the actual
  XeroSMS fetch + de-dupe + persist. If you want push-based updates instead of
  polling, subscribe to Postgres changes on `SmsMessage` client-side and drop the
  `setInterval` — the persistence logic doesn't need to change.

## Folder structure

```
prisma/schema.prisma          User, Wallet, Transaction, Order, SmsMessage
src/
  lib/
    prisma.ts                 Prisma client singleton
    auth.ts                   requireUser / requireAdmin, error → HTTP mapping
    validations.ts            Zod schemas for every API input
    format.ts                 money/relative-time formatting
    supabase/
      client.ts                browser client (auth only)
      server.ts                server client + service-role client
    services/
      wallet.ts                the only module allowed to mutate Wallet/Transaction
      xerosms.ts               the only module allowed to call XeroSMS
      purchase.ts              orchestrates buy-number flow + compensating refunds
  middleware.ts                session refresh + route protection
  app/
    (auth)/login, signup
    dashboard/                 layout (sidebar/bottom nav), home, wallet, buy,
                                orders, orders/[id] (SMS inbox), admin
    api/
      wallet/                  GET balance+history, POST fund (init only), webhook (credits)
      orders/                  GET list, POST purchase, [id], [id]/cancel, [id]/sms
      catalog/                 countries/services passthrough to XeroSMS
      admin/                   users, orders, transactions, [id]/refund
      cron/expire-orders/      sweep for orders no one polled to expiry
  components/
    ui/                        Button, StatusBadge, Toast, Skeleton
    dashboard/                 nav, wallet header badge, admin refund button
```

## Setup

1. **Supabase project** — create one, grab the URL + anon key + service role key
   from Project Settings → API, and the pooled/direct connection strings from
   Project Settings → Database.
2. Copy `.env.example` to `.env` and fill in every value.
3. Install deps: `npm install`.
4. Push the schema: `npm run db:migrate` (creates the migration + applies it —
   use `db:deploy` in CI/production instead, since it doesn't prompt).
5. **Make yourself an admin** — there is deliberately no self-serve "become admin"
   endpoint. After signing up once through the app, run:
   ```sql
   update "User" set role = 'admin' where email = 'you@example.com';
   ```
6. **Paystack webhook** — in the Paystack dashboard, point the webhook URL at
   `https://<your-domain>/api/wallet/webhook`. This is the *only* thing that
   credits a wallet; the `/api/wallet/fund` route just opens a transaction.
7. **Cron (expiry sweep)** — `.github/workflows/expire-orders.yml` hits
   `/api/cron/expire-orders` every 10 minutes via GitHub Actions, same pattern as
   your AOMZIIP reports bot. Add two repo secrets under
   **Settings → Secrets and variables → Actions**:
   - `APP_URL` — your deployed Railway URL, e.g. `https://numlysms.up.railway.app`
   - `CRON_SECRET` — any long random string, matching the `CRON_SECRET` you set
     in Railway's environment variables
   As with the AOMZIIP bot, GitHub's free-tier cron can fire a few minutes late
   under load — fine here since this is a backstop, not time-critical.
8. `npm run dev` locally.

## Deploying to Render (free tier)

1. Push this repo to GitHub (already done).
2. Go to **dash.render.com** → **New** → **Blueprint** → connect the
   `codervx55/numlysms` repo. Render reads `render.yaml` automatically and
   proposes the `numlysms` web service.
3. When prompted, paste in every variable from `.env.example` (Supabase keys,
   `DATABASE_URL`/`DIRECT_URL`, XeroSMS key, Paystack keys, `CRON_SECRET`).
4. Deploy. `npm start` runs `prisma migrate deploy` before `next start`, same
   as the Railway setup, so schema changes apply automatically on every deploy.
5. Update the GitHub Actions cron secret: set `APP_URL` (repo → Settings →
   Secrets and variables → Actions) to your Render URL, e.g.
   `https://numlysms.onrender.com`.
6. Point Paystack's webhook at `https://numlysms.onrender.com/api/wallet/webhook`.

**Free-tier behavior worth knowing:** Render's free web services sleep after 15
minutes with no traffic, then cold-start (30–60s) on the next request. Your
`expire-orders` GitHub Action already pings the app every 10 minutes — more
often than the 15-minute sleep window — so in practice the app should stay
warm without any extra work. The one edge case: if a Paystack webhook lands
while the app happens to be asleep, that request eats the cold-start delay.
Paystack retries failed/timed-out webhooks, so this isn't silently lost money,
just a delayed credit. If that delay becomes a problem, Render's paid tier
($7/mo) removes the sleep behavior entirely.

## Deploying to Railway

1. Push this repo to GitHub, then create a new Railway project from it.
2. Add every variable from `.env.example` under Railway's **Variables** tab
   (including `CRON_SECRET`).
3. Railway auto-detects Node via Nixpacks; `railway.json` pins the build/start
   commands explicitly:
   - Build: `npm run build` (runs `prisma generate` then `next build`)
   - Start: `npm start` → runs `prisma migrate deploy` before `next start`, so
     schema changes apply automatically on every deploy — no manual migration
     step needed.
4. `.github/workflows/ci.yml` runs typecheck + lint + build on every push to
   `main` and on PRs, so a broken build gets caught before it reaches Railway.

## Money-safety model (read this before touching `lib/services/wallet.ts`)

- Balances are stored as **integer minor units** (`BigInt`), never floats.
- Every balance mutation takes a Postgres row lock (`SELECT ... FOR UPDATE`)
  inside a transaction before reading the balance, so two concurrent requests
  for the same user serialize instead of racing on a stale read.
- Every mutation requires an **idempotency key**, unique per `(userId, key)`.
  Retried requests — a webhook redelivery, a double-tapped button, a client
  retry after a timeout — return the original result instead of double-applying.
- Deposits are credited **only** by the signature-verified Paystack webhook.
  The client-facing fund endpoint never touches the balance.
- Purchase price is **always re-fetched from XeroSMS server-side**; the client
  only ever sends country/service codes, never a price, so a tampered request
  can't buy at a different price than what's actually listed.
- The buy-number flow (`lib/services/purchase.ts`) has compensating actions at
  each step: insufficient balance → no external calls made; XeroSMS purchase
  fails → automatic refund; XeroSMS succeeds but the DB write fails → retry the
  write a few times, then cancel the number at XeroSMS and refund rather than
  leave an unrecorded live number.

## Known follow-ups (not blocking, but worth doing before real money moves)

- **Rate limiting** isn't implemented on any route — add it at the edge
  (Vercel/Cloudflare) or via a small in-memory/Redis limiter on
  `/api/wallet/fund`, `/api/orders`, and the webhook, since all three are
  attack surface for abuse.
- **RLS**: all tables are currently reachable only through Prisma using the
  Supabase service-role-equivalent connection string, which bypasses RLS — safe
  as long as no client code ever queries these tables directly via
  `@supabase/supabase-js`. If you later add any client-side Supabase table
  queries, enable RLS on every table first.
- **Structured logging/alerting**: the `console.error` calls marked `CRITICAL`
  in `purchase.ts` (orphaned XeroSMS number, failed order-failed write) should
  go to a real alerting channel (Sentry, a Telegram bot, whatever you already
  use for the AOMZIIP reports bot) — those are the two failure modes most
  likely to need a human.
- **XeroSMS webhook**: if XeroSMS supports push delivery for incoming SMS
  instead of only polling, swap `getMessages` polling for a signature-verified
  webhook (mirror the Paystack webhook pattern) — much lower latency and fewer
  API calls.
- No automated tests yet. `lib/services/wallet.ts` and `purchase.ts` are the
  highest-value places to add them given what's at stake if they regress.
