import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readLoginCredentials } from '../lib/login-request';

test('rota aceita email JSON, contrato antigo e formulário nativo, sem alterar a senha', async () => {
  for (const [contentType, body] of [
    ['application/json', JSON.stringify({ email:' teste@example.com ',password:' senha com espaços ' })],
    ['application/json', JSON.stringify({ username:'teste@example.com',password:' senha com espaços ' })],
    ['application/x-www-form-urlencoded', new URLSearchParams({email:'teste@example.com',password:' senha com espaços '}).toString()],
  ]) {
    const credentials = await readLoginCredentials(new Request('https://crm.example.com/api/auth/login', {
      method:'POST',headers:{'content-type':contentType},body,
    }));
    assert.deepEqual(credentials,{email:'teste@example.com',password:' senha com espaços '});
  }
  assert.equal(await readLoginCredentials(new Request('https://crm.example.com',{method:'POST',headers:{'content-type':'application/json'},body:'{"email":"invalido","password":"teste"}'})),null);
});

test('formulário React: clique, autofill, validação, erros e sucesso', async t => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {url:'https://crm.example.com/login'});
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const globals: Record<string, unknown> = {
    window:dom.window,document:dom.window.document,navigator:dom.window.navigator,
    HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT:true,
  };
  for (const [key,value] of Object.entries(globals)) {
    saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  const originalFetch = globalThis.fetch;
  // Import after installing the DOM so React uses the correct event environment.
  const { createElement, act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { LoginForm } = await import('../app/login/login-form');
  const root = createRoot(document.getElementById('root')!);
  let calls: { url:string; init?: RequestInit }[] = [];
  let navigations = 0;
  let respond: () => Promise<Response> = async () => Response.json({success:true});
  globalThis.fetch = async (url,init) => { calls.push({url:String(url),init}); return respond(); };
  let revision = 0;
  const mount = async () => {
    calls=[]; navigations=0;
    await act(async()=>root.render(createElement(LoginForm,{key:revision++,onAuthenticated:()=>{navigations++;}})));
  };
  const fill = (email='teste@example.com',password=' senha segura ') => {
    // Change values without change/input events, as browser autofill can do.
    (document.querySelector('[name="email"]') as HTMLInputElement).value=email;
    (document.querySelector('[name="password"]') as HTMLInputElement).value=password;
  };
  const click = async () => act(async () => { (document.querySelector('button[type="submit"]') as HTMLButtonElement).click(); });
  try {
    await t.test('clique envia as credenciais preenchidas e aciona navegação no sucesso',async()=>{
      await mount(); fill(); await click();
      assert.equal(calls.length,1);
      assert.equal(calls[0].url,'/api/auth/login');
      assert.equal(calls[0].init?.method,'POST');
      assert.deepEqual(JSON.parse(calls[0].init!.body as string),{email:'teste@example.com',password:' senha segura '});
      assert.equal(navigations,1);
    });
    await t.test('email inválido gera mensagem visível, em vez de bloqueio nativo silencioso',async()=>{
      await mount(); fill('invalido'); await click();
      assert.equal(calls.length,0);
      assert.match(document.querySelector('[role="alert"]')!.textContent!,/e-mail válido/);
    });
    await t.test('erro da API é exibido e permite tentar novamente',async()=>{
      respond=async()=>Response.json({error:'Credenciais recusadas'},{status:401});
      await mount(); fill(); await click();
      assert.equal(navigations,0);
      assert.match(document.querySelector('[role="alert"]')!.textContent!,/Credenciais recusadas/);
      assert.equal((document.querySelector('button') as HTMLButtonElement).disabled,false);
      respond=async()=>Response.json({success:true}); await click(); assert.equal(navigations,1);
    });
    await t.test('resposta não JSON, falha de rede e timeout têm mensagens',async()=>{
      for(const [response,message] of [
        [async()=>new Response('<html>Gateway error</html>',{status:502}),/resposta inesperada/],
        [async()=>{throw new TypeError('Failed to fetch');},/conectar/],
        [async()=>{throw new DOMException('timeout','TimeoutError');},/demorou/],
      ] as const) {
        respond=response; await mount(); fill(); await click();
        assert.match(document.querySelector('[role="alert"]')!.textContent!,message);
        assert.equal(navigations,0);
      }
    });
    await t.test('submit por teclado e cliques repetidos não duplicam requisições',async()=>{
      let finish!: (response:Response)=>void;
      respond=()=>new Promise(resolve=>{finish=resolve;});
      await mount(); fill();
      await act(async()=>{
        const form=document.querySelector('form')!;
        form.requestSubmit(); form.requestSubmit();
      });
      assert.equal(calls.length,1);
      await act(async()=>finish(Response.json({success:true})));
      assert.equal(navigations,1);
    });
    await t.test('HTML contém destino e nomes para envio mesmo sem handlers JavaScript',async()=>{
      await mount();
      assert.equal(document.querySelector('form')!.getAttribute('action'),'/api/auth/login');
      assert.equal(document.querySelector('form')!.method,'post');
      assert.ok(document.querySelector('input[name="email"]'));
      assert.ok(document.querySelector('input[name="password"]'));
    });
  } finally {
    await act(async()=>root.unmount()); globalThis.fetch=originalFetch;
    for(const [key,descriptor] of saved) {
      if(descriptor) Object.defineProperty(globalThis,key,descriptor);
      else Reflect.deleteProperty(globalThis,key);
    }
    dom.window.close();
  }
});
