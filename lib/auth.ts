import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { AppUser } from '@/lib/types';

// Authorization is verified against Auth and the database on every request.
export async function getCurrentUser(): Promise<AppUser | null> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await client.from('app_users')
    .select('id,full_name,email,phone,role').eq('id', user.id).maybeSingle();
  if (profileError) throw new Error('Não foi possível verificar as permissões do usuário.');
  if (!profile || profile.role !== 'admin') return null;
  return { ...profile, username: user.email || '' } as AppUser;
}
