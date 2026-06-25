# IMPHERE Technical Documentation

This folder contains technical documentation for the IMPHERE platform.

## Structure

```
docs/
├── features/          # Detailed docs for complex features
│   └── [feature].md
├── adr/               # Architecture Decision Records
│   └── ADR-XXX-*.md
└── README.md          # This file
```

## Quick Links

- [Product Specification](../PRODUCT_SPECIFICATION.md) - Full feature requirements
- [Development Principles](../CLAUDE.md) - Coding standards and philosophy
- [Database Schema](../supabase/migrations/001_initial_schema.sql) - PostgreSQL schema

## Feature Documentation

| Feature | Status | Doc |
|---------|--------|-----|
| Anti-Cheat System | Pending | `features/anti-cheat.md` |
| Proclamation Lifecycle | Pending | `features/proclamations.md` |
| Standing & IC Economy | Pending | `features/economy.md` |
| Real-time Subscriptions | Pending | `features/realtime.md` |
| Voucher Encryption | Pending | `features/vouchers.md` |
| Impact Circle Eminence | Pending | `features/impact-circles.md` |

## Architecture Decisions

| ADR | Title | Status |
|-----|-------|--------|
| 001 | Use Supabase over Firebase | Accepted |
| 002 | PostgreSQL over MongoDB | Accepted |
| 003 | Next.js App Router over Pages | Accepted |

---

*Documentation is updated as features are implemented.*
