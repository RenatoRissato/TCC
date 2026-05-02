import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

const url = ENV.supabaseUrl;
const anonKey = ENV.supabaseAnonKey;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos no .env',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'smartroutes-auth-v1',
  },
});
