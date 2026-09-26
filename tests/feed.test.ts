import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { buildFeed, collectPages, propertyErrors, publicImageUrl, PROPERTY_TYPES, FEATURE_TYPES, validateFeedContact, type FeedProperty } from '../supabase/functions/_shared/feed';

const property: FeedProperty = {
  id:'8c6dce99-278f-4ceb-806c-9f6a988a43ce', code:'ROJ-101', title:'Apartamento & jardim',
  description:'Texto <livre> com ]]> e emoji 🏠\u0001. Apartamento amplo com jardim e excelente iluminação natural.', property_type:'Apartamento',
  price:450000, rental_price:null, area:90, living_area:70, bedrooms:2, bathrooms:1,
  images:['properties/foto com espaço.jpg', ...Array.from({length:4},(_,i)=>`properties/foto-${i}.jpeg`)], status:'active', feed_enabled:true,
  transaction_type:'sale', address:'Rua das Flores', street_number:'10', city:'Curitiba',
  neighborhood:'Centro', state:'PR', cep:'80000-000', suites:0, parking_spaces:1,
};
const contact = { name:'Imobiliária & Cia', email:'contato@example.com', phone:'+5541999999999' };
const render = (rows: FeedProperty[]) => buildFeed(rows,contact,'https://storage.example.com',new Date('2026-09-25T12:00:00Z'));

test('XML preserva texto, separa CDATA terminador e remove controles inválidos', () => {
  const xml = render([property]);
  assert.equal(XMLValidator.validate(xml), true);
  const data = new XMLParser({ ignoreAttributes:false }).parse(xml);
  assert.equal(data.ListingDataFeed['@_xmlns'],'http://www.vivareal.com/schemas/1.0/VRSync');
  assert.equal(data.ListingDataFeed.Listings.Listing.Title,property.title);
  assert.equal(data.ListingDataFeed.Listings.Listing.Details.Description,property.description.replace('\u0001',''));
  assert.match(xml,/foto%20com%20espa%C3%A7o.jpg/);
  assert.match(xml,/<ListPrice currency="BRL">450000/);
  assert.match(xml,/<LivingArea unit="square metres">70/);
});
test('inativos, excluídos e não selecionados nunca entram no feed', () => {
  const xml = render([{...property,status:'sold'},{...property,deleted_at:new Date().toISOString()},{...property,feed_enabled:false}]);
  assert.doesNotMatch(xml,/<Listing>/);
  assert.equal(XMLValidator.validate(xml),true);
});
test('não substitui dados ausentes e falha antes de devolver carga parcial', () => {
  assert.throws(() => render([property,{...property,code:'ROJ-102',living_area:null}]),/área útil/);
  assert.throws(() => render([property,{...property,id:'outro'}]),/duplicado/);
  assert.throws(() => render([{...property,property_type:'Comercial'}]),/tipo/);
  assert.ok(propertyErrors({...property,latitude:12,longitude:null}).length);
  assert.throws(() => render([{...property,price:NaN}]),/preço/);
});
test('locação e valores zero opcionais são representados sem preço de venda inventado', () => {
  const xml=render([{...property,transaction_type:'rent',price:0,rental_price:2500,condominium:0,yearly_tax:1200}]);
  assert.doesNotMatch(xml,/<ListPrice/);
  assert.match(xml,/<RentalPrice currency="BRL" period="Monthly">2500/);
  assert.match(xml,/<PropertyAdministrationFee currency="BRL">0/);
  assert.match(xml,/<Suites>0<\/Suites>/);
});
test('rejeita protocolos de imagens perigosos e traversal em paths', () => {
  for (const path of ['javascript:alert(1)','../private.png','https://user:pass@example.com/a']) {
    assert.throws(() => publicImageUrl(path,'https://storage.example.com'));
  }
});
test('paginação continua com páginas menores que o limite e propaga falhas', async () => {
  const cursors: (string | undefined)[]=[];
  const rows=await collectPages(async cursor => {
    cursors.push(cursor);
    return cursor === undefined ? [{id:'a'}] : cursor === 'a' ? [{id:'b'}] : [];
  });
  assert.deepEqual(rows,[{id:'a'},{id:'b'}]);
  assert.deepEqual(cursors,[undefined,'a','b']);
  await assert.rejects(collectPages(async () => [{id:'a'}]),/progresso/);
  await assert.rejects(collectPages(async cursor => { if(cursor) throw Error('banco offline'); return [{id:'a'}]; }),/offline/);
});

