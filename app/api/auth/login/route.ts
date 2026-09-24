import { NextResponse } from 'next/server';
import { authenticateUser, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Informe o usuário e a senha.' }, { status: 400 });
    }

    const authResult = await authenticateUser(username, password);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Credenciais inválidas.' }, { status: 401 });
    }

    const sessionData = JSON.stringify(authResult.user);
    const token = Buffer.from(sessionData).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
    });

    // Definir cookie de sessão por 30 dias
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (err: any) {
    console.error('Erro no login:', err);
    return NextResponse.json({ error: 'Erro interno ao processar login.' }, { status: 500 });
  }
}
