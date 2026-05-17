# IMPHERE Development Principles

## Core Philosophy

### 1. Extensibility First
- Design every module to be extended without modification
- Use interfaces/types over concrete implementations
- Prefer composition over inheritance
- Keep dependencies injectable and swappable
- Never hardcode values that might change - use environment variables or config

### 2. Clarity Before Code
- Fully understand the requirement before writing any code
- Ask clarifying questions when specifications are ambiguous
- Document the "why" not just the "what"
- If a feature seems complex, break it down until each piece is simple
- Write the types/interfaces first, implementation second

### 3. Production-Grade Decisions
- Every technical decision should consider:
  - **Scalability**: Will this work with 10x users?
  - **Security**: What can go wrong? How can this be exploited?
  - **Performance**: What's the time/space complexity?
  - **Reliability**: How does this handle failures?
  - **Observability**: Can we debug this in production?
- No shortcuts, no "we'll fix it later" - do it right the first time
- Use battle-tested libraries over custom implementations

### 4. Maintainability is Non-Negotiable
- Code should be readable by someone new to the project
- Follow consistent naming conventions
- Keep files focused - one responsibility per file
- Group related code together (colocation)
- Write self-documenting code; add comments only for complex logic
- Delete dead code immediately - don't comment it out

---

## Technical Standards for IMPHERE

### File Structure
```
src/
├── app/              # Next.js pages and API routes
├── components/       # React components (grouped by feature)
├── lib/              # Core utilities and service clients
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── constants/        # App-wide constants
```

### Naming Conventions
- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserProfile`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_STANDING`)
- **Types/Interfaces**: PascalCase (`UserProfile`)
- **Database columns**: snake_case (`native_pin_name`)

### Code Patterns
- Use TypeScript strict mode - no `any` types
- Prefer `async/await` over `.then()` chains
- Handle errors explicitly - never swallow errors silently
- Use early returns to reduce nesting
- Keep functions under 50 lines; extract if longer

### Database
- All queries through Supabase client (type-safe)
- Use transactions for multi-step operations
- Never trust client input - validate on server
- Use Row Level Security (RLS) for all tables

### API Design
- RESTful conventions for CRUD operations
- Server Actions for mutations when possible
- Return consistent response shapes
- Include proper error messages and status codes

### Security
- Never expose secrets to client (use server-only)
- Validate and sanitize all user inputs
- Use parameterized queries (Supabase handles this)
- Implement rate limiting on sensitive endpoints
- Log security-relevant events

---

## Project Context

**IMPHERE** is a civic engagement platform commissioned by a local MLA (Member of Legislative Assembly) in India. This is a **government-adjacent application** which means:

- **Security is paramount** - No vulnerabilities tolerated
- **Audit trail required** - All point/credit transactions logged
- **Anti-fraud measures** - Geolocation verification, no gallery uploads
- **Public trust** - Clean, professional UI; no bugs in production

### Key Domain Terms
- **Standing**: Non-spendable reputation score (like karma)
- **Impact Credits (IC)**: Spendable currency for vouchers
- **Believers/Believing**: Followers/Following
- **Native Pin**: User's hometown (set once, changeable yearly)
- **Active Pin**: Current GPS location
- **Proclamation**: User-raised local issue requiring community backing
- **Impact Circle**: Community group for collective challenges
- **Vouch**: Like/upvote on a post

### Tech Stack
- **Frontend**: Next.js 14+ (App Router, Server Components)
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Auth**: Supabase Auth (Google OAuth)
- **Cache**: Upstash Redis
- **Media**: Cloudinary
- **Styling**: Tailwind CSS + Shadcn/ui

---

## Before Starting Any Feature

1. **Read existing code** - Understand current patterns before adding new code
2. **Check the spec** - Refer to `PRODUCT_SPECIFICATION.md` for requirements
3. **Plan the approach** - Think through edge cases before coding
4. **Consider the user** - How will this look/feel on mobile?
5. **Think about errors** - What happens when things go wrong?

## Code Review Checklist

- [ ] Types are explicit (no `any`)
- [ ] Error cases handled
- [ ] Loading states considered
- [ ] Mobile responsive
- [ ] No console.logs left behind
- [ ] No commented-out code
- [ ] Follows existing patterns
- [ ] Would I understand this in 6 months?

---

## Documentation Standards

### Philosophy
Documentation exists so new developers can understand the system **before** reading code. Good docs reduce onboarding time and prevent knowledge loss.

### When to Document

| Complexity Level | What to Document | Where |
|------------------|------------------|-------|
| **Simple** | Self-documenting code is enough | Inline comments only if non-obvious |
| **Medium** | Brief explanation of approach | JSDoc/TSDoc on functions |
| **Complex** | Full technical document | `docs/` folder |
| **Architectural** | Decision rationale + alternatives considered | `docs/adr/` (Architecture Decision Records) |

### Documentation Structure for Complex Features

When implementing a key feature, create a document in `docs/features/` with this structure:

```markdown
# Feature: [Feature Name]

## Overview
One paragraph explaining what this feature does and why it exists.

## Concepts (Theory First)
Explain any domain concepts or technical theory needed to understand the implementation.
- What problem are we solving?
- What are the constraints?
- What patterns/algorithms are relevant?

## Architecture
How the feature is structured:
- Components involved
- Data flow diagram (if complex)
- Database tables affected

## Implementation Details
The "how" - key code decisions:
- Why this approach over alternatives?
- Edge cases handled
- Performance considerations

## API Reference
Endpoints, parameters, response shapes.

## Testing
How to test this feature manually and what automated tests exist.

## Known Limitations
What doesn't work yet or could be improved.
```

### Architecture Decision Records (ADRs)

For significant technical decisions, create an ADR in `docs/adr/`:

```markdown
# ADR-001: [Decision Title]

## Status
Accepted | Superseded | Deprecated

## Context
What situation prompted this decision?

## Decision
What did we decide to do?

## Alternatives Considered
What other options did we evaluate and why were they rejected?

## Consequences
- Positive outcomes
- Trade-offs accepted
- Risks introduced
```

### Features Requiring Documentation

These features are complex enough to warrant full technical docs:

1. **Anti-Cheat System** - EXIF parsing, geolocation verification, fraud detection
2. **Proclamation Lifecycle** - State machine, threshold calculation, expiration handling
3. **Standing & IC Economy** - Earning rules, spending rules, badge calculations
4. **Real-time Subscriptions** - Supabase realtime setup, optimistic updates
5. **Voucher Encryption** - AES-256 encryption, secure redemption flow
6. **Impact Circle Eminence** - Score calculation, leaderboard ranking

### Documentation Checklist

After implementing a complex feature:
- [ ] Technical doc created in `docs/features/`
- [ ] ADR created if architectural decision was made
- [ ] README updated if setup steps changed
- [ ] Type definitions have TSDoc comments
- [ ] Complex functions have inline explanations
