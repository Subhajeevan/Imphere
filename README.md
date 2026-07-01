# IMPHERE

<p align="center">
  <img src="public/logo-gold.png" alt="IMPHERE Logo" width="280" />
</p>

<p align="center">
  <strong>Build Your Standing. Resolve the Future.</strong>
</p>

<p align="center">
  A civic engagement platform where citizens complete verified community challenges,
  earn reputation, organise in groups, and redeem real-world rewards.
</p>

---

## About

**IMPHERE** is a government-commissioned civic engagement platform built for a local
MLA (Member of Legislative Assembly) in India. It turns real-world community
participation into a transparent, gamified experience built on two currencies:

- **Standing** — a non-spendable reputation score that determines your badge tier.
- **Impact Credits (IC)** — spendable currency earned through impact and redeemed for rewards.

Because it is a **government-adjacent application**, security, auditability, and
anti-fraud measures are first-class concerns — every credit transaction is logged,
challenge submissions are geo-verified, and all data access is protected by
row-level security.

---

## Features

### 🏛️ Civic Core
- **Feed** — posts with vouches (upvotes), comments, and saves.
- **Challenges** — two tracks:
  - *Welfare (static)* — admin-created civic tasks.
  - *Proclamations* — community-raised local issues that must be backed to activate.
- **Anti-cheat submissions** — camera-only photos with EXIF + GPS verified against the
  target location (no gallery uploads).
- **Leaderboard**, **notifications**, and **believers/believing** (follow graph).

### 👥 Impact Circles
- Community groups with membership roles (**principal / steward / member**),
  an **eminence** score, and weekly **standings**.

### 💬 Circle Chat & Direct Messages
A full WhatsApp/Discord-style messaging experience, in circles **and** in 1-on-1 DMs:
- Real-time rounded-bubble threads (Supabase Realtime)
- 😊 Emoji **reactions** with live counts
- 💬 **Reply** to a message (tap the preview to jump to the original)
- 📷📄 **Attachments** — photos & documents (PDF/DOCX/PPT/XLSX/TXT/ZIP) via Cloudinary
- 📍 **Live location** sharing → tappable Google Maps cards
- 🔍 In-chat **search** with match highlighting
- **Circles only:** 📊 polls (live percentages), 📢 leader announcements,
  📌 pinned messages, and a 📂 **Shared Files** section in Circle Info

