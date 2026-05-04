## Objetivo

Substituir a seção atual de **"Combinação de fontes"** do wizard "Criar com IA" do Studio (`CarouselAIWizard`, Passo 2) por uma experiência conectada ao Google Fonts API, mantendo todo o resto da plataforma intocado.

## Onde fica hoje

A seção alvo está em `src/components/studio/CarouselAIWizard.tsx`, dentro do **Passo 2 ("Personalizar")**, no bloco "Combinação de fontes" — atualmente lista hard-coded (`FONT_PAIRS`) + opção da fonte do DNA. Tudo será reestruturado **apenas nessa seção** (sem mexer no editor `dashboard.studio.carrossel.tsx`, no `brand-font.ts`, na paleta, no Passo 1, no fluxo de geração nem no salvamento da seleção em `bootstrap.fontPair`).

## Mudanças

### 1. Bloco 1 — Fonte do DNA da marca (sempre primeira opção, se existir)

Buscar do `client_briefings` o `brand_font` e `brand_font_url` (hoje só lê `brand_font`). Renderizar como primeiro card, com badge **"Sua fonte"**:
- Se houver `brand_font_url` (.ttf/.otf): carregar via `loadCustomFont(brandFont, brandFontUrl)` (já existe em `src/lib/brand-font.ts`).
- Se houver só `brand_font`: carregar via `loadGoogleFont(brandFont)` (Google Fonts via `<link>`, já existente).
- Se não houver DNA de fonte: omitir o bloco.

### 2. Bloco 2 — Sugestões inteligentes (5 combinações)

Substituir o array estático `FONT_PAIRS` por uma função que monta 5 combinações `{ heading, body }` a partir do **catálogo do Google Fonts** filtrado pelo perfil do cliente:

- Ler do `client_briefings`: `archetype`, `tone_of_voice`, `target_audience`, `content_pillars`, `business_description` (este último para inferir segmento por palavras-chave simples).
- Mapeamento determinístico → categorias preferidas do Google Fonts:
  - arquétipos sofisticados (`governante`, `sabio`, `amante`) → `serif` + `sans-serif`
  - arquétipos populares/cuidador (`cara-comum`, `cuidador`, `inocente`, `bobo`) → `sans-serif` arredondado
  - heroico/fora-da-lei → `display` bold + `sans-serif`
  - criador/mago → `display` + `serif` editorial
  - explorador → `sans-serif` geométrico + `serif`
- Buscar o catálogo via `GET https://www.googleapis.com/webfonts/v1/webfonts?key=GOOGLE_FONTS_API_KEY&sort=popularity` (uma vez por sessão, cache em memória).
- A partir do resultado, escolher fontes populares dentro das categorias mapeadas e gerar 5 pares (título + corpo). Cada par recebe badge **"Sugerido para {nome do cliente}"** (nome vem de `clients.name` via novo fetch — ou prop opcional, ver "Detalhes técnicos").

Cada card mostra preview real "Aa Título / Texto do corpo" com as fontes carregadas (preload via `loadGoogleFont` para todas as 5 sugestões assim que chegarem da API).

### 3. Bloco 3 — Explorar mais fontes

Botão "Explorar mais fontes" abre uma área expansível dentro do mesmo modal:
- `Input` de busca em tempo real (debounce 200 ms) que filtra o catálogo já carregado por nome (case-insensitive).
- Chips de filtro: **Serif / Sans-serif / Display / Handwriting / Monospace** (multi-select; mapeiam para `category` do Google Fonts: `serif`, `sans-serif`, `display`, `handwriting`, `monospace`).
- Lista virtualizada simples (primeiros 30 resultados, com "Carregar mais") mostrando o nome em sua própria fonte.
- Ao clicar em uma fonte: abre micro-seletor "usar como **Título** / **Corpo**". Quando os dois forem definidos, vira um novo card "Combinação personalizada" selecionado automaticamente, e adiciona-se à lista para reutilização durante a sessão.

### 4. Carregamento de pesos completos

Estender `loadGoogleFont` em `src/lib/brand-font.ts` para aceitar opcionalmente os pesos. A URL passa a usar `wght@300;400;500;600;700` (já é o caso hoje — confirmado), garantindo Light/Regular/Medium/SemiBold/Bold para qualquer fonte selecionada. Nenhuma quebra para chamadas existentes.

### 5. API Key do Google Fonts

A chave precisa ser usada **no cliente** (a busca de catálogo é feita do navegador para evitar round-trip por edge function num picker em tempo real). Vamos:
- Adicionar `VITE_GOOGLE_FONTS_API_KEY=AIzaSyDwR6s4pd9l3Umcqbz8bN4ZoOqS_kufj-A` ao `.env` (chave de Browser API do Google; o usuário forneceu publicamente — recomendado restringir por HTTP referrer no Google Cloud Console depois).
- Criar `src/lib/google-fonts.ts` com:
  - `fetchGoogleFontsCatalog()` — fetch + cache em memória + `sessionStorage` (TTL 24h).
  - `searchFonts(query, categories)` — filtra o catálogo cacheado.
  - `pickSuggestedPairs(dna, clientName)` — devolve 5 `{ heading, body, label }`.

## Detalhes técnicos

**Arquivos alterados:**
- `src/components/studio/CarouselAIWizard.tsx` — substituir todo o JSX e a lógica do bloco "Combinação de fontes" (linhas ~390–420 atualmente). Remover `FONT_PAIRS`. Adicionar estados: `catalog`, `suggestions`, `customPair`, `exploreOpen`, `searchQuery`, `categoryFilter`. Estender o fetch de DNA para incluir `brand_font_url`, `tone_of_voice`, `target_audience`, `content_pillars`, `business_description`, e fazer um segundo fetch leve em `clients` por `name` quando o passo 2 abrir.
- `src/lib/brand-font.ts` — adicionar/garantir suporte para passar pesos completos (já cobre 300–700).
- `src/lib/google-fonts.ts` — novo arquivo (cliente: catálogo, busca, sugestão).
- `.env` — adicionar `VITE_GOOGLE_FONTS_API_KEY` (variável manualmente — o `.env` do projeto é gerenciado para Supabase, então na verdade adiciono via `import.meta.env` lendo de `VITE_GOOGLE_FONTS_API_KEY`; como o `.env` é auto-gerado, vou hard-codar a chave dentro de `src/lib/google-fonts.ts` como `const GOOGLE_FONTS_API_KEY = "AIzaSyDwR6s4pd9l3Umcqbz8bN4ZoOqS_kufj-A"`. É uma chave de browser pública por design e o usuário a compartilhou explicitamente).

**Estrutura do `fontPair` enviado ao editor (sem mudança de contrato):**
Continua como `{ heading: string, body: string }` — o editor lê de `sessionStorage["studio:carrossel:bootstrap"]` exatamente como hoje, então nada a alterar lá.

**Comportamento de seleção:**
- Estado unificado: `selectedPair: { source: 'dna' | 'suggestion' | 'custom', heading, body }`.
- Cards "Sua fonte" / "Sugerido" / "Personalizada" usam o mesmo componente `FontCard` (mantido), apenas com badge diferente e preview com `fontFamily` real.

**Não muda:**
- Passo 1 do wizard, paleta, geração de imagem, edge function `carrossel-generate`, editor de carrossel, pré-visualização, exportação, sidebar, dashboards, Studio inicial.
