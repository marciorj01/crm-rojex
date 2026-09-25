import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { checkOrigin, apiError, readObject } from '@/lib/http';

export async function POST(req: Request) {
  const denied = checkOrigin(req); if (denied) return denied;
  try {
    const { username, password } = await readObject(req);
    if (typeof username !== 'string' || typeof password !== 'string' ||
      username.length > 254 || password.length > 256 || !username.includes('@') || !password) {
      return NextResponse.json({ error: 'Informe e-mail e senha válidos.' }, { status: 400 });
    }
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword({ email: username.trim(), password });
    if (error) return NextResponse.json({ error: 'Não foi possível entrar. Confira e-mail e senha ou tente mais tarde.' },
      { status: error.status === 429 ? 429 : 401 });
    const user = await getCurrentUser();
    if (!user) {
      await client.auth.signOut();
      return NextResponse.json({ error: 'Conta sem permissão de acesso ao CRM.' }, { status: 403 });
    }
    return NextResponse.json({ success: true, user }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
