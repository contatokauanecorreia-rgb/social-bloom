## Contexto
O edge function `carrossel-generate` está retornando erro 404 ao chamar a API da Anthropic. A causa raiz é que o modelo `claude-sonnet-4-20250514` definido em `supabase/functions/_shared/claude.ts` não existe na API da Anthropic.

## Correção
1. **Atualizar modelo no shared helper**  
   Alterar a constante `CLAUDE_MODEL` em `supabase/functions/_shared/claude.ts`:  
   - De: `"claude-sonnet-4-20250514"`  
   - Para: `"claude-sonnet-4-5-20250929"`  
   Este é um modelo válido e estável (Sonnet 4.5, multimodal) da Anthropic.

2. **Reimplantar a edge function**  
   Deploy da função `carrossel-generate` para aplicar a correção no ambiente de execução.

3. **Verificar logs**  
   Validar nos logs que o erro 404 (`creative_director_failed`) não ocorre mais e que `meta.typography` está presente na resposta.

## O que não muda
- Nenhuma alteração em copy, alinhamentos de texto, presets de layout, limites de caracteres ou lógica do Gemini.
- O frontend, banco de dados, RLS e demais edge functions permanecem intactos.
- A chave `ANTHROPIC_API_KEY` já está configurada.