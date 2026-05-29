## Objetivo

Substituir o provedor de IA atual (Lovable AI Gateway / Gemini) por **Claude Sonnet 4** nas funções de geração de carrossel e de ideias do planner, sempre injetando o **DNA do cliente** (briefing completo) no prompt. A chave fica como secret no backend, nunca no frontend.

## O que muda

### 1. Secret `ANTHROPIC_API_KEY`
- Adicionar via `add_secret` (você cola o valor no popup seguro).
- Lida apenas dentro das edge functions com `Deno.env.get("ANTHROPIC_API_KEY")`.
- Nada vai pro `.env`, nada vai pro client.

### 2. Helper compartilhado `supabase/functions/_shared/claude.ts`
- Wrapper para `https://api.anthropic.com/v1/messages` com:
  - headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type`.
  - modelo fixo `claude-sonnet-4-20250514`.
  - suporte a **tool use** (equivalente ao `tool_choice` da OpenAI) para extrair JSON estruturado de slides/ideias de forma confiável.
  - tratamento de erros 401 / 429 / 529 devolvendo mensagens claras ao cliente.

### 3. Helper compartilhado `supabase/functions/_shared/client-dna.ts`
- Função `loadClientDNA(supabaseClient, clientId)` que busca de `clients` + `client_briefings`:
  - nome, segmento/company
  - `tone_of_voice`, `target_audience`, `business_description`
  - `goals`, `content_pillars`, `dos`, `donts`, `archetype`, `palette`, `references`
- Retorna um bloco de texto formatado pronto para virar `system prompt` ("DNA da marca").
- Usado tanto por `carrossel-generate` quanto por `planner-ideas`, garantindo contexto idêntico nas duas superfícies.

### 4. `supabase/functions/carrossel-generate/index.ts`
- Substituir a chamada para `ai.gateway.lovable.dev` (linhas ~79 e ~470) por `callClaude(...)` do helper.
- Antes de montar o prompt: chamar `loadClientDNA(clientId)` e prefixar o system prompt com:
  - "Você é um copywriter especializado no nicho **X**, tom **Y**, falando com **Z**…"
  - listar pilares, dos/donts, referências.
- Manter o schema atual de slides (`title`, `subtitle`, `body`, `sistema`, `tipo`, `fundo`, `imageFrame`), mas declarar via `tools` do Anthropic (input_schema) em vez de `tool_choice` OpenAI.
- Manter a detecção `allEmpty` → fallback existente, e os logs de diagnóstico.
- O campo "referências de conteúdo / alinhamento / estilo de textos e títulos" enviado pela UI do wizard é repassado como bloco adicional no user message ("Configurações do usuário para esta geração: …").

### 5. `supabase/functions/planner-ideas/index.ts`
- Mesma troca: ler `clientId` do body (já existe), carregar DNA, chamar Claude com tool use que devolve `{ ideas: [{ title, hook, format, pillar }] }`.
- Sem mudança de contrato no client.

### 6. Frontend
- **Nenhuma mudança de fluxo.** O wizard de carrossel e o planner continuam invocando as mesmas edge functions (`carrossel-generate`, `planner-ideas`) com o mesmo payload, então `CarouselAIWizard.tsx` e a tela do planner não precisam ser alterados.
- Só ajuste cosmético: trocar textos de erro genéricos ("IA indisponível") para refletir mensagens vindas do helper Claude (rate limit / créditos / chave inválida).

## Detalhes técnicos

- **Modelo:** `claude-sonnet-4-20250514` (hardcoded no helper — fácil de trocar em um único lugar).
- **max_tokens:** 4096 para carrossel, 2048 para planner.
- **Tool use shape (Anthropic):**
  ```json
  {
    "tools": [{
      "name": "emit_slides",
      "description": "Retorna os slides do carrossel",
      "input_schema": { "type": "object", "properties": { "slides": {...} }, "required": ["slides"] }
    }],
    "tool_choice": { "type": "tool", "name": "emit_slides" }
  }
  ```
- **Segurança:** secret só em edge function; client nunca recebe a key. `config.toml` mantém `verify_jwt = true` para ambas as funções (já está).
- **Sem migração de banco** — o DNA já está em `client_briefings`.

## Arquivos tocados

```
supabase/functions/_shared/claude.ts          (novo)
supabase/functions/_shared/client-dna.ts      (novo)
supabase/functions/carrossel-generate/index.ts (editado: troca de provider + DNA)
supabase/functions/planner-ideas/index.ts      (editado: troca de provider + DNA)
```

## O que **não** vai mudar
- UI do wizard, UI do planner, estrutura dos slides, fluxo de créditos, geração de imagens (continua FAL/`carrossel-image`), score, RLS, tabelas.

## Próximo passo após aprovação
1. Pedir o secret `ANTHROPIC_API_KEY` via `add_secret`.
2. Implementar os 4 arquivos acima.
3. Deploy das duas funções e teste rápido via `curl_edge_functions` com um cliente real.
