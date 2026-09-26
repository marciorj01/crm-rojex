// VR-SYNC: https://developers.grupozap.com/feeds/vrsync/
// A homologação das regras específicas da Loft é uma etapa separada.
export interface FeedProperty {
  id: string; code?: string; title: string; description: string;
  property_type: string; price: number; area: number;
  bedrooms: number; bathrooms: number; images: string[];
  status: string; deleted_at?: string | null; feed_enabled?: boolean;
  transaction_type?: string; rental_price?: number | null;
  condominium?: number | null; yearly_tax?: number | null;
  living_area?: number | null; built_area?: number | null; suites?: number | null; parking_spaces?: number | null;
  address?: string; street_number?: string | null; complement?: string | null;
  city?: string; neighborhood?: string; state?: string; cep?: string;
  latitude?: number | null; longitude?: number | null;
  features_comfort?: string[]; features_leisure?: string[];
  features_infrastructure?: string[]; features_security?: string[];
  features_location?: string[]; features_premium?: string[]; custom_features?: string[];
}

export const PROPERTY_TYPES: Record<string, string> = {
  Apartamento: 'Residential / Apartment', Casa: 'Residential / Home',
  Sobrado: 'Residential / Sobrado', 'Casa em Condomínio': 'Residential / Condo',
  Cobertura: 'Residential / Penthouse', Terreno: 'Residential / Land Lot',
  'Sala Comercial': 'Commercial / Office', Galpão: 'Commercial / Industrial',
  Studio: 'Residential / Studio', Flat: 'Residential / Flat',
  Chácara: 'Residential / Farm Ranch', Sítio: 'Residential / Agricultural',
  Kitnet: 'Residential / Kitnet', Loft: 'Residential / Loft',
};

const STATES: Record<string, string> = {
  AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará',
  DF:'Distrito Federal', ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão', MT:'Mato Grosso',
  MS:'Mato Grosso do Sul', MG:'Minas Gerais', PA:'Pará', PB:'Paraíba', PR:'Paraná',
  PE:'Pernambuco', PI:'Piauí', RJ:'Rio de Janeiro', RN:'Rio Grande do Norte',
  RS:'Rio Grande do Sul', RO:'Rondônia', RR:'Roraima', SC:'Santa Catarina',
  SP:'São Paulo', SE:'Sergipe', TO:'Tocantins',
};

