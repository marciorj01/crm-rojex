'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User, Plus, ExternalLink, Settings, LogOut } from 'lucide-react';

export function Navbar({ user }: { user: import('@/lib/types').AppUser }) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      router.push('/login');
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar imóveis ou leads..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
          />
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/properties/new"
          className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Imóvel</span>
        </Link>

        <a
          href="/api/feed"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 border border-slate-800 px-3 py-1.5 rounded-xl transition-all"
        >
          <span>Feed Loft</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

        {/* User Profile with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800/80 transition"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
              <User className="w-5 h-5 text-sky-400" />
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-200">{user.full_name}</p>
              <p className="text-[10px] text-sky-400 font-mono">{user.username}</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <p className="text-xs font-bold text-white">{user.full_name}</p>
                <p className="text-[11px] text-slate-400">{user.username} (Admin)</p>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Settings className="w-4 h-4 text-sky-400" />
                <span>Configurações & Senha</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
