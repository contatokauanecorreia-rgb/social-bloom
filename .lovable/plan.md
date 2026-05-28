## Objetivo

Quando o usuário gerar um carrossel pelo wizard de IA, em vez de cair direto no editor com 1 versão, mostrar **duas variações lado a lado** — uma no sistema **Minimalista** (foco em tipografia, sem foto) e uma no sistema **Criativo** (foto editorial cobrindo o slide). O usuário escolhe qual vai para o editor / aprovação do cliente antes de exportar.

## UX

Novo passo final no `CarouselAIWizard` (após o usuário clicar "Gerar"):

1. Wizard chama a edge function **2× em paralelo** com a mesma topic/briefing:
   - Versão A: `bgKinds: ["texto"]` → vira sistema **Minimalista** (presets M2/M3).
   - Versão B: `bgKinds: ["foto"]` → vira sistema **Criativo** (presets C1).
   - **Sem geração de imagem nessa etapa** (`aiImages: false`) — só copy + layout. Placeholder visual com cor da paleta no preview. Isso evita gastar geração de imagem em uma versão que vai ser descartada.
2. Tela de comparação dentro do mesmo dialog (substitui o spinner de "gerando…"):
   - Dois cards grandes lado a lado: "Minimalista" e "Criativo".
   - Cada card mostra mini-preview dos primeiros 3 slides (usa o mesmo `SlidePreview` que o editor já tem, em escala reduzida).
   - Botão "Escolher esta versão" em cada card.
   - Botão secundário "Gerar de novo" (volta ao passo de configuração).
3. Ao escolher uma versão:
   - Monta o `bootstrap` (sessionStorage) só da versão escolhida.
   - Se `aiImages` estava ligado na config original e a versão escolhida é **Criativa**, gera os `imageJobs` (a geração das imagens em si continua acontecendo no editor em segundo plano, como já é hoje).
   - Navega para `/dashboard/studio/carrossel`.

## Mudanças

### 1. `src/components/studio/CarouselAIWizard.tsx`
- Novo estado: `variants: { minimalista: SlideData[] | null; criativo: SlideData[] | null }`, `chooseStep: boolean`.
- Função `handleGenerate` divide em duas chamadas paralelas:
  ```ts
  const [minRes, creRes] = await Promise.all([
    invoke({ ...common, bgKinds: ["texto"], aiImages: false }),
    invoke({ ...common, bgKinds: ["foto"], aiImages: false }),
  ]);
  ```
- Em vez de navegar direto, seta `variants` e `chooseStep = true`.
- Novo render `<VariantPicker>`:
  - 2 cards com mini-thumbnails (reaproveita render existente de slide, em CSS `transform: scale(0.18)`).
  - Cada um chama `pickVariant("minimalista" | "criativo")`.
- `pickVariant` monta o bootstrap da versão escolhida (cópia exata da lógica atual de `imageJobs`, palette, signature, fontPair) e navega.
- Tratamento de erro: se uma das duas chamadas falhar, ainda permite escolher a que deu certo (com aviso) ou refazer.

### 2. Mini-preview de slide
- Extrair o JSX de render de slide do editor para um componente compartilhado **`src/components/studio/SlideMiniPreview.tsx`** (lê os mesmos campos do bootstrap: title/subtitle/body/sistema/fundo/palette/fontPair), renderizado em ~200×250 px.
- Usado tanto no editor (não muda) quanto no wizard.
- Se a refatoração ficar grande, fallback: render simplificado dedicado dentro do wizard (cor de fundo da paleta + título + subtítulo), sem reaproveitar o editor.

### 3. Backend
- **Sem mudanças** em `carrossel-generate`. Já aceita `bgKinds` e responde sob esse filtro.
- **Sem mudanças** em DB.

## Fora de escopo
- Salvar as duas versões no Planner como rascunho (entrega atual: apenas a escolhida vai para o editor).
- Comparar 3+ versões.
- Editar a versão minimalista e a criativa em paralelo no editor.
- Mudar como as imagens são geradas no editor (continua igual).
