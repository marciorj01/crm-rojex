'use client';

import Link from 'next/link';
import { Bell, Search, User, Plus, ExternalLink } from 'lucide-react';

export function Navbar() {
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

        <button 
          aria-label="Notificações"
          className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-all relative"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 rounded-full bg-sky-500 absolute top-2 right-2"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
            <User className="w-5 h-5 text-sky-400" />
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-200">Corretor Principal</p>
            <p className="text-[10px] text-slate-400">admin@rojex.com.br</p>
          </div>
        </div>
      </div>
    </header>
  );
}
