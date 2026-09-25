import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOrigin, apiError } from '@/lib/http';

export async function POST(req: Request) {
  const denied = checkOrigin(req); if (denied) return denied;
  try {
    const client = await createClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    const response = NextResponse.json({ success: true });
    response.cookies.delete('rojex_crm_auth_token');
    return response;
  } catch (error) { return apiError(error); }
}
