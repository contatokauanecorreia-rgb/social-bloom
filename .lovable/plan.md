## Escopo
Aplicar 8 melhorias ao editor `src/routes/dashboard.studio.carrossel.tsx` mantendo a arquitetura atual (tipos, slides, export ZIP, salvar rascunho, barra de slides, picker de formato). Nenhum outro arquivo do app é tocado, exceto `src/lib/brand-font.ts` (carregar família completa) e o tipo `Slide`, que ganha campos novos com defaults retrocompatíveis.

---

## 1. Tamanho do slide no preview (auto-fit)

Em `ScaledPreview` o cálculo já existe mas tem dois problemas: (a) `parent.clientHeight` na maioria das vezes é o conteúdo do `<main>` colapsado e (b) o `Math.min(..., 0.8)` impõe um teto. Ajustes:

- Trocar `min-h-screen` do wrapper raiz por `h-screen` + flex coluna, garantindo que `<main>` tenha altura definida.
- Em `ScaledPreview`: medir o `<main>` (parent do parent) via `ResizeObserver`, calcular `scale = min((pw - 48) / format.w, (ph - 48) / format.h)` sem teto fixo, com mínimo de 0.1.
- Recomputar quando `format` muda e quando a janela redimensiona.

Resultado: o slide cabe sempre na coluna central sem zoom-out manual.

## 2. Fundo padrão dot-grid branco

Em `SlideContent`:
- Quando `slide.bgImage` é `null`, renderizar fundo branco com padrão de pontos via `background-image: radial-gradient(#0000001a 1px, transparent 1px); background-size: 24px 24px;` aplicado a uma camada de fundo.
- Remover o uso de `dna.palette[2]` como cor de fundo padrão (que estava deixando cinza/escuro). A paleta continua aplicada em texto e assinatura.

## 3. Alinhamento de texto por campo

Adicionar ao tipo `Slide`:

```ts
textAlign: { title: "left" | "center" | "right"; subtitle: ...; body: ... }
```

Default: todos `"center"` (mantém comportamento atual).

No `EditorPanel`, dentro de cada `TextFieldRow`, incluir 3 botões-ícone (`AlignLeft`, `AlignCenter`, `AlignRight` do lucide-react) que chamam `onUpdateActive` setando `textAlign[field]`. Independentes por campo.

Em `SlideContent`, aplicar `textAlign` em cada elemento (`h1`/`h2`/`p`) via `style.textAlign`. O container do bloco passa a usar `alignItems` derivado do alinhamento do título (para o bloco encolher e respeitar o lado correto): `flex-start | center | flex-end`.

## 4. Bloco de texto arrastável

Adicionar ao `Slide`:

```ts
textPos: { x: number; y: number } // 0..1 normalizado em relação ao slide
```

Default `{ x: 0.5, y: 0.5 }` (centro), retrocompatível.

Em `SlideContent`:
- O bloco de texto deixa de usar `inset: 0 + justifyContent: center`. Vira um `position: absolute` posicionado em `left: x*format.w; top: y*format.h; transform: translate(-50%, -50%)`, com `maxWidth: format.w * 0.84`.
- Mantém `flex-direction: column` e o gap da seção 5.

Drag (apenas no preview, não na thumb e não no node de export):
- Adicionar prop `draggable?: boolean` em `SlideContent`. `ScaledPreview` passa `true`; thumbs e export passam `false`.
- Quando `draggable`, envolver o bloco de texto em handlers `onPointerDown/Move/Up` que calculam o delta em pixels do slide (dividindo o delta da tela pelo `scale` recebido) e atualizam `textPos` via callback `onTextMove(dx, dy)` exposto pela `ScaledPreview` para o pai.
- Limitar `x`,`y` em `[0.05, 0.95]`.

`CarrosselEditorPage` ganha um `updateActiveTextPos(dx, dy)` que aplica em cima do `textPos` atual.

## 5. Espaçamento padrão

Em `SlideContent`, substituir o `gap: 24` único por gaps explícitos entre elementos. Como flex `gap` é único, renderizar com margens:

- `subtitle`: `marginTop: 16`
- `body`: `marginTop: 12`

Aplicado apenas quando o elemento anterior também está visível. Esses valores ficam em constantes `TITLE_TO_SUBTITLE = 16`, `SUBTITLE_TO_BODY = 12`.

## 6. Família completa de fontes (300–700)

Atualizar `src/lib/brand-font.ts`:

- `loadGoogleFont(family)` passa a requisitar `wght@300;400;500;600;700` (já é quase isso; garantir todos os pesos).
- Manter cache via `loadedGoogle` Set.

Adicionar ao `Slide`:

```ts
fontWeight: { title: number; subtitle: number; body: number }
```

Defaults: title 700, subtitle 500, body 400 (retrocompatíveis com os pesos atuais hardcoded).