### 🎁 Exchange
An Impact-Credit marketplace with product catalog, categories, featured &
recommended rails, daily deals, nearby offers, a wishlist, redemption history, and
tier-gated **leaderboard rewards**. Voucher codes are securely redeemed.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) — App Router, Server Components, Server Actions |
| UI | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict) |
| Database | [Supabase](https://supabase.com/) — PostgreSQL + PostGIS, Row Level Security, Realtime |
| Auth | Supabase Auth — Google OAuth + email/password |
| Media | [Cloudinary](https://cloudinary.com/) — images & raw file uploads |
| Cache / rate-limit | [Upstash Redis](https://upstash.com/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + shadcn-style primitives |
| Icons | [Lucide React](https://lucide.dev/) |

Brand accent: **gold `#D4AF37`**.

---

## Architecture at a Glance

- **Rendering** — Server Components fetch data server-side; interactive views are
  Client Components. Mutations go through Route Handlers (`src/app/api/**`) or
  Server Actions.
- **Two Supabase clients** ([src/lib/supabase/](src/lib/supabase/)):
  - `createClient()` — user-scoped (respects RLS), used for reads and auth.
  - `createAdminClient()` — **true service-role** client (bypasses RLS) for trusted
    server-side writes only. Never imported into client components.
- **Realtime** — chat messages, reactions, and poll votes are streamed via Supabase
  Realtime; the relevant tables are added to the `supabase_realtime` publication in
  the migrations.
- **Security** — every table has RLS. Recursion-prone membership checks are wrapped
  in `SECURITY DEFINER` SQL helpers (see migrations 006/007/008). Session refresh and
  route protection live in [src/proxy.ts](src/proxy.ts).

---

## Getting Started

### Prerequisites
- **Node.js 18.17+**
- A **Supabase** project (PostgreSQL + PostGIS)
- A **Cloudinary** account (media uploads)
- *(Optional)* an **Upstash Redis** database

### 1. Install

```bash
git clone https://github.com/Subhajeevan/Imphere.git
cd Imphere
npm install
```

### 2. Configure environment

Create `.env.local` in the project root (see [Environment Variables](#environment-variables)).

### 3. Apply the database migrations

In the **Supabase SQL Editor**, run the files in
[supabase/migrations/](supabase/migrations/) **in order (001 → 008)**. They are
idempotent, so re-running is safe.

| # | File | Adds |
|---|------|------|
| 001 | `001_initial_schema.sql` | Core schema: profiles, follows, challenges, posts, circles, vouchers, notifications, transactions |
| 002 | `002_circles_update.sql` | Circle categories + `circle_messages` + Realtime |
| 003 | `003_missing_rls_policies.sql` | Additional RLS policies |
| 004 | `004_exchange_schema.sql` | Exchange products, redemptions, wishlist |
| 005 | `005_direct_messages.sql` | Conversations, participants, direct messages |
| 006 | `006_fix_dm_rls_recursion.sql` | DM RLS recursion fix (SECURITY DEFINER helper) |
| 007 | `007_circle_chat_enhancements.sql` | Reactions, polls, replies, attachments, location, pins, announcements |
| 008 | `008_dm_chat_enhancements.sql` | Same rich features for direct messages |

> Ensure **Realtime** is enabled for your project — the chat features depend on it.

### 4. Generate typed database bindings

```bash
npm run db:generate-types   # writes src/types/database.types.ts
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key — **server only**, bypasses RLS |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key (server) |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret (server) |
| `NEXT_PUBLIC_APP_URL` | ✅ | App base URL (e.g. `http://localhost:3000`) — used for server-side fetches |
| `NEXT_PUBLIC_SITE_URL` | ➖ | Public site URL for OAuth redirects |
| `UPSTASH_REDIS_REST_URL` | ➖ | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | ➖ | Upstash Redis REST token |

> `.env.local` is gitignored and must never be committed.
> On some Windows setups, corporate TLS interception can break Supabase/Cloudinary
> calls in dev; if you hit `SELF_SIGNED_CERT_IN_CHAIN`, set
> `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` **for local development only**.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate-types` | Generate TypeScript types from Supabase |

---

## Project Structure

```
Imphere/
├── src/
│   ├── app/                      # App Router: pages + API route handlers
│   │   ├── api/                  # Route handlers (feed, challenges, circles, chats, exchange, users…)
│   │   ├── challenges/           # Challenge list + submit
│   │   ├── community/            # Impact Circles  (+ /[id]/chat full-screen thread)
│   │   ├── chats/                # Direct messages: inbox + /[id] thread
│   │   ├── exchange/             # IC marketplace
│   │   ├── explore/  leaderboard/  notifications/  profile/  settings/
│   │   ├── create/               # Create post / circle
│   │   └── login/ signup/ onboarding/ ...   # Auth
│   ├── components/
│   │   ├── auth/                 # Google OAuth button, etc.
│   │   ├── challenges/  feed/  layout/  ui/
│   │   └── community/
│   │       └── chat/             # Reusable chat UI (bubbles, input bar, reactions, polls, previews)
│   ├── hooks/                    # useFeed, useImageUpload, useCircleThread, useDirectThread, …
│   ├── lib/
│   │   ├── supabase/             # client() + admin() factories
│   │   ├── cloudinary.ts         # Signed uploads + chat attachments
│   │   ├── redis.ts              # Upstash client
│   │   └── utils.ts
│   ├── types/                    # circle-chat.ts + generated database.types.ts
│   └── proxy.ts                  # Supabase session refresh + route protection
├── supabase/migrations/          # 001–008 SQL migrations (run in order)
├── docs/                         # ADRs, feature docs, progress tracker
├── public/                       # Logos & static assets
└── CLAUDE.md                     # Engineering principles & standards
```

---

## Domain Glossary

| Term | Meaning |
|------|---------|
| **Standing** | Non-spendable reputation score (like karma); drives your badge tier |
| **Impact Credits (IC)** | Spendable currency for Exchange rewards |
| **Believers / Believing** | Followers / following |
| **Native Pin** | Your hometown (set once, changeable yearly) |
| **Active Pin** | Current GPS location |
| **Proclamation** | A user-raised local issue that needs community backing to activate |
| **Impact Circle** | A community group for collective challenges |
| **Vouch** | A like / upvote on a post |
| **Eminence** | A circle's collective ranking score |

**Badge tiers** (by Standing): Citizen → Bronze → Silver → Gold.
**Exchange reward levels** (by lifetime IC): Citizen → Bronze → Silver → Gold → Platinum.

---

## API Overview

All endpoints live under `src/app/api/**`. Highlights:

**Feed & Posts** — `GET /api/feed`, `POST /api/posts`, `GET /api/search`, `POST /api/upload`

**Challenges** — `GET /api/challenges`, `/challenges/categories`,
`POST /challenges/create`, `/challenges/[id]/accept`, `/challenges/[id]/submit`

**Circles** — `GET/POST /api/circles`, `/circles/[id]`, `/circles/[id]/join`,
`/circles/[id]/members`
- **Chat:** `/circles/[id]/thread`, `/circles/[id]/messages`,
  `/circles/[id]/attachments`, `/circles/[id]/polls`, `/circles/[id]/announcements`,
  `/circles/[id]/messages/[messageId]/pin`, `/circles/[id]/files`

**Direct Messages** — `GET/POST /api/chats`, `/chats/[id]`,
`/chats/[id]/messages`, `/chats/[id]/attachments`

**Exchange** — `/exchange/products`, `/categories`, `/featured`, `/recommended`,
`/offers`, `/history`, `/wishlist`, `/redeem`, `/leaderboard-rewards`

**Users & Social** — `/user/me`, `/user/profile`, `/users/[id]`,
`/users/[id]/posts`, `/users/[id]/challenges`, `/users/[id]/follow`

**Vouchers** — `POST /api/vouchers/[id]/redeem`

**Notifications** — `GET /api/notifications`, `POST /api/notifications/read`

---

## Security

This is a government-adjacent application; security is non-negotiable:

- **Row Level Security** on every table; membership checks use `SECURITY DEFINER`
  helpers to stay correct and non-recursive.
- **Service-role isolation** — privileged writes only via `createAdminClient()` in
  server code; secrets are never exposed to the client.
- **Anti-fraud** — camera-only submissions with EXIF + geolocation verification.
- **Server-side validation** — uploads are MIME/size-checked before hitting Cloudinary;
  leader-only actions (announcements, pins) are enforced on the server.
- **Auditability** — Standing/IC movements are recorded in `transactions`.

---

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Engineering principles & coding standards |
| [PRODUCT_SPECIFICATION.md](PRODUCT_SPECIFICATION.md) | Product requirements |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Development progress tracker |
| [docs/adr/](docs/adr/) | Architecture Decision Records |
| [docs/README.md](docs/README.md) | Technical documentation index |

---

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) — extensibility, clarity, and production-grade standards.
2. Match existing patterns; keep TypeScript strict (no `any`).
3. Ensure `npx tsc --noEmit` passes before committing.
4. If you add a DB-backed feature, ship a new numbered migration and keep it idempotent.

---

## License

Private — all rights reserved.

<p align="center">
  <sub>A civic initiative for community empowerment.</sub>
</p>
