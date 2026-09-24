import { createAdminClient } from '@/lib/supabase/admin';
import { PropertyList } from '@/components/properties/property-list';

export const revalidate = 0; // Sempre atualizado em tempo de execução

export default async function PropertiesPage() {
  const supabase = createAdminClient();

  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar lista de imóveis:', error);
  }

  return <PropertyList initialProperties={properties || []} />;
}