No `EditorPanel` seção FONTE, abaixo de cada slider de tamanho, um `<select>` (ou shadcn `Select`) com opções 300/400/500/600/700 rotuladas (Light/Regular/Medium/SemiBold/Bold) que atualiza `fontWeight[field]`.

Em `SlideContent`, trocar `fontWeight: 800/600/400` hardcoded por `slide.fontWeight.title|subtitle|body`.

## 7. Seção ASSINATURA

Adicionar ao `Slide`:

```ts
signature: {
  enabled: boolean;
  handle: string;          // "@studiobelaforma"
  position: "bl" | "br" | "tl" | "tr";
  color: string;           // cor da paleta, default dna.palette[0]
}
```

Defaults: `{ enabled: false, handle: "", position: "br", color: dna.palette[0] }`.

No `EditorPanel`, nova `Section title="Assinatura"` abaixo de Cores:
- `Switch` para `enabled`.
- `Input` para `handle` (placeholder `@suamarca`).
- `RadioGroup` 2x2 com 4 opções de canto.
- Linha de 3 swatches da paleta para escolher a cor.
- Botão/checkbox "Aplicar em todos os slides" (usa `onApplyToAll` para copiar o objeto inteiro de `signature`).

Em `SlideContent`, quando `signature.enabled && handle`, renderizar um `<div>` `position: absolute` com padding `format.w * 0.05`, `fontSize: format.w * 0.025`, `fontWeight: 600`, cor `signature.color`, ancorado no canto:
- `bl`: `left/bottom`
- `br`: `right/bottom`
- `tl`: `left/top`
- `tr`: `right/top`

## 8. Autocomplete de título via Planner

No `EditorPanel`, o campo Título do `TextFieldRow` ganha um modo "com sugestões". Implementação:

- O componente pai (`CarrosselEditorPage`) carrega 1x, quando `userId` e `clientId` existirem:
  ```ts
  supabase.from("content_posts")
    .select("title")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200)
  ```
  e guarda em `plannerTitles: string[]`.
- Passa `plannerTitles` para `EditorPanel` → para o `TextFieldRow` do título.
- Quando o usuário digita ≥2 chars, filtra `plannerTitles` por `includes` case-insensitive (até 6 sugestões) e exibe um `<ul>` absoluto abaixo do `Input` (estilo dropdown shadcn). Clicar preenche o título via `onChange` e fecha.
- Se a lista filtrada está vazia (ou não há posts para o cliente), o dropdown não aparece.
- Fechar ao perder foco (com pequeno delay para permitir o click).

A tabela `content_posts` confirmadamente tem `title` e `client_id` no schema, RLS por `user_id` já garante isolamento.

---

## Detalhes técnicos

**Tipo Slide atualizado** (defaults em `makeSlide`):
```text
textAlign:   { title:"center", subtitle:"center", body:"center" }
textPos:     { x:0.5, y:0.5 }
fontWeight:  { title:700, subtitle:500, body:400 }
signature:   { enabled:false, handle:"", position:"br", color:dna.palette[0] }
```

`makeSlide` recebe `dna` opcional para inicializar `signature.color`. Onde já é chamado sem argumento (estado inicial), usar `DEFAULT_PALETTE[0]`.

**Drag math** (em `ScaledPreview`):
```text
onPointerMove: dx_real = (e.clientX - startX) / scale
               dy_real = (e.clientY - startY) / scale
               newX = clamp(startPos.x + dx_real / format.w, 0.05, 0.95)
               newY = clamp(startPos.y + dy_real / format.h, 0.05, 0.95)
```

**Renderização texto (SlideContent)**: container do bloco com `display:flex; flex-direction:column; alignItems` derivado do `textAlign.title`; cada filho com seu próprio `textAlign`. Margens superiores conforme seção 5.

**Export ZIP**: continua usando `slide-export-${id}` com `SlideContent draggable={false}`. Como agora SlideContent honra `textPos`/`textAlign`/`fontWeight`/`signature`, o export sai idêntico ao preview.

**Retrocompat com rascunhos antigos**: ao carregar slides salvos do Planner (futuro), garantir defaults via spread em `makeSlide`. (Não há fluxo de "abrir rascunho" hoje, então só os defaults bastam.)

---

## Arquivos modificados

- `src/routes/dashboard.studio.carrossel.tsx` — tipos, painel, preview, slide content, autocomplete, drag, assinatura.
- `src/lib/brand-font.ts` — pesos 300;400;500;600;700.

## Fora do escopo

- Barra de slides (thumbs), header, picker de formato, salvar rascunho, export ZIP — sem mudanças além do efeito automático das novas propriedades sendo respeitadas.
- Roteamento `/dashboard/studio` e `Outlet` — já corrigidos.
