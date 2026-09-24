'use client';

import { useState } from 'react';
import { Lead } from '@/lib/types';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  MessageSquare, 
  Send, 
  Trash2 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LeadTableProps {
  initialLeads: Lead[];
}

export function LeadTable({ initialLeads }: LeadTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const supabase = createClient();

  const handleStatusChange = async (id: string, newStatus: NonNullable<Lead['status']>) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert(`Erro ao atualizar status do lead: ${error.message}`);
    } else {
      setLeads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    }
    setUpdatingId(null);
  };

  // Mover Lead para a Lixeira
  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Deseja mover o lead de "${name}" para a Lixeira?`)) return;

    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'soft_delete', type: 'lead', id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao mover para a lixeira');

      setLeads((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Erro ao mover lead para lixeira: ${err.message}`);
    }
  };

  const filteredLeads = leads.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.phone && item.phone.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatWhatsApp = (phone: string) => {
    if (!phone) return '#';
    const cleanNumber = phone.replace(/\D/g, '');
    const number = cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber;
    return `https://wa.me/${number}?text=${encodeURIComponent('Olá! Vi seu interesse no nosso imóvel anunciado. Como posso ajudar?')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leads & Potenciais Clientes</h1>
          <p className="text-sm text-slate-400">
            Leads capturados via Webhook de integração do portal Loft e site
          </p>
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 flex items-center gap-3">
            <Users className="w-5 h-5 text-sky-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Recebidos</span>
              <span className="text-lg font-bold text-white">{leads.length} Leads</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-sky-500 transition"
          >
            <option value="all">Todos os Status</option>
            <option value="new">Novos (Não atendidos)</option>
            <option value="contacted">Em Contato</option>
            <option value="qualified">Qualificados</option>
            <option value="converted">Convertidos (Vendido)</option>
            <option value="lost">Perdidos</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="glass-panel overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">Nenhum lead recebido ainda</h3>
            <p className="text-xs text-slate-500">
              Configure a URL de Webhook <code className="bg-slate-900 px-2 py-1 rounded text-sky-400">/api/leads</code> no painel da Loft para receber contatos automaticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Cliente / Contato</th>
                  <th className="py-3.5 px-4">Origem</th>
                  <th className="py-3.5 px-4">Imóvel de Interesse</th>
                  <th className="py-3.5 px-4">Data de Entrada</th>
                  <th className="py-3.5 px-4">Status no CRM</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-900/50 transition">
                    {/* Cliente / Contato */}
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-slate-100">{lead.name}</p>
                        <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-400">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" /> {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" /> {lead.phone}
                            </span>
                          )}
                        </div>
                        {lead.message && (
                          <p className="text-xs text-slate-400 italic mt-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 max-w-sm line-clamp-2">
                            &quot;{lead.message}&quot;
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Origem */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {lead.source || 'Portal Loft'}
                      </span>
                    </td>

                    {/* Imóvel de Interesse */}
                    <td className="py-4 px-4">
                      {lead.properties ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                          <Building className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="line-clamp-1">{lead.properties.title}</span>
                        </span>
                      ) : lead.property_id ? (
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {lead.property_id.substring(0, 8)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Interesse Geral</span>
                      )}
                    </td>

                    {/* Data */}
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(lead.created_at)}</span>
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as any)}
                        disabled={updatingId === lead.id}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none transition ${
                          lead.status === 'new'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : lead.status === 'contacted'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : lead.status === 'qualified'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : lead.status === 'converted'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <option value="new" className="bg-slate-900 text-amber-300">NOVO</option>
                        <option value="contacted" className="bg-slate-900 text-sky-300">EM CONTATO</option>
                        <option value="qualified" className="bg-slate-900 text-purple-300">QUALIFICADO</option>
                        <option value="converted" className="bg-slate-900 text-emerald-300">CONVERTIDO (VENDIDO)</option>
                        <option value="lost" className="bg-slate-900 text-rose-300">PERDIDO</option>
                      </select>
                    </td>

                    {/* Actions: WhatsApp e Lixeira */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {lead.phone && (
                          <a
                            href={formatWhatsApp(lead.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-emerald-600/20"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteLead(lead.id, lead.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition"
                          title="Mover para Lixeira"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
