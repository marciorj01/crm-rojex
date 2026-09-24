import { createAdminClient } from '@/lib/supabase/admin';
import { PropertyForm } from '@/components/properties/property-form';
import { notFound } from 'next/navigation';

export const revalidate = 0;

interface EditPropertyPageProps {
  params: {
    id: string;
  };
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const supabase = createAdminClient();

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !property) {
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
