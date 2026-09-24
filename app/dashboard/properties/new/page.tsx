import { PropertyForm } from '@/components/properties/property-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/properties"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Cadastrar Novo Imóvel</h1>
            <p className="text-sm text-slate-400">
              Preencha os detalhes do imóvel e carregue fotos diretamente para o Supabase Storage
            </p>
          </div>
        </div>
      </div>

      <PropertyForm />
    </div>
  );
}
