// Remove or comment out this file since we're not using Supabase client-side
// We're going through FastAPI instead

// If you need this file for other purposes, keep it but don't use it for auth
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if both values exist, otherwise export null
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

// Log warning if not configured
if (!supabase) {
  console.warn("⚠️ Supabase client not configured - using FastAPI backend only")
}
