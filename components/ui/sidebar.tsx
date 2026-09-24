'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  LayoutDashboard, 
  PlusCircle, 
  Rss, 
  Settings,
  Building,
  LogOut,
  Trash2
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Imóveis', href: '/dashboard/properties', icon: Building2 },
    { name: 'Novo Imóvel', href: '/dashboard/properties/new', icon: PlusCircle },
    { name: 'Leads Recebidos', href: '/dashboard/leads', icon: Users },
    { name: 'Configurações & Lixeira', href: '/dashboard/settings', icon: Settings },
  ];

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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight tracking-wide">CRM ROJEX</h1>
            <p className="text-xs text-sky-400 font-medium">Gestão & Integration Loft</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Principal
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/dashboard/properties');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* External Integration Tools */}
        <div className="p-4 space-y-1 border-t border-slate-800/60 mt-4">
          <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Integrações & Portais
          </div>
          
          <a
            href="/api/feed"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-emerald-400 hover:bg-emerald-950/30 border border-transparent hover:border-emerald-500/20 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <Rss className="w-5 h-5 text-emerald-400" />
              <span>Feed XML (VRsync)</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">XML</span>
          </a>
        </div>
      </div>

      {/* Footer Info & Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/20 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>

        <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
          <span>Vercel + Supabase</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>
    </aside>
  );
}
