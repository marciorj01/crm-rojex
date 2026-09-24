'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Property } from '@/lib/types';
import { 
  Building2, 
  Bed, 
  Bath, 
  Maximize2, 
  MapPin, 
  Plus, 
  Search, 
  Rss, 
  ImageIcon, 
  Trash2, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  Edit3,
  Hash
} from 'lucide-react';

interface PropertyListProps {
  initialProperties: Property[];
}

export function PropertyList({ initialProperties }: PropertyListProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mover para a Lixeira (Soft Delete)
  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm(`Deseja enviar o imóvel "${title}" para a Lixeira? Você poderá restaurá-lo nas Configurações.`)) return;

    setDeletingId(id);
    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'soft_delete', type: 'property', id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao mover para lixeira');

      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`Erro ao mover para a lixeira: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProperties = properties.filter((item) => {
    const propCode = item.code || `ROJ-${item.id.substring(0, 6).toUpperCase()}`;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      propCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.neighborhood && item.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.cep && item.cep.includes(searchTerm));

    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesType = selectedType === 'all' || item.property_type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Carteira de Imóveis</h1>
          <p className="text-sm text-slate-400">
            Clique em qualquer imóvel para editar textos, fotos, preços e características
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/feed"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 transition text-sm font-medium"
          >
            <Rss className="w-4 h-4 text-emerald-400" />
            <span>Feed XML Loft</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>

          <Link
            href="/dashboard/properties/new"
            className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-md shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Imóvel</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, título, bairro ou CEP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-sky-500 transition"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos (No Feed)</option>
            <option value="inactive">Inativos</option>
            <option value="sold">Vendidos</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-sky-500 transition"
          >
            <option value="all">Todos os Tipos</option>
            <option value="Apartamento">Apartamento</option>
            <option value="Casa">Casa</option>
            <option value="Casa em Condomínio">Casa em Condomínio</option>
            <option value="Cobertura">Cobertura</option>
            <option value="Terreno">Terreno</option>
            <option value="Comercial">Comercial</option>
          </select>
        </div>
      </div>

      {/* Grid of Properties */}
      {filteredProperties.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">Nenhum imóvel encontrado</h3>
            <p className="text-sm text-slate-400 mt-1">
              {searchTerm ? 'Tente ajustar seus termos de pesquisa' : 'Comece cadastrando seu primeiro imóvel para gerar o feed.'}
            </p>
          </div>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Imóvel Agora</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => {
            const displayCode = prop.code || `ROJ-${prop.id.substring(0, 6).toUpperCase()}`;

            return (
              <div 
                key={prop.id} 
                className="glass-card overflow-hidden flex flex-col justify-between group hover:border-sky-500/40 transition duration-200"
              >
                <Link href={`/dashboard/properties/${prop.id}`} className="block">
                  {/* Image Banner */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer">
                    {prop.images && prop.images.length > 0 ? (
                      <img
                        src={prop.images[0]}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                        <ImageIcon className="w-10 h-10" />
                        <span className="text-xs">Sem fotografias</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      {prop.status === 'active' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                          <CheckCircle className="w-3 h-3" /> ATIVO (NO FEED)
                        </span>
                      )}
                      {prop.status === 'inactive' && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                          <Clock className="w-3 h-3" /> INATIVO
                        </span>
                      )}
                      {prop.status === 'sold' && (
                        <span className="inline-flex items-center gap-1 bg-slate-700/90 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                          VENDIDO
                        </span>
                      )}
                    </div>

                    {/* Image Count & Edit Hint */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <span className="bg-sky-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md opacity-0 group-hover:opacity-100 transition">
                        <Edit3 className="w-3 h-3" /> Editar
                      </span>
                      {prop.images && prop.images.length > 0 && (
                        <div className="bg-slate-950/80 backdrop-blur-md text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                          <span>{prop.images.length} fotos</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1">
                        <span className="font-semibold text-sky-400 uppercase tracking-wide">
                          {prop.property_type}
                        </span>
                        <span className="font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-sky-300 font-bold flex items-center gap-1">
                          <Hash className="w-3 h-3 text-slate-500" />
                          {displayCode}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-100 text-base line-clamp-1 group-hover:text-sky-300 transition">
                        {prop.title}
                      </h3>

                      {(prop.neighborhood || prop.city || prop.cep) && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">
                            {[prop.neighborhood, prop.city, prop.state].filter(Boolean).join(', ')}
                            {prop.cep ? ` (${prop.cep})` : ''}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Characteristics */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Bed className="w-4 h-4 text-sky-400" />
                        <span>{prop.bedrooms} Quarto(s)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bath className="w-4 h-4 text-sky-400" />
                        <span>{prop.bathrooms} WCs</span>
                      </div>
                      <div className="flex items-center gap-1.5" title={prop.built_area ? `Área Total: ${prop.area} m² | Construída: ${prop.built_area} m²` : `Área Total: ${prop.area} m²`}>
                        <Maximize2 className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="truncate">
                          {prop.built_area ? `${prop.built_area} / ${prop.area} m²` : `${prop.area} m²`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Price and Actions */}
                <div className="p-5 pt-0 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Preço de Venda</span>
                    <span className="text-lg font-extrabold text-white">
                      {formatPrice(prop.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/dashboard/properties/${prop.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600/10 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/20 text-xs font-semibold transition"
                      title="Editar Imóvel"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </Link>

                    <button
                      onClick={(e) => handleDelete(e, prop.id, prop.title)}
                      disabled={deletingId === prop.id}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-950/30 transition disabled:opacity-50"
                      title="Mover para a Lixeira"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
