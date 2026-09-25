-- CRM ROJEX: instalação em um NOVO projeto Supabase.
-- Não aplicar sobre banco legado: app_users passa a referenciar auth.users.
-- Não contém senhas ou usuários padrão. Veja README.md para provisionamento.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE DEFAULT ('ROJ-' || gen_random_uuid()::text), -- Código do Imóvel (Ex: ROJ-101, AP-204)
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    property_type VARCHAR(100) NOT NULL DEFAULT 'Apartamento',
    price NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    bedrooms INT NOT NULL DEFAULT 0,
    bathrooms INT NOT NULL DEFAULT 0,
    area NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (area >= 0), -- Área Total (m²)
    built_area NUMERIC(10, 2) DEFAULT 0.00, -- Área Construída (m²)
    images TEXT[] DEFAULT '{}', -- Lista de URLs ou caminhos das imagens
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','sold')), -- active, inactive, sold
    
    -- Localização & CEP
    feed_enabled BOOLEAN NOT NULL DEFAULT false,
    transaction_type TEXT NOT NULL DEFAULT 'sale' CHECK (transaction_type IN ('sale','rent','sale_rent')),
    rental_price NUMERIC(15,2) CHECK (rental_price >= 0),
    condominium NUMERIC(15,2) CHECK (condominium >= 0),
    yearly_tax NUMERIC(15,2) CHECK (yearly_tax >= 0),
    living_area NUMERIC(10,2) CHECK (living_area > 0),
    suites INTEGER CHECK (suites >= 0),
    parking_spaces INTEGER CHECK (parking_spaces >= 0),
    street_number TEXT,
    complement TEXT,
    latitude NUMERIC(10,7) CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(10,7) CHECK (longitude BETWEEN -180 AND 180),
    cep VARCHAR(10) DEFAULT '',
    city VARCHAR(100) DEFAULT '',
    neighborhood VARCHAR(100) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    state VARCHAR(2) DEFAULT '',
    
    -- Seção 5: Características Desejadas
    property_status VARCHAR(100) DEFAULT 'Pronto para morar',
    standard VARCHAR(100) DEFAULT 'Médio padrão',
    features_comfort TEXT[] DEFAULT '{}',
    features_leisure TEXT[] DEFAULT '{}',
    features_infrastructure TEXT[] DEFAULT '{}',
    features_security TEXT[] DEFAULT '{}',
    features_location TEXT[] DEFAULT '{}',
    features_premium TEXT[] DEFAULT '{}',
    custom_features TEXT[] DEFAULT '{}',

    -- Lixeira (Soft Delete)
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


ALTER TABLE public.properties ADD CONSTRAINT properties_counts CHECK (bedrooms >= 0 AND bathrooms >= 0 AND (built_area IS NULL OR built_area >= 0));
ALTER TABLE public.properties ADD CONSTRAINT properties_code CHECK (code = upper(trim(code)) AND length(code) > 0);
-- O default precisa respeitar a normalização acima.
ALTER TABLE public.properties ALTER COLUMN code SET DEFAULT ('ROJ-' || upper(gen_random_uuid()::text));

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  message TEXT,
  source VARCHAR(100) NOT NULL DEFAULT 'Portal',
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','lost','converted')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);
CREATE INDEX properties_feed_idx ON public.properties(id) WHERE status = 'active' AND deleted_at IS NULL AND feed_enabled;
CREATE INDEX properties_created_idx ON public.properties(created_at DESC);
CREATE INDEX leads_property_idx ON public.leads(property_id);
CREATE INDEX leads_created_idx ON public.leads(created_at DESC);

CREATE FUNCTION private.is_crm_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_users WHERE id = (SELECT auth.uid()) AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION private.is_crm_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_crm_admin() TO authenticated;

CREATE FUNCTION private.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER properties_updated BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_users, public.properties, public.leads FROM anon, authenticated;
GRANT SELECT ON public.app_users TO authenticated;
GRANT UPDATE(full_name,email,phone) ON public.app_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.app_users, public.properties, public.leads TO service_role;
CREATE POLICY profile_read ON public.app_users FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY profile_update ON public.app_users FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY properties_admin ON public.properties FOR ALL TO authenticated USING ((SELECT private.is_crm_admin())) WITH CHECK ((SELECT private.is_crm_admin()));
CREATE POLICY leads_admin ON public.leads FOR ALL TO authenticated USING ((SELECT private.is_crm_admin())) WITH CHECK ((SELECT private.is_crm_admin()));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('property_images','property_images',true,10485760,ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY property_images_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id='property_images');
CREATE POLICY property_images_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='property_images' AND (SELECT private.is_crm_admin()));
CREATE POLICY property_images_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='property_images' AND (SELECT private.is_crm_admin())) WITH CHECK (bucket_id='property_images' AND (SELECT private.is_crm_admin()));
CREATE POLICY property_images_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='property_images' AND (SELECT private.is_crm_admin()));
COMMIT;
