import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client with service-role key.
 * Server-side only — NEVER import this in client components.
 * Bypasses RLS, so always verify permissions before using it.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
