## Editor de carrossel: edição inline + remoção de seções e formato fixo 4:5

Mantém tudo o que já existe. Apenas as remoções, ajustes e a nova edição inline pedidos.

---

### 1) Formato fixo 1080×1350 (remover tela "Escolha o formato")

Arquivo: `src/routes/dashboard.studio.carrossel.tsx`

- `useState<Format | null>(null)` + `formatPickerOpen` → trocar por `useState<Format | null>(FORMATS[0])` e remover `formatPickerOpen` (e todos os `setFormatPickerOpen(...)`).
- Remover o JSX `<FormatPickerDialog .../>` no final do componente.
- Remover a função/handler `handlePickFormat` (não é mais usada).
- Remover o componente `FormatPickerDialog` inteiro do arquivo (declarado mais abaixo).
- Resultado: ao entrar em `/dashboard/studio/carrossel`, já abre direto no editor com formato 1080×1350.

### 2-3-5) Remover do painel esquerdo as seções "Layout & posição do texto", "Texto" e "Fonte"

Arquivo: `src/routes/dashboard.studio.carrossel.tsx`, dentro de `EditorPanel`:

- Remover bloco `{/* LAYOUT & POSIÇÃO */} <Section title="Layout & posição do texto"> ... </Section>` (linhas ~1000-1036).
- Remover bloco `{/* TEXTO */} <Section title="Texto"> ... </Section>` com os 3 `TextFieldRow` (linhas ~1205-1265).
- Remover bloco `{/* FONTE */} <Section title="Fonte"> ... </Section>` com sliders de tamanho/peso (linhas ~1267-1316).
- Remover funções auxiliares no `EditorPanel` que ficam órfãs: `setAlign`, `setWeight`, e a prop `onApplyToAll` se não for usada por mais nada (verificar Cores/Assinatura — manter se ainda usada). Manter `selectedField`/`setSelectedField` (a seção "Cores" continua usando).
- O componente `TextFieldRow` no arquivo passa a ser não-utilizado; remover a definição também.

Manter no painel esquerdo (mesma ordem):
1. Planner de conteúdo (já existe)
2. Imagem de fundo (já existe)
3. Grade de imagem — **manter como está** (só foi pedido para remover Layout/Texto/Fonte; "Grade de imagem" não está na lista de remoção). Se o usuário quiser remover depois, é trivial.
4. Sombra/Overlay (já existe)
5. Cores (já existe)
6. Assinatura (já existe)

> Observação: a lista do usuário não menciona "Grade de imagem". Vou mantê-la para não remover algo fora do escopo. Se quiser tirar, basta dizer.

### 4) Edição inline no preview

- Em `SlideContent` (`src/routes/dashboard.studio.carrossel.tsx`):
  - Adicionar prop opcional `onEditField?: (field: TextField, value: string) => void` e `onSelectField?: (f: TextField) => void` e `editable?: boolean`.
  - Os elementos `<h1>` (title), `<h2>` (subtitle), `<p>` (body) recebem, quando `editable`:
    - `contentEditable suppressContentEditableWarning`
    - `onClick`: `e.stopPropagation()` + `onSelectField(field)` (para a seção Cores saber em qual campo aplicar).
    - `onBlur`: chamar `onEditField(field, e.currentTarget.innerText)`.
    - `onKeyDown`: se `Enter` sem Shift, `e.preventDefault()` e `(e.currentTarget as HTMLElement).blur()` (Enter confirma; Shift+Enter quebra linha).
    - `style.outline: "none"` + `cursor: text` quando editável.
  - Quando o slide está editável, **desabilitar drag** do bloco de texto (já não há mais o seletor de posição; o texto vem posicionado automaticamente). Para isso: condicional simples — se `editable`, ignorar handlers de pointer.
  - Renderizar inputs vazios de forma editável: trocar a guarda `slide.text.title && (...)` por sempre renderizar quando `editable` (mostrar placeholder leve via `data-placeholder` + CSS inline `:empty::before` substituto: usar fallback string como `"Toque para editar título"` quando vazio, com cor `slide.textColor.title` em opacidade 60%). Para simplificar, renderizar sempre os 3 elementos quando editável e usar `innerText` vazio com pseudo-placeholder via `&:empty:before` num `<style>` inline ou usando `data-empty` + classe utilitária. Implementação concreta: condicional `editable ? (sempre renderiza) : (renderiza só se houver texto)`.
- No `ScaledPreview`, encaminhar as novas props para `SlideContent`.
- No uso de `<ScaledPreview slide={activeSlide} ... onMoveText={moveActiveText} />` (linha ~747):
  - Remover `onMoveText` (não há mais reposicionamento manual).
  - Adicionar `editable`, `onSelectField={setSelectedField}` e `onEditField={(field, value) => updateActive((s) => ({ ...s, text: { ...s.text, [field]: value } }))}`.
- O `SlideContent` usado em `exportRef` (hidden, linha ~805) e na `SlidesBar` continua **não-editável** (sem `editable`).
- Remover a função `moveActiveText` se ficar sem chamadas.

### 6) Geração com IA: imagens sem texto

Arquivo: `supabase/functions/carrossel-image/index.ts`

- Em `fullPrompt`, acrescentar diretiva forte:
  - `"Pure photographic/visual content. Absolutely no text, no letters, no typography, no captions, no watermarks, no logos with text, no signs."`
  - Texto final: `${prompt}. ${styleStr} ${segStr} Editorial, high quality, soft natural lighting, instagram feed aesthetic, vertical 4:5 composition. Pure photographic/visual content only — no text, no letters, no typography, no captions, no watermarks, no signs anywhere in the image.`

Arquivo: `supabase/functions/carrossel-generate/index.ts`

- No `systemPrompt`, complementar a regra do `imagePrompt`:
  - Acrescentar: `"O imagePrompt deve descrever apenas conteúdo visual/fotográfico — nunca peça texto, letras, tipografia, legendas, marca d'água ou logos com texto na imagem."`

### 7) Posicionamento automático pela IA (sem edição manual de posição)

- Como a IA escreve copies curtas e o `textPos` default é `{ x: 0.5, y: 0.5 }` (centro), o texto já fica centralizado. O reposicionamento manual deixou de existir junto com a remoção do "Layout & posição".
- Não é necessário pedir à IA coordenadas: o layout fixo 4:5 + texto centralizado + alinhamento centro (default em `makeSlide`) é suficiente. O `textAlign`/`textPos` continuam no modelo `Slide` para não quebrar o restante (export, signature, cores).

### Sem alterações em

- Wizard (`CarouselAIWizard.tsx`) — fluxo continua igual; apenas pula direto para o editor.
- `screenshot-url`, `TemplatesDialog`, `dashboard.studio.tsx`, tabela `carousel_templates`.
- Seções restantes do painel: Planner, Imagem de fundo, Grade de imagem, Sombra/Overlay, Cores, Assinatura.

### Arquivos editados

- `src/routes/dashboard.studio.carrossel.tsx` (remoções + edição inline + formato fixo)
- `supabase/functions/carrossel-image/index.ts` (proibir texto na imagem)
- `supabase/functions/carrossel-generate/index.ts` (proibir texto no `imagePrompt`)
