import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { normalizeLead } from '../lib/leads';
import { checkOrigin, readJson, BodyTooLarge } from '../lib/http';

test('webhook rejeita contatos vazios e conserva identificador para resolver anúncio', () => {
  assert.throws(()=>normalizeLead({}));
  assert.throws(()=>normalizeLead({email:'não-é-email'}));
  assert.throws(()=>normalizeLead({phone:123}));
  const lead=normalizeLead({contact:{name:'Maria',email:'maria@example.com'},listing_id:'ROJ-101',lead_id:'lead-1'});
  assert.equal(lead.listing,'ROJ-101'); assert.equal(lead.external_id,'lead-1');
});
test('rotas de sessão bloqueiam CSRF e corpos excedentes mesmo sem Content-Length', async () => {
  assert.equal(checkOrigin(new Request('https://crm.example.com/api/trash',{headers:{origin:'https://evil.example.com'}}))?.status,403);
  assert.equal(checkOrigin(new Request('https://crm.example.com/api/trash',{headers:{origin:'https://crm.example.com'}})),null);
  await assert.rejects(readJson(new Request('https://crm.example.com',{method:'POST',body:'a'.repeat(100)}),50),BodyTooLarge);
  assert.deepEqual(await readJson(new Request('https://crm.example.com',{method:'POST',body:'{"ok":true}'})),{ok:true});
});

test('migração PostgreSQL: RLS, perfis, storage e integridade', async () => {
  const db = new PGlite({ extensions:{pgcrypto} });
  try {
    // Minimal Supabase-owned schemas. The application migration below is unchanged.
    await db.exec(`
      CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public,storage TO anon,authenticated,service_role;
      GRANT ALL ON storage.objects TO anon,authenticated,service_role;
    `);
    await db.exec(await readFile('supabase/migrations/20260925000100_initial_secure_crm.sql','utf8'));
    const admin='11111111-1111-4111-8111-111111111111';
    const outsider='22222222-2222-4222-8222-222222222222';
    await db.exec(`INSERT INTO auth.users VALUES ('${admin}'),('${outsider}');
      INSERT INTO public.app_users(id,full_name,email) VALUES ('${admin}','Administrador','admin@example.com');
      INSERT INTO public.properties(title) VALUES ('Privado');`);
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT * FROM public.app_users'));
    await assert.rejects(db.query('SELECT * FROM public.properties'));
    await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('property_images','unauthorized.jpg')"));
    await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub = '${outsider}'`);
    assert.equal((await db.query('SELECT * FROM public.properties')).rows.length,0);
    await assert.rejects(db.query("INSERT INTO public.properties(title) VALUES ('Invasão')"));
    await assert.rejects(db.query(`INSERT INTO public.app_users(id,full_name,email) VALUES ('${outsider}','Invasor','x@example.com')`));
    await db.exec(`SET request.jwt.claim.sub = '${admin}'`);
    assert.equal((await db.query('SELECT * FROM public.properties')).rows.length,1);
    await db.query("INSERT INTO public.properties(code,title,price) VALUES ('ROJ-1','Casa',100)");
    await assert.rejects(db.query("INSERT INTO public.properties(code,title) VALUES ('ROJ-1','Duplicado')"));
    await assert.rejects(db.query("UPDATE public.properties SET price=-1"));
    await assert.rejects(db.query("UPDATE public.app_users SET role='admin'"));
    await db.query("UPDATE public.app_users SET full_name='Novo nome'");
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('property_images','allowed.jpg')");
    await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('other','denied.jpg')"));
    await db.exec('RESET ROLE; SET ROLE service_role');
    await db.query("INSERT INTO public.leads(name,email,source,external_id) VALUES ('Maria','maria@example.com','Loft','1')");
    await assert.rejects(db.query("INSERT INTO public.leads(name,email,source,external_id) VALUES ('Maria','maria@example.com','Loft','1')"));
    await db.exec('RESET ROLE; SET ROLE anon');
    assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='property_images'")).rows.length,1);
  } finally { await db.close(); }
});
