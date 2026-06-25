# IMPHERE

<p align="center">
  <img src="public/logo-gold.png" alt="IMPHERE Logo" width="300" />
</p>

<p align="center">
  <strong>Build Your Standing. Resolve the Future.</strong>
</p>

<p align="center">
  A civic engagement platform where citizens complete community challenges, earn reputation, and make real-world impact.
</p>

---

## About

IMPHERE is a government-commissioned civic engagement platform built for a local MLA in India. It gamifies community participation by rewarding users with:

- **Standing** - Non-spendable reputation score that determines your badge tier
- **Impact Credits (IC)** - Spendable currency for vouchers and rewards

Users can complete verified challenges, raise community issues (Proclamations), join Impact Circles, and build their civic influence through real-world actions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| Language | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| Database | [Supabase](https://supabase.com/) (PostgreSQL + PostGIS) |
| Auth | Supabase Auth |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Media | [Cloudinary](https://cloudinary.com/) |
| Cache | [Upstash Redis](https://upstash.com/) |

---

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Supabase account (for database)
- Cloudinary account (for media uploads)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd imphere-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Upstash Redis (optional)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 4. Set Up Supabase

1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/` (if available)
3. Or apply the schema from the Supabase dashboard

### 5. Generate Database Types

```bash
npm run db:generate-types
```

This generates TypeScript types from your Supabase schema into `src/types/database.types.ts`.

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate-types` | Generate TypeScript types from Supabase |

---

## Project Structure

```
imphere-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API route handlers
│   │   ├── challenges/         # Challenge pages
│   │   ├── profile/            # Profile pages
│   │   ├── login/              # Auth pages
│   │   ├── signup/
│   │   └── ...
│   ├── components/             # React components
│   │   ├── layout/             # Navigation, sidebar, etc.
│   │   ├── feed/               # Feed and post components
│   │   └── challenges/         # Challenge components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and clients
│   │   ├── supabase/           # Supabase client setup
│   │   └── utils.ts            # Helper functions
│   ├── types/                  # TypeScript type definitions
│   │   └── database.types.ts   # Auto-generated from Supabase
│   └── proxy.ts                # Request proxy for auth
├── public/                     # Static assets (logos, favicons)
├── assets/                     # Source design files
├── docs/                       # Documentation
│   ├── PROGRESS.md             # Development progress tracker
│   └── README.md               # Docs index
└── CLAUDE.md                   # Development principles
```

---

## Key Concepts

### Badge Tiers

Users progress through badge tiers based on Standing:

| Badge | Standing Required | Ring Color |
|-------|-------------------|------------|
| Citizen | 0 | Gray |
| Bronze | 500 | Bronze |
| Silver | 2,000 | Silver |
| Gold | 5,000 | Gold |

### Challenge Types

1. **Static (Welfare Track)** - Admin-created civic tasks
2. **Proclamation** - Community-raised issues that need backing to activate

### Anti-Cheat System

Challenge submissions require:
- Camera-captured photos (no gallery uploads)
- EXIF metadata with GPS coordinates
- Location verification within 50 meters of target

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PROGRESS.md](docs/PROGRESS.md) | Detailed progress tracker with all features |
| [CLAUDE.md](CLAUDE.md) | Development principles and coding standards |
| [docs/README.md](docs/README.md) | Technical documentation index |

---

## API Overview

### Feed
- `GET /api/feed` - Fetch paginated posts

### Challenges
- `GET /api/challenges` - List challenges
- `GET /api/challenges/categories` - Get categories
- `POST /api/challenges/[id]/accept` - Accept a challenge

### Users
- `GET /api/users/[id]` - Get user profile
- `GET /api/users/[id]/posts` - Get user's posts
- `GET /api/users/[id]/challenges` - Get verified submissions
- `POST|DELETE /api/users/[id]/follow` - Toggle follow

---

## Development Notes

### Code Style

- TypeScript strict mode enabled
- No `any` types
- Early returns to reduce nesting
- Functions under 50 lines
- Colocation of related code

### Database

- All queries through Supabase client (type-safe)
- Row Level Security (RLS) enabled on all tables
- PostGIS for location-based features

### Security Considerations

This is a government-adjacent application with strict security requirements:
- EXIF verification for submissions
- Encrypted voucher codes (AES-256)
- Full audit trail for all transactions
- No client-side exposure of secrets

---

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) for development principles
2. Check [docs/PROGRESS.md](docs/PROGRESS.md) for current status
3. Follow existing patterns in the codebase
4. Ensure no TypeScript errors before committing

---

## License

Private - All rights reserved.

---

<p align="center">
  <sub>A civic initiative for community empowerment</sub>
</p>