test('limites de publicação bloqueiam dados incompletos sem corrigir o imóvel', () => {
  for (const patch of [
    { images: property.images.slice(0,4) }, { images: Array(5).fill(property.images[0]) },
    { images: [...property.images.slice(0,4), 'properties/image.png'] },
    { title: 'Curto' }, { title: 'a'.repeat(101) },
    { description: 'Curta' }, { description: 'a'.repeat(3001) },
    { description: 'a'.repeat(2990), custom_features: ['Característica personalizada longa'] },
    { price: 0 }, { price: 0.5 }, { property_type: 'Tipo inventado' }, { property_type: 'constructor' },
    { code: '', id: '' }, { code: 'x'.repeat(51) }, { living_area: 0 },
    { suites: 3, bedrooms: 2 },
    { suites: 0, features_comfort: ['Suíte'] },
  ]) assert.throws(() => render([{ ...property, ...patch }]));
  assert.doesNotThrow(() => render([{ ...property, title:'a'.repeat(10), description:'a'.repeat(50) }]));
  assert.doesNotThrow(() => render([{ ...property, title:'a'.repeat(100), description:'a'.repeat(3000) }]));
});

test('CH001 sintético válido gera Listing; não modifica o cadastro real', () => {
  const xml = render([{ ...property, code:'CH001', property_type:'Chácara' }]);
  assert.match(xml, /<ListingID>CH001<\/ListingID>/);
  assert.match(xml, /Residential \/ Farm Ranch/);
  const listing = new XMLParser({ ignoreAttributes:false }).parse(xml).ListingDataFeed.Listings.Listing;
  assert.equal(listing.Media.Item.length, 5);
  assert.equal(listing.Media.Item.filter((item: Record<string, unknown>) => item['@_primary'] === 'true').length, 1);
  assert.equal(listing.Media.Item[0]['@_primary'], 'true');
  assert.match(listing.Media.Item[1]['#text'], /foto-0.jpeg$/);
  assert.ok(listing.ContactInfo.Name);
  assert.ok(listing.Location.Country);
});

test('Features usa apenas enums mapeados e mantém texto ambíguo na descrição', () => {
  const xml = render([{ ...property, features_comfort:['Ar-condicionado'],
    features_leisure:['Churrasqueira','Churrasqueira'], custom_features:['Vista especial'] }]);
  assert.match(xml, /<Feature>Cooling<\/Feature>/);
  assert.equal((xml.match(/<Feature>BBQ<\/Feature>/g) || []).length, 1);
  assert.match(xml, /Características: Vista especial/);
  assert.doesNotMatch(xml, /<Feature>Vista especial/);
  assert.equal(PROPERTY_TYPES['Chácara'], 'Residential / Farm Ranch');
  assert.equal(FEATURE_TYPES['Churrasqueira'], 'BBQ');
});

test('valores inteiros VR-SYNC não misturam áreas nem inventam coordenadas', () => {
  const xml = render([{ ...property, price:450000.99, area:90.8, living_area:70.9, built_area:80 }]);
  assert.match(xml, /<ListPrice currency="BRL">450000<\/ListPrice>/);
  assert.match(xml, /<LotArea unit="square metres">90<\/LotArea>/);
  assert.match(xml, /<LivingArea unit="square metres">70<\/LivingArea>/);
  assert.doesNotMatch(xml, /<Latitude>|<Longitude>|<BuiltArea>/);
});

test('área útil maior que construída não bloqueia nem substitui as áreas exportadas', () => {
  const input = { ...property, code:'CH001', property_type:'Chácara', area:3000, living_area:3000, built_area:260 };
  const original = structuredClone(input);
  const xml = render([input]);
  assert.match(xml, /<ListingID>CH001<\/ListingID>/);
  assert.match(xml, /<LotArea unit="square metres">3000<\/LotArea>/);
  assert.match(xml, /<LivingArea unit="square metres">3000<\/LivingArea>/);
  assert.doesNotMatch(xml, /<BuiltArea>/);
  assert.deepEqual(input, original);
  for (const field of ['area', 'living_area'] as const) {
    for (const value of [0, -1, NaN, Infinity]) {
      assert.throws(() => render([{ ...input, [field]:value }]));
    }
  }
});

test('contato exige campos públicos válidos e website sem credenciais', () => {
  assert.throws(() => validateFeedContact({ ...contact, email:'' }));
  assert.throws(() => validateFeedContact({ ...contact, phone:'11999999999' }));
  assert.throws(() => validateFeedContact({ ...contact, website:'https://invalid url' }));
  assert.throws(() => validateFeedContact({ ...contact, website:'https://user:pass@example.com' }));
});
