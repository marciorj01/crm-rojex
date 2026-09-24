import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  Building2, 
  Users, 
  Rss, 
  PlusCircle, 
  TrendingUp, 
  CheckCircle, 
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const revalidate = 0; // Server rendering sempre atualizado

export default async function DashboardOverviewPage() {
  const supabase = createAdminClient();

  // Buscar contagens e métricas do Supabase
  const [{ count: totalProperties }, { count: activeProperties }, { count: totalLeads }, { count: newLeads }] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
  ]);

  // Buscar os últimos 5 imóveis e últimos 5 leads
  const [{ data: recentProperties }, { data: recentLeads }] = await Promise.all([
    supabase.from('properties').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('leads').select('*, properties(title)').order('created_at', { ascending: false }).limit(5),
  ]);

  return (
    <div className="space-y-8">
      {/* Banner de Boas-Vindas */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-slate-800 p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5" /> Painel de Controle Ativo
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              CRM Imobiliário ROJEX
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Sua carteira de imóveis está conectada e pronta para exportação via XML Feed (VRsync) para o portal Loft e captação de leads em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/properties/new"
              className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-sky-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Imóvel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Imóveis */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Imóveis</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{totalProperties || 0}</span>
            <span className="text-xs text-slate-400">cadastrados</span>
          </div>
        </div>

        {/* Card 2: Imóveis Ativos (No Feed) */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ativos no Feed Loft</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Rss className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">{activeProperties || 0}</span>
            <span className="text-xs text-emerald-500 font-medium">Sincronizados</span>
          </div>
        </div>

        {/* Card 3: Total Leads */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Leads</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{totalLeads || 0}</span>
            <span className="text-xs text-slate-400">capturados</span>
          </div>
        </div>

        {/* Card 4: Leads Novos */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Novos Contatos</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-400">{newLeads || 0}</span>
            <span className="text-xs text-amber-500 font-medium">Aguardando atendimento</span>
          </div>
        </div>
      </div>

      {/* Grid com Imóveis Recentes e Leads Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imóveis Recentes */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              Últimos Imóveis Cadastrados
            </h2>
            <Link href="/dashboard/properties" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentProperties && recentProperties.length > 0 ? (
            <div className="space-y-3">
              {recentProperties.map((prop) => (
                <div key={prop.id} className="glass-card p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                      {prop.images && prop.images[0] ? (
                        <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Building2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-sm line-clamp-1">{prop.title}</h4>
                      <p className="text-xs text-slate-400">
                        {prop.property_type} • R$ {Number(prop.price).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${
                    prop.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {prop.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhum imóvel cadastrado ainda.</p>
          )}
        </div>

        {/* Leads Recentes */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Últimos Leads Capturados
            </h2>
            <Link href="/dashboard/leads" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentLeads && recentLeads.length > 0 ? (
            <div className="space-y-3">
              {recentLeads.map((lead: any) => (
                <div key={lead.id} className="glass-card p-3.5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">{lead.name}</h4>
                    <p className="text-xs text-slate-400">
                      {lead.email || lead.phone || 'Sem contato'} • <span className="text-sky-400">{lead.source}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md shrink-0 ${
                    lead.status === 'new' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                  }`}>
                    {(lead.status || 'NOVO').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhum lead recebido ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
