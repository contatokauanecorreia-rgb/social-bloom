## Adicionar 3 funcionalidades: estilo de imagem, salvar templates, card de templates salvos

Mantém tudo que já existe. Adições isoladas e bem delimitadas.

---

### 1) Estilo das imagens no wizard

**Arquivo:** `src/components/studio/CarouselAIWizard.tsx`

- Novo state `imageStyle: string` (vazio por padrão), reset junto com os outros no `useEffect` de close.
- Nova seção no **Step 1**, inserida logo **antes** do botão "Continuar" (após o bloco "Gerar imagens com IA"):
  - Label: `Estilo das imagens (opcional)`
  - `Textarea` com placeholder: `Ex: editorial minimalista, fotorrealista ao ar livre, cores vibrantes...`
  - Helper: `Se vazio, será usado um estilo padrão baseado no arquétipo da marca.`
- No `handleGenerate`, propagar `imageStyle: imageStyle.trim() || null` para cada `imageJob` (`{ slideIndex, imagePrompt, imageStyle }`) e salvar no `bootstrap`.

**Arquivo:** `src/routes/dashboard.studio.carrossel.tsx`

- Atualizar tipo de `imageJobs` para incluir `imageStyle?: string | null`.
- No loop de geração (linha ~270), passar `imageStyle: job.imageStyle ?? null` no body do invoke `carrossel-image`.

**Arquivo:** `supabase/functions/carrossel-image/index.ts`

- Aceitar `imageStyle?: string | null` no body.
- Compor `fullPrompt`: se `imageStyle` presente, usar como diretiva principal de estilo; senão, manter o fallback atual baseado em `archetype`.

---

### 2) Salvar como template (no editor)

**DB — nova tabela `carousel_templates`** (migração):

```sql
create table public.carousel_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id uuid not null,
  name text not null,
  font_pair jsonb,           -- { heading, body }
  palette text[] not null default '{}',
  layout jsonb,              -- { fontSize, textAlign, fontWeight, textPos }
  overlay jsonb,             -- { enabled, intensity, type }
  signature jsonb,           -- { enabled, position, color }
  image_style text,
  created_at timestamptz not null default now()
);
alter table public.carousel_templates enable row level security;

create policy "users select own templates" on public.carousel_templates
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own templates" on public.carousel_templates
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users delete own templates" on public.carousel_templates
  for delete to authenticated using (auth.uid() = user_id);
```

**Arquivo:** `src/routes/dashboard.studio.carrossel.tsx`

- Adicionar no header (canto direito, antes do espaço flexível ou ao lado do título) um cluster:
  - `Checkbox "Salvar como template"` (state `saveTemplateChecked`).
  - Quando marcado, exibe inline: `Input` para nome do template + `Button "Salvar template"`.
- Handler `handleSaveTemplate`:
  - Coleta do `activeSlide`: `fontSize`, `textAlign`, `fontWeight`, `textPos`, `overlay`, `signature` (sem `enabled`/`handle` pessoais — guarda só posição/cor).
  - Coleta de `pageFontPair` e `dna.palette`.
  - `imageStyle` lido do `bootstrapRef.current?.imageStyle` (precisa salvar no bootstrap junto com os jobs).
  - Insere na tabela `carousel_templates` com `name`, `client_id` (clientId atual), e os blobs.
  - Toast de sucesso + desmarca o checkbox.

---

### 3) Card "Templates salvos" no Studio

**Arquivo:** `src/routes/dashboard.studio.tsx`

- Adicionar 5º `ModeCard` após "Criar roteiro":
  - Ícone: `Bookmark` (lucide-react).
  - Título: `Templates salvos`.
  - Descrição: `Use um estilo que você já criou antes`.
  - `cost={0}` (sem créditos) — verificar se `ModeCard` aceita; se exibe "X créditos", passar `cost` como `null`/oculto. Se necessário, adicionar prop opcional `costLabel="Sem custo"` ou `hideCost`.
  - `disabled` somente quando não há cliente selecionado (igual ao card carrossel).
  - `onClick`: abre `<TemplatesDialog>`.

**Novo componente:** `src/components/studio/TemplatesDialog.tsx`

- Props: `open`, `onOpenChange`, `clientId`.
- Carrega templates: `select * from carousel_templates where client_id = ? order by created_at desc`.
- Lista com cada item exibindo:
  - **Nome** + data formatada (`pt-BR` short).
  - **Preview de cores**: 3 swatches da `palette`.
  - **Preview de fonte**: nome da `font_pair.heading` + amostra "Aa" renderizada nessa fonte (carregada via `loadGoogleFont`).
  - Botão `Usar este template`.
- Ao clicar "Usar este template":
  - Salva no `sessionStorage` chave `studio:carrossel:template` com o objeto completo.
  - Fecha modal e navega para `/dashboard/studio/carrossel`.
- Empty state: `Nenhum template salvo ainda. Crie um carrossel e salve como template.`

**Arquivo:** `src/routes/dashboard.studio.carrossel.tsx`

- Novo `useEffect` no mount que lê `studio:carrossel:template` do sessionStorage. Se existir:
  - Auto-pick formato carrossel 4:5 (igual ao bootstrap atual).
  - Cria 1 slide vazio aplicando: `fontSize`, `textAlign`, `fontWeight`, `textPos`, `overlay`, `signature` do template.
  - Aplica `palette` no `dna` e `font_pair` em `pageFontPair` (carrega Google Fonts).
  - Limpa o sessionStorage.

---

### Arquivos editados/criados

- `src/components/studio/CarouselAIWizard.tsx` — nova seção "Estilo das imagens"
- `src/routes/dashboard.studio.carrossel.tsx` — checkbox/save template + bootstrap de template + propagação de `imageStyle`
- `src/routes/dashboard.studio.tsx` — 5º card
- `src/components/studio/TemplatesDialog.tsx` — **novo**
- `src/components/studio/ModeCard.tsx` — pequeno ajuste opcional para custo "Sem custo" (se necessário)
- `supabase/functions/carrossel-image/index.ts` — usar `imageStyle` quando presente
- Migração: criar tabela `carousel_templates` com RLS

### Sem mudanças

- `carrossel-generate`, `screenshot-url`
- Fluxo atual de wizard, planner, geração de slides
