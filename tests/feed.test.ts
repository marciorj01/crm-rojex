import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { buildFeed, collectPages, propertyErrors, publicImageUrl, type FeedProperty } from '../supabase/functions/_shared/feed';

const property: FeedProperty = {
  id:'8c6dce99-278f-4ceb-806c-9f6a988a43ce', code:'ROJ-101', title:'Apartamento & jardim',
  description:'Texto <livre> com ]]> e emoji 🏠\u0001', property_type:'Apartamento',
  price:450000, rental_price:null, area:90, living_area:70, bedrooms:2, bathrooms:1,
  images:['properties/foto com espaço.jpg'], status:'active', feed_enabled:true,
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
  assert.match(xml,/<ListPrice currency="BRL">450000.00/);
  assert.match(xml,/<LivingArea unit="square metres">70.00/);
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
  assert.match(xml,/<RentalPrice currency="BRL" period="Monthly">2500.00/);
  assert.match(xml,/<PropertyAdministrationFee currency="BRL">0.00/);
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
