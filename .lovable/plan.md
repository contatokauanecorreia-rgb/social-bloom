## Objetivo
Fazer o carrossel gerar apenas imagens fotográficas, sem texto dentro da foto, inclusive quando a fonte do conteúdo for o Planner.

## O que está acontecendo
Identifiquei o vazamento principal no fluxo atual:

- Em `src/components/studio/CarouselAIWizard.tsx`, os `imageJobs` são criados com `s.imagePrompt || effectiveTopic`.
- Quando o slide não vem com `imagePrompt` válido, o app usa o `effectiveTopic` inteiro como prompt.
- No modo Planner, esse `effectiveTopic` é o texto completo do carrossel (`SLIDE 1`, bullets, CTA etc.).
- A prova está no request capturado para `carrossel-image`: o body estava enviando todo o conteúdo do Planner como `prompt`.

Isso explica por que o modelo continua desenhando letras: ele está recebendo texto demais e, em alguns casos, o próprio copy do carrossel.

## Plano de correção

### 1. Parar de enviar o texto do Planner como prompt de imagem
Em `src/components/studio/CarouselAIWizard.tsx`:
- Remover o fallback `|| effectiveTopic` na criação dos `imageJobs`.
- Criar jobs apenas para slides que realmente tenham `imagePrompt` visual válido.
- Respeitar os tipos que não devem ter foto (`M1/M2/M3`, `C2/C4/C5`) e não gerar job para eles.

Resultado: nenhum request de imagem vai mais receber o texto integral do post.

### 2. Adicionar uma trava de segurança no backend de imagem
Em `supabase/functions/carrossel-image/index.ts`:
- Detectar prompts claramente errados para imagem, como:
  - texto longo demais
  - muitas quebras de linha
  - presença de `SLIDE`, bullets, CTA, listas, títulos/copys completos
- Se o prompt estiver contaminado por copy, não enviar isso direto ao modelo de imagem.
- Em vez disso, converter para uma descrição visual curta e segura, ou cair para um prompt visual genérico coerente com a marca.

Isso cria uma segunda camada de proteção mesmo se o front voltar a vazar texto no futuro.

### 3. Reforçar o pipeline do `carrossel-generate`
Em `supabase/functions/carrossel-generate/index.ts`:
- Garantir que cada slide fotográfico sempre retorne uma `imagePrompt` curta, visual e em inglês.
- Garantir que slides tipográficos continuem com `imagePrompt` vazio.
- Endurecer o pós-processamento para truncar/remover prompts muito verbais antes de chegar na fase de imagem.

Resultado: o backend já entrega prompts visuais melhores e mais seguros para o editor.

### 4. Melhorar observabilidade para validar a correção
Adicionar logs úteis para depuração:
- quando um slide for pulado por não ter prompt visual
- quando um prompt textual for bloqueado/substituído
- qual tipo de slide recebeu geração de imagem

Assim eu consigo confirmar rapidamente se o fluxo ficou limpo.

## Arquivos que vou ajustar
- `src/components/studio/CarouselAIWizard.tsx`
- `supabase/functions/carrossel-image/index.ts`
- `supabase/functions/carrossel-generate/index.ts`
- possivelmente `supabase/functions/_shared/fal-image.ts` para centralizar a heurística de bloqueio/sanitização

## Resultado esperado
- O carrossel vai gerar somente imagens visuais/fotográficas.
- O texto do Planner não será mais enviado ao gerador de imagem.
- Slides que deveriam ser apenas tipográficos não vão ganhar fundo com imagem “inventando letras”.
- A incidência de texto dentro das fotos deve cair drasticamente porque o principal vazamento será removido na origem.