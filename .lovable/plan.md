# BLOCO 3 — Editor de Carrossel

Adiciona um editor visual completo em `/dashboard/studio/carrossel` com modal de seleção de formato, painel de edição, preview escalado, barra de slides e export ZIP.

## 1. Banco de dados

A tabela `client_briefings` hoje tem `palette` e `archetype`, mas **não tem fonte**. Adicionar campos:

- `client_briefings.brand_font` (text, nullable) — nome da fonte (Google Font ou nome do arquivo .ttf).
- `client_briefings.brand_font_url` (text, nullable) — URL pública (Google Fonts) ou caminho do storage.

Criar bucket de storage `brand-assets` (público), com policies: usuário autenticado pode upload/select/delete arquivos no próprio prefixo `{user_id}/...`. Usado tanto para fonte customizada (.ttf) quanto para imagens de fundo do editor.

Estender o passo "Marca" do briefing wizard (`dashboard.clientes.$id.briefing.tsx`) para incluir:
- Campo de fonte: input "Nome da fonte" + opção de upload `.ttf` (envia para `brand-assets/{user_id}/fonts/`).
- Indicação se é Google Font (carregada por `<link>`) ou arquivo customizado.

## 2. Dependências novas

- `html2canvas` — render de cada slide DOM em PNG.
- `jszip` — empacotar PNGs em um único arquivo.
- `file-saver` — disparar download do ZIP.
- `@dnd-kit/core` + `@dnd-kit/sortable` (já usados no planner se existir; senão instalar) — drag para reordenar slides.

## 3. Notificação badge no sidebar

Criar `src/lib/planner-notification.ts`:
- `markPlannerHasDraft()` / `clearPlannerHasDraft()` salvam flag em `localStorage` (`postly:planner:hasDraft`).
- Hook `usePlannerNotification()` retorna boolean reativo (via `storage` event + custom event).

Atualizar `AppSidebar.tsx`:
- Item "Planner de conteúdo" exibe um pontinho rosa (badge) quando flag ativa.
- Ao entrar em `/dashboard/planner`, limpar a flag.

## 4. Rota `/dashboard/studio/carrossel`

Arquivo: `src/routes/dashboard.studio.carrossel.tsx`.

### Fluxo

1. Ao montar: carrega cliente ativo (`ACTIVE_CLIENT_STORAGE_KEY`) + briefing (palette, archetype, brand_font, brand_font_url). Se não houver cliente, redireciona para `/dashboard/studio` com toast.
2. Abre **modal de formato** (não dispensável até escolher). Opções:
   - Carrossel `1080x1350`
   - Quadrado `1080x1080`
   - Stories `1080x1920`
   - Botão "Começar" → fecha modal e inicializa editor com 1 slide vazio.
3. Editor renderizado.

### Layout do editor

```text
+--------------------------------------------------+
| Header: voltar / título / cliente ativo          |
+----------+--------------------------+------------+
|          |                          |            |
| Painel   |     Preview do slide     |            |
| esquerdo |     (escalado p/ caber)  |            |
| 280px    |                          |            |
|          |                          |            |
+----------+--------------------------+------------+
| Barra de slides (miniaturas + add + remove)      |
+--------------------------------------------------+
```

Mobile: painel esquerdo vira drawer (botão "Editar"), barra de slides fica horizontal scroll na base.

### Estado do editor (em memória)

```ts
type Slide = {
  id: string;
  bgImage: string | null;          // dataURL ou URL pública
  overlay: { enabled: boolean; intensity: number; type: "dark"|"light"|"gradient" };
  text: { title: string; subtitle: string; body: string };
  fontSize: { title: number; subtitle: number; body: number };
  textColor: { title: string; subtitle: string; body: string };
};
type EditorState = {
  format: { w: number; h: number };
  slides: Slide[];
  activeId: string;
  selectedField: "title"|"subtitle"|"body" | null;
  font: { name: string; url: string|null; isCustom: boolean };
  palette: [string, string, string];
};
```

### Painel esquerdo — controles

Cada seção é um `Collapsible` ou bloco com título uppercase pequeno.

**IMAGEM DE FUNDO**
- Botão "Anexar imagem" → `<input type=file accept=image/*>`. Lê como dataURL (ou faz upload para `brand-assets`); salva em `slide.bgImage`.
- Miniatura do upload + botão "Remover".
- Checkbox "Aplicar em todos os slides" → propaga `bgImage` para todos.

**SOMBRA / OVERLAY**
- `Switch` ativar/desativar.
- `Slider` 0–100 (intensidade).
- `RadioGroup`: Escuro / Claro / Gradiente.

**TEXTO**
- 3 inputs: Título, Subtítulo, Corpo (textarea).
- Cada um com botão "Aplicar em todos os slides".
- Clicar no input torna esse campo o `selectedField` (para aplicar cor).

**FONTE**
- Mostra nome da fonte do DNA. Se Google Font: injeta `<link>` em `document.head` com `family=name`. Se custom (.ttf): registra `@font-face` via `FontFace` API com `brand_font_url`.
- 3 sliders de tamanho (Título 32–120, Subtítulo 20–80, Corpo 14–48).

