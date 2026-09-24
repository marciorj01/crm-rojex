import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppUser } from '@/lib/types';

export const AUTH_COOKIE_NAME = 'rojex_crm_auth_token';

// Usuário e senha padrão caso a tabela ainda não tenha sido populada
export const DEFAULT_USER: AppUser = {
  id: 'default-admin-marcioroger',
  username: 'marcioroger',
  full_name: 'Márcio Roger',
  email: 'admin@rojex.com.br',
  role: 'admin',
};
export const DEFAULT_PASSWORD = 'admin123456';

/**
 * Valida as credenciais do usuário contra o Supabase ou padrão
 */
export async function authenticateUser(usernameInput: string, passwordInput: string): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  try {
    const supabase = createAdminClient();

    // Buscar na tabela app_users
    const { data: dbUser, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (dbUser) {
      if (dbUser.password_hash === cleanPassword) {
        return {
          success: true,
          user: {
            id: dbUser.id,
            username: dbUser.username,
            full_name: dbUser.full_name || 'Márcio Roger',
            email: dbUser.email || 'admin@rojex.com.br',
            role: dbUser.role || 'admin',
          },
        };
      } else {
        return { success: false, error: 'Senha incorreta.' };
      }
    }

    // Se a tabela ainda não tiver esse registro ou estiver vazia, testar usuário padrão
    if (cleanUsername === DEFAULT_USER.username && cleanPassword === DEFAULT_PASSWORD) {
      // Tentar auto-criar no banco para persistência futura
      try {
        await supabase.from('app_users').insert({
          username: DEFAULT_USER.username,
          password_hash: DEFAULT_PASSWORD,
          full_name: DEFAULT_USER.full_name,
          email: DEFAULT_USER.email,
          role: 'admin',
        });
      } catch (e) {
        // Ignora caso tabela ainda não exista no banco
      }

      return {
        success: true,
        user: DEFAULT_USER,
      };
    }

    return { success: false, error: 'Usuário não encontrado ou senha inválida.' };
  } catch (err: any) {
    // Fallback de emergência para manter sistema funcionando
    if (cleanUsername === DEFAULT_USER.username && cleanPassword === DEFAULT_PASSWORD) {
      return { success: true, user: DEFAULT_USER };
    }
    return { success: false, error: 'Falha na autenticação: ' + (err?.message || 'Erro interno') };
  }
}

/**
 * Retorna os dados do usuário autenticado a partir do cookie de sessão
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return decoded as AppUser;
  } catch {
    return null;
  }
}
