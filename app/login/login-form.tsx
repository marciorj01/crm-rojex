'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Building, Lock, User, LogIn, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export function LoginForm({ onAuthenticated, initialError = '' }: {
  onAuthenticated: () => void;
  initialError?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    // Read the actual inputs, including values inserted by browser autofill.
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email') || '').trim();
    const password = String(values.get('password') || '');
    setErrorMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 256) {
      setErrorMessage('Informe um e-mail válido e sua senha.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15000),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!data || typeof data !== 'object') throw new Error('O servidor retornou uma resposta inesperada. Tente novamente.');
      const result = data as { success?: boolean; error?: unknown };
      if (!response.ok || result.success !== true) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível entrar. Confira e-mail e senha.');
      }
      onAuthenticated();
    } catch (error) {
      const message = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'O login demorou para responder. Tente novamente.'
        : error instanceof TypeError ? 'Não foi possível conectar. Confira sua conexão e tente novamente.'
        : error instanceof Error ? error.message : 'Falha ao realizar login.';
      setErrorMessage(message);
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Header / Brand */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-sky-500/25 mx-auto mb-4 animate-in fade-in zoom-in duration-300">
          <Building className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">CRM ROJEX</h1>
        <p className="text-sm text-slate-400 mt-1">Gestão Imobiliária & Integração Portais</p>
      </div>

      {/* Login Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-6 pb-3 border-b border-slate-800">
          <Sparkles className="w-4 h-4" /> Acesso ao Painel Administrativo
        </div>

        {errorMessage && (
          <div id="login-error" role="alert" aria-live="polite" className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form action="/api/auth/login" method="post" noValidate onSubmit={handleSubmit} aria-busy={loading} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-2">
              E-mail
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email" name="email" type="email" autoComplete="username"
                aria-describedby={errorMessage ? 'login-error' : undefined}
                required
                placeholder="Seu e-mail de acesso"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password" name="password" type="password" autoComplete="current-password"
                aria-describedby={errorMessage ? 'login-error' : undefined}
                required
                placeholder="Sua senha secreta"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white py-3 px-6 rounded-xl font-bold text-sm transition shadow-lg shadow-sky-600/30 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Acessar CRM</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Info Box */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Acesso configurável nas <strong className="text-slate-300">Configurações</strong> do painel
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 mt-8">
        &copy; 2026 CRM ROJEX Imóveis. Todos os direitos reservados.
      </p>
    </div>
  );
}
