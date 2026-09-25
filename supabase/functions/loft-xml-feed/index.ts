// ============================================================
// SUPABASE EDGE FUNCTION — loft-xml-feed
// Converte imóveis ativos da tabela `properties` para XML
// no padrão de integração exigido pelo portal Loft.
//
// URL pública após deploy:
//   https://<PROJECT_REF>.supabase.co/functions/v1/loft-xml-feed
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface Property {
  id: string;
  code: string;
  title: string;
  description: string | null;
  property_type: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  built_area: number | null;
  images: string[];
  status: string;
  cep: string;
  city: string;
  neighborhood: string;
  address: string;
  state: string;
  property_status: string;
  standard: string;
  features_comfort: string[];
  features_leisure: string[];
  features_infrastructure: string[];
  features_security: string[];
  features_location: string[];
  features_premium: string[];
  custom_features: string[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escapa caracteres reservados do XML fora de seções CDATA. */
function xmlEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Mapeia o tipo de imóvel do CRM para o padrão aceito pela Loft.
 * Ajuste conforme os valores reais cadastrados no seu CRM.
 */
function mapPropertyType(type: string): string {
  const map: Record<string, string> = {
    "apartamento": "Apartamento",
    "casa": "Casa",
    "casa em condomínio": "Casa em Condomínio",
    "casa em condominio": "Casa em Condomínio",
    "cobertura": "Cobertura",
    "studio": "Studio",
    "kitnet": "Kitnet",
    "loft": "Loft",
    "terreno": "Terreno",
    "comercial": "Comercial",
    "sala": "Sala Comercial",
    "galpão": "Galpão",
    "galp": "Galpão",
  };
  return map[type.toLowerCase().trim()] ?? type;
}

/**
 * Gera a tag <Foto> para cada URL de imagem.
 * A Loft aceita até 30 fotos por imóvel.
 */
function buildPhotosXml(images: string[]): string {
  if (!images || images.length === 0) return "";
  const limited = images.slice(0, 30);
  const tags = limited
    .map(
      (url, i) =>
        `      <Foto ordem="${i + 1}" principal="${i === 0 ? "1" : "0"}">\n        <URLArquivo>${xmlEscape(url)}</URLArquivo>\n      </Foto>`,
    )
    .join("\n");
  return `    <Fotos>\n${tags}\n    </Fotos>`;
}

/**
 * Monta o bloco <Caracteristicas> a partir dos arrays de features do CRM.
 */
function buildFeaturesXml(property: Property): string {
  const allFeatures = [
    ...(property.features_comfort ?? []),
    ...(property.features_leisure ?? []),
    ...(property.features_infrastructure ?? []),
    ...(property.features_security ?? []),
    ...(property.features_location ?? []),
    ...(property.features_premium ?? []),
    ...(property.custom_features ?? []),
  ].filter(Boolean);

  if (allFeatures.length === 0) return "";

  const tags = allFeatures
    .map((f) => `      <Caracteristica>${xmlEscape(f)}</Caracteristica>`)
    .join("\n");
  return `    <Caracteristicas>\n${tags}\n    </Caracteristicas>`;
}

/**
 * Constrói o bloco XML de um único imóvel.
 */
function buildImovelXml(p: Property): string {
  const codigoExibicao = p.code && p.code.trim() !== "" ? p.code : p.id;

  return `  <Imovel>
    <CodigoImovel>${xmlEscape(codigoExibicao)}</CodigoImovel>
    <TipoImovel>${xmlEscape(mapPropertyType(p.property_type))}</TipoImovel>
    <SubTipoImovel>${xmlEscape(p.property_status ?? "Residencial")}</SubTipoImovel>
    <Titulo><![CDATA[${p.title ?? ""}]]></Titulo>
    <Descricao><![CDATA[${p.description ?? ""}]]></Descricao>
    <PrecoVenda>${p.price?.toFixed(2) ?? "0.00"}</PrecoVenda>
    <AreaUtil>${p.area ?? 0}</AreaUtil>
    <AreaTotal>${p.built_area ?? p.area ?? 0}</AreaTotal>
    <Dormitorios>${p.bedrooms ?? 0}</Dormitorios>
    <Banheiros>${p.bathrooms ?? 0}</Banheiros>
    <Vagas>0</Vagas>
    <Endereco>
      <CEP>${xmlEscape(p.cep)}</CEP>
      <Logradouro>${xmlEscape(p.address)}</Logradouro>
      <Bairro>${xmlEscape(p.neighborhood)}</Bairro>
      <Cidade>${xmlEscape(p.city)}</Cidade>
      <UF>${xmlEscape(p.state)}</UF>
      <Pais>Brasil</Pais>
    </Endereco>
${buildPhotosXml(p.images)}
${buildFeaturesXml(p)}
  </Imovel>`;
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
serve(async (_req: Request) => {
  try {
    // Inicializa o cliente Supabase com as variáveis de ambiente injetadas
    // automaticamente pelo runtime da Edge Function.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
        Deno.env.get("SUPABASE_ANON_KEY") ??
        "",
    );

    // Busca somente imóveis ativos e não deletados
    const { data: properties, error } = await supabaseClient
      .from("properties")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error.message);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Erro>${xmlEscape(error.message)}</Erro>`,
        {
          status: 500,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        },
      );
    }

    // Monta o XML completo
    const imoveis = (properties as Property[]) ?? [];
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<!-- Feed de Imóveis ROJEX — Gerado em ${now} — Total: ${imoveis.length} imóvel(is) -->\n`;
    xml += `<Carga>\n`;
    xml += `  <Imoveis>\n`;

    for (const property of imoveis) {
      xml += buildImovelXml(property);
      xml += "\n";
    }

    xml += `  </Imoveis>\n`;
    xml += `</Carga>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Permite que a Loft faça cache por 5 minutos
        "Cache-Control": "public, max-age=300",
        // Permite acesso externo (necessário para o portal Loft buscar o feed)
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Erro>Erro interno no servidor.</Erro>`,
      {
        status: 500,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      },
    );
  }
});
