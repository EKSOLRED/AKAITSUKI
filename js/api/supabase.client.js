import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig } from '../config/supabase.config.js';

const canInit =
  Boolean(supabaseConfig.enabled) &&
  Boolean(String(supabaseConfig.url || '').trim()) &&
  Boolean(String(supabaseConfig.anonKey || '').trim());

export const supabase = canInit
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function isSupabaseConfigured() {
  return Boolean(supabase);
}
