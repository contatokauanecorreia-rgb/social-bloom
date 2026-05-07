## Objetivo

Remover o seletor "Alinhamento dos textos" (Esquerda/Centro/Direita) do passo de configurações do `CarouselAIWizard`, já que o alinhamento agora é determinado pelos princípios de design selecionados.

## Mudanças

### `src/components/studio/CarouselAIWizard.tsx`
- Remover o bloco de UI "Alinhamento dos textos" (linhas ~1370–1397).
- Remover o estado `const [alignment, setAlignment] = useState<...>("center")` (linha 357).
- Remover `alignment` do payload enviado ao backend (linha 700).
- Remover `alignment` da tipagem `Body` correspondente (linha 727).

### `supabase/functions/carrossel-generate/index.ts`
- Remover o campo `alignment` do tipo `Body` e qualquer referência (já que cada princípio define seu próprio alinhamento via `PRINCIPLE_TO_LAYOUT`).
- Caso algum prompt/appendix mencione `alignment`, substituir pela diretriz já presente nos princípios.

### `src/routes/dashboard.studio.carrossel.tsx`
- Se houver leitura de `meta.alignment` ou propagação para slides, removê-la — o alinhamento agora vem por princípio.

## Resultado
O passo 2 do wizard deixa de exibir o seletor de alinhamento; o backend e o renderer passam a confiar exclusivamente nos princípios escolhidos para definir o alinhamento dos textos de cada slide.
