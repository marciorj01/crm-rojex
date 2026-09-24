import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getPublicImageUrl(supabaseUrl: string, imagePath: string): string {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const cleanPath = imagePath.replace(/^property_images\//, '');
  return `${supabaseUrl}/storage/v1/object/public/property_images/${cleanPath}`;
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://seu-projeto.supabase.co';
    const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'CRM ROJEX Imóveis';
    const companyEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'contato@rojeximoveis.com.br';

    // Buscar imóveis ativos que não foram para a lixeira
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar imóveis para o feed XML:', error);
      return new NextResponse('Erro interno ao buscar imóveis.', { status: 500 });
    }

    // Construção do XML no padrão VRsync (Loft, VivaReal, ZAP, OLX)
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlContent += `<ListingDataFeed xmlns="http://www.vrsync.com.br/schema/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vrsync.com.br/schema/1.0 http://www.vrsync.com.br/schema/1.0/vrsync.xsd">\n`;
    
    xmlContent += `  <Header>\n`;
    xmlContent += `    <Provider>${escapeXml(companyName)}</Provider>\n`;
    xmlContent += `    <Email>${escapeXml(companyEmail)}</Email>\n`;
    xmlContent += `  </Header>\n`;
    
    xmlContent += `  <Listings>\n`;

    if (properties && properties.length > 0) {
      for (const prop of properties) {
        const listingId = `ROJ-${prop.id.substring(0, 8).toUpperCase()}`;
        const formattedPrice = Number(prop.price || 0).toFixed(2);
        const formattedArea = Number(prop.area || 0).toFixed(2);

        // Reunir todas as características
        const allFeatures = [
          ...(prop.features_comfort || []),
          ...(prop.features_leisure || []),
          ...(prop.features_infrastructure || []),
          ...(prop.features_security || []),
          ...(prop.features_location || []),
          ...(prop.features_premium || []),
        ];
        
        xmlContent += `    <Listing>\n`;
        xmlContent += `      <ListingID>${listingId}</ListingID>\n`;
        xmlContent += `      <Title><![CDATA[${prop.title || 'Imóvel'}]]></Title>\n`;
        xmlContent += `      <TransactionType>For Sale</TransactionType>\n`;
        
        // Mídias / Fotografias
        xmlContent += `      <Media>\n`;
        if (Array.isArray(prop.images) && prop.images.length > 0) {
          prop.images.forEach((img: string, idx: number) => {
            const fullUrl = getPublicImageUrl(supabaseUrl, img);
            xmlContent += `        <Item medium="image" caption="Foto ${idx + 1}">${escapeXml(fullUrl)}</Item>\n`;
          });
        }
        xmlContent += `      </Media>\n`;

        // Detalhes do Imóvel
        xmlContent += `      <Details>\n`;
        xmlContent += `        <PropertyType>${escapeXml(prop.property_type || 'Residential / Apartment')}</PropertyType>\n`;
        xmlContent += `        <Description><![CDATA[${prop.description || ''}]]></Description>\n`;
        xmlContent += `        <ListPrice>${formattedPrice}</ListPrice>\n`;
        xmlContent += `        <Bedrooms>${prop.bedrooms || 0}</Bedrooms>\n`;
        xmlContent += `        <Bathrooms>${prop.bathrooms || 0}</Bathrooms>\n`;
        xmlContent += `        <LivingArea unit="square metres">${formattedArea}</LivingArea>\n`;

        // Características no padrão VRsync
        if (allFeatures.length > 0) {
          xmlContent += `        <Features>\n`;
          allFeatures.forEach((feat) => {
            xmlContent += `          <Feature>${escapeXml(feat)}</Feature>\n`;
          });
          xmlContent += `        </Features>\n`;
        }

        xmlContent += `      </Details>\n`;

        // Localização
        xmlContent += `      <Location displayAddress="Neighborhood">\n`;
        xmlContent += `        <Country abbreviation="BR">Brasil</Country>\n`;
        xmlContent += `        <State abbreviation="${escapeXml(prop.state || 'SP')}">${escapeXml(prop.state || 'SP')}</State>\n`;
        xmlContent += `        <City>${escapeXml(prop.city || 'São Paulo')}</City>\n`;
        xmlContent += `        <Neighborhood>${escapeXml(prop.neighborhood || 'Centro')}</Neighborhood>\n`;
        xmlContent += `        <Address>${escapeXml(prop.address || '')}</Address>\n`;
        if (prop.cep) {
          xmlContent += `        <PostalCode>${escapeXml(prop.cep)}</PostalCode>\n`;
        }
        xmlContent += `      </Location>\n`;

        xmlContent += `    </Listing>\n`;
      }
    }

    xmlContent += `  </Listings>\n`;
    xmlContent += `</ListingDataFeed>`;

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (err) {
    console.error('Erro catastrófico no gerador de feed XML:', err);
    return new NextResponse('Erro ao gerar Feed XML de Imóveis.', { status: 500 });
  }
}
