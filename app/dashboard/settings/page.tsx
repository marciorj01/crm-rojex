'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  KeyRound, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Building2, 
  Users, 
  Shield, 
  Save,
  Clock,
  Sparkles
} from 'lucide-react';
import { Property, Lead } from '@/lib/types';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'security' | 'trash'>('security');

  // Security Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Trash State
  const [trashProperties, setTrashProperties] = useState<Property[]>([]);
  const [trashLeads, setTrashLeads] = useState<Lead[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [trashMsg, setTrashMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar dados da lixeira
  const fetchTrash = async () => {
    setLoadingTrash(true);
    try {
      const res = await fetch('/api/trash');
      const data = await res.json();
      setTrashProperties(data.properties || []);
      setTrashLeads(data.leads || []);
    } catch (err: any) {
      console.error('Erro ao buscar lixeira:', err);
    } finally {
      setLoadingTrash(false);
    }
  };

  useEffect(() => {
    // Buscar usuário inicial
    setUsername('marcioroger');
    setFullName('Márcio Roger');
    setEmail('contato@rojeximoveis.com.br');
    setPhone('+5541999999999');

    fetchTrash();
  }, []);

  // Salvar novo usuário e senha
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    setUserMsg(null);

    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUsername: username,
          newPassword: password,
          fullName,
          email,
          phone,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao atualizar credenciais.');
      }

      setUserMsg({ type: 'success', text: 'Usuário e senha atualizados com sucesso!' });
      setPassword('');
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err.message || 'Erro ao salvar.' });
    } finally {
      setSavingUser(false);
    }
  };

  // Restaurar item da lixeira
  const handleRestore = async (type: 'property' | 'lead', id: string) => {
    setActionLoadingId(id);
    setTrashMsg(null);

    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', type, id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar');

      setTrashMsg({ type: 'success', text: 'Item restaurado com sucesso! Já está disponível no CRM.' });
      
      if (type === 'property') {
        setTrashProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        setTrashLeads((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err: any) {
      setTrashMsg({ type: 'error', text: err.message || 'Erro ao restaurar item.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Excluir definitivamente da lixeira
  const handlePermanentDelete = async (type: 'property' | 'lead', id: string, name: string) => {
    if (!confirm(`Atenção: Deseja realmente EXCLUIR DEFINITIVAMENTE "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setActionLoadingId(id);
    setTrashMsg(null);

    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'permanent_delete', type, id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');

      setTrashMsg({ type: 'success', text: 'Item excluído permanentemente do banco de dados.' });
      
      if (type === 'property') {
        setTrashProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        setTrashLeads((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err: any) {
      setTrashMsg({ type: 'error', text: err.message || 'Erro ao excluir permanentemente.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-sky-400" />
          Configurações do Sistema
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie suas credenciais de acesso, segurança e a lixeira de itens excluídos.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'security'
              ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Acesso & Senha</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('trash');
            fetchTrash();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'trash'
              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Lixeira do CRM ({trashProperties.length + trashLeads.length})</span>
        </button>
      </div>

      {/* TAB 1: ACESSO & SEGURANÇA */}
      {activeTab === 'security' && (
        <div className="max-w-2xl">
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Alterar Usuário e Senha</h2>
                <p className="text-xs text-slate-400">Você pode modificar suas credenciais a qualquer momento</p>
              </div>
            </div>

            {userMsg && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
                  userMsg.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {userMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{userMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Márcio Roger"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    E-mail de Contato (Feed & Portais)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@rojeximoveis.com.br"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Telefone / WhatsApp da Imobiliária (com +55 e DDD) <span className="text-amber-400">* Exigido pela Loft</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+5541999999999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Formato aceito pela Loft: +55 seguido do DDD e número (Ex: +5541999999999)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Nome de Usuário (Login) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="marcioroger"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Nova Senha de Acesso <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a nova senha desejada"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Recomendado usar ao menos 6 dígitos.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-sky-600/20 disabled:opacity-50"
                >
                  {savingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Credenciais</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: LIXEIRA DO CRM */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          {trashMsg && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
                trashMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {trashMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{trashMsg.text}</span>
            </div>
          )}

          {loadingTrash ? (
            <div className="glass-panel p-12 text-center">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Carregando itens da lixeira...</p>
            </div>
          ) : trashProperties.length === 0 && trashLeads.length === 0 ? (
            <div className="glass-panel p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-200">A lixeira está vazia</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Nenhum imóvel ou lead foi enviado para a lixeira recentemente.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Imóveis na Lixeira */}
              {trashProperties.length > 0 && (
                <div className="glass-panel p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-sky-400" />
                      Imóveis na Lixeira ({trashProperties.length})
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {trashProperties.map((prop) => (
                      <div
                        key={prop.id}
                        className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-rose-500/20 bg-rose-950/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                            {prop.images && prop.images[0] ? (
                              <img src={prop.images[0]} alt="" className="w-full h-full object-cover grayscale" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <Building2 className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-200 text-sm">{prop.title}</h4>
                            <p className="text-xs text-slate-400">
                              {prop.property_type} • R$ {Number(prop.price).toLocaleString('pt-BR')} • {prop.neighborhood || prop.city}
                            </p>
                            {prop.deleted_at && (
                              <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> Excluído em: {new Date(prop.deleted_at).toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions: Restaurar ou Excluir Definitivo */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => handleRestore('property', prop.id)}
                            disabled={actionLoadingId === prop.id}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>RESTAURAR</span>
                          </button>

                          <button
                            onClick={() => handlePermanentDelete('property', prop.id, prop.title)}
                            disabled={actionLoadingId === prop.id}
                            className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 px-3.5 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>EXCLUIR DEFINITIVAMENTE</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads na Lixeira */}
              {trashLeads.length > 0 && (
                <div className="glass-panel p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Leads na Lixeira ({trashLeads.length})
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {trashLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-rose-500/20 bg-rose-950/10"
                      >
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm">{lead.name}</h4>
                          <p className="text-xs text-slate-400">
                            {lead.email || lead.phone || 'Sem contato'} • Origem: {lead.source || 'Portal'}
                          </p>
                          {lead.deleted_at && (
                            <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> Excluído em: {new Date(lead.deleted_at).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>

                        {/* Actions: Restaurar ou Excluir Definitivo */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => handleRestore('lead', lead.id)}
                            disabled={actionLoadingId === lead.id}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>RESTAURAR</span>
                          </button>

                          <button
                            onClick={() => handlePermanentDelete('lead', lead.id, lead.name)}
                            disabled={actionLoadingId === lead.id}
                            className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 px-3.5 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>EXCLUIR DEFINITIVAMENTE</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
