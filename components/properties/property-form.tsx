'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Upload, 
  X, 
  Loader2, 
  ImagePlus, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ChevronDown, 
  Plus, 
  Sparkles,
  Check,
  Building,
  DollarSign,
  MapPin,
  Tag
} from 'lucide-react';

// Listas Pré-configuradas para o Cadastro
const DEFAULT_COMFORT_OPTIONS = [
  'Suíte',
  'Aquecimento',
  'Ar-condicionado',
  'Área de serviço',
  'Lavanderia',
  'Armário no quarto',
  'Armário na cozinha',
  'Armário no banheiro',
  'Closet',
  'Varanda gourmet',
  'Churrasqueira na varanda',
  'Cozinha americana',
  'Cozinha planejada',
  'Escritório / Home Office',
  'Lavabo',
  'Sala de jantar',
  'Despensa',
  'Quarto de serviço',
];

const DEFAULT_LEISURE_OPTIONS = [
  'Piscina adulto',
  'Piscina infantil',
  'Piscina aquecida',
  'Churrasqueira',
  'Academia / Fitness',
  'Salão de festas',
  'Espaço gourmet',
  'Sauna seca / úmida',
  'Quadra poliesportiva',
  'Quadra de tênis / Beach Tennis',
  'Playground',
  'Brinquedoteca',
  'SPA / Hidromassagem',
  'Salão de jogos',
  'Pet Place / Espaço Pet',
  'Pista de caminhada / Cooper',
  'Cinema / Espaço Cine',
];

const DEFAULT_INFRASTRUCTURE_OPTIONS = [
  'Elevador social',
  'Elevador de serviço',
  'Portaria 24h',
  'Portaria virtual / remota',
  'Garagem coberta',
  'Vagas para visitantes',
  'Depósito privativo na garagem',
  'Gerador elétrico',
  'Bicicletário',
  'Coworking no condomínio',
  'Lavanderia coletiva',
  'Acessibilidade PCD',
  'Hall social decorado',
  'Wi-Fi nas áreas comuns',
];

const DEFAULT_SECURITY_OPTIONS = [
  'Câmeras de segurança (CFTV)',
  'Interfone inteligente',
  'Portão eletrônico',
  'Guarita blindada',
  'Controle de acesso biométrico / facial',
  'Alarme monitorado',
  'Ronda e vigilância 24h',
  'Cerca elétrica',
  'Fechadura eletrônica / digital',
];

const DEFAULT_LOCATION_OPTIONS = [
  'Perto de Metrô / Trem',
  'Perto de Shopping Center',
  'Perto de Parques / Praças',
  'Perto de Hospital / Clínicas',
  'Perto de Escolas / Faculdades',
  'Perto de Supermercados / Padarias',
  'Perto de Farmácias',
  'Fácil acesso a vias principais',
  'Rua tranquila / Arborizada',
];

const DEFAULT_PREMIUM_OPTIONS = [
  'Vista panorâmica / Vista livre',
  'Andar alto',
  'Pé direito duplo',
  'Automação residencial',
  'Energia solar fotovoltaica',
  'Tomada para carro elétrico',
  'Isolamento acústico',
  'Piso em porcelanato / Madeira nobre',
  'Janelas com persianas automatizadas',
];

