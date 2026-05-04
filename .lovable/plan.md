# Reestruturar fluxo de criação de carrossel

## 1. Remover diálogo "Como você quer criar?"

**`src/routes/dashboard.studio.tsx`**
- Remover `import { CarouselModeDialog }`.
- Remover state `carouselFlow` (substituir por `aiOpen: boolean`).
- No `onClick` do card "Criar carrossel": validar cliente e abrir direto o `CarouselAIWizard` (`setAiOpen(true)`).
- Remover o JSX `<CarouselModeDialog ... />`.
- Manter `<CarouselAIWizard />` controlado pelo novo state.

O arquivo `src/components/studio/CarouselModeDialog.tsx` fica órfão — manter no repo (instrução "Não altere nenhuma outra parte"), só deixa de ser importado.

## 2. Reformular `CarouselAIWizard.tsx` — passo 1 "Configurar carrossel"

Manter a estrutura de 2 passos (1 = configurar conteúdo; 2 = personalizar fontes/paleta — intocado). Apenas reescrever o **conteúdo do passo 1** para conter as 3 seções pedidas.

### State novo (passo 1)
- `contentSource: "planner" | "ai"` (default `"ai"`).
- `selectedPostIds: string[]`.
- `plannerPosts: { id, title, tags, notes }[]` carregados do Supabase.
- `referenceMode: "none" | "file" | "url"`.
- `referenceFile: File | null`, `referencePreview: string | null` (já existe como `moodboard*` — renomear).
- `referenceUrl: string` (texto do campo "Colar link").
- `referenceImageDataUrl: string | null` (resultado processado: upload em base64, ou screenshot da URL, ou imagem direta baixada).
- `referenceLoading: boolean` (durante fetch/screenshot).
- Manter: `slideCount`, `imageMode`, `aiImages`.
- Remover do passo 1: `topic` é mantido **apenas** quando `contentSource === "ai"`.

### Carregar posts do Planner
- Quando `step === 1` e `clientId` definido, fazer `supabase.from("content_posts").select("id, title, tags, notes").eq("client_id", clientId).eq("user_id", userId).order("created_at", { ascending: false })`.
- Buscar `userId` via `supabase.auth.getSession()` no mount do wizard (já não temos — adicionar `useEffect` com `getSession`).

### UI Seção 1 — Fonte do conteúdo
- `RadioGroup` com 2 opções:
  - **"Usar conteúdo do Planner"**: lista scrollável (max-h ~48) de checkbox cards mostrando `title` + chip de tipo (derivado de `tags`: se contém "carrossel"/"reels"/"post"). Vazia → mensagem "Nenhum post no Planner para este cliente".
  - **"Gerar com IA"**: a `Textarea` atual com placeholder solicitado.

### UI Seção 2 — Referência de conteúdo (opcional)
- Substituir label "Moodboard ou referência" por **"Referência de conteúdo"**.
- Dois subcontroles lado a lado:
  - Botão **"Anexar imagem"** (input file existente, accept `image/jpeg,image/png,image/webp`).
  - Campo **"Colar link"** (`Input` + botão "Usar"): aceita URL.
- Lógica de processamento ao usuário "confirmar" o link (botão Usar) ou anexar arquivo:
  - **Arquivo**: ler como base64 → `referenceImageDataUrl`.
  - **URL**: classificar:
    - Se termina em `.jpg`, `.jpeg`, `.png`, `.webp` (regex), buscar via fetch → blob → base64.
    - Caso contrário (Pinterest, Instagram, qualquer site): chamar nova edge function `screenshot-url` (ver §5) que retorna base64.
  - Mostrar preview da imagem resultante com botão Remover (igual ao moodboard atual).

### UI Seção 3 — Configurações
- Manter exatamente os 3 controles atuais (Número de slides com setas, Imagens no carrossel com 4 botões, Toggle "Gerar imagens com IA").

### Validação para avançar
- `canContinueStep1`:
  - `contentSource === "ai"` → `topic.trim().length > 0`.
  - `contentSource === "planner"` → `selectedPostIds.length > 0`.

## 3. Geração — texto primeiro, imagens em background

### `handleGenerate` (`CarouselAIWizard`)
- Chamar `carrossel-generate` com novo body:
  - Se `contentSource === "planner"`: enviar `plannerPosts` selecionados (title + notes) como `topic` agregado (string concatenada) + flag `aiImages: false` para o body inicial **não importa** porque vamos pedir só texto.
  - Adicionar campo `referenceImageDataUrl` (string base64 ou null) no body.
  - Adicionar `imageMode` e `aiImages` para o backend incluir no retorno (decisão final fica no editor).
  - **NOVO comportamento server**: chamar a edge function com flag `textOnly: true` para retornar imediatamente apenas slides de texto (sem rodar geração de imagem). Isso evita o timeout e abre o editor rápido.
- Ao receber resposta com slides de texto, gravar bootstrap em `sessionStorage` igual hoje, **adicionando**:
  - `imageJobs`: lista `{ slideIndex, imagePrompt }[]` quando `aiImages && imageMode !== "none"`.
  - `referenceImageDataUrl`.
- Navegar para `/dashboard/studio/carrossel`.

### `supabase/functions/carrossel-generate/index.ts`
- Adicionar suporte a `textOnly: boolean` no body. Quando `true`, pular toda a fase de imagens (já tem o branch — só forçar). Retornar 200 com slides + `meta.imagesGenerated: 0`.
- Quando `referenceImageDataUrl` for fornecido, anexar ao prompt do modelo de texto como mensagem `user` com `image_url` (Gemini suporta multimodal) — instruindo: "Use a imagem como referência de paleta, tipografia e estilo visual ao escrever."
- Manter o restante da lógica, fallback e logs.
- Continuar deploy automático.

