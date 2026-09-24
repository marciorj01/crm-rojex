-- =========================================================
-- CRM IMOBILIÁRIO ROJEX - SQL SCHEMA & MIGRATION COMPLETA (SUPABASE)
-- =========================================================

-- 1. Habilitar a extensão pgcrypto se ainda não estiver ativa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 2. TABELA APP_USERS (USUÁRIOS E CREDENCIAIS DE ACESSO DO CRM)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) DEFAULT 'Márcio Roger',
    email VARCHAR(255) DEFAULT 'admin@rojex.com.br',
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir usuário padrão se não existir (Usuário: marcioroger / Senha: admin123456)
INSERT INTO public.app_users (username, password_hash, full_name, email, role)
VALUES ('marcioroger', 'admin123456', 'Márcio Roger', 'contato@rojeximoveis.com.br', 'admin')
ON CONFLICT (username) DO NOTHING;

-- =========================================================
-- 3. TABELA PROPERTIES (IMÓVEIS) COM NOVAS CARACTERÍSTICAS E LIXEIRA
-- =========================================================
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) DEFAULT '', -- Código do Imóvel (Ex: ROJ-101, AP-204)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(100) NOT NULL DEFAULT 'Apartamento',
    price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    bedrooms INT NOT NULL DEFAULT 0,
    bathrooms INT NOT NULL DEFAULT 0,
    area NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- em m²
    images TEXT[] DEFAULT '{}', -- Lista de URLs ou caminhos das imagens
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, sold
    
    -- Localização & CEP
    cep VARCHAR(10) DEFAULT '',
    city VARCHAR(100) DEFAULT 'São Paulo',
    neighborhood VARCHAR(100) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    state VARCHAR(2) DEFAULT 'SP',
    
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

-- Garantir que as novas colunas existam mesmo se a tabela já foi criada anteriormente
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS code VARCHAR(50) DEFAULT '';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cep VARCHAR(10) DEFAULT '';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_status VARCHAR(100) DEFAULT 'Pronto para morar';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS standard VARCHAR(100) DEFAULT 'Médio padrão';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features_comfort TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features_leisure TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features_infrastructure TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features_security TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features_location TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features_premium TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS custom_features TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON public.properties(deleted_at);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_updated_at ON public.properties;
CREATE TRIGGER trg_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION update_properties_updated_at();

-- =========================================================
-- 4. TABELA LEADS (CONTATOS / POTENCIAIS CLIENTES) COM LIXEIRA
-- =========================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    message TEXT,
    source VARCHAR(100) DEFAULT 'Loft Portal',
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, lost, converted
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON public.leads(deleted_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- =========================================================
-- 5. CONFIGURAÇÃO DO STORAGE BUCKET (property_images)
-- =========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property_images',
    'property_images',
    TRUE,
    10485760, -- 10MB limite por imagem
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- =========================================================
-- 6. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- =========================================================

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- POLÍTICAS DA TABELA APP_USERS
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura e escrita de app_users" ON public.app_users;
CREATE POLICY "Permitir leitura e escrita de app_users"
    ON public.app_users FOR ALL
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------
-- POLÍTICAS DA TABELA PROPERTIES
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura publica de imoveis ativos" ON public.properties;
CREATE POLICY "Permitir leitura publica de imoveis ativos"
    ON public.properties FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir criacao de imoveis para usuarios autenticados" ON public.properties;
DROP POLICY IF EXISTS "Permitir criacao de imoveis" ON public.properties;
CREATE POLICY "Permitir criacao de imoveis"
    ON public.properties FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir edicao de imoveis para usuarios autenticados" ON public.properties;
DROP POLICY IF EXISTS "Permitir edicao de imoveis" ON public.properties;
CREATE POLICY "Permitir edicao de imoveis"
    ON public.properties FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de imoveis para usuarios autenticados" ON public.properties;
DROP POLICY IF EXISTS "Permitir exclusao de imoveis" ON public.properties;
CREATE POLICY "Permitir exclusao de imoveis"
    ON public.properties FOR DELETE
    USING (true);

-- ---------------------------------------------------------
-- POLÍTICAS DA TABELA LEADS
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Permitir insercao publica de leads (Webhooks/Formularios)" ON public.leads;
CREATE POLICY "Permitir insercao publica de leads (Webhooks/Formularios)"
    ON public.leads FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de leads para usuarios autenticados" ON public.leads;
DROP POLICY IF EXISTS "Permitir leitura de leads" ON public.leads;
CREATE POLICY "Permitir leitura de leads"
    ON public.leads FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir atualizacao de leads para usuarios autenticados" ON public.leads;
DROP POLICY IF EXISTS "Permitir atualizacao de leads" ON public.leads;
CREATE POLICY "Permitir atualizacao de leads"
    ON public.leads FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Permitir exclusao de leads para usuarios autenticados" ON public.leads;
DROP POLICY IF EXISTS "Permitir exclusao de leads" ON public.leads;
CREATE POLICY "Permitir exclusao de leads"
    ON public.leads FOR DELETE
    USING (true);

-- ---------------------------------------------------------
-- POLÍTICAS DO STORAGE OBJECTS (BUCKET property_images)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Imagens de Imoveis - Acesso Publico de Leitura" ON storage.objects;
CREATE POLICY "Imagens de Imoveis - Acesso Publico de Leitura"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'property_images');

DROP POLICY IF EXISTS "Imagens de Imoveis - Upload por Usuarios Autenticados ou Anonimos" ON storage.objects;
CREATE POLICY "Imagens de Imoveis - Upload por Usuarios Autenticados ou Anonimos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'property_images');

DROP POLICY IF EXISTS "Imagens de Imoveis - Edicao e Exclusao" ON storage.objects;
CREATE POLICY "Imagens de Imoveis - Edicao e Exclusao"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'property_images');

DROP POLICY IF EXISTS "Imagens de Imoveis - Exclusao" ON storage.objects;
CREATE POLICY "Imagens de Imoveis - Exclusao"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'property_images');
