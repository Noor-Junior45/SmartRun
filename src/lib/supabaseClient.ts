/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (process.env as any || {});

const supabaseUrl =
  env.VITE_SUPABASE_URL || 'https://iffdkhzctkbglmvaayeh.supabase.co';
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_C7DzW73hItwOaxr9R4Z2dw_HtjCqHaS';

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[Giriraj Power] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in environment variables. Using embedded fallback configuration.'
  );
}

import { durableAuthStorage } from './durableStorage';

/**
 * Shared Supabase Client singleton with persistent session handling
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'giriraj_supabase_auth_session',
    storage: durableAuthStorage,
    experimental: {
      passkey: true
    }
  }
});

