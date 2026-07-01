import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

type SupabaseCookie = {
  name: string
  value: string
  options?: Record<string, unknown>
}

/**
 * Creates a Supabase client for use in Server Components, Route Handlers, and Server Actions
 *
 * Usage in Server Component:
 * ```tsx
 * import { createClient } from '@/lib/supabase/server'
 *
 * export default async function Page() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('posts').select()
 *   return <div>...</div>
 * }
 * ```
 *
 * Usage in Server Action:
 * ```tsx
 * 'use server'
 * import { createClient } from '@/lib/supabase/server'
 *
 * export async function myAction() {
 *   const supabase = await createClient()
 *   // ...
 * }
 * ```
 */
export async function createClient(): Promise<any> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates an admin Supabase client with the service role key.
 * USE WITH CAUTION - bypasses Row Level Security.
 *
 * IMPORTANT: this must NOT be built from `createServerClient` with cookies.
 * Doing so makes supabase-js send the logged-in user's JWT as the
 * `Authorization` header, which overrides the service-role key — so requests
 * run as the authenticated user and RLS is still enforced. We use the plain
 * `@supabase/supabase-js` client with no session persistence so the
 * service-role key is the only credential, and RLS is genuinely bypassed.
 *
 * Only use for:
 * - server processes
 * - background jobs
 * - trusted internal workflows where bypassing RLS is required
 */
export async function createAdminClient(): Promise<any> {
  return createServiceRoleClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
