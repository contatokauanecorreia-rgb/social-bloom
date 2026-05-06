## Objetivo
Fazer o gerador usar imagens ultrarrealistas do FLUX no carrossel e corrigir a lógica que hoje deixa foto só no primeiro slide em muitos casos.

## O que vou mudar

### 1. Voltar o pipeline de imagem do carrossel para FLUX como provedor principal
Arquivos:
- `supabase/functions/carrossel-image/index.ts`
- `supabase/functions/carrossel-generate/index.ts`

Mudanças:
- Remover o Nano Banana como caminho principal do carrossel.
- Colocar `generateWithFal(...)` como primeira escolha para geração.
- Opcionalmente manter outro provedor só como fallback técnico de emergência, mas sem ser o padrão do fluxo.
- Ajustar logs para deixar claro quando foi `done_fal` vs fallback.

Resultado esperado:
- O visual volta a ficar mais fotográfico/ultrarrealista, em vez da estética mais “básica” que você rejeitou.

### 2. Corrigir por que só o primeiro slide está recebendo imagem
Arquivos:
- `src/components/studio/CarouselAIWizard.tsx`
- `supabase/functions/carrossel-generate/index.ts`
- `src/routes/dashboard.studio.carrossel.tsx`

Diagnóstico confirmado no código:
- O wizard chama `carrossel-generate` com `textOnly: true`, então o backend não injeta imagens no retorno inicial.
- Depois disso, o editor cria `imageJobs` em background.
- Só que esses `imageJobs` hoje filtram os slides pelos tipos visuais (`M4/M5` no minimalista e `C1/C3` no criativo), então os outros slides ficam sem foto por design.

Mudanças:
- Parar de limitar a geração de imagem só a esses tipos quando `aiImages` estiver ligado.
- Fazer o `imageJobs` incluir todos os slides que precisem de imagem no modo escolhido.
- Ajustar a função que monta `imagePrompt` para garantir prompt visual válido em todos os slides, sem reaproveitar copy do Planner.
- No editor, aplicar a imagem recebida sem quebrar o layout dos slides já montados.

Resultado esperado:
- Não ficará mais “só o primeiro slide com imagem”.
- O carrossel passará a gerar imagem em todos os slides que o modo de imagem pedir.

### 3. Preservar o controle “sem texto dentro da imagem” usando FLUX
Arquivos:
- `supabase/functions/_shared/fal-image.ts`
- `supabase/functions/carrossel-image/index.ts`
- `supabase/functions/carrossel-generate/index.ts`

Mudanças:
- Manter a sanitização de prompts (`sanitizeImageNote`) e o fallback visual quando vier copy em vez de descrição de cena.
- Refinar o prompt do FLUX para puxar foto editorial realista, textura natural de pele, lente/câmera/luz plausíveis e proibição de texto/logos/captions.
- Preservar a proteção contra imagem preta/blank que já existe.

Resultado esperado:
- Imagens mais realistas com FLUX, mas ainda evitando texto inventado e placeholders pretos.

### 4. Ajustar o comportamento visual no editor para fotos em mais slides
Arquivo:
- `src/routes/dashboard.studio.carrossel.tsx`

Mudanças:
- Rever a aplicação automática de overlay/textColor quando uma imagem chega em background.
- Evitar que a lógica atual “force” um visual pensado só para capa quando outros slides também receberem foto.
- Manter legibilidade do texto em slides com fundo fotográfico.

Resultado esperado:
- As imagens entram corretamente em múltiplos slides sem deixar o texto ilegível.

## Detalhes técnicos
- Hoje o problema não é só o modelo; também existe uma regra estrutural no app que restringe foto a poucos tipos de slide.
- O request atual do wizard envia `textOnly: true`, então toda a distribuição de imagens depende do loop de `imageJobs` no editor.
- Esse loop está funcionando, mas recebe uma lista já reduzida pelo filtro de tipos (`M4/M5` ou `C1/C3`), por isso o efeito de “só a primeira imagem”.
- Vou corrigir isso no ponto de origem, não só no render.

## Entrega esperada
- FLUX volta a ser o gerador principal do carrossel.
- O carrossel deixa de gerar só a primeira imagem.
- As imagens ficam mais ultrarrealistas.
- Continua havendo proteção contra texto indesejado dentro da imagem e contra imagens pretas.
- O feedback de progresso/sucesso continua coerente com a quantidade real de imagens geradas.