export function PropertyForm() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'Apartamento',
    bedrooms: '2',
    bathrooms: '2',
    area: '',
    status: 'active' as 'active' | 'inactive' | 'sold',
    // Endereço e CEP
    cep: '',
    address: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    // 5. Características Desejadas
    property_status: 'Pronto para morar',
    standard: 'Médio padrão',
  });

  // Preço formatado em Reais (com centavos/decimais)
  const [rawPrice, setRawPrice] = useState<number>(0);
  const [displayPrice, setDisplayPrice] = useState<string>('');

  // Arrays de Múltipla Escolha
  const [comfortList, setComfortList] = useState<string[]>(DEFAULT_COMFORT_OPTIONS);
  const [selectedComfort, setSelectedComfort] = useState<string[]>([]);
  const [customComfortInput, setCustomComfortInput] = useState('');

  const [leisureList, setLeisureList] = useState<string[]>(DEFAULT_LEISURE_OPTIONS);
  const [selectedLeisure, setSelectedLeisure] = useState<string[]>([]);
  const [customLeisureInput, setCustomLeisureInput] = useState('');

  const [infraList, setInfraList] = useState<string[]>(DEFAULT_INFRASTRUCTURE_OPTIONS);
  const [selectedInfra, setSelectedInfra] = useState<string[]>([]);
  const [customInfraInput, setCustomInfraInput] = useState('');

  const [securityList, setSecurityList] = useState<string[]>(DEFAULT_SECURITY_OPTIONS);
  const [selectedSecurity, setSelectedSecurity] = useState<string[]>([]);
  const [customSecurityInput, setCustomSecurityInput] = useState('');

  const [locationList, setLocationList] = useState<string[]>(DEFAULT_LOCATION_OPTIONS);
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [customLocationInput, setCustomLocationInput] = useState('');

  const [premiumList, setPremiumList] = useState<string[]>(DEFAULT_PREMIUM_OPTIONS);
  const [selectedPremium, setSelectedPremium] = useState<string[]>([]);
  const [customPremiumInput, setCustomPremiumInput] = useState('');

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Formatador de Moeda BRL
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = parseFloat(rawVal) / 100 || 0;
    setRawPrice(num);
    setDisplayPrice(rawVal ? formatCurrency(num) : '');
  };

  // Atualizar inputs de texto e selects simples
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Busca de CEP Automática via ViaCEP
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);

    // Formatar máscara 00000-000
    const formattedCep = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val;
    setFormData((prev) => ({ ...prev, cep: formattedCep }));

    if (val.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val}/json/`);
        const data = await res.json();

        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            address: data.logradouro || prev.address,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch (err) {
        console.error('Erro ao consultar ViaCEP:', err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Toggle Multi-select
  const toggleSelection = (item: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  // Adicionar Opção Personalizada
  const addCustomOption = (
    inputVal: string, 
    setInputVal: React.Dispatch<React.SetStateAction<string>>, 
    list: string[], 
    setList: React.Dispatch<React.SetStateAction<string[]>>, 
    selected: string[], 
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    if (!list.includes(trimmed)) {
      setList([trimmed, ...list]);
    }
    if (!selected.includes(trimmed)) {
      setSelected([trimmed, ...selected]);
    }
    setInputVal('');
  };

  // Upload múltiplo de fotos diretamente para o bucket Supabase 'property_images'
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setMessage(null);

    const newImageUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `properties/${fileName}`;

        // Upload para o Bucket 'property_images'
        const { data, error } = await supabase.storage
          .from('property_images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error(`Erro ao fazer upload da imagem ${file.name}:`, error);
          throw error;
        }

        // Gerar URL pública da imagem recém enviada
        const { data: publicUrlData } = supabase.storage
          .from('property_images')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          newImageUrls.push(publicUrlData.publicUrl);
        }
      }

      setUploadedImages((prev) => [...prev, ...newImageUrls]);
      setMessage({ type: 'success', text: `${newImageUrls.length} imagem(ns) carregada(s) com sucesso!` });
    } catch (err: any) {
      console.error('Erro no upload de imagens:', err);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao enviar imagens. Verifique se o Bucket "property_images" está criado no Supabase.' 
      });
    } finally {
      setUploadingImages(false);
    }
  };

  // Remover foto da lista
  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || rawPrice <= 0 || !formData.area) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios (Título, Preço e Área).' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          title: formData.title,
          description: formData.description,
          property_type: formData.property_type,
          price: rawPrice,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseInt(formData.bathrooms) || 0,
          area: parseFloat(formData.area) || 0,
          status: formData.status,
          cep: formData.cep,
          city: formData.city,
          neighborhood: formData.neighborhood,
          address: formData.address,
          state: formData.state,
          images: uploadedImages,
          property_status: formData.property_status,
          standard: formData.standard,
          features_comfort: selectedComfort,
          features_leisure: selectedLeisure,
          features_infrastructure: selectedInfra,
          features_security: selectedSecurity,
          features_location: selectedLocation,
          features_premium: selectedPremium,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Imóvel cadastrado com sucesso! Redirecionando...' });
      
      setTimeout(() => {
        router.push('/dashboard/properties');
        router.refresh();
      }, 1200);

    } catch (err: any) {
      console.error('Erro ao salvar imóvel:', err);
      setMessage({ type: 'error', text: `Erro ao salvar imóvel: ${err.message || 'Tente novamente.'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Card 1: Informações Básicas */}
      <div className="glass-panel p-6 space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          1. Informações Básicas do Imóvel
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Título do Imóvel <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ex: Apartamento de Luxo 3 Suítes com Vista Panorâmica"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipo de Imóvel <span className="text-rose-400">*</span>
            </label>
            <select
              name="property_type"
              value={formData.property_type}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            >
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa / Sobrado</option>
              <option value="Casa em Condomínio">Casa em Condomínio</option>
              <option value="Cobertura">Cobertura</option>
              <option value="Terreno">Terreno / Lote</option>
              <option value="Comercial">Sala Comercial / Galpão</option>
              <option value="Studio / Flat">Studio / Flat</option>
              <option value="Chácara / Sítio">Chácara / Sítio</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Status de Publicação <span className="text-rose-400">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            >
              <option value="active">Ativo (Visível no Feed e Loft)</option>
              <option value="inactive">Inativo (Rascunho)</option>
              <option value="sold">Vendido / Alugado</option>
            </select>
          </div>

          {/* PREÇO EM REAL COM CASAS DECIMAIS */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Preço de Venda (R$) <span className="text-rose-400">* (com centavos)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                R$
              </span>
              <input
                type="text"
                value={displayPrice}
                onChange={handlePriceChange}
                placeholder="R$ 0,00"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            {rawPrice > 0 && (
              <span className="text-[11px] text-sky-400 mt-1 block">
                Valor gravado: R$ {rawPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Área Útil (m²) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="Ex: 120"
              step="0.01"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Dormitórios / Quartos</label>
            <input
              type="number"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleChange}
              min="0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Banheiros</label>
            <input
              type="number"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleChange}
              min="0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">Descrição Completa</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Descreva as principais características do imóvel, acabamentos, varanda, condomínio, área de lazer..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Localização & CEP Automático */}
      <div className="glass-panel p-6 space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            2. Endereço & Localização (Busca por CEP)
          </span>
          {loadingCep && (
            <span className="text-xs text-sky-400 flex items-center gap-1.5 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando endereço...
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CAMPO CEP */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              CEP (com busca automática)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleCepChange}
                maxLength={9}
                placeholder="00000-000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Digite o CEP para auto-completar</span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">Endereço (Rua / Av)</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Rua Augusta, 1000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Bairro</label>
            <input
              type="text"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              placeholder="Consolação"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Cidade</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="São Paulo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Estado (UF)</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              maxLength={2}
              placeholder="SP"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 uppercase placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Card 3: CARACTERÍSTICAS DESEJADAS (FIGURAS 1 E 2) */}
      <div className="glass-panel p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            5. CARACTERÍSTICAS DESEJADAS
          </h2>
          <span className="text-xs text-slate-400">Seleções & Cadastro Manual</span>
        </div>

        <div className="space-y-6">
          {/* 1. STATUS DO IMÓVEL (ÚNICA) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              STATUS DO IMÓVEL (ÚNICA)
            </label>
            <select
              name="property_status"
              value={formData.property_status}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
            >
              <option value="Pronto para morar">Pronto para morar</option>
              <option value="Em construção">Em construção</option>
              <option value="Na planta">Na planta</option>
              <option value="Lançamento">Lançamento</option>
              <option value="Reformado">Reformado</option>
              <option value="Em reforma">Em reforma</option>
              <option value="Oportunidade">Oportunidade</option>
            </select>
          </div>

          {/* 2. PADRÃO DO IMÓVEL (ÚNICA) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              PADRÃO DO IMÓVEL (ÚNICA)
            </label>
            <select
              name="standard"
              value={formData.standard}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
            >
              <option value="Alto padrão">Alto padrão</option>
              <option value="Médio padrão">Médio padrão</option>
              <option value="Econômico / Popular">Econômico / Popular</option>
              <option value="Luxo / Super Luxo">Luxo / Super Luxo</option>
              <option value="Studio / Compacto">Studio / Compacto</option>
            </select>
          </div>

          {/* 3. CONFORTO E AMBIENTES INTERNOS (MÚLTIPLA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                CONFORTO E AMBIENTES INTERNOS
              </label>
              <span className="text-xs text-sky-400 font-semibold">{selectedComfort.length} selecionados</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'comfort' ? null : 'comfort')}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 flex items-center justify-between transition"
              >
                <span>{selectedComfort.length > 0 ? `${selectedComfort.length} item(ns) selecionado(s)` : 'Selecionar'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openDropdown === 'comfort' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'comfort' && (
                <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 z-20">
                  {/* Input para adicionar característica manual */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digitar nova opção e adicionar..."
                      value={customComfortInput}
                      onChange={(e) => setCustomComfortInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomOption(customComfortInput, setCustomComfortInput, comfortList, setComfortList, selectedComfort, setSelectedComfort);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomOption(customComfortInput, setCustomComfortInput, comfortList, setComfortList, selectedComfort, setSelectedComfort)}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  {/* Lista com Checkboxes e Scroll */}
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40">
                    {comfortList.map((item) => {
                      const isChecked = selectedComfort.includes(item);
                      return (
                        <label
                          key={item}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-sm text-slate-200 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelection(item, selectedComfort, setSelectedComfort)}
                            className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                          />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Badges selecionados */}
            {selectedComfort.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedComfort.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-lg text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleSelection(tag, selectedComfort, setSelectedComfort)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. LAZER E BEM-ESTAR (MÚLTIPLA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                LAZER E BEM-ESTAR
              </label>
              <span className="text-xs text-sky-400 font-semibold">{selectedLeisure.length} selecionados</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'leisure' ? null : 'leisure')}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 flex items-center justify-between transition"
              >
                <span>{selectedLeisure.length > 0 ? `${selectedLeisure.length} item(ns) selecionado(s)` : 'Selecionar'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openDropdown === 'leisure' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'leisure' && (
                <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 z-20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digitar nova opção e adicionar..."
                      value={customLeisureInput}
                      onChange={(e) => setCustomLeisureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomOption(customLeisureInput, setCustomLeisureInput, leisureList, setLeisureList, selectedLeisure, setSelectedLeisure);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomOption(customLeisureInput, setCustomLeisureInput, leisureList, setLeisureList, selectedLeisure, setSelectedLeisure)}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40">
                    {leisureList.map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-sm text-slate-200 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLeisure.includes(item)}
                          onChange={() => toggleSelection(item, selectedLeisure, setSelectedLeisure)}
                          className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedLeisure.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedLeisure.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleSelection(tag, selectedLeisure, setSelectedLeisure)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 5. ESTRUTURA E FACILIDADES (MÚLTIPLA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                ESTRUTURA E FACILIDADES
              </label>
              <span className="text-xs text-sky-400 font-semibold">{selectedInfra.length} selecionados</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'infra' ? null : 'infra')}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 flex items-center justify-between transition"
              >
                <span>{selectedInfra.length > 0 ? `${selectedInfra.length} item(ns) selecionado(s)` : 'Selecionar'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openDropdown === 'infra' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'infra' && (
                <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 z-20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digitar nova opção e adicionar..."
                      value={customInfraInput}
                      onChange={(e) => setCustomInfraInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomOption(customInfraInput, setCustomInfraInput, infraList, setInfraList, selectedInfra, setSelectedInfra);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomOption(customInfraInput, setCustomInfraInput, infraList, setInfraList, selectedInfra, setSelectedInfra)}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40">
                    {infraList.map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-sm text-slate-200 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedInfra.includes(item)}
                          onChange={() => toggleSelection(item, selectedInfra, setSelectedInfra)}
                          className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedInfra.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedInfra.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-lg text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleSelection(tag, selectedInfra, setSelectedInfra)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 6. SEGURANÇA (MÚLTIPLA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                SEGURANÇA
              </label>
              <span className="text-xs text-sky-400 font-semibold">{selectedSecurity.length} selecionados</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'security' ? null : 'security')}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 flex items-center justify-between transition"
              >
                <span>{selectedSecurity.length > 0 ? `${selectedSecurity.length} item(ns) selecionado(s)` : 'Selecionar'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openDropdown === 'security' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'security' && (
                <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 z-20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digitar nova opção e adicionar..."
                      value={customSecurityInput}
                      onChange={(e) => setCustomSecurityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomOption(customSecurityInput, setCustomSecurityInput, securityList, setSecurityList, selectedSecurity, setSelectedSecurity);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomOption(customSecurityInput, setCustomSecurityInput, securityList, setSecurityList, selectedSecurity, setSelectedSecurity)}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40">
                    {securityList.map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-sm text-slate-200 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSecurity.includes(item)}
                          onChange={() => toggleSelection(item, selectedSecurity, setSelectedSecurity)}
                          className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedSecurity.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedSecurity.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleSelection(tag, selectedSecurity, setSelectedSecurity)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 7. LOCALIZAÇÃO E PROXIMIDADES (MÚLTIPLA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                LOCALIZAÇÃO E PROXIMIDADES
              </label>
              <span className="text-xs text-sky-400 font-semibold">{selectedLocation.length} selecionados</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 flex items-center justify-between transition"
              >
                <span>{selectedLocation.length > 0 ? `${selectedLocation.length} item(ns) selecionado(s)` : 'Selecionar'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openDropdown === 'location' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'location' && (
                <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 z-20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digitar nova opção e adicionar..."
                      value={customLocationInput}
                      onChange={(e) => setCustomLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomOption(customLocationInput, setCustomLocationInput, locationList, setLocationList, selectedLocation, setSelectedLocation);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomOption(customLocationInput, setCustomLocationInput, locationList, setLocationList, selectedLocation, setSelectedLocation)}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40">
                    {locationList.map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-sm text-slate-200 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLocation.includes(item)}
                          onChange={() => toggleSelection(item, selectedLocation, setSelectedLocation)}
                          className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedLocation.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedLocation.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2.5 py-1 rounded-lg text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleSelection(tag, selectedLocation, setSelectedLocation)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 8. DIFERENCIAIS PREMIUM (MÚLTIPLA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                DIFERENCIAIS PREMIUM
              </label>
              <span className="text-xs text-amber-400 font-semibold">{selectedPremium.length} selecionados</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'premium' ? null : 'premium')}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 flex items-center justify-between transition"
              >
                <span>{selectedPremium.length > 0 ? `${selectedPremium.length} item(ns) selecionado(s)` : 'Selecionar'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openDropdown === 'premium' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'premium' && (
                <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 z-20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digitar nova opção e adicionar..."
                      value={customPremiumInput}
                      onChange={(e) => setCustomPremiumInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomOption(customPremiumInput, setCustomPremiumInput, premiumList, setPremiumList, selectedPremium, setSelectedPremium);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomOption(customPremiumInput, setCustomPremiumInput, premiumList, setPremiumList, selectedPremium, setSelectedPremium)}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40">
                    {premiumList.map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-sm text-slate-200 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPremium.includes(item)}
                          onChange={() => toggleSelection(item, selectedPremium, setSelectedPremium)}
                          className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedPremium.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedPremium.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleSelection(tag, selectedPremium, setSelectedPremium)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 4: Upload de Múltiplas Fotografias para Supabase Storage */}
      <div className="glass-panel p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            4. Fotografias do Imóvel (Bucket Supabase)
          </h2>
          <span className="text-xs text-slate-400">Bucket: <code className="bg-slate-800 px-2 py-0.5 rounded text-sky-400">property_images</code></span>
        </div>

        {/* Zona de Drop / Upload */}
        <div className="relative border-2 border-dashed border-slate-800 hover:border-sky-500/60 rounded-2xl p-8 text-center bg-slate-950/50 hover:bg-slate-950/80 transition cursor-pointer group">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploadingImages}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />

          <div className="flex flex-col items-center justify-center gap-3">
            {uploadingImages ? (
              <>
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                <p className="text-sm font-semibold text-sky-300">Enviando imagens para o Supabase Storage...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition">
                  <ImagePlus className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Clique para selecionar ou arraste fotos aqui
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Suporta PNG, JPG, WEBP (múltiplos arquivos até 10MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Galeria de Fotos Carregadas */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fotos Carregadas ({uploadedImages.length}):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {uploadedImages.map((url, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video">
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 bg-rose-600/90 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-rose-500"
                    title="Remover Imagem"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-slate-950/80 text-[10px] text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-medium text-sm transition"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading || uploadingImages}
          className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-600/25 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando Imóvel...</span>
            </>
          ) : (
            <span>Salvar e Publicar Imóvel</span>
          )}
        </button>
      </div>
    </form>
  );
}
