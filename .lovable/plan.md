## Objetivo

Voltar a geração de **copy** dos carrosséis para o estado anterior (Lovable AI Gateway + Gemini, mesmo prompt e mesmos alinhamentos de texto). O **Claude** deixa de escrever copy e passa a ser usado **só** para a parte criativa baseada no DNA do cliente: sugerir **elementos gráficos** (setas, linhas, asteriscos, tickers, palavras de destaque) e **tipografia** (par de fontes). E, como combinado antes, elementos gráficos só são propostos quando o usuário anexa uma referência visual.

## O que muda

### 1. `supabase/functions/carrossel-generate/index.ts` — DUAS ETAPAS

**Etapa A — Copy via Gemini (como antes)**
- Restaurar `callAI(...)` para `ai.gateway.lovable.dev` com `google/gemini-2.5-flash` e `tools` / `tool_choice` (igual ao commit `1103525`).
- System prompt, presets de layout, sequência de slides, regras de alinhamento (`ALINHAMENTO`/`textAlign`) e limites de caracteres ficam **exatamente** como estavam antes da entrada do Claude.
- Schema do `build_carousel` enviado ao Gemini volta a ter SÓ `title`, `subtitle`, `body`, `imagePrompt`, `sistema`, `tipo`, `fundo`, `nota_visual`. **Removo** dele os campos decorativos (`elemento_decorativo`, `elemento_grafico`, `palavra_destaque`, `ticker_texto`, `label`, `tags`) — Gemini não precisa mais sugeri-los.
- O pós-processamento dos slides volta a respeitar o alinhamento global e os presets, sem qualquer lógica `hasReference` mexendo no copy.

**Etapa B — Direção criativa via Claude (DNA)**
- Depois que Gemini devolver os slides com copy pronto, faço uma **segunda chamada** via `callClaudeTool` (modelo `claude-sonnet-4-20250514`) usando o helper já existente.
- Input para Claude:
  - System: `loadClientDNA(clientId).prompt` + instrução "Você é o diretor criativo desta marca. NÃO reescreva copy. Apenas proponha elementos visuais coerentes com o DNA."
  - User content:
    - Lista enxuta dos slides já gerados (apenas título e corpo, para contexto)
    - **Imagem de referência** (anexada como bloco `image` via `dataUrlToImageBlock`) — só presente se `referenceImageDataUrl` existir.
- Tool `creative_direction` com `input_schema`:
  ```json
  {
    "type": "object",
    "properties": {
      "typography": {
        "type": "object",
        "properties": {
          "heading": { "type": "string", "description": "Google Font para títulos" },
          "body": { "type": "string", "description": "Google Font para corpo" },
          "rationale": { "type": "string" }
        }
      },
      "slides": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "elemento_decorativo": { "enum": ["seta","asterisco","triangulo","seta-circular","nenhum"] },
            "elemento_grafico": { "enum": ["circulo","seta-curva","ticker","seta-vertical","toggle"] },
            "palavra_destaque": { "type": "string" },
            "ticker_texto": { "type": "string" },
            "label": { "type": "string" },
            "tags": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    }
  }
  ```
- **Regra do anexo**: só permito que Claude proponha campos do array `slides` (elementos gráficos) **se** `referenceImageDataUrl` estiver presente. Sem referência, o prompt instrui Claude a devolver `slides: []` e preencher apenas `typography`. O merge no backend também respeita isso defensivamente (ignora `slides` se não houver referência).
- Se a chamada do Claude falhar (sem `ANTHROPIC_API_KEY`, 401, 429, timeout etc.): logamos o erro e seguimos com os slides do Gemini sem direção criativa — **não quebra** a geração principal.

**Merge no backend**
- Para cada slide do output do Gemini, sobrescrevo `elemento_decorativo` / `elemento_grafico` / `palavra_destaque` / `ticker_texto` / `label` / `tags` com o que Claude propôs (quando houver referência).
- `meta.typography = { heading, body, rationale }` (ou `null` se Claude falhou).
- `meta` ganha também `creativeDirector: "claude" | null` para debug.

### 2. `supabase/functions/_shared/claude.ts` — MANTER
Continua sendo usado, agora só na Etapa B. Nada muda.

### 3. `supabase/functions/_shared/client-dna.ts` — MANTER
Continua sendo usado nas duas etapas (Gemini também recebe o DNA via `dnaPrompt` no system, como já era depois da reversão do briefing inline).

### 4. `supabase/functions/planner-ideas/index.ts` — NÃO TOCAR
Já está na versão Gemini original. Sem mudanças.

### 5. Frontend — SEM mudanças
- Continua mandando `referenceImageDataUrl`, `textAlign`, `bgKinds`, etc.
- Os slides voltam com a mesma forma (`title`, `subtitle`, `body`, presets) + campos opcionais decorativos quando houver referência.
- Se o frontend já consome `meta.typography`, ótimo; se não, simplesmente ignora — não há regressão.

## Arquivos tocados

```
supabase/functions/carrossel-generate/index.ts   (etapa A revertida ao Gemini, etapa B nova p/ Claude)
```

Não tocar: `_shared/claude.ts`, `_shared/client-dna.ts`, `planner-ideas`, frontend, banco, RLS, config.toml, secrets.

## Deploy

Redeploy somente do `carrossel-generate` e teste rápido via curl com e sem `referenceImageDataUrl` para confirmar:
- Sem referência: slides voltam com copy do Gemini, `meta.typography` vinda do Claude, **sem** elementos gráficos.
- Com referência: mesma coisa + elementos gráficos por slide vindos do Claude.

## O que **não** muda

- Modelo de copy: Gemini 2.5 Flash via Lovable Gateway.
- Alinhamento, presets de layout, limites de caracteres, sequência de slides, fallback, geração de imagens FAL, créditos, score.
- DNA continua sendo injetado nas duas IAs.