**CORES**
- 3 swatches lado a lado da `palette`. Clique aplica `textColor[selectedField]`. Se nenhum campo selecionado, mostrar dica "Selecione um campo de texto".

**Rodapé do painel**
- Botão primário "Baixar todos" (com ícone Download).
- Botão secundário "Salvar rascunho".

### Preview central

Componente `SlideCanvas` com tamanho real (`format.w` × `format.h`) e `transform: scale(...)` para caber no container (mesma técnica do skill slides). O DOM real está em pixel-perfect 1080×N — necessário para `html2canvas` exportar nas dimensões corretas.

Ordem de camadas:
1. `<img bgImage>` cobrindo (object-fit: cover) ou cor sólida fallback.
2. Overlay (`div absolute inset-0`) com background calculado:
   - `dark`: `rgba(0,0,0, intensity/100)`
   - `light`: `rgba(255,255,255, intensity/100)`
   - `gradient`: `linear-gradient(180deg, transparent, rgba(0,0,0,intensity/100))`
3. Texto centralizado (flex column, padding) com Título/Subtítulo/Corpo nas fontes/cores escolhidas.

### Barra de slides

Lista horizontal de miniaturas (cada miniatura é um `SlideCanvas` em escala bem reduzida, `pointer-events: none`). Slide ativo: borda primária. Botão "+" no fim adiciona slide novo (clona estilos do anterior, texto vazio). Hover na miniatura mostra "×". Drag-and-drop com `@dnd-kit/sortable`.

### Export ZIP — "Baixar todos"

```ts
const zip = new JSZip();
for (let i = 0; i < slides.length; i++) {
  setActiveId(slides[i].id);          // força render
  await new Promise(r => requestAnimationFrame(r));
  const node = document.getElementById(`slide-export-${slides[i].id}`);
  const canvas = await html2canvas(node, { useCORS: true, scale: 1, width: format.w, height: format.h });
  const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), "image/png"));
  zip.file(`slide-${i+1}.png`, blob);
}
const out = await zip.generateAsync({ type: "blob" });
saveAs(out, `carrossel-${Date.now()}.zip`);
markPlannerHasDraft();
toast.success("Download iniciado! 🎉 Não esquece de pegar a legenda do seu post no Planner de conteúdo 📝", { duration: 8000 });
```

Para que `html2canvas` capture nas dimensões reais, renderiza-se um nó "exportável" oculto (`position: absolute; left: -99999px;` ou `visibility: hidden`) com tamanho original 1080×N por slide ativo.

### Salvar rascunho

Cria post em `content_posts` (na primeira semana do usuário) com:
- `title`: "Rascunho de carrossel — {cliente}"
- `notes`: JSON serializado do `EditorState` (para reabrir depois) + título do primeiro slide como resumo
- `status`: `'backlog'`
- `tags`: `['carrossel', 'rascunho']`

Toast de sucesso + `markPlannerHasDraft()`.

## 5. Atualizar Studio dashboard

`dashboard.studio.tsx`: trocar `onClick={() => toast.info("Em breve!")}` do card "Criar carrossel" por `navigate({ to: "/dashboard/studio/carrossel" })`. **Sem cobrança de créditos** neste bloco (o editor é manual; créditos são para geração por IA).

## 6. Componentes novos

```
src/components/studio/carrossel/
  FormatPickerDialog.tsx   - modal de formato
  SlideCanvas.tsx          - render pixel-perfect de 1 slide
  SlideThumbnail.tsx       - miniatura sortável
  SlidesBar.tsx            - barra inferior
  EditorPanel.tsx          - painel esquerdo (todas as seções)
  ColorSwatches.tsx
  OverlayControls.tsx
  TextFieldsControls.tsx
  FontControls.tsx
  BgImageControls.tsx
  useCarrosselEditor.ts    - hook com state + ações (addSlide, removeSlide, updateSlide, applyToAll, etc.)
  exportSlides.ts          - função de export ZIP
src/lib/planner-notification.ts
```

## 7. Out of scope (deste bloco)

- Drag livre de elementos no canvas (texto sempre centralizado por padrão).
- Edição inline clicando no preview (apenas via inputs do painel).
- Reabrir rascunho a partir do planner (apenas grava).
- Cobrança de créditos (editor manual).

## Detalhes técnicos resumidos

- Migration: `ALTER TABLE client_briefings ADD COLUMN brand_font text, ADD COLUMN brand_font_url text;` + criação de bucket `brand-assets` com policies por `auth.uid()`.
- Carregamento de Google Font: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=NAME&display=swap">` injetado uma vez via `useEffect`.
- Carregamento de fonte custom: `new FontFace(name, url(...)).load().then(f => document.fonts.add(f))`.
- `html2canvas` com `useCORS: true` para imagens do bucket público.
- Toda a estrutura permanece com design system atual (cores rosa, bordas, componentes shadcn).
