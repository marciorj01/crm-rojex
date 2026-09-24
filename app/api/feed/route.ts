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

function formatE164Phone(rawPhone: string): string {
  if (!rawPhone) return '+5541999999999';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return `+55${digits}`;
  }
  return digits ? `+${digits}` : '+5541999999999';
}

function mapPropertyType(type: string): string {
  switch (type) {
    case 'Apartamento': return 'Residential / Apartment';
    case 'Casa': 
    case 'Casa / Sobrado': return 'Residential / Home';
    case 'Casa em Condomínio': return 'Residential / Condo';
    case 'Cobertura': return 'Residential / Penthouse';
    case 'Terreno':
    case 'Terreno / Lote': return 'Residential / Land Lot';
    case 'Comercial':
    case 'Sala Comercial / Galpão': return 'Commercial / Office';
    case 'Studio / Flat': return 'Residential / Flat';
    case 'Chácara / Sítio': return 'Residential / Farm Ranch';
    default: return 'Residential / Home';
  }
}

function parseAddressParts(rawAddress: string): { street: string; number: string } {
  if (!rawAddress) return { street: 'Não informado', number: 'S/N' };
  const match = rawAddress.match(/^(.*?)(?:,\s*|\s+)(\d+|S\/N|s\/n)$/i);
  if (match) {
    return { street: match[1].trim(), number: match[2].trim() };
  }
  return { street: rawAddress.trim(), number: 'S/N' };
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://seu-projeto.supabase.co';

    // Buscar dados de contato do corretor/imobiliária da tabela app_users
    const { data: adminUser } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const companyName = adminUser?.full_name || process.env.NEXT_PUBLIC_COMPANY_NAME || 'CRM ROJEX Imóveis';
    const companyEmail = adminUser?.email || process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'contato@rojeximoveis.com.br';
    const rawPhone = adminUser?.phone || process.env.COMPANY_PHONE || process.env.NEXT_PUBLIC_COMPANY_PHONE || '+5541999999999';
    const formattedPhone = formatE164Phone(rawPhone);

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

    const currentDateIso = new Date().toISOString().replace(/\.\d{3}Z$/, '');

    // Construção do XML no padrão oficial VRsync / Loft / VivaReal / Zap
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlContent += `<ListingDataFeed xmlns="http://www.vrsync.com.br/schema/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vrsync.com.br/schema/1.0 http://www.vrsync.com.br/schema/1.0/vrsync.xsd">\n`;
    
    xmlContent += `  <Header>\n`;
    xmlContent += `    <Provider>${escapeXml(companyName)}</Provider>\n`;
    xmlContent += `    <Email>${escapeXml(companyEmail)}</Email>\n`;
    xmlContent += `    <ContactName>${escapeXml(companyName)}</ContactName>\n`;
    xmlContent += `    <Telephone>${escapeXml(formattedPhone)}</Telephone>\n`;
    xmlContent += `    <PublishDate>${currentDateIso}</PublishDate>\n`;
    xmlContent += `  </Header>\n`;
    
    xmlContent += `  <Listings>\n`;

    if (properties && properties.length > 0) {
      for (const prop of properties) {
        const listingId = escapeXml(prop.code || `ROJ-${prop.id.substring(0, 8).toUpperCase()}`);
        const formattedPrice = Number(prop.price || 0).toFixed(2);
        const formattedArea = Number(prop.area || 0).toFixed(2);
        const formattedBuiltArea = prop.built_area ? Number(prop.built_area).toFixed(2) : null;
        const mappedType = mapPropertyType(prop.property_type || 'Apartamento');

        const { street, number: streetNumber } = parseAddressParts(prop.address || '');
        const cleanCep = (prop.cep || '').replace(/\D/g, '');
        const formattedCep = cleanCep.length === 8 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : (prop.cep || '00000-000');

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

        // DADOS DE CONTATO DO ANÚNCIO (Exigência do Portal Loft)
        xmlContent += `      <ContactInfo>\n`;
        xmlContent += `        <Name>${escapeXml(companyName)}</Name>\n`;
        xmlContent += `        <Email>${escapeXml(companyEmail)}</Email>\n`;
        xmlContent += `        <Telephone>${escapeXml(formattedPhone)}</Telephone>\n`;
        xmlContent += `        <Website>https://rojeximoveis.com.br</Website>\n`;
        xmlContent += `      </ContactInfo>\n`;
        
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
        xmlContent += `        <PropertyType>${escapeXml(mappedType)}</PropertyType>\n`;
        xmlContent += `        <Description><![CDATA[${prop.description || prop.title || ''}]]></Description>\n`;
        xmlContent += `        <ListPrice>${formattedPrice}</ListPrice>\n`;
        xmlContent += `        <Bedrooms>${prop.bedrooms || 0}</Bedrooms>\n`;
        xmlContent += `        <Bathrooms>${prop.bathrooms || 0}</Bathrooms>\n`;
        if (formattedBuiltArea) {
          xmlContent += `        <LivingArea unit="square metres">${formattedBuiltArea}</LivingArea>\n`;
        } else {
          xmlContent += `        <LivingArea unit="square metres">${formattedArea}</LivingArea>\n`;
        }
        xmlContent += `        <LotArea unit="square metres">${formattedArea}</LotArea>\n`;

        // Características no padrão VRsync
        if (allFeatures.length > 0) {
          xmlContent += `        <Features>\n`;
          allFeatures.forEach((feat) => {
            xmlContent += `          <Feature>${escapeXml(feat)}</Feature>\n`;
          });
          xmlContent += `        </Features>\n`;
        }

        xmlContent += `      </Details>\n`;

        // Localização Completa no padrão VRsync
        xmlContent += `      <Location displayAddress="All">\n`;
        xmlContent += `        <Country abbreviation="BR">Brasil</Country>\n`;
        xmlContent += `        <State abbreviation="${escapeXml(prop.state || 'PR')}">${escapeXml(prop.state || 'PR')}</State>\n`;
        xmlContent += `        <City>${escapeXml(prop.city || 'São Paulo')}</City>\n`;
        xmlContent += `        <Neighborhood>${escapeXml(prop.neighborhood || 'Centro')}</Neighborhood>\n`;
        xmlContent += `        <Address>${escapeXml(street)}</Address>\n`;
        xmlContent += `        <StreetNumber>${escapeXml(streetNumber)}</StreetNumber>\n`;
        if (formattedCep) {
          xmlContent += `        <PostalCode>${escapeXml(formattedCep)}</PostalCode>\n`;
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
        'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Erro catastrófico no gerador de feed XML:', err);
    return new NextResponse('Erro ao gerar Feed XML de Imóveis.', { status: 500 });
  }
}
