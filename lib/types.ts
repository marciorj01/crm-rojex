export interface Property {
  id: string;
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
  created_at: string;
  properties?: {
    title: string;
  } | null;
}

export interface PropertyFormData {
  title: string;
  description: string;
  property_type: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  status: 'active' | 'inactive' | 'sold';
  city: string;
  neighborhood: string;
  address: string;
  state: string;
  images: string[];
}
