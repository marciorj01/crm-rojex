import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { checkOrigin, apiError, readObject } from '@/lib/http';

export async function POST(req: Request) {
  const denied = checkOrigin(req); if (denied) return denied;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const { newPassword, currentPassword, fullName, email, phone } = await readObject(req);
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 150 ||
      typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof phone !== 'string' || phone.length > 50 ||
      (newPassword !== undefined && typeof newPassword !== 'string')) {
      return NextResponse.json({ error: 'Confira nome, e-mail e telefone.' }, { status: 400 });
    }
    const client = await createClient();
    if (newPassword) {
      if (newPassword.length < 12 || newPassword.length > 256 || typeof currentPassword !== 'string' || currentPassword.length > 256) {
        return NextResponse.json({ error: 'Informe a senha atual e uma nova senha de 12 a 256 caracteres.' }, { status: 400 });
      }
      const { error: authError } = await client.auth.signInWithPassword({ email: user.username, password: currentPassword });
      if (authError) return NextResponse.json({ error: 'Não foi possível confirmar a senha atual.' }, { status: 401 });
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) return NextResponse.json({ error: 'Não foi possível alterar a senha. Confira a política de senhas.' }, { status: 400 });
    }
    const { error } = await client.from('app_users').update({
      full_name: fullName.trim(), email: email.trim(), phone: phone.trim(),
    }).eq('id', user.id);
    if (error) {
      console.error('Falha ao salvar perfil', { error });
      return NextResponse.json({ error: newPassword
        ? 'A senha foi alterada, mas os dados de contato não foram salvos. Recarregue e atualize somente o contato.'
        : 'Não foi possível salvar os dados de contato.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, user: await getCurrentUser() });
  } catch (error) { return apiError(error); }
}
