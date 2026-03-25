import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS, used in all server-side API routes
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
