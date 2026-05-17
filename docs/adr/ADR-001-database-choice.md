# ADR-001: PostgreSQL (Supabase) over MongoDB and Firebase

## Status
Accepted

## Date
2024-01-XX (Project inception)

## Context

IMPHERE is a civic engagement platform requiring:
- **Geospatial queries**: Distance calculations, nearby challenges, locality-based filtering
- **Complex aggregations**: Leaderboards, standing calculations, community rankings
- **Transactional integrity**: Voucher redemption must be atomic (deduct credits + mark voucher)
- **Real-time updates**: Live feeds, notifications, proclamation voting
- **Audit trail**: Government-adjacent app needs transaction logging
- **Relational data**: Users → Posts → Comments, Followers relationships

We evaluated three database options.

## Alternatives Considered

### MongoDB
**Pros:**
- Flexible schema
- Good geospatial support (2dsphere indexes)
- JSON-native

**Cons:**
- Weaker transaction guarantees
- Aggregation pipeline is verbose
- Requires separate backend server
- No built-in auth or real-time

**Verdict:** Good, but PostgreSQL's PostGIS is superior for geospatial, and we need strong ACID compliance.

### Firebase Firestore
**Pros:**
- Real-time listeners built-in
- No backend needed for basic ops
- Fast prototyping
- Firebase Auth is easy

**Cons:**
- **Weak geospatial** - GeoFire is a hacky workaround
- **No aggregations** - Can't do leaderboards natively
- **Limited queries** - No complex compound queries
- **Vendor lock-in** - Hard to migrate away
- **Pricing unpredictable** - Charges per read/write

**Verdict:** Rejected due to poor geospatial support and no native aggregations.

### PostgreSQL (via Supabase)
**Pros:**
- **PostGIS** - Industry-standard geospatial (used by Uber, Airbnb)
- **ACID transactions** - Perfect for voucher redemption
- **SQL aggregations** - Native GROUP BY, window functions, CTEs
- **Supabase extras** - Auth, real-time, storage, edge functions included
- **Row Level Security** - Database-level access control
- **No vendor lock-in** - Can self-host, standard PostgreSQL
- **Type generation** - Auto-generates TypeScript types from schema

**Cons:**
- Slightly more setup than Firebase
- Need to design schema upfront

**Verdict:** Best fit for all requirements.

## Decision

Use **Supabase (PostgreSQL + PostGIS)** as the primary database.

## Consequences

### Positive
- Strong geospatial queries for anti-cheat and locality features
- ACID transactions for financial operations (IC, vouchers)
- Native leaderboard queries via SQL
- Real-time subscriptions included
- Auth handled by Supabase (Google OAuth)
- Type-safe queries with generated types

### Trade-offs
- Must design schema carefully upfront (migrations needed for changes)
- Learning curve for RLS policies

### Risks
- Supabase is a startup (mitigated: can self-host PostgreSQL)
- PostGIS adds complexity (mitigated: well-documented, widely used)

## References
- [Supabase Docs](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Why Uber uses PostgreSQL](https://www.uber.com/blog/postgres/)
