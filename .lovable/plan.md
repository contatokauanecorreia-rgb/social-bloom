
## Objetivo

Dois ajustes no fluxo de criação de carrossel (Studio → Criar carrossel):

1. Quando o conteúdo vem do **Planner**, a IA precisa **reescrever os posts** seguindo os 12 princípios de design de conteúdo (espaço branco, contraste, proporção, hierarquia, ênfase, equilíbrio, alinhamento, harmonia, margens, direcionamento, variedade, ritmo) — não pode só "jogar o título do post no slide".
2. Substituir o seletor de **"Imagens no carrossel"** (4 botões: Sem imagens / Só fundo / Só grade / Intercalar) por um **seletor visual de grade** com **setas ← →** alternando entre **mini-previews de layouts de grade de imagens**.

---

## 1) Planner → Carrossel com princípios de design

Hoje (`CarouselAIWizard.tsx`, linhas 437–446) os posts do Planner viram um texto cru:

```
Posts selecionados do Planner:
1. Título do post — notes
2. ...
```

isso vai como `topic` para `carrossel-generate`, que trata como tema livre. Resultado: a IA improvisa do zero e ignora o conteúdo já escrito.

**Mudança:**

- No frontend (`CarouselAIWizard.handleGenerate`) passar um novo campo `plannerSource`:
  ```ts
  plannerSource: contentSource === "planner" ? {
    posts: picked.map(p => ({ title: p.title, tags: p.tags, notes: p.notes }))
  } : null
  ```
  e manter `effectiveTopic` apenas como rótulo curto.
- Em `carrossel-generate/index.ts`, quando `plannerSource` chegar, injetar um bloco extra no `systemPrompt` chamado **"ADAPTAÇÃO DO PLANNER COM PRINCÍPIOS DE DESIGN DE CONTEÚDO"** que instrui a IA a:
  - Tratar cada post do Planner como **briefing bruto**, não como texto final.
  - Reorganizar em N slides aplicando os 12 princípios (lista resumida no prompt: espaço branco, contraste, proporção, hierarquia, ênfase, equilíbrio, alinhamento, harmonia, margens, direcionamento Z/L/reta, variedade, ritmo rápido/lento).
  - Para cada slide decidir: 1 ideia central, palavra de ênfase, hierarquia título/subtítulo/corpo, ritmo (slide curto vs. denso) e direcionamento de leitura.
  - Manter limites de caracteres já existentes (369/422).
  - Continuar usando os sistemas Minimalista/Criativo já detectados pelo DNA.

Sem mudar schema da tool — os princípios refletem nas escolhas de tipo (M1–M5 / C1–C5), `palavra_destaque`, `label` e tamanhos de texto que a IA já controla.

## 2) Seletor visual de grades de imagens

**Substituir** o bloco atual em `CarouselAIWizard.tsx` (linhas ~770–796 e o card de toggle "Gerar imagens com IA" 798–808) por um carrossel de **layouts de grade** com setas em direções opostas.

### UI

```text
Imagens no carrossel
┌────────────────────────────────────────────────┐
│  ←   ┌───────────┐   ┌───────────┐   ┌───────┐ │
│      │  preview  │   │  preview  │   │ prev. │ │   →
│      │  layout A │   │  layout B │   │ lay C │ │
│      └───────────┘   └───────────┘   └───────┘ │
│                ●  ○  ○  ○  ○  ○                │
└────────────────────────────────────────────────┘
            [ Nome do layout selecionado ]
```

- Setas ← → ficam em **lados opostos** do trilho (esquerda e direita).
- Cada card é um **mini-mockup SVG** (1:1.25, fundo claro) mostrando a estrutura de imagens dentro de um slide.
- Selecionar um card define `imageMode` interno + um novo campo `gridLayout`.

### Layouts (8 variações iniciais)

| id              | descrição                                          | imageMode interno |
|-----------------|----------------------------------------------------|-------------------|
| `none`          | Sem imagens (slide só tipografia)                  | `none`            |
| `full-bg`       | 1 imagem ocupando o slide inteiro                  | `bg`              |
| `half-top`      | Imagem na metade superior, texto embaixo           | `bg` + zona       |
| `half-side`     | Imagem à esquerda 50%, texto à direita             | `bg` + zona       |
| `grid-2x2`      | 4 imagens em grade 2×2                             | `grid`            |
| `grid-3-mosaic` | 1 imagem grande + 2 menores ao lado                | `grid`            |
| `strip-3`       | 3 faixas horizontais de imagem                     | `grid`            |
| `polaroid-mix`  | 2–3 polaroids sobrepostas em fundo neutro          | `mixed`           |

Isso vira um array constante no topo do componente:

```ts
const GRID_LAYOUTS: { id: GridLayoutId; label: string; mode: ImageMode; preview: ReactNode }[] = [...]
```

### Estado e payload

- Substituir `imageMode` por `gridLayout: GridLayoutId` (mapeia para `imageMode` ao mandar para a edge function, mantendo compatibilidade backend).
- Card "Gerar imagens com IA (FLUX...)" some — quando `gridLayout !== "none"` a geração com IA fica implícita (já era o default `aiImages = true`).
- `imageStyle` (textarea de estilo) continua aparecendo quando `gridLayout !== "none"`.

### Backend

- `carrossel-generate` continua recebendo `imageMode` (derivado).
- Adicionar campo opcional `gridLayout` no payload e no `bootstrap` salvo em `sessionStorage`, para o **editor** (`dashboard.studio.carrossel.tsx`) saber qual layout aplicar nos slides com foto.
- No editor, no momento de criar os slides a partir do bootstrap, aplicar `slide.gridLayout` e renderizar diferente quando for `grid-2x2`, `strip-3`, etc. (zonas de imagem em vez de só `bgImage`). Numa primeira iteração, layouts não-`bg` aplicam a imagem como `bgImage` mas com **máscara CSS / posição** correspondente.

---

## Detalhes técnicos

**Arquivos alterados:**

- `src/components/studio/CarouselAIWizard.tsx`
  - Novo tipo `GridLayoutId` + array `GRID_LAYOUTS` com previews SVG inline.
  - Novo componente local `GridLayoutPicker` com `useState` de índice + setas.
  - Remove os 4 botões de `imageMode` e o card "Gerar imagens com IA".
  - `handleGenerate`: monta `imageMode` a partir do layout, envia `plannerSource` quando aplicável e inclui `gridLayout` no body e no bootstrap.

- `supabase/functions/carrossel-generate/index.ts`
  - Aceita `plannerSource?: { posts: { title; tags; notes }[] }` e `gridLayout?: string`.
  - Quando `plannerSource` presente, injeta o appendix "PRINCÍPIOS DE DESIGN DE CONTEÚDO" no `systemPrompt` e troca o conteúdo do user message para listar os posts como matéria-prima.
  - `gridLayout` é só repassado nos `meta` (não muda a tool), apenas garante que slides com layout de grade tenham `imagePrompt` preenchido.

- `src/routes/dashboard.studio.carrossel.tsx`
  - Lê `gridLayout` do bootstrap, guarda em estado e usa no render do slide para decidir entre `bg`, grade 2×2, faixas, etc. (primeiras 2 variações além de `bg` na primeira release; resto cai em `bg`).

**Não mexe em:** DNA, fontes, paleta, alinhamento, FLUX 2 pro, limites de caracteres, autenticação.

## Resultado esperado

- Selecionar posts do Planner agora gera carrosséis **visualmente coerentes** com os princípios de design, em vez de copiar o título do post.
- A escolha de imagens passa a ser uma **decisão visual** (eu vejo o layout antes), não 4 rótulos de texto ambíguos.
