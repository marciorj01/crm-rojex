export interface Property {
  id: string;
  code?: string; // Código de Referência / ID amigável (Ex: ROJ-101, AP-204)
  title: string;
  description: string;
  property_type: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  status: 'active' | 'inactive' | 'sold';
  city?: string;
  neighborhood?: string;
  address?: string;
  state?: string;
  cep?: string;
  property_status?: string; // Pronto para morar, Em construção, Na planta, etc.
  standard?: string; // Alto padrão, Médio padrão, etc.
  features_comfort?: string[]; // Conforto e Ambientes Internos
  features_leisure?: string[]; // Lazer e Bem-estar
  features_infrastructure?: string[]; // Estrutura e Facilidades
  features_security?: string[]; // Segurança
  features_location?: string[]; // Localização e Proximidades
  features_premium?: string[]; // Diferenciais Premium
  custom_features?: string[]; // Adicionadas manualmente
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  property_id?: string | null;
  message?: string;
  source?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'lost' | 'converted';
  deleted_at?: string | null;
  created_at: string;
  properties?: {
    title: string;
    code?: string;
  } | null;
}

export interface PropertyFormData {
  code?: string;
  title: string;
  description: string;
  property_type: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  status: 'active' | 'inactive' | 'sold';
  cep: string;
  city: string;
  neighborhood: string;
  address: string;
  state: string;
  images: string[];
  property_status: string;
  standard: string;
  features_comfort: string[];
  features_leisure: string[];
  features_infrastructure: string[];
  features_security: string[];
  features_location: string[];
  features_premium: string[];
  custom_features: string[];
}

export interface AppUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}
