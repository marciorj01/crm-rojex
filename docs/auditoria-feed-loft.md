# Auditoria do feed VR-SYNC — CRM ROJEX

> Retificação posterior: a comparação `living_area > built_area` foi removida como bloqueio,
> pois não é uma exigência VR-SYNC comprovada. As áreas continuam validadas individualmente,
> sem substituição de valores. O diagnóstico e os resultados abaixo registram a auditoria original;
> a descrição do CH001 foi posteriormente corrigida pelo usuário para 113 caracteres.

## Resultado e pendências do cadastro

A integração foi revisada antes das alterações. O endpoint inicialmente retornava HTTP 200 com
CH001, nove imagens e XML bem formado. A chave administrativa estava funcionando; não foi alterada.

Após aplicar as validações solicitadas, CH001 requer revisão manual:

| Campo | Valor observado | Resultado |
| --- | --- | --- |
| Status / seleção / exclusão | active / true / null | Elegível para seleção |
| Título | 48 caracteres | Válido |
| Descrição original | 17 caracteres | Bloqueada; mínimo de 50 |
| Área total | 3.000 m² | Mantida como LotArea |
| Área útil | 3.000 m² | Supera a construída informada |
| Área construída | 260 m² | Exige conferência manual das medidas |
| Fotos | 9 JPEGs públicas | HEAD 200; entre 405.327 e 942.161 bytes |

A descrição anterior no XML tinha 242 caracteres porque incluía características. Isso mascarava
a descrição original insuficiente. Não foi inventado texto nem alterado qualquer campo do imóvel.
O teste CH001 válido usa uma fixture sintética, não uma atualização do registro real.

**Estado final local:** os quatro endpoints retornam XML de erro com HTTP 503 enquanto esses dois
problemas existirem. A política já existente de não entregar carga parcial foi preservada.
Uma falha em imóvel selecionado interrompe a carga inteira; não remove silenciosamente o anúncio.
Para obter 200 novamente, corrigir os dados reais manualmente e repetir a verificação HTTP.

## Caminho auditado

- `app/api/feed/route.ts`: consulta administrativa, paginação por UUID, filtros, validação e resposta XML.
- `next.config.js`: `/feed.xml`, `/portais/feeds/arquivo.xml` e `/portais/feeds/imoveis.xml` são rewrites para `/api/feed`.
- `lib/supabase/admin.ts`: cliente servidor com `SUPABASE_SERVICE_ROLE_KEY`; sem sessão de usuário e sem alteração nesta auditoria.
- `supabase/functions/_shared/feed.ts`: seleção explícita de colunas, regras e serialização compartilhadas.
- `supabase/functions/loft-xml-feed/index.ts`: alternativa Deno, com as mesmas regras e verificações de fotos.
- `components/properties/property-form.tsx`: validação antes de salvar e chamada da pré-validação autenticada.
- Migração existente: código obrigatório/único e políticas de acesso. Nenhuma migração foi executada no Supabase.

## Problemas e correções

1. Títulos e descrições sem limites: agora 10–100 e 50–3000 caracteres, respectivamente.
   O texto final, incluindo características sem mapeamento, também não pode superar 3000.
2. Uma única foto era suficiente: agora são exigidas cinco JPEGs distintas; duplicadas bloqueiam o envio.
3. Fotos não eram verificadas: checagem anônima de disponibilidade, MIME, tamanho até 7.000.000 bytes
   e assinatura inicial JPEG. Ordem do array preservada; apenas a primeira recebe `primary="true"`.
4. Características eram todas texto: correspondências inequívocas usam `Features/Feature`;
   rótulos compostos ou sem equivalência segura permanecem na descrição. Não são inventados enums.
5. Validação só ocorria para imóvel já ativo: agora qualquer tentativa de salvar `feed_enabled=true`
   passa pelas regras e pela pré-validação, mesmo em rascunho.
6. Contato, código duplicado e acessibilidade das fotos não eram conferidos antes de salvar:
   `/api/feed/validate` valida esses itens com sessão e proteção de origem, sem gravar dados.
   O gerador valida novamente: contornar o formulário não permite publicar um anúncio inválido.
7. Valores fracionários eram emitidos: dinheiro e áreas agora descartam frações apenas na exportação.
   Preços e áreas obrigatórios precisam resultar em inteiro positivo. O banco preserva os originais.
8. Incluída conferência entre área útil e construída, quando esta for informada, e entre suítes/dormitórios.
   A característica Suíte exige quantidade positiva. Não se aplica área construída <= terreno:
   construções com vários pavimentos podem exceder a área do lote.

## Estrutura, localização e contato

Mantidos `ListingDataFeed`, namespace VivaReal, `Header` completo, `Listings/Listing`, identificador,
título, finalidade, publicação STANDARD, mídia, detalhes, localização e contato por anúncio.
Sem namespace inventado para Loft. A identificação usa código, com UUID como fallback legado,
limite de 50 caracteres e detecção de duplicatas na carga. O banco já protege códigos únicos.

O CRM é limitado ao Brasil: país BR/Brasil e validação de UF, cidade, bairro, logradouro, número e CEP.
Coordenadas opcionais precisam vir juntas e dentro dos limites; nenhuma é criada automaticamente.
Área total permanece em `LotArea`; útil em `LivingArea`. A construída é usada para conferência,
mas não é exportada numa tag inventada nem usada como substituta da útil.