export interface FeedContact { name: string; email: string; phone: string; website?: string }
export const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';
export function cleanXml(value: unknown): string {
  return String(value ?? '').replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '');
}
export function escapeXml(value: unknown): string {
  return cleanXml(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export function cdata(value: unknown): string {
  return `<![CDATA[${cleanXml(value).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}
export function listingId(p: Pick<FeedProperty, 'code' | 'id'>): string {
  return p.code?.trim() || p.id;
}
// Only unambiguous labels from the CRM are translated. Other labels remain text.
export const FEATURE_TYPES: Record<string, string> = {
  'Aquecimento': 'Heating', 'Ar-condicionado': 'Cooling', 'Lavanderia': 'Laundry',
  'Closet': 'Closet', 'Varanda gourmet': 'Gourmet Balcony',
  'Churrasqueira na varanda': 'Barbecue Balcony', 'Cozinha americana': 'American Kitchen',
  'Lavabo': 'Lavabo', 'Sala de jantar': 'Dinner Room', 'Despensa': 'Pantry',
  'Quarto de serviço': 'Service Room', 'Churrasqueira': 'BBQ',
  'Salão de festas': 'Party Room', 'Espaço gourmet': 'Gourmet Area',
  'Quadra poliesportiva': 'Sports Court', 'Playground': 'Playground',
  'Brinquedoteca': 'Toys Place', 'Salão de jogos': 'Game room',
  'Gerador elétrico': 'Generator', 'Bicicletário': 'Bicycles Place',
  'Portão eletrônico': 'Electronic Gate', 'Guarita blindada': 'Armored Security Cabin',
  'Isolamento acústico': 'Soundproofing',
};
export function feedFeatures(p: FeedProperty) {
  const labels = [...new Set([...(p.features_comfort || []), ...(p.features_leisure || []),
    ...(p.features_infrastructure || []), ...(p.features_security || []), ...(p.features_location || []),
    ...(p.features_premium || []), ...(p.custom_features || [])])];
  return { mapped: [...new Set(labels.filter(label => Object.hasOwn(FEATURE_TYPES, label)).map(label => FEATURE_TYPES[label]))],
    text: labels.filter(label => !Object.hasOwn(FEATURE_TYPES, label)) };
}
export function feedDescription(p: FeedProperty): string {
  const { text } = feedFeatures(p);
  return cleanXml(p.description).trim() + (text.length ? `\n\nCaracterísticas: ${text.join('; ')}.` : '');
}
export function publicImageUrl(path: string, supabaseUrl: string): string {
  let url: URL;
  if (/^https?:\/\//i.test(path)) url = new URL(path);
  else {
    if (!path || path.includes('..') || /^[a-z][a-z0-9+.-]*:/i.test(path)) throw new Error('Caminho de foto inválido');
    const encoded = path.replace(/^\/?property_images\//, '').replace(/^\//,'').split('/').map(encodeURIComponent).join('/');
    url = new URL(`/storage/v1/object/public/property_images/${encoded}`, supabaseUrl);
  }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL de foto inválida');
  return url.href;
}

// Business validation shared with the form; unknown values are never invented.
export function propertyErrors(p: FeedProperty, storageUrl = 'https://storage.example.com'): string[] {
  const errors: string[] = [];
  const length = (value: unknown) => [...cleanXml(value).trim()].length;
  if (!listingId(p) || length(listingId(p)) > 50) errors.push('Código do imóvel deve ter entre 1 e 50 caracteres');
  if (length(p.title) < 10 || length(p.title) > 100) errors.push('Título deve ter entre 10 e 100 caracteres');
  if (length(p.description) < 50 || length(p.description) > 3000) errors.push('Descrição deve ter entre 50 e 3000 caracteres');
  if (length(feedDescription(p)) > 3000) errors.push('Descrição com características ultrapassa 3000 caracteres');
  for (const [label, value] of Object.entries({ título:p.title, descrição:p.description,
    logradouro:p.address, número:p.street_number, bairro:p.neighborhood, cidade:p.city })) {
    if (typeof value !== 'string' || !value.trim()) errors.push(`Informe ${label}`);
  }
  if (!Object.hasOwn(PROPERTY_TYPES, p.property_type)) errors.push('Selecione um tipo de imóvel específico');
  if (!STATES[p.state || '']) errors.push('Informe uma UF válida');
  if (!/^\d{8}$/.test((p.cep || '').replace(/\D/g,''))) errors.push('Informe um CEP válido');
  // VR-SYNC imports integer amounts/areas. Values below 1 would become zero.
  const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 1;
  if (!positive(p.area)) errors.push('Informe a área total');
  if (!positive(p.living_area)) errors.push('Informe a área útil');
  if (p.built_area != null && (!Number.isFinite(p.built_area) || p.built_area < 0)) errors.push('Área construída inválida');
  if (!['sale','rent','sale_rent'].includes(p.transaction_type || '')) errors.push('Informe a finalidade');
  if (p.transaction_type !== 'rent' && !positive(p.price)) errors.push('Informe o preço de venda');
  if (p.transaction_type !== 'sale' && !positive(p.rental_price)) errors.push('Informe o aluguel mensal');
  for (const field of ['bedrooms','bathrooms','suites','parking_spaces'] as const) {
    const value = p[field];
    if (value == null && (field === 'suites' || field === 'parking_spaces')) continue;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) errors.push(`Quantidade inválida: ${field}`);
  }
  if (p.property_type === 'Studio' && p.bedrooms < 1) errors.push('Studio exige ao menos um dormitório no VR-SYNC');
  if (p.suites != null && p.suites > p.bedrooms) errors.push('Suítes não podem exceder o número de dormitórios');
  if (p.features_comfort?.includes('Suíte') && !(p.suites && p.suites > 0)) errors.push('Informe a quantidade de suítes ou desmarque a característica Suíte');
  for (const field of ['condominium','yearly_tax'] as const) {
    const value = p[field];
    if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) errors.push(`Valor inválido: ${field}`);
  }
  if ((p.latitude == null) !== (p.longitude == null)) errors.push('Informe latitude e longitude juntas');
  if (p.latitude != null && (!Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90)) errors.push('Latitude inválida');
  if (p.longitude != null && (!Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180)) errors.push('Longitude inválida');
  if (!Array.isArray(p.images) || p.images.length < 5) errors.push('Adicione ao menos 5 fotos JPEG distintas para o feed');
  if (Array.isArray(p.images)) {
    const urls = new Set<string>();
    for (const path of p.images) {
      try {
        const url = publicImageUrl(path, storageUrl);
        if (urls.has(url)) errors.push('Remova fotos duplicadas da seleção do feed');
        urls.add(url);
        if (!/\.jpe?g$/i.test(new URL(url).pathname)) errors.push('Para o feed, use fotos JPEG (.jpg ou .jpeg)');
      } catch { errors.push('Foto com endereço inválido'); }
    }
  }
  return [...new Set(errors)];
}

function listingXml(p: FeedProperty, storageUrl: string): string {
  const problems = propertyErrors(p, storageUrl);
  if (problems.length) throw new Error(`Imóvel ${listingId(p)}: ${problems.join('; ')}`);
  const type = PROPERTY_TYPES[p.property_type];
  const features = feedFeatures(p).mapped;
  const description = feedDescription(p);
  const amount = (tag: string, value: number | null | undefined) => value == null ? '' : `<${tag} currency="BRL">${Math.trunc(value)}</${tag}>`;
  return `<Listing>
<ListingID>${escapeXml(listingId(p))}</ListingID>
<Title>${cdata(p.title)}</Title>
<TransactionType>${p.transaction_type === 'sale' ? 'For Sale' : p.transaction_type === 'rent' ? 'For Rent' : 'Sale/Rent'}</TransactionType>
<PublicationType>STANDARD</PublicationType>
<Media>${p.images.map((path, i) => `<Item medium="image" caption="Foto ${i + 1}"${i === 0 ? ' primary="true"' : ''}>${escapeXml(publicImageUrl(path, storageUrl))}</Item>`).join('')}</Media>
<Details>
<UsageType>${type.startsWith('Commercial') ? 'Commercial' : 'Residential'}</UsageType>
<PropertyType>${escapeXml(type)}</PropertyType>
<Description>${cdata(description)}</Description>
${p.transaction_type !== 'rent' ? amount('ListPrice', p.price) : ''}
${p.transaction_type !== 'sale' ? `<RentalPrice currency="BRL" period="Monthly">${Math.trunc(p.rental_price!)}</RentalPrice>` : ''}
<LotArea unit="square metres">${Math.trunc(p.area)}</LotArea>
<LivingArea unit="square metres">${Math.trunc(p.living_area!)}</LivingArea>
${amount('PropertyAdministrationFee', p.condominium)}
${amount('YearlyTax', p.yearly_tax)}
${features.length ? `<Features>${features.map(feature => `<Feature>${escapeXml(feature)}</Feature>`).join('')}</Features>` : ''}
<Bedrooms>${p.bedrooms}</Bedrooms><Bathrooms>${p.bathrooms}</Bathrooms>
${p.suites == null ? '' : `<Suites>${p.suites}</Suites>`}
${p.parking_spaces == null ? '' : `<Garage type="Parking Space">${p.parking_spaces}</Garage>`}
</Details>
<Location displayAddress="Street">
<Country abbreviation="BR">Brasil</Country>
<State abbreviation="${escapeXml(p.state)}">${cdata(STATES[p.state!])}</State>
<City>${cdata(p.city)}</City><Neighborhood>${cdata(p.neighborhood)}</Neighborhood>
<Address>${cdata(p.address)}</Address><StreetNumber>${cdata(p.street_number)}</StreetNumber>
${p.complement ? `<Complement>${cdata(p.complement)}</Complement>` : ''}
<PostalCode>${escapeXml(p.cep!.replace(/\D/g,''))}</PostalCode>
${p.latitude == null ? '' : `<Latitude>${p.latitude}</Latitude><Longitude>${p.longitude}</Longitude>`}
</Location>`;
}

export function validateFeedContact(contact: FeedContact): void {
  if (!contact.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || !/^\+[1-9]\d{9,14}$/.test(contact.phone)) {
    throw new Error('Configure nome, e-mail e telefone internacional do contato do feed');
  }
  if (contact.website) {
    try {
      const url = new URL(contact.website);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { throw new Error('O website deve ser uma URL HTTPS válida, sem credenciais'); }
  }
}
export function buildFeed(properties: FeedProperty[], contact: FeedContact, storageUrl: string, now = new Date()): string {
  validateFeedContact(contact);
  const contactXml = `<ContactInfo><Name>${cdata(contact.name)}</Name><Email>${escapeXml(contact.email)}</Email>${contact.website ? `<Website>${escapeXml(contact.website)}</Website>` : ''}<Telephone>${escapeXml(contact.phone)}</Telephone></ContactInfo>`;
  const ids = new Set<string>();
  const listings: string[] = [];
  let bytes = 0;
  for (const p of properties) {
    if (p.status !== 'active' || p.deleted_at || p.feed_enabled !== true) continue;
    const id = listingId(p);
    if (!id || ids.has(id)) throw new Error(`Código de anúncio vazio ou duplicado: ${id}`);
    ids.add(id);
    const xml = listingXml(p, storageUrl) + contactXml + '</Listing>';
    bytes += new TextEncoder().encode(xml).length;
    if (bytes > 20 * 1024 * 1024) throw new Error('Feed excede o limite operacional de 20 MiB');
    listings.push(xml);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">
<Header><Provider>${cdata(contact.name)}</Provider><Email>${escapeXml(contact.email)}</Email><ContactName>${cdata(contact.name)}</ContactName><PublishDate>${now.toISOString()}</PublishDate><Telephone>${escapeXml(contact.phone)}</Telephone></Header>
<Listings>${listings.join('\n')}</Listings></ListingDataFeed>`;
}

export const FEED_COLUMNS = 'id,code,title,description,property_type,price,area,bedrooms,bathrooms,images,status,deleted_at,feed_enabled,transaction_type,rental_price,condominium,yearly_tax,living_area,built_area,suites,parking_spaces,address,street_number,complement,city,neighborhood,state,cep,latitude,longitude,features_comfort,features_leisure,features_infrastructure,features_security,features_location,features_premium,custom_features';

// Cursor pagination continues even when PostgREST caps pages below the requested size.
export async function collectPages<T extends { id: string }>(fetchPage: (cursor?: string) => Promise<T[]>): Promise<T[]> {
  const result: T[] = [];
  let cursor: string | undefined;
  while (true) {
    const page = await fetchPage(cursor);
    if (!page.length) return result;
    const next = page[page.length - 1].id;
    if (!next || next === cursor) throw new Error('Paginação sem progresso');
    result.push(...page);
    if (result.length > 10000) throw new Error('Feed excede o limite operacional de 10.000 imóveis');
    cursor = next;
  }
}
