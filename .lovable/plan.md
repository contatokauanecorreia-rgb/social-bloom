# Video Workflow — Canvas de geração de vídeo com IA

Nova página em `/dashboard/studio/video-workflow` com um canvas visual no estilo node-editor, onde 5 blocos aparecem conectados por linhas, na ordem fixa: **vídeo → cenário → IA → LUTs → gerar**. O usuário pode arrastar cada bloco para reposicionar, mas a ordem de execução do pipeline é sempre a mesma.

## Escopo do que será construído

### 1. Nova rota
- `src/routes/dashboard.studio.video-workflow.tsx` (filha de `/dashboard/studio`, herda header, picker de cliente e contexto)
- `head()` próprio: title `Video Workflow — Postly`, description e og tags
- Card de entrada na grade do Studio (`dashboard.studio.tsx`) ao lado de "Carrossel AI" para navegar até a nova página

### 2. Canvas com blocos arrastáveis
- Componente `VideoWorkflowCanvas.tsx` em `src/components/studio/video-workflow/`
- Área `relative` com fundo em grid sutil (token `--muted`), altura responsiva (≥600px desktop, scroll vertical no mobile)
- 5 blocos posicionados via `position: absolute` com `{ x, y }` em estado React
- Drag implementado com `pointerdown/pointermove/pointerup` nativos (sem libs novas) — clamp dentro do canvas, cursor `grabbing`
- Posições persistidas em `localStorage` por usuário: `postly-video-workflow-layout`
- Botão "Reorganizar" para resetar ao layout padrão
- Linhas de conexão: SVG `<path>` em camada absoluta atrás dos blocos, curvas Bézier ligando borda direita do bloco N à borda esquerda do bloco N+1, recalculadas ao arrastar
- Indicador visual de etapa concluída (check verde) e etapa ativa (ring `--primary`)

### 3. Os 5 blocos (componentes em `src/components/studio/video-workflow/blocks/`)

**Bloco 1 — Upload de vídeo** (`VideoUploadBlock.tsx`)
- Drop zone aceitando `.mp4`, `.mov`, `.webm` (máx 100MB validado no client)
- Preview com `<video>` controlado, nome e tamanho do arquivo
- Botão remover

**Bloco 2 — Cenário** (`SceneBlock.tsx`)
- Toggle entre dois modos: "Imagem" ou "Prompt de texto"
- Imagem: drop zone (`.jpg/.png/.webp`, máx 10MB) com preview
- Texto: `<Textarea>` com contador (máx 500 chars), placeholder ex.: "Praia ao pôr-do-sol, tons quentes…"

**Bloco 3 — Modelo de IA** (`AIModelBlock.tsx`)
- `RadioGroup` com 3 cards selecionáveis:
  - Luma Ray2 Flex — rápido, ideal para iterações
  - Luma Ray2 Reimaginar — reinterpreta cenário mantendo movimento
  - Kling via Replicate — maior fidelidade, mais lento
- Cada card mostra ícone, nome, breve descrição e estimativa de tempo

**Bloco 4 — LUTs e ajuste de cor** (`ColorGradingBlock.tsx`)
- 3 sliders (shadcn `Slider`): Contraste, Saturação, Temperatura (cada um de -100 a +100, default 0)
- Valores numéricos ao lado de cada slider
- Grid 3×2 de LUTs como botões selecionáveis: Cinema, Neon, Natural, B&W, Golden, Cold — um deles ativo por vez (default "Natural"), cada um com mini-thumb colorido representando o look

**Bloco 5 — Gerar** (`GenerateBlock.tsx`)
- Estado de validação: desabilita botão até blocos 1, 2 e 3 estarem preenchidos
- Botão `Gerar vídeo` (variant primary, full width)
- Ao clicar: barra de progresso (`Progress` do shadcn) animada 0→100 em etapas simuladas (upload → processamento → grading → finalização), com label de etapa atual
- Mensagem de sucesso ao terminar com placeholder "Em breve: integração com os modelos selecionados"

### 4. Estado e validação
- Hook `useVideoWorkflowState.ts` centraliza: `video`, `scene`, `model`, `grading`, `progress`, `status`
- Validação por bloco (booleano `complete`) usada para acender check e para liberar o botão Gerar
- Sem integração de backend nesta etapa — somente UI funcional + persistência local

## Fora de escopo
- Chamada real às APIs Luma/Replicate (ficará para próxima iteração)
- Upload dos arquivos para Lovable Cloud Storage
- Histórico de gerações
- Edição da ordem dos blocos (a sequência do pipeline é fixa por design)

## Arquivos a criar/editar
- novo `src/routes/dashboard.studio.video-workflow.tsx`
- novos componentes em `src/components/studio/video-workflow/` (canvas + 5 blocos + hook)
- editar `src/routes/dashboard.studio.tsx` para adicionar o ModeCard de entrada
