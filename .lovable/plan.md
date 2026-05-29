## Objetivo

Desfazer a parte da última solicitação que envolveu o **planner**, mantendo o **Claude (Anthropic)** apenas onde faz sentido: a **geração de carrosséis**. Lá ele atua como mente criativa para títulos, subtítulos e — só quando o usuário anexa referências — também propõe elementos gráficos (setas, linhas, asteriscos etc.). Tudo continua puxando o **DNA do cliente**.

## O que muda

### 1. `supabase/functions/planner-ideas/index.ts` — REVERTER
- Voltar para a versão anterior (commit `08f8ec5`), que usa `LOVABLE_API_KEY` + `google/gemini-3-flash-preview` via `ai.gateway.lovable.dev`.
- Remove imports de `claude.ts` e `client-dna.ts` deste arquivo.
- DNA continua sendo lido inline (briefing + cliente), como já era antes.
- Resultado: planner não consome mais a chave Anthropic.

### 2. `supabase/functions/carrossel-generate/index.ts` — AJUSTAR
- **Manter** a chamada via `callClaudeTool` + `loadClientDNA` (Claude segue como cérebro criativo).
- **Elementos gráficos condicionais ao anexo de referência**:
  - Criar uma flag `hasReference = !!referenceImageDataUrl`.
  - **Sem referência anexada**: remover do `slideItemProperties` (input_schema enviado ao Claude) os campos `elemento_decorativo`, `elemento_grafico`, `palavra_destaque`, `ticker_texto`, `label`, `tags`. E no system prompt, instruir explicitamente: "NÃO sugira elementos gráficos decorativos (setas, linhas, asteriscos, tickers). Foque só em copy: título, subtítulo, corpo."
  - **Com referência anexada**: manter o schema completo atual e adicionar no prompt: "Use a referência anexa como inspiração para propor elementos gráficos (setas, linhas, asteriscos, tickers) que combinem com o estilo dela. Estes elementos só podem aparecer se a referência sugerir."
- No pós-processamento dos slides (linhas ~531–539), só copiar `elemento_decorativo`/`elemento_grafico`/`palavra_destaque`/`ticker_texto`/`label`/`tags` para o output quando `hasReference` for true. Sem referência, esses campos saem `undefined` (o frontend já lida com isso).

### 3. `supabase/functions/_shared/client-dna.ts` — MANTER
- Continua sendo usado pelo `carrossel-generate`. Nada muda.

### 4. `supabase/functions/_shared/claude.ts` — MANTER
- Continua sendo usado pelo `carrossel-generate`. Nada muda.

### 5. Secret `ANTHROPIC_API_KEY` — MANTER
- Permanece no backend. Só o `carrossel-generate` lê.

### 6. Frontend — SEM mudanças
- O wizard de carrossel já envia `referenceImageDataUrl` quando o usuário anexa uma imagem. Nenhum ajuste de UI necessário.
- A tela do planner volta a funcionar com o gateway Lovable (Gemini), como antes.

## Arquivos tocados

```
supabase/functions/planner-ideas/index.ts          (revertido p/ versão Gemini)
supabase/functions/carrossel-generate/index.ts     (elementos gráficos condicionais)
```

Não tocar: `_shared/claude.ts`, `_shared/client-dna.ts`, frontend, banco, RLS, config.toml.

## Deploy

Após as edições, redeployar as duas funções (`planner-ideas` e `carrossel-generate`) e fazer um teste rápido via curl em cada uma.

## O que **não** muda

- DNA continua sendo injetado nos dois lugares.
- Modelo Claude no carrossel segue `claude-sonnet-4-20250514`.
- Geração de imagens FAL, créditos, score, fallback, schema dos slides no editor — tudo intacto.
