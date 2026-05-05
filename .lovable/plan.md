## Substituir o system prompt da edge function `carrossel-generate`

Mantém tudo o que já existe. Apenas troca o `systemPrompt` (linhas 177-186) em `supabase/functions/carrossel-generate/index.ts` pelo novo prompt de "Consultor Criativo Estratégico", com placeholders preenchidos dinamicamente a partir do contexto que a função já carrega (briefing + cliente + body do request).

### 1) Mapear placeholders → variáveis já existentes

Tudo já está disponível no escopo do `Deno.serve` handler — nenhum dado novo precisa ser buscado:

- `[NOME_CLIENTE]` → `clientName ?? "—"`
- `[SEGMENTO]` → `segment ?? "—"` (vem de `clients.company`)
- `[TOM_VOZ]` → `briefing?.tone_of_voice ?? "—"`
- `[ARQUETIPO]` → `briefing?.archetype ?? "—"` (mapear opcionalmente para `ARCHETYPE_TONE` como complemento)
- `[PUBLICO]` → `briefing?.target_audience ?? "—"`
- `[OBJETIVO]` → `(briefing?.goals ?? []).join(", ") || "—"`
- `[PALAVRAS_CHAVE]` → `(briefing?.dos ?? []).join(", ") || "—"`
- `[PALAVRAS_PROIBIDAS]` → `(briefing?.donts ?? []).join(", ") || "—"`
- `[CORES]` → `(briefing?.palette ?? []).join(", ") || "—"`
- `[TEMA]` → `topic.trim()`
- `[N]` → `slideCount`
- `[DESCRICAO_REFERENCIA]` → `referenceImageDataUrl ? "imagem de referência anexada na mensagem do usuário" : "nenhuma"`
- `[ESTILO_IMAGENS]` → `"editorial, instagram feed aesthetic, soft natural lighting, vertical 4:5"` (default fixo, alinhado ao que `carrossel-image` já usa)

### 2) Compatibilidade com o tool-call atual (CRÍTICO)

O código abaixo do prompt usa `tools` com `function: build_carousel` que exige `slides[].{title, body, imagePrompt}` (e opcional `subtitle`). O novo prompt do usuário pede um JSON com chaves em **português** (`titulo`, `subtitulo`, `corpo`, `nota_visual`, `legenda`) — se enviarmos só esse texto, o modelo vai responder via tool-call com as chaves em inglês mesmo (o tool-call é o que vence), mas o conteúdo da seção "RETORNE APENAS JSON" do prompt entraria em conflito.

Para preservar 100% o pipeline existente (parsing do tool-call em `parsed.slides`, padding, fallback, geração de imagem usando `imagePrompt`), vou:

- Inserir o prompt do usuário **na íntegra** (pensamento estratégico, regras, processo, hooks, narrativa, regras absolutas).
- Substituir apenas o bloco final "RETORNE APENAS JSON ..." por uma instrução curta dizendo que a saída deve ser entregue **via a function tool `build_carousel`**, mapeando: `titulo→title`, `subtitulo→subtitle`, `corpo→body`, `nota_visual→imagePrompt` (em inglês), e que `legenda` deve ser ignorada (o sistema atual não consome `legenda`, então mantemos isso fora para não quebrar o schema).
- Manter a regra existente de que `imagePrompt` é em inglês e nunca pede texto/tipografia na imagem (já está coberto pelas regras do novo prompt + reforço explícito).

Isso preserva a estratégia/copy nova **e** o contrato de I/O atual.

### 3) Edição

Arquivo: `supabase/functions/carrossel-generate/index.ts`

- Substituir o array `systemPrompt` (linhas 177-186) por uma string única (`const systemPrompt = \`...\``) que:
  1. Contém todo o prompt do usuário com os placeholders interpolados.
  2. Termina com um bloco curto: "Entregue a saída chamando a função `build_carousel`. Mapeie: titulo→title, subtitulo→subtitle, corpo→body, nota_visual→imagePrompt (em inglês, apenas visual, nunca peça texto/tipografia/logos na imagem). Não inclua o campo `legenda` na saída."

### Sem alterações em

- `tools` schema, parsing, fallback, padding, geração de imagens.
- `buildBriefingContext` (deixa a função no arquivo; deixa de ser usada — opcionalmente removo a chamada `briefingCtx`, mas mantenho a função para não tocar em mais nada).
- `dashboard.studio.carrossel.tsx`, `CarouselAIWizard.tsx`, `carrossel-image`.
- `supabase/config.toml`.

### Arquivo editado

- `supabase/functions/carrossel-generate/index.ts` (apenas o bloco do `systemPrompt`)
