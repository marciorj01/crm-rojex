-- =========================================================
-- CRM IMOBILIÁRIO ROJEX - SQL SCHEMA & RLS POLICIES (SUPABASE)
-- =========================================================

-- 1. Habilitar a extensão pgcrypto se ainda não estiver ativa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 2. TABELA PROPERTIES (IMÓVEIS)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(100) NOT NULL DEFAULT 'Apartamento',
    price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    bedrooms INT NOT NULL DEFAULT 0,
    bathrooms INT NOT NULL DEFAULT 0,
    area NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- em m²
    images TEXT[] DEFAULT '{}', -- Lista de URLs ou caminhos das imagens
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, sold
    city VARCHAR(100) DEFAULT 'São Paulo',
    neighborhood VARCHAR(100) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    state VARCHAR(2) DEFAULT 'SP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
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
-- 3. TABELA LEADS (CONTATOS / POTENCIAIS CLIENTES)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    message TEXT,
    source VARCHAR(100) DEFAULT 'Loft Portal', -- Ex: Loft, VivaReal, Site Direct
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, lost, converted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- =========================================================
-- 4. CONFIGURAÇÃO DO STORAGE BUCKET (property_images)
-- =========================================================
-- Inserir ou atualizar bucket público para imagens dos imóveis
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
-- 5. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- =========================================================

-- Enable RLS em todas as tabelas
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- POLÍTICAS DA TABELA PROPERTIES:
-- - Leitura pública: permitida para exibir no feed XML e site
-- - Inserção/Atualização/Deleção: apenas usuários autenticados ou service_role
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Permitir leitura publica de imoveis ativos" ON public.properties;
CREATE POLICY "Permitir leitura publica de imoveis ativos"
    ON public.properties FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir criacao de imoveis para usuarios autenticados" ON public.properties;
CREATE POLICY "Permitir criacao de imoveis para usuarios autenticados"
    ON public.properties FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Permitir edicao de imoveis para usuarios autenticados" ON public.properties;
CREATE POLICY "Permitir edicao de imoveis para usuarios autenticados"
    ON public.properties FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Permitir exclusao de imoveis para usuarios autenticados" ON public.properties;
CREATE POLICY "Permitir exclusao de imoveis para usuarios autenticados"
    ON public.properties FOR DELETE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ---------------------------------------------------------
-- POLÍTICAS DA TABELA LEADS:
-- - Leitura/Edição/Exclusão: apenas usuários autenticados ou service_role (painel CRM)
-- - Inserção: permitida para todos (Webhook do portal e formulários públicos)
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Permitir insercao publica de leads (Webhooks/Formularios)" ON public.leads;
CREATE POLICY "Permitir insercao publica de leads (Webhooks/Formularios)"
    ON public.leads FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de leads para usuarios autenticados" ON public.leads;
CREATE POLICY "Permitir leitura de leads para usuarios autenticados"
    ON public.leads FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Permitir atualizacao de leads para usuarios autenticados" ON public.leads;
CREATE POLICY "Permitir atualizacao de leads para usuarios autenticados"
    ON public.leads FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Permitir exclusao de leads para usuarios autenticados" ON public.leads;
CREATE POLICY "Permitir exclusao de leads para usuarios autenticados"
    ON public.leads FOR DELETE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

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
