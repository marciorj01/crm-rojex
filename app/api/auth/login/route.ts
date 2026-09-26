import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { checkOrigin, apiError } from '@/lib/http';
import { isLoginForm, readLoginCredentials } from '@/lib/login-request';

export async function POST(req: Request) {
  const denied = checkOrigin(req); if (denied) return denied;
  const nativeForm = isLoginForm(req);
  const failure = (message: string, status: number, code: string) => nativeForm
    ? NextResponse.redirect(new URL(`/login?error=${code}`, req.url), 303)
    : NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    const credentials = await readLoginCredentials(req);
    if (!credentials) return failure('Informe e-mail e senha válidos.', 400, 'invalid');
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword(credentials);
    if (error) return failure('Não foi possível entrar. Confira e-mail e senha ou tente mais tarde.',
      error.status === 429 ? 429 : 401, 'credentials');
    const user = await getCurrentUser();
    if (!user) {
      await client.auth.signOut();
      return failure('Conta sem permissão de acesso ao CRM.', 403, 'forbidden');
    }
    if (nativeForm) return NextResponse.redirect(new URL('/dashboard', req.url), 303);
    return NextResponse.json({ success: true, user }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const response = apiError(error);
    return nativeForm ? failure('Login indisponível.', response.status, 'unavailable') : response;
  }
}
