
# Refator do gerador de carrosséis

5 mudanças encadeadas no wizard, na edge function e no editor.

---

## 1. Princípios de design — 2 eixos independentes

**Wizard (`CarouselAIWizard.tsx`)**
- Remove a faixa atual de 12 cards (`DESIGN_PRINCIPLES`, `principleScrollRef`, scroll horizontal).
- Substitui por 2 grupos visuais lado a lado:
  - **Alinhamento do texto**: 2 cards (mini preview) — `Esquerda` / `Centralizado`. Single-select, obrigatório.
  - **Tipo de fundo**: 2 cards (mini preview) — `Foto cobrindo o slide` / `Sem imagem (só texto)`. Multi-select (1 ou 2). Se os dois marcados, IA alterna entre eles ao longo dos slides.
- Estado: `textAlign: "left" | "center"` e `bgKinds: Array<"foto" | "texto">`.

**Edge function (`carrossel-generate/index.ts`)**
- Substitui `PRINCIPLE_TO_LAYOUT` (12 entradas) por uma matriz 2×2 enxuta:
  - `foto-left`, `foto-center`, `texto-left`, `texto-center` — cada uma define `tipo`, `fundo`, `imageFrame` (`full` ou `null`), `layout` textual e `align`.
- Recebe `textAlign` + `bgKinds[]` no payload em vez de `designPrinciples[]`.
- `sequence[i]` distribui os `bgKinds` ciclicamente, sempre com o mesmo `textAlign`.
- Reescreve `principleAppendix` para refletir a nova lógica simples (1 alinhamento global, alternância de fundo).

**Compatibilidade**
- `Slide.bgKind` continua como hoje (`foto | off-white | bege-texturizado | branco`).
- Mantém `imageFrame` só para o caso `full`; remove os demais frames (`top-60`, `half-left`, `half-right`, `centered-square`, `bottom-third`) — não fazem mais parte da nova proposta.

---

## 2. Assinatura do perfil — global, 6 posições

**Wizard (`CarouselAIWizard.tsx`)**
- Onde hoje há o `instagram` input, vira bloco "Assinatura":
  - Input do `@handle` (mantém).
  - Grid 2×3 de cards visuais com 6 posições: `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`.
  - Toggle "Mostrar assinatura" (on por padrão).
- Propaga no bootstrap: `signaturePosition: "tl" | "tc" | "tr" | "bl" | "bc" | "br"`, `signatureEnabled: boolean`.

**Editor (`dashboard.studio.carrossel.tsx`)**
- Estende `SignaturePos` para incluir `tc` e `bc` (hoje só `bl|br|tl|tr`).
- Lê `signaturePosition` global do bootstrap e aplica em **todos** os slides ao montar.
- Painel direito ganha um único bloco "Assinatura do carrossel" (global, não por slide) com o mesmo grid 2×3 — alterar lá atualiza todos os slides.
- Renderer da assinatura: posiciona com `top/bottom` + `left:50% transform:translateX(-50%)` para `tc/bc`.

---

## 3. Pop-up "conteúdo extenso" antes de gerar

**Wizard (`CarouselAIWizard.tsx`)**
- Quando o usuário clica "Gerar carrossel" e a fonte é um post do planner:
  - Calcula caracteres totais do conteúdo selecionado.
  - Heurística: limite ~180 caracteres por slide. Se `total / slideCount > 180`, abre `<AlertDialog>` antes de chamar a edge function:
    - Mensagem: "Esse conteúdo é longo para X slides. Recomendamos Y slides para o texto respirar."
    - `Y = Math.min(10, Math.ceil(total / 180))`.
    - Botões: "Aumentar para Y slides" (set `slideCount = Y` e prossegue) / "Manter X slides" / "Cancelar".
- Aplica só quando origem = planner. Geração livre (sem post) não dispara.

---

## 4. Edição de texto e drag com guias

**Editor (`dashboard.studio.carrossel.tsx`)**

**Edição inline NÃO** — confirmado: edição continua pelo painel direito (já existe). Garantir que os 3 campos (title/subtitle/body) estejam sempre editáveis no painel para o slide ativo (revisar bloco que renderiza inputs ~linha 1300+ e remover qualquer condição que esconda campos por `slideType`).

**Drag com guias**
- Texto: já existe `textPos {x, y}` arrastável. Adicionar:
  - Snap thresholds (~3% do canvas) em centros e bordas: `x ∈ {0, 50, 100}`, `y ∈ {0, 25, 50, 75, 100}`.
  - Durante o drag, renderizar **guides visuais** (linhas absolutas dashed sobre o canvas) sempre que estiver "snapped":
    - Vertical no centro X, horizontal no centro Y, linhas das margens (10%/90%).
  - Guides somem ao soltar (`onPointerUp`).
- Mesma lógica para arrastar a imagem (`bgPos`) quando ela está em modo full.
- Implementa via novo componente interno `<DragGuides activeX activeY />` posicionado absolute dentro do `.slide-canvas`.

---

## 5. Limpeza

- Remove de `dashboard.studio.carrossel.tsx`: tipos/branches de `imageFrame` que não são `full | null` (top-60, half-*, centered-square, bottom-third) e o componente `<ImageFrame>` correspondente.
- Remove de `carrossel-generate/index.ts`: o array `DESIGN_PRINCIPLES` antigo, mapas e prompts dos 12 princípios.
- Remove de `CarouselAIWizard.tsx`: `DESIGN_PRINCIPLES`, `selectedPrinciples`, `principleScrollRef`, `holdScrollHandlers` e botões de scroll.
- Atualiza `.lovable/plan.md` para refletir a nova arquitetura.

---

## Detalhes técnicos

**Arquivos editados**
- `src/components/studio/CarouselAIWizard.tsx` — UI do wizard, estado, pop-up, bootstrap.
- `supabase/functions/carrossel-generate/index.ts` — payload, mapa 2×2, prompt.
- `src/routes/dashboard.studio.carrossel.tsx` — slide type, signature `tc/bc`, painel global de assinatura, drag guides, limpeza de frames.

**Sem mudanças de banco.** Tudo client + edge function.

**Tipos atualizados**
```ts
type TextAlignChoice = "left" | "center";
type BgKindChoice = "foto" | "texto";
type SignaturePos = "tl" | "tc" | "tr" | "bl" | "bc" | "br";

type Bootstrap = {
  // ...existente
  textAlign: TextAlignChoice;
  bgKinds: BgKindChoice[];
  signaturePosition: SignaturePos;
  signatureEnabled: boolean;
};
```

**Resultado esperado**
- Wizard fica 60% mais curto e direto.
- Slides gerados se parecem com os exemplos enviados: alinhamento consistente, foto-cheia OU só texto, assinatura sempre no mesmo canto.
- Posts longos do planner não geram slides com texto cortado — o pop-up força a decisão.
- Usuário consegue arrastar texto/imagem com sensação de Canva (snap + linhas guia).
