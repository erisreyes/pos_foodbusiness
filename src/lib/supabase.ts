/**
 * Shared Supabase client — single instance for auth, queries, and RPC calls.
 *
 * Credentials: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Schema:      VITE_SUPABASE_SCHEMA (default: public) — use pos_demo for demo data
 *
 * Import this module; do not create additional clients elsewhere.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

const rawSchema = (import.meta.env.VITE_SUPABASE_SCHEMA as string | undefined)?.trim();
export const supabaseSchema = rawSchema && rawSchema.length > 0 ? rawSchema : 'public';

if (!/^[a-z_][a-z0-9_]*$/i.test(supabaseSchema)) {
  throw new Error(
    'VITE_SUPABASE_SCHEMA must be a valid PostgreSQL identifier (e.g. public, pos_demo).',
  );
}

export const supabase = createClient(url, anonKey, {
  db: { schema: supabaseSchema },
});

if (import.meta.env.DEV) {
  console.info(`[Supabase] Using schema: ${supabaseSchema}`);
}
