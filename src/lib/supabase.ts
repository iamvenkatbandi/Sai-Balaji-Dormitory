import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

// @supabase/supabase-js v2 throws at module load on empty strings.
// Use syntactically valid placeholders so the app mounts and renders
// its error/notice states rather than a white page.
const safeUrl = isSupabaseConfigured ? url! : 'https://unconfigured.supabase.co';
const safeKey = isSupabaseConfigured ? key! : 'unconfigured-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});