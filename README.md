# CRM ROJEX — recuperação e operação

Next.js 16, React 19, TypeScript e Supabase Auth/PostgreSQL/Storage. Use Node.js 24 LTS e npm.
Preparado para um **novo projeto Supabase**. Nenhum cadastro ou fotografia do projeto apagado é restaurado automaticamente.

## 1. Preservar e reconstruir o banco

Preserve uma cópia do workspace e procure backups de dados e fotos antes de configurar serviços.
A migração inicial é para banco novo: não execute sobre um banco legado com dados.

1. Crie um projeto Supabase na sua conta e aguarde o provisionamento.
2. Execute **uma vez** o arquivo supabase/schema.sql no SQL Editor. Alternativamente aplique
   supabase/migrations/20260925000100_initial_secure_crm.sql pela CLI. São o mesmo SQL: escolha um método.
3. Em Authentication, desative cadastro público e configure senha mínima de 12 caracteres.
   O config.toml configura o ambiente local e não muda automaticamente o painel remoto.
4. Crie seu usuário em Authentication → Users, com e-mail confirmado e senha própria.
5. Copie o UUID do usuário e execute o SQL abaixo, substituindo os exemplos:

~~~sql
insert into public.app_users (id, full_name, email, phone)
values ('UUID_DO_USUARIO_AUTH', 'Seu nome', 'contato@seu-dominio.com.br', '+55DDDNUMERO');
~~~

Não existe usuário/senha padrão. Somente contas com perfil app_users acessam o CRM.
Não crie uma trigger que conceda perfil administrativo a todo cadastro.
O e-mail de acesso é gerenciado no Supabase Auth; o e-mail do perfil é um contato comercial.

O SQL cria o bucket público property_images. A leitura de fotos é pública; gravações exigem
administrador. Tabelas do CRM não têm acesso anônimo. A chave administrativa é usada apenas
no servidor, pelo feed e pelo webhook autorizado. Usuários do CRM compartilham uma carteira;
o projeto não implementa separação entre várias imobiliárias.

## 2. Configurar e executar localmente

Edite .env.local usando os nomes de .env.local.example. Não sobrescreva um arquivo existente sem conferir.
Não reutilize os segredos padrão do código antigo e nunca envie .env.local ao GitHub.

| Variável | Uso |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | URL base do novo projeto, sem /rest/v1 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Chave pública anônima sujeita às permissões do banco |
| SUPABASE_SERVICE_ROLE_KEY | Chave administrativa, exclusivamente no servidor |
| LEAD_WEBHOOK_SECRET | Token aleatório de pelo menos 32 caracteres; necessário ao webhook |
| FEED_CONTACT_NAME | Nome comercial público do feed |
| FEED_CONTACT_EMAIL | E-mail público do feed |
| FEED_CONTACT_PHONE | Telefone internacional: +55, DDD e número |
| FEED_CONTACT_WEBSITE | Website HTTPS público; opcional |

O contato do feed é definido nessas variáveis. Alterar o perfil pessoal não muda o contato público do feed.
Reinicie o servidor após alterar variáveis. No PowerShell do VS Code:

~~~powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run dev
~~~

Usamos npm.cmd para evitar o bloqueio de npm.ps1 pelo PowerShell.
Abra http://localhost:3000/login e entre com o e-mail e a senha criados no Supabase Auth.

## 3. Verificação funcional

- Sem login, confirme o bloqueio do painel e das APIs administrativas.
- Entre, cadastre um rascunho, envie fotos, salve e confira a persistência.
- Teste edição, lixeira, restauração e exclusão definitiva. Exclusão definitiva só aceita itens da lixeira.
- Atualize seu perfil. Para trocar a senha, informe a atual e uma nova senha com ao menos 12 caracteres.
- Confirme logout e bloqueio de uma conta Auth que não tenha perfil administrativo.

Os testes automatizados executam a migração original em PostgreSQL em memória (PGlite), com
schemas mínimos representando Auth e Storage. Verificam RLS, permissões, integridade, XML e contatos.
Não substituem o teste integrado de Auth/Storage no novo Supabase remoto.

## 4. Feed VR-SYNC e Loft

Endpoint principal existente: /api/feed. Aliases preservados: /feed.xml,
/portais/feeds/arquivo.xml e /portais/feeds/imoveis.xml. Escolha uma URL canônica HTTPS após o deploy.
Não é necessário criar uma rota nova.

O imóvel só entra na carga quando estiver ativo, sem exclusão lógica e com **Incluir no feed** marcado.
Novos imóveis começam como rascunho e fora do feed. Preencha dados reais, incluindo finalidade,
preços aplicáveis, área útil e total, localização e fotos. Aluguel e condomínio são mensais; IPTU é anual.
Para habilitar o feed, o formulário valida título (10–100 caracteres), descrição (50–3000, incluindo
características adicionais), código e ao menos cinco fotos JPEG distintas de até 7 MB.
Uma pré-validação autenticada em `/api/feed/validate` verifica contato do servidor, código duplicado
e fotos públicas antes do salvamento. O gerador repete as verificações ao servir o XML.
Fotos do feed devem estar no bucket público `property_images` deste projeto; URLs de terceiros
não são consultadas pelo servidor. As fotos existentes não são convertidas nem apagadas.
As áreas exportadas são validadas individualmente; área construída não substitui a útil.
Suítes e vagas podem ficar em branco quando desconhecidos. O código é único e estável na edição pela interface.

