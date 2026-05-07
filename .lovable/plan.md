## Diagnóstico
O erro persiste por 4 motivos já confirmados no código e nos logs:

1. **O prompt visual está sendo descartado com frequência.** Os logs mostram `prompt_looked_like_copy, using fallback` em `carrossel-image`, então o sistema entende uma descrição válida como se fosse copy do slide.
2. **O fallback atual é genérico demais.** Em vez de reconstruir a cena com base no tema e no DNA da marca, ele cai para algo como “candid lifestyle scene...”, o que abre espaço para props aleatórios como livros, mãos e cenas sem relação com o conteúdo.
3. **A geração ainda está priorizando velocidade, não fidelidade.** O helper compartilhado usa `fal-ai/flux-2/klein/9b` com apenas `6` steps. Essa combinação aumenta bastante a chance de anatomia ruim, mãos deformadas e resultados “estranhos”.
4. **O bloco de texto continua ancorado baixo.** Em `dashboard.studio.carrossel.tsx`, o layout usa `bottomPad = 0.08 * format.w`, então o conteúdo ainda fica mais para baixo do que sua referência pede.

## Plano
### 1. Corrigir a origem dos prompts irrelevantes
- Ajustar `looksLikeCopyNotImagePrompt()` para parar de derrubar descrições visuais legítimas só porque estão longas ou têm traços de português.
- Trocar o fallback genérico por um **fallback contextual**, montado a partir de:
  - tema do slide
  - segmento da marca
  - arquétipo
  - tipo visual do slide
- Fazer o pipeline gerar uma **nota visual curta, objetiva e sempre em inglês**, com foco em cena, sujeito, ambiente, enquadramento e clima — sem reaproveitar copy do conteúdo.

### 2. Parar de gerar pessoas deformadas
- Atualizar `generateWithFal()` para uma configuração **quality-first** em vez de speed-first.
- Mudar o carrossel para **FLUX.2 Pro** como padrão de produção para imagens de slide.
- Aumentar steps e adicionar guidance apropriado para reduzir deformidades.
- Incluir instruções anti-erro no prompt final, como:
  - anatomia natural
  - mãos corretas
  - rosto sem distorção
  - proporções reais
  - sem membros extras
- Manter a política de **não aceitar imagem ruim como fallback silencioso**: se a geração falhar, o slide fica sem imagem em vez de salvar uma imagem torta.

### 3. Subir o conteúdo no layout do slide
- Reposicionar o bloco textual para ficar **mais alto e mais equilibrado** no canvas.
- Ajustar o `bottomPad` e, se necessário, a lógica de ancoragem para manter o conteúdo visualmente mais próximo do centro útil.
- Rebalancear overlays dos slides com foto para preservar legibilidade sem empurrar o texto para baixo.
- Manter intactos os limites de caracteres já definidos:
  - sem título: 369
  - com título: 422

### 4. Validar o fluxo completo
- Testar a geração de um carrossel real com DNA de cliente.
- Confirmar que:
  - não aparecem mais logs de fallback indevido
  - não surgem livros/mãos/cenas sem relação com o tema
  - a anatomia fica mais consistente
  - o texto sobe para uma posição mais harmônica

## Arquivos envolvidos
- `supabase/functions/_shared/fal-image.ts`
- `supabase/functions/carrossel-image/index.ts`
- `supabase/functions/carrossel-generate/index.ts`
- `src/routes/dashboard.studio.carrossel.tsx`

## Observação importante
Se a exigência for **“imagem exata, sem deformidades”**, manter `FLUX.2 klein` não é a melhor escolha para produção. Eu consigo melhorar bastante o pipeline com ele, mas para esse nível de qualidade o caminho mais consistente é usar a variante **Pro** no carrossel.