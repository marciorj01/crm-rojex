import { LoginContent } from './login-content';

type LoginParams = { redirect?: string | string[]; error?: string | string[] };
export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginParams> }) {
  const params = await searchParams;
  const requested = typeof params.redirect === 'string' ? params.redirect : '/dashboard';
  const redirectTo = /^\/dashboard(?:\/[^\\]*)?$/.test(requested) ? requested : '/dashboard';
  const errors: Record<string, string> = {
    invalid: 'Informe um e-mail válido e sua senha.',
    credentials: 'Não foi possível entrar. Confira e-mail e senha ou tente mais tarde.',
    forbidden: 'Conta sem permissão de acesso ao CRM.',
    unavailable: 'Não foi possível concluir o login. Tente novamente.',
  };
  const initialError = typeof params.error === 'string' ? errors[params.error] || '' : '';
  return <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
    <div aria-hidden="true" className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
    <div aria-hidden="true" className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
    <LoginContent redirectTo={redirectTo} initialError={initialError} />
  </div>;
}
