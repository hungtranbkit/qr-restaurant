# QR Restaurant Ordering System — Demo Bistro

A working restaurant ordering platform: customers order via a per-table QR code,
kitchen sees tickets in realtime, staff manage tables and service requests,
cashiers check out, and admins run the business from a real dashboard — all on
real Postgres data, with server-side pricing, RBAC and audit logging.

This is a demo/dev build. It is **not** hardened for public production traffic
(see [Known limitations](#known-limitations)).

## 1. Architecture

```
Browser (customer / staff / kitchen / POS / admin)
        │  HTTPS
        ▼
Next.js 16 App Router (single Node process)
 ├─ Server Components ── read data directly via Prisma (initial page loads)
 ├─ Route Handlers (src/app/api/**) ── the API layer: auth, Zod validation,
 │                                     RBAC checks, calls the service layer
 ├─ Service layer (src/lib/services/**) ── all business logic & Prisma
 │   transactions (pricing, table sessions, orders, payments, audit…)
 └─ Realtime bus (src/lib/realtime) ── in-process EventEmitter, fanned out
     to browsers over Server-Sent Events (src/app/api/**/events)
        │
        ▼
PostgreSQL (Docker, port 5434) via Prisma ORM
```

Key design decisions:

- **Server-authoritative pricing.** The client never sends a price. Every
  order line is re-resolved against the live menu server-side
  (`src/lib/services/pricing.ts`), and `TableSession` totals are recomputed
  from live `Order`/`OrderItem` rows on every mutation and again at checkout.
- **Snapshotted order history.** `OrderItem` stores `itemNameSnapshot` /
  `unitPriceSnapshot` / modifier snapshots, so changing a menu price later
  never rewrites past orders (covered by `tests/pricing.test.ts`).
- **QR tokens, not IDs.** A table's QR encodes a 32-byte random
  `qrToken` (`/order/{token}`), never its database id. Regenerating a QR
  immediately invalidates the old one.
- **Realtime via SSE**, not polling: `src/lib/realtime/bus.ts` is an
  in-process event bus; `/api/staff/events`, `/api/kitchen/tickets`'s SSE
  sibling and `/api/customer/[token]/events` stream `text/event-stream` to
  the browser. Good enough for a single-instance deployment; see limitations
  for scaling this to multiple instances.
- **RBAC enforced server-side**, not just hidden buttons — every mutating
  route calls `requireApiPermission(...)` (`src/lib/auth/guard.ts`), and every
  page calls `requirePagePermission(...)`. See `tests/rbac.test.ts` and
  `tests/unauthorized-access.test.ts`.

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui (Radix), Lucide icons |
| Charts | Recharts |
| DB | PostgreSQL 17 (Docker) |
| ORM | Prisma 6 |
| Auth | Custom session cookie backed by a DB `Session` table (bcrypt password hashes) |
| Validation | Zod |
| Realtime | Server-Sent Events over an in-process EventEmitter |
| QR | `qrcode` (server-rendered PNG data URLs) |
| Tests | Vitest (API/integration, against a live dev server + DB) + Playwright (critical-path E2E) |

## 3. Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env and adjust if needed (defaults match the docker-compose below)
cp .env.example .env

# 3. Start Postgres
docker compose up -d

# 4. Apply the schema
npm run db:migrate

# 5. Seed demo data (Demo Bistro: areas, tables, menu, users, some history)
npm run db:seed

# 6. Run the app
npm run dev
# → http://localhost:3200
```

### Environment variables (`.env`)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Reserved for future signed-cookie use; set to any long random string |
| `APP_BASE_URL` | Base URL embedded in generated QR codes (`http://localhost:3200` in dev) |

### Other scripts

```bash
npm run build        # production build
npm run start         # run the production build (port 3200)
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run db:studio     # Prisma Studio GUI on the dev DB
npm test              # vitest — requires `npm run dev` running in another terminal
npm run test:e2e      # playwright — requires `npm run dev` running + `npx playwright install chromium`
```

## 4. Demo credentials

All seeded accounts share the password **`demo123`** (dev/demo only — never use
this pattern in production).

| Role | Email |
|---|---|
| Super Admin | `admin@example.local` |
| Manager | `manager@example.local` |
| Cashier | `cashier@example.local` |
| Waiter | `waiter@example.local`, `waiter02@example.local` |
| Kitchen | `kitchen@example.local` |

Customers never log in — they reach the app through a table's QR code.

## 5. Demo QR URL

After seeding, every table has its own random QR token. Get a live one from
the running app:

```bash
node -e "require('@prisma/client'); const p=new (require('@prisma/client').PrismaClient)(); p.table.findFirst({where:{code:'A01'}}).then(t=>{console.log('/order/'+t.qrToken);p.\$disconnect()})"
```

Or, as an admin: **Admin → Bàn → (table) → Xem / Tải QR**, which also lets
you download the PNG or open a printable QR card at
`/admin/tables/{id}/print`.

Table codes seeded: `A01`–`A08` (Tầng 1), `B01`–`B06` (Tầng 2), `VIP01`–`VIP03`
(VIP), `O01`–`O04` (Ngoài trời).

## 6. Role → permission matrix

| Capability | SUPER_ADMIN | MANAGER | CASHIER | WAITER | KITCHEN |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard / reports | ✅ | ✅ | – | – | – |
| Menu management (incl. price) | ✅ | ✅ | – | – | – |
| Table & QR management | ✅ | ✅ | – | – | – |
| Open table / transfer table | ✅ | ✅ | – | ✅ | – |
| Create orders (staff-entry) | ✅ | ✅ | – | ✅ | – |
| Cancel order / order item | ✅ | ✅ | – | – | – |
| View tables & orders | ✅ | ✅ | ✅ | ✅ | – |
| Checkout / payment | ✅ | ✅ | ✅ | – | – |
| Void payment | ✅ | ✅ | – | – | – |
| Apply discount | ✅ | ✅ | – | – | – |
| Accept/complete customer requests | ✅ | ✅ | – | ✅ | – |
| Kitchen display (view) | ✅ | ✅ | – | – | ✅ |
| Kitchen ticket transitions | ✅ | – | – | – | ✅ |
| User management | ✅ | ✅ | – | – | – |
| Audit log | ✅ | ✅ | – | – | – |
| Settings (tax rate, auto-available) | ✅ | ✅ | – | – | – |

The full matrix lives in code at `src/lib/rbac/permissions.ts`
(`ROLE_PERMISSIONS`) — that file is the single source of truth; every API
route and page reads from it.

## 7. Main workflows

- **QR → Order → Kitchen → Serve → Checkout → Payment → Dashboard**
  (the core loop): customer scans QR → browses menu → adds items with
  variants/modifiers → submits → kitchen ticket appears in realtime →
  kitchen advances NEW→PREPARING→READY → waiter marks served → customer
  orders again (same session) → customer requests staff / requests payment
  → cashier checks out at `/pos` → table frees → dashboard revenue updates.
- **Staff table board** (`/staff/tables`): open table, add order (POS-style
  picker), transfer table, request checkout, respond to customer requests —
  all realtime via SSE.
- **Kitchen Display** (`/kitchen`): 3-column board (Mới / Đang chuẩn bị /
  Sẵn sàng), station filter, elapsed-time badges, no prices ever shown.
- **POS / checkout** (`/pos`): queue of tables awaiting payment, itemized
  bill computed server-side, discount, multiple payment methods, void.
- **Admin** (`/admin`): dashboard (real charts from live data), menu &
  modifier management, table/area/QR management, users, orders, payments,
  reports, audit log, settings.

## 8. Demo E2E script (manual, matches the mandatory scenario)

1. Log in as `admin@example.local` → confirm table **A05** exists under
   Admin → Bàn.
2. Open A05's QR dialog, copy the order URL (or use the QR image directly).
3. Open that URL in a new browser tab (this is the "customer").
4. Add 2× Cơm bò (Không hành), 1× Mì cay (any size/spice), 2× Coca → **GỬI ĐƠN**.
5. Log in as `kitchen@example.local` in another tab/window → see the new
   ticket at Bàn A05 → **Nhận món** → **Hoàn thành**.
6. Log in as `waiter@example.local` → `/staff/tables` → A05 shows **Sẵn sàng**.
7. Back in the customer tab: order 1 more item (e.g. Kem vani) — a second
   Order appears in the same TableSession.
8. Customer tab: **Gọi nhân viên** → "Gọi phục vụ". Waiter sees it in the
   notification bell → Nhận → hoàn tất.
9. Customer tab: **Thanh toán** → choose Tiền mặt → **Gọi thanh toán**.
10. Log in as `cashier@example.local` → `/pos` → select A05 → **Xác nhận
    thanh toán**.
11. Table A05 returns to **Trống (AVAILABLE)**.
12. Log back in as admin → `/admin` → revenue/order counters reflect the
    new transaction.

The same flow is automated as an integration test (API-level, hitting the
real DB) across `tests/table-session.test.ts`, `tests/kitchen-status.test.ts`
and `tests/payment.test.ts`, and as a browser E2E test in
`e2e/critical-flow.spec.ts`.

## 9. Tests

```bash
npm run dev      # terminal 1
npm test         # terminal 2 — 50 assertions across 7 files, ~6s
```

Coverage: RBAC (page + API level), QR token validation & regeneration,
order pricing (variants/modifiers/tax/discount, price-change snapshot
isolation, sold-out rejection, client-price-injection rejection), table
session lifecycle (auto-open, multiple orders per session, payment-request
lock), kitchen status transitions (valid + invalid), checkout/payment/void,
and cross-table data isolation.

`e2e/critical-flow.spec.ts` (Playwright) drives the full QR→checkout flow
through real browser contexts for customer/kitchen/waiter/cashier. Install
browsers once with `npx playwright install chromium`, then `npm run test:e2e`.

## 10. Security notes

- Passwords hashed with bcrypt; sessions are opaque random tokens stored in
  a DB `Session` table (revocable, not a stateless JWT).
- Every mutating route re-checks permission server-side — the UI hides
  buttons the current role can't use, but the API is the actual gate.
- Customer routes are entirely QR-token-scoped; there is no client-suppliable
  table id anywhere in the customer API surface (`tests/unauthorized-access.test.ts`).
- All pricing is recomputed server-side from the live menu at order time and
  again at checkout; the client cannot influence totals.
- Freeform text (order notes, request notes) is stripped of control
  characters and HTML tags before storage.
- A basic in-memory rate limiter guards the public login and customer QR
  endpoints (`src/lib/rate-limit.ts`) — see limitations for its ceiling.

## 11. Known limitations

- **Single instance only.** The realtime bus and rate limiter are
  in-process (`EventEmitter` / a `Map`), so they don't work correctly behind
  multiple app instances — an obvious next step would be Redis pub/sub +
  a shared rate-limit store.
- **Single restaurant/branch is seeded**, though the schema supports many
  (`Restaurant` → `Branch[]`); there's no branch switcher UI.
- **No payment gateway integration** — payment methods are recorded, not
  processed (matches the V1 scope).
- **No automated visual/browser verification was run in this session** —
  the host this was built on was under heavy memory pressure (other
  unrelated services sharing the machine), so launching a Chromium instance
  for screenshots or `test:e2e` was skipped as a safety precaution. The app
  was instead verified via the full Next.js production build, `tsc`,
  `eslint`, and 50 passing integration tests hitting the real dev server —
  but nobody has visually eyeballed the rendered UI. Please sanity-check the
  visual design (spacing, responsive breakpoints, empty/loading states)
  before treating this as demo-ready, and run `npm run test:e2e` on a
  machine with normal headroom.
- **No delivery, inventory, or full loyalty/CRM** — intentionally out of
  scope per the V1 brief.
- **Image uploads aren't wired up** — `MenuItem.image` / `MenuCategory.image`
  accept a URL string; there's no upload widget in the admin UI yet.
- **Discount is table-session-level only** (not per-item), matching the V1
  brief.

## 12. Database entities

`Restaurant`, `Branch`, `Area`, `Table`, `TableSession`, `User`, `Session`,
`MenuCategory`, `MenuItem`, `MenuVariant`, `ModifierGroup`, `ModifierOption`,
`MenuItemModifierGroup`, `KitchenStation`, `Order`, `OrderItem`,
`OrderItemModifier`, `CustomerRequest`, `Payment`, `AuditLog`. Full definitions
in `prisma/schema.prisma`.

## 13. Routes

```
Customer   /order/[token]
Staff      /staff, /staff/tables, /staff/tables/[id]
Kitchen    /kitchen
POS        /pos
Admin      /admin, /admin/orders, /admin/menu, /admin/tables,
           /admin/tables/[id]/print, /admin/users, /admin/payments,
           /admin/reports, /admin/audit, /admin/settings
Auth       /login, /forbidden
API        /api/auth/*, /api/customer/[token]/*, /api/staff/*, /api/kitchen/*,
           /api/pos/*, /api/orders/*, /api/order-items/*, /api/requests/*,
           /api/checkout, /api/discount, /api/payments/*, /api/admin/*
```
