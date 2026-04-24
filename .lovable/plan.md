## Objetivo
Criar um endpoint público `/api/public/chat-sur` que usa Claude (Anthropic) com o system prompt completo do agente SUR. Sem alterações no frontend ou nas funções existentes.

## Arquivos a criar/editar

### 1. Criar `src/routes/api.public.chat-sur.ts`
TanStack Start server route com:

- **Handlers**: `OPTIONS` (preflight CORS, 204) + `POST`
- **CORS completo** em todas as respostas (sucesso e erro):
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - `Access-Control-Max-Age: 86400`
- **Validação Zod** do body:
  ```ts
  z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(8000),
    })).min(1).max(50),
  })
  ```
  Retorna `400` com CORS se inválido.
- **Verificação de secret**: se `process.env.ANTHROPIC_API_KEY` faltar → `500` com mensagem clara.
- **Chamada Anthropic**:
  - URL: `https://api.anthropic.com/v1/messages`
  - Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`
  - Body: `model: "claude-sonnet-4-20250514"`, `max_tokens: 4096`, `system: <prompt SUR completo>`, `messages: [...]`
- **System prompt SUR**: texto exato fornecido (validação `SUR026`/`sur026`, Strategic Idea Map, 3 Stages, PT-BR, tone of voice, sigilo absoluto sobre fontes/lógica interna).
- **Resposta sucesso**: `{ reply: string }` extraído de `data.content[0].text`.
- **Tratamento de erros upstream**:
  - `429` → "Muitas requisições. Aguarde um instante."
  - `401`/`403` → "Chave da Anthropic inválida ou sem permissão."
  - Outros → `console.error` + `500` genérico
  - `try/catch` global

### 2. Solicitar secret `ANTHROPIC_API_KEY`
Via `add_secret` (formato `sk-ant-...`, obtido em https://console.anthropic.com/ → Settings → API Keys).

### 3. Validação pós-deploy
Testar com `stack_modern--invoke-server-function`:
- `{"messages":[{"role":"user","content":"marketing"}]}` → "Conteúdo protegido..."
- `{"messages":[{"role":"user","content":"SUR026 marketing"}]}` → Strategic Idea Map completo

## Sem alterações em
- Frontend React (chat do SUR continua no Gemini via `agent-chat`)
- `supabase/functions/agent-chat`
- `supabase/config.toml`
- Banco de dados / RLS
- Outros agentes

## URLs finais
- Preview: `https://id-preview--fd37a91c-a86e-496a-961e-c0e23dd82644.lovable.app/api/public/chat-sur`
- Stable preview: `https://project--fd37a91c-a86e-496a-961e-c0e23dd82644-dev.lovable.app/api/public/chat-sur`
- Produção (após publicar): `https://project--fd37a91c-a86e-496a-961e-c0e23dd82644.lovable.app/api/public/chat-sur`