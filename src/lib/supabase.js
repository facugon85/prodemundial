import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!(url && key)

export const supabase = supabaseConfigured ? createClient(url, key) : null

// URL del proyecto original (sin custom domain) para edge functions
export const supabaseFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ?? `${url}/functions/v1`

export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)
