'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Loader2, ImagePlus, CheckCircle2, AlertCircle } from 'lucide-react';

export function PropertyForm() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'Apartamento',
    price: '',
    bedrooms: '2',
    bathrooms: '2',
    area: '',
    status: 'active' as 'active' | 'inactive' | 'sold',
    city: 'São Paulo',
    neighborhood: '',
    address: '',
    state: 'SP',
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Atualizar inputs de texto e números
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        text: 'Erro ao enviar imagens. Verifique se o Bucket "property_images" e as políticas RLS estão configuradas no Supabase.' 
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

    if (!formData.title || !formData.price || !formData.area) {
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
          price: parseFloat(formData.price) || 0,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseInt(formData.bathrooms) || 0,
          area: parseFloat(formData.area) || 0,
          status: formData.status,
          city: formData.city,
          neighborhood: formData.neighborhood,
          address: formData.address,
          state: formData.state,
          images: uploadedImages,
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
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao salvar imóvel:', err);
      setMessage({ type: 'error', text: `Erro ao salvar imóvel: ${err.message || 'Tente novamente.'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
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
          Informações Básicas do Imóvel
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
              placeholder="Ex: Lindo Apartamento de 3 Quartos em Moema"
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
              <option value="Cobertura">Cobertura</option>
              <option value="Terreno">Terreno / Lote</option>
              <option value="Comercial">Sala Comercial / Galpão</option>
              <option value="Flat">Flat / Studio</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Status <span className="text-rose-400">*</span>
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Preço de Venda (R$) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="750000"
              step="0.01"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
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
              placeholder="85"
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

      {/* Card 2: Localização */}
      <div className="glass-panel p-6 space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          Endereço & Localização
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Card 3: Upload de Múltiplas Fotografias para Supabase Storage */}
      <div className="glass-panel p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            Fotografias do Imóvel (Bucket Supabase)
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
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar e Publicar Imóvel</span>
          )}
        </button>
      </div>
    </form>
  );
}
