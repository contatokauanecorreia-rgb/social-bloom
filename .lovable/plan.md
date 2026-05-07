Objetivo: corrigir a geração de imagens do carrossel, que hoje falha antes mesmo de chegar na etapa de qualidade/relevância da imagem.

Diagnóstico confirmado
- O problema principal não é o prompt do usuário nem o DNA da marca.
- A função `carrossel-image` está chamando um endpoint inválido do provedor de imagem.
- Arquivo afetado: `supabase/functions/_shared/fal-image.ts`
- Chamada atual encontrada no código: `https://fal.run/fal-ai/flux-2/pro`
- Pelos logs, esse caminho responde `404` com `{"detail":"Path /pro not found"}`.
- A documentação pública do provedor indica que o endpoint correto é `https://fal.run/fal-ai/flux-2-pro`.

Evidências
- O frontend mostra o toast “Não foi possível gerar as imagens agora. Tente regenerar pelo editor.” quando nenhuma imagem retorna com sucesso.
- Na tela, a rota `dashboard.studio.carrossel.tsx` considera sucesso apenas quando `data?.imageDataUrl` vem preenchido.
- Nas requisições observadas, a função respondeu `200`, porém com `{ "imageDataUrl": null }`.
- Nos logs da função `carrossel-image`, todas as tentativas recentes falham com o mesmo erro `404 Path /pro not found`.
- Isso explica por que nenhuma imagem é gerada agora, inclusive quando o prompt visual faz sentido.

Plano de correção
1. Corrigir o endpoint do provedor de imagem em `supabase/functions/_shared/fal-image.ts` de `fal-ai/flux-2/pro` para `fal-ai/flux-2-pro`.
2. Revisar os parâmetros enviados para garantir compatibilidade com esse endpoint específico.
3. Validar a resposta da função para diferenciar claramente:
   - erro do provedor
   - bloqueio de segurança
   - retorno sem URL
4. Melhorar a mensagem de erro no cliente para não mascarar falha técnica como se fosse problema temporário genérico.
5. Testar novamente o fluxo de geração no carrossel para confirmar que as imagens voltam a ser produzidas.
6. Só depois disso, se ainda necessário, ajustar a qualidade/relevância visual dos prompts restantes.

Resultado esperado
- A geração volta a funcionar.
- O editor deixa de retornar `imageDataUrl: null` para todos os slides.
- A mensagem de erro some quando o endpoint correto responder com URL válida.

Detalhes técnicos
- Arquivos envolvidos:
  - `supabase/functions/_shared/fal-image.ts`
  - `supabase/functions/carrossel-image/index.ts`
  - `src/routes/dashboard.studio.carrossel.tsx`
- Causa raiz atual: integração quebrada por URL incorreta do modelo, não por layout do slide.
- Impacto secundário: como todas as imagens falham, o usuário vê apenas o fallback de erro e pode interpretar como problema de prompt ou do editor.

Se você aprovar, eu sigo com essa correção primeiro — ela deve destravar a geração de imagens imediatamente.