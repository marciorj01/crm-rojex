import { createClient } from '@/lib/supabase/server';
import { PropertyForm } from '@/components/properties/property-form';
import { notFound } from 'next/navigation';

export const revalidate = 0;

interface EditPropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const supabase = await createClient();

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', (await params).id)
    .maybeSingle();

  if (error) throw error;
  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Editar Imóvel</h1>
        <p className="text-sm text-slate-400">
          Atualize as informações, fotos, características e preços do imóvel
        </p>
      </div>

      <PropertyForm initialProperty={property} />
    </div>
  );
}
