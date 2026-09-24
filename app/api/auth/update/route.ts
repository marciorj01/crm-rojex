import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser, AUTH_COOKIE_NAME } from '@/lib/auth';
import { AppUser } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
    }

    const { newUsername, newPassword, fullName, email } = await req.json();

    if (!newUsername || !newPassword) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    const cleanFullName = (fullName || 'Márcio Roger').trim();
    const cleanEmail = (email || 'admin@rojex.com.br').trim();

    const supabase = createAdminClient();

    // Atualiza ou insere na tabela app_users
    // Se o usuário atual já existe pelo username anterior ou pelo ID
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', currentUser.username)
      .maybeSingle();

    let updatedUser: AppUser;

    if (existingUser) {
      const { data, error } = await supabase
        .from('app_users')
        .update({
          username: cleanUsername,
          password_hash: cleanPassword,
          full_name: cleanFullName,
          email: cleanEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (error) {
        throw error;
      }
      updatedUser = {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      };
    } else {
      // Inserção nova
      const { data, error } = await supabase
        .from('app_users')
        .insert({
          username: cleanUsername,
          password_hash: cleanPassword,
          full_name: cleanFullName,
          email: cleanEmail,
          role: 'admin',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      updatedUser = {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      };
    }

    // Renovar o cookie de sessão com os novos dados
    const sessionData = JSON.stringify(updatedUser);
    const token = Buffer.from(sessionData).toString('base64');

    const response = NextResponse.json({
      success: true,
      message: 'Credenciais atualizadas com sucesso!',
      user: updatedUser,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    console.error('Erro ao atualizar usuário:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar dados de acesso.' }, { status: 500 });
  }
}