### Geração de imagens em background — `dashboard.studio.carrossel.tsx`
- Ao consumir bootstrap, se `imageJobs && imageJobs.length > 0`:
  - Setar state `imageProgress: { current: number, total: number, percent: number } | null`.
  - Iniciar loop `for` sequencial: para cada job, invocar nova edge function `carrossel-image` (ou reutilizar `carrossel-generate` com flag `imagesOnly` — preferir nova função pequena dedicada para evitar timeout).
  - Atualizar slide quando imagem chegar: `setSlides(prev => prev.map((s, i) => i === job.slideIndex ? { ...s, bgImage: dataUrl, textColor: { title:"#FFF",... }, overlay: { enabled:true, intensity:40, type:"dark" } } : s))`.
  - Atualizar `imageProgress` a cada slide.
- Render: barra discreta no rodapé (acima da `SlidesBar`) quando `imageProgress` ativo: texto "Slide X de Y — gerando fundo X%" + componente `Progress`.

### Nova edge function `carrossel-image`
- POST `{ prompt, imageMode, archetype, segment }` → retorna `{ imageDataUrl: string | null }`.
- Chama `google/gemini-3-pro-image-preview` igual hoje.
- Timeout 60s isolado (uma chamada por slide → não estoura o limite do worker).
- CORS + auth iguais às demais.

## 4. Editor — Painel esquerdo "Planner de conteúdo"

`src/routes/dashboard.studio.carrossel.tsx` — componente `EditorPanel`.

- Adicionar **no topo do painel** (antes da Section "Layout & posição") uma nova Section colapsável "Planner de conteúdo":
  - Botão de header expansível (chevron up/down — padrão dos `Section` atuais ou novo accordion local).
  - Quando expandida: lista de posts (já temos `plannerTitles` mas precisa do conteúdo completo — trocar para carregar `id, title, tags, notes`).
- Cada item da lista: linha clicável com:
  - `title` em `text-sm font-medium`.
  - Badge pequena com tipo derivado das tags (`carrossel`/`reels`/`post`) — fallback "post".
- Ao clicar:
  - Substituir o conteúdo do **slide ativo**: setar `slide.text.title = post.title` e `slide.text.body = post.notes ?? ""` (subtitle limpo).
  - Toast de confirmação "Slide atualizado com conteúdo do Planner".

### Carregamento dos posts (já existe parcialmente)
- Substituir o `select("title")` por `select("id, title, tags, notes")` e armazenar em `plannerPosts` em vez de `plannerTitles`.
- Passar `plannerPosts` para `EditorPanel` (substituindo `plannerTitles`). Manter compatibilidade do `TextFieldRow.suggestions` derivando `plannerPosts.map(p => p.title)`.

## 5. Resumo dos arquivos tocados

- `src/routes/dashboard.studio.tsx` — remover dialog de modo.
- `src/components/studio/CarouselAIWizard.tsx` — passo 1 reescrito (3 seções), `handleGenerate` ajustado.
- `src/routes/dashboard.studio.carrossel.tsx` — bootstrap com `imageJobs`, geração background, barra de progresso, Section "Planner de conteúdo" no painel esquerdo, `plannerPosts` enriquecido.
- `supabase/functions/carrossel-generate/index.ts` — flag `textOnly`, suporte a `referenceImageDataUrl` no prompt.
- `supabase/functions/carrossel-image/index.ts` — **novo**, geração unitária de imagem.
- `supabase/functions/screenshot-url/index.ts` — **novo**, captura screenshot de URL via API externa.

## 6. Detalhes técnicos

### Screenshot de URL
- Usar **ScreenshotOne** (`https://api.screenshotone.com/take`) — requer API key.
- A função pega `?url=...&format=png&block_ads=true&full_page=false&viewport_width=1280&viewport_height=800` e responde com a imagem binária.
- Edge function lê secret `SCREENSHOTONE_API_KEY`, faz fetch, converte para base64 e retorna `{ imageDataUrl }`.
- **Antes de implementar**: precisamos pedir ao usuário a API key da ScreenshotOne (free tier: 100 screenshots/mês). Vou solicitar via `add_secret` quando entrar em build mode.
- Fallback: se a key não estiver configurada, retornar 200 com `imageDataUrl: null` e mostrar toast "Não foi possível processar este link — anexe uma imagem".

### Imagem como referência multimodal no Gemini
- Modelo `google/gemini-3-flash-preview` aceita conteúdo multimodal:
  ```
  { role: "user", content: [
    { type: "text", text: "..." },
    { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
  ]}
  ```
- Adicionar instrução no system prompt: "Quando uma imagem de referência for enviada, observe paleta, tipografia, layout, densidade textual e estilo visual e descreva textualmente esse estilo nos `imagePrompt` dos slides; use o tom textual sugerido pela imagem nos textos."

### Conteúdo vindo do Planner
- Quando `contentSource === "planner"`, montar `topic` enviado ao backend como:
  ```
  Posts selecionados do Planner:
  1. <title> — <notes>
  2. ...
  ```
- O backend continua usando `topic` no prompt; nada muda no schema de retorno.
- No editor (bootstrap), se vier do Planner com 1 post selecionado e ele tiver `notes`, podemos pré-preencher o `body` do slide 1 também — fica como melhoria opcional, default é deixar a IA distribuir.

### Não tocar
- Componente `CarouselModeDialog.tsx` (deixa órfão).
- Lógica passo 2 (fontes/paleta) do wizard.
- Estrutura geral do editor (header, preview, export, save draft).
- Outras rotas, schema do banco, RLS.
