import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Only public feed generation and authenticated inbound webhooks use this client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