Venda usa `ListPrice`; aluguel usa `RentalPrice` mensal; ambas usam BRL quando aplicáveis.
Condomínio permanece em `PropertyAdministrationFee`. IPTU permanece em `YearlyTax`, com semântica
anual do cadastro; valores opcionais ausentes não viram zero. A migração ao elemento mais recente
`Iptu` depende da confirmação do contrato da Loft, evitando trocar um campo legado sem homologação.

`FEED_CONTACT_NAME`, `FEED_CONTACT_EMAIL`, `FEED_CONTACT_PHONE` e website opcional HTTPS são
validados no servidor. URLs de website com credenciais são recusadas. Nenhum secret vai ao XML.
CDATA, terminador `]]>`, escaping, UTF-8 e remoção de controles XML continuam cobertos por testes.

## Tipos do formulário e mapeamento

O formulário deriva sua lista de `PROPERTY_TYPES`; tipos desconhecidos são bloqueados.

| CRM | PropertyType |
| --- | --- |
| Apartamento | Residential / Apartment |
| Casa | Residential / Home |
| Sobrado | Residential / Sobrado |
| Casa em Condomínio | Residential / Condo |
| Cobertura | Residential / Penthouse |
| Terreno | Residential / Land Lot |
| Sala Comercial | Commercial / Office |
| Galpão | Commercial / Industrial |
| Studio | Residential / Studio |
| Flat | Residential / Flat |
| Chácara | Residential / Farm Ranch |
| Sítio | Residential / Agricultural |
| Kitnet | Residential / Kitnet |
| Loft | Residential / Loft |

As 23 traduções de características estão explicitadas em `FEATURE_TYPES`, no serializador.
Valores como “Quadra de tênis / Beach Tennis” não são interpretados como uma modalidade específica.
Rótulos de piscinas também preservam sua descrição original, sem inferir atributos adicionais.

## Segurança e limites operacionais

As consultas continuam exigindo simultaneamente status ativo, seleção para feed e exclusão nula.
Nenhuma política RLS foi aberta. O endpoint de leitura do XML continua público; a pré-validação exige login.
Fotos são consultadas exclusivamente no bucket público `property_images` do projeto configurado,
sem cookies/chaves, sem redirects e sem parâmetros de acesso temporário. URLs externas ficam
bloqueadas para publicação: isso evita transformar o servidor em um cliente de URLs arbitrárias.
Não houve conversão, upload, exclusão ou alteração de fotos nesta auditoria.

A checagem de mídia limita concorrência a quatro requisições e reaproveita o prazo de 25 segundos.
Uma indisponibilidade temporária de imagem impede a carga; catálogos grandes precisam de medição
de desempenho antes de homologar. Essa checagem valida metadados e assinatura, não a qualidade visual
ou a decodificação completa da foto. Cache do feed pode durar cinco minutos conforme configuração existente.

Os logs seguros da etapa anterior foram preservados e incluem a etapa `images`. Erros públicos
continuam genéricos, com request ID e sem debug. Um 503 nunca é apresentado como feed vazio bem-sucedido.

## Verificações executadas

- Suíte: 29 testes aprovados, incluindo elegibilidade, limites, preço zero, tipos desconhecidos,
  imagens, duplicatas, primary, CDATA, características, áreas, contato e proteção dos logs.
- Testes HTTP: 2 aprovados. Quatro URLs entregam XML diretamente, sem redirects, com 503 seguro
  devido ao cadastro; pré-validação anônima retorna 401 e origem externa retorna 403.
- Lint aprovado.
- Build de produção aprovado; inclui `/api/feed/validate`.
- Nove fotos reais verificadas por HEAD anônimo, sem imprimir URLs ou credenciais.
- Nenhum login foi simulado com credenciais reais nem foi feita gravação remota.
- Edge Function não foi implantada ou executada no runtime Deno; seus módulos compartilhados foram testados.

## Arquivos desta auditoria

Alterados: `app/api/feed/route.ts`, `components/properties/property-form.tsx`,
`supabase/functions/_shared/feed.ts`, `supabase/functions/loft-xml-feed/index.ts`,
`tests/feed.test.ts`, `package.json` e `README.md`.

Criados: `app/api/feed/validate/route.ts`, `lib/feed-contact.ts`,
`supabase/functions/_shared/feed-media.ts`, `tests/feed-media.test.ts`,
`tests/feed-http.integration.ts` e este relatório.

`feed-diagnostics.ts` e seu teste já estavam no workspace desde a tarefa anterior e continuam necessários.

## Homologação ainda pendente

O XSD remoto não pôde ser obtido (HTTPS indisponível e HTTP 403); **não houve validação XSD**.
XML bem formado e testes locais não substituem a importação real. Devem ser confirmados com a Loft:
suporte aos tipos/finalidades usados, enums de características, campo de IPTU legado/novo,
requisitos adicionais de fotos e aceitação da carga no contrato específico da imobiliária.

Fontes oficiais consultadas:

- [Loft — integração XML](https://loft.com.br/para-imobiliarias/site-loft/)
- [VR-SYNC — cabeçalho](https://developers.grupozap.com/feeds/vrsync/elements/header.html)
- [VR-SYNC — anúncio, localização e fotos](https://developers.grupozap.com/feeds/vrsync/elements/listing.html)
- [VR-SYNC — detalhes e enumerações](https://developers.grupozap.com/feeds/vrsync/elements/details.html)

**Não houve commit, push, publicação na Vercel, configuração da Loft, alteração de credenciais,
usuário, senha, esquema, CH001 ou arquivos do Storage.**
