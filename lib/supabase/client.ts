import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for browser/client components
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper to create a client (can be extended for server-side with service role key)
export function createSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