O serializador usa namespace, nomes e valores documentados para VR-SYNC. Características livres
sem correspondência segura entram na descrição; as mapeadas usam `Features/Feature`.
Valores monetários e áreas são enviados como inteiros, descartando frações apenas no XML.
CDATA trata inclusive o terminador ]]>.
Há paginação por UUID, prazo total de consulta de 25 segundos, limite operacional de 10.000 imóveis
e aproximadamente 20 MiB de conteúdo de anúncios. Cache compartilhado: cinco minutos.
Uma seleção inválida retorna 503 com identificador para consulta aos logs, sem carga parcial.
Uma carga vazia válida retorna 200: confirme a seleção antes de enviar, pois o portal pode remover anúncios.
Com o servidor local em execução, `npm.cmd run test:feed-http` confere os aliases e a proteção
da pré-validação. Um teste HTTP aprovado com status 503 confirma erro seguro, não prontidão para publicar.

**Homologação Loft pendente.** Os testes verificam XML bem formado e regras da aplicação.
O XSD remoto não pôde ser obtido durante a implementação: não foi realizada validação XSD.
Confirme o contrato/XSD atual da Loft e valide cada tipo/finalidade antes da carga real.
As regras de completude do formulário são controles locais de qualidade, não uma afirmação de
que todos esses campos sejam obrigatórios em todos os contratos da Loft.

Fontes:
- https://loft.com.br/para-imobiliarias/site-loft/
- https://developers.grupozap.com/feeds/vrsync/elements/header.html
- https://developers.grupozap.com/feeds/vrsync/elements/listing.html
- https://developers.grupozap.com/feeds/vrsync/elements/details.html

## 5. Edge Function opcional

O CRM usa o endpoint Next.js. loft-xml-feed é uma alternativa que compartilha o serializador
em supabase/functions/_shared/feed.ts. Não é necessário implantar ambos.
Usa Deno.serve, import fixado e chave administrativa somente no servidor porque a tabela é privada.
Não abra SELECT anônimo nas tabelas para servir o feed.
O runtime fornece SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Configure FEED_CONTACT_* nos secrets da função.
A execução no runtime Deno/Supabase ainda precisa ser verificada; os testes locais cobrem o módulo compartilhado.

Com Supabase CLI e Docker, para um ambiente local isolado:

~~~powershell
npx.cmd supabase start
npx.cmd supabase migration up --local
npx.cmd supabase functions serve loft-xml-feed --no-verify-jwt
~~~

Crie supabase/functions/.env, ignorado pelo Git, com FEED_CONTACT_* para esse teste.
Não copie variáveis SUPABASE_* de produção para esse arquivo; o runtime local fornece as próprias.
Para deploy opcional, depois de conferir o destino e configurar os secrets no painel:

~~~powershell
npx.cmd supabase login
npx.cmd supabase functions deploy loft-xml-feed --project-ref SEU_PROJECT_REF --no-verify-jwt
~~~

## 6. Webhook de leads

POST /api/leads exige Authorization: Bearer SEU_TOKEN. Sem configuração retorna 503;
com token inválido, 401. Limite do corpo: 64 KiB. Formato básico:

~~~json
{
  "lead_id": "identificador-unico-do-portal",
  "listing_id": "CODIGO_DO_IMOVEL",
  "name": "Nome do interessado",
  "email": "interessado@example.com",
  "phone": "+5541999999999",
  "message": "Gostaria de conhecer o imóvel."
}
~~~

É necessário e-mail ou telefone válido. O código do anúncio é resolvido para o UUID do imóvel.
Código desconhecido retorna 422, sem perder silenciosamente o vínculo. Com lead_id, reenvios
não duplicam registros. Sem identificador externo, não há deduplicação garantida.
Confirme payload e autenticação com a Loft antes de configurar o webhook real.

## 7. Imagens e dados históricos

Recriar o bucket não recupera fotos. Restaure backups ou reenvie imagens. URLs completas antigas
precisam ser corrigidas: o feed não as reescreve automaticamente. Confira as fotos em janela anônima.
Remover uma foto do cadastro ou excluir um imóvel não apaga automaticamente os objetos do bucket.
Limpeza de órfãos requer conferência para evitar apagar imagens compartilhadas.

## 8. Nova Vercel

Após testes locais, crie um projeto Vercel vinculado ao repositório atualizado. Escolha Next.js,
raiz do repositório, Node 24, build npm run build e saída padrão. Configure as variáveis
em Preview/Production conforme o ambiente. supabase/functions/_shared deve acompanhar o deploy.
Teste login, bloqueios, upload, CRUD, XML e webhook no endereço publicado. Só então envie a URL
HTTPS escolhida à Loft e acompanhe a importação. Domínio, credenciais e serviços não são criados pelo código.

## 9. GitHub: atualização manual

Nenhum commit ou push é realizado automaticamente. No terminal do projeto:

~~~powershell
git status
git diff --stat
git branch --show-current
~~~

Na primeira atualização, remova do índice os artefatos antigos (mantém os arquivos locais):

~~~powershell
git rm --cached --ignore-unmatch tsconfig.tsbuildinfo supabase/.temp/cli-latest supabase/.temp/linked-project.json
~~~

Depois:

~~~powershell
git add .
git diff --cached --stat
git diff --cached --name-only
git commit -m "Corrige seguranca do CRM e prepara recuperacao e feed VR-SYNC"
git push origin HEAD
~~~

Confira que .env.local não está entre os arquivos preparados. Se houver divergência remota,
não use --force: compare as alterações e resolva antes de reenviar.
