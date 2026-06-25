# ADR-002: Next.js over Separate React + Express

## Status
Accepted

## Date
2024-01-XX (Project inception)

## Context

IMPHERE needs:
- Server-side rendering for SEO and performance
- API routes for server-side logic (EXIF parsing, encryption)
- Google OAuth authentication
- Real-time updates
- Mobile-first responsive design

We considered two architectural approaches.

## Alternatives Considered

### Separate Frontend (Vite + React) and Backend (Express)

```
client/          # Vite + React
server/          # Express + TypeScript
```

**Pros:**
- Clear separation of concerns
- Can scale independently
- Familiar pattern

**Cons:**
- Two codebases to maintain
- Two deployment pipelines
- CORS configuration needed
- Auth token management complexity (JWT in cookies, refresh tokens)
- Duplicate type definitions
- More boilerplate

**Verdict:** More complexity than necessary for this project.

### Next.js (Full-stack)

```
src/app/         # Pages + API routes
src/components/  # Shared components
src/lib/         # Utilities
```

**Pros:**
- **Single codebase** - Easier to maintain
- **Server Components** - Reduced client JS, faster loads
- **Server Actions** - Simplified form handling, no manual API calls
- **Built-in API routes** - Server logic colocated with pages
- **Supabase integration** - Official Next.js helpers
- **Auth simplified** - Supabase handles sessions via cookies
- **Type sharing** - Same types used everywhere
- **Deployment** - Single deployment (Vercel, Railway, Docker)

**Cons:**
- Coupled frontend/backend (acceptable for this project size)
- Next.js-specific patterns to learn

**Verdict:** Significantly simpler for a full-stack application.

## Decision

Use **Next.js 14+ with App Router** as the full-stack framework.

### Specific Choices
- **App Router** over Pages Router (newer, more features)
- **Server Components** by default (better performance)
- **Server Actions** for mutations (simpler than API routes)
- **API Routes** for complex operations (EXIF parsing, webhooks)

## Consequences

### Positive
- Single codebase reduces maintenance burden
- Server Components reduce JavaScript shipped to client
- Supabase Auth works seamlessly with Next.js middleware
- Type-safe from database to UI
- Can deploy anywhere (not locked to Vercel)

### Trade-offs
- Learning curve for Server Components vs Client Components
- Need to understand React Server Actions
- Some operations need `"use client"` directive

### Risks
- Next.js updates can introduce breaking changes (mitigated: use LTS patterns)
- App Router is relatively new (mitigated: stable since Next.js 14)

## Implementation Notes

### Server vs Client Components

```tsx
// Server Component (default) - runs on server
// Can access database directly, no useState/useEffect
export default async function Page() {
  const data = await supabase.from('posts').select()
  return <PostList posts={data} />
}

// Client Component - runs in browser
// Needed for interactivity (clicks, forms, state)
"use client"
export function LikeButton() {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked(true)}>Like</button>
}
```

### Server Actions

```tsx
// Instead of: POST /api/posts -> fetch from client
// Use: Server Action called directly from component

async function createPost(formData: FormData) {
  "use server"
  await supabase.from('posts').insert({...})
  revalidatePath('/feed')
}

export function PostForm() {
  return <form action={createPost}>...</form>
}
```

## References
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Server Components Explained](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Supabase Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
