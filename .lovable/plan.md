## Finalizar editor: Planner expansível + geração de imagens em background

Restam 2 itens do fluxo aprovado anteriormente. Tudo já existe estruturalmente — só falta renderizar a UI do Planner e processar a fila `imageJobs`.

### 1) Seção "Planner de conteúdo" (colapsável) no painel esquerdo

Em `src/routes/dashboard.studio.carrossel.tsx`, dentro de `EditorPanel` (já recebe `plannerPosts` e `onApplyPlannerPost`, mas não os renderiza):

- Adicionar como **primeira `Section`** do painel (antes de "Layout & posição"), usando o estado `plannerOpen` que já existe.
- Cabeçalho clicável com chevron (expand/collapse) e contador (`{plannerPosts.length} posts`).
- Quando expandido:
  - Lista rolável (max-h ~240px) dos posts do cliente ativo.
  - Cada item exibe: **título** (font-medium, truncado em 2 linhas) + **badge do tipo** derivado das tags (`carrossel` / `reels` / `post`, fallback `post`) + 1ª linha de `notes` em muted, se houver.
  - Clique no item chama `onApplyPlannerPost(post)` → substitui o conteúdo do slide ativo (já implementado no parent).
  - Estado vazio: "Nenhum post no Planner para este cliente."

Sem mudanças no contrato de props (já tudo presente).

### 2) Geração de imagens em background com barra de progresso discreta

Em `src/routes/dashboard.studio.carrossel.tsx`:

- **Disparar o loop** após o bootstrap consumir `data.imageJobs`. Novo `useEffect` que depende de `bootstrapRef.current?.imageJobs` (armazenar a fila em state local `pendingImageJobs`).
- **Loop sequencial** (1 por vez para não sobrecarregar):
  - Para cada job `{ slideIndex, imagePrompt }`:
    - `setImageProgress({ current, total, percent })` antes de iniciar.
    - `await supabase.functions.invoke("carrossel-image", { body: { prompt, palette: dna.palette, archetype: bootstrapRef.current?.archetype } })`.
    - Se sucesso e retorna `imageDataUrl`: `setSlides` mapeando o slide nesse índice para receber `bgImage` + ajustar `textColor` para branco e `overlay` ativado (mesma lógica já usada no bootstrap quando há imagem).
    - Se erro: log + `toast.error` discreto, continua para o próximo.
  - Ao final: `setImageProgress(null)` + `toast.success("Imagens geradas")`.
- **Barra de progresso discreta**: renderizar acima da `SlidesBar` (entre o main e o footer de slides) quando `imageProgress != null`:
  - Linha fina (h-1) com `width: ${percent}%` em `bg-primary`.
  - Texto pequeno: "Gerando imagens… {current}/{total}" à direita.
  - Não bloqueia interação no editor — usuário pode editar texto/baixar enquanto roda.

### Arquivos editados

- `src/routes/dashboard.studio.carrossel.tsx` (única mudança)

### Sem mudanças

- Edge functions (`carrossel-generate`, `carrossel-image`, `screenshot-url`) — já criadas e prontas.
- `CarouselAIWizard.tsx` — já envia `imageJobs` no sessionStorage.
- Nenhuma migração de DB.
