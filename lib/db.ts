import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — created on first request, not at module evaluation time.
// This prevents Next.js build from crashing when env vars are absent during
// the "Collecting page data" phase.
let _instance: SupabaseClient | null = null

function getInstance(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _instance
}

// Proxy so all existing `db.from(...)` call sites work unchanged
export const db = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    return getInstance()[prop as keyof SupabaseClient]
  },
})
