## Problema

Hoje o fluxo do carrossel tem duas fases:

1. **Texto/variantes** — `carrossel-generate` (rápido, no wizard).
2. **Imagens** — `carrossel-image` rodando em loop dentro de `dashboard.studio.carrossel.tsx`, **só enquanto o usuário fica na página**.

Consequências:
- O `studio_jobs` é marcado como `done` assim que as variantes de texto saem — antes das imagens. Então o item já aparece em **"Recentes"** mesmo sem imagens prontas.
- Clicar em um item "recente" reabre o wizard na tela **"Escolha a versão"** — não é o que o usuário quer.
- Se o usuário sai da tela do editor durante a geração das imagens, o loop é interrompido (vive dentro do componente da rota). Nada continua em background.

## Objetivo

- A geração de **imagens** também roda como job de background, com progresso real refletido em "Em andamento" no Studio.
- Sair da página do editor **não cancela** mais a geração — ela continua enquanto o usuário estiver em qualquer rota `/dashboard/*`.
- Quando todas as imagens ficam prontas, o `studio_jobs.status` vira `done` e o toast global avisa.
- Clicar em um job em **"Recentes"** (kind=carrossel, done) abre direto o **editor** com os slides finais (com imagens), pulando a tela de escolha.
- Clicar em **"Em andamento"** abre o editor e continua mostrando o progresso da geração das imagens.

## Plano

### 1. Modelo de job estendido

Em `studio_jobs.result` (JSONB, já existe), passar a guardar para `kind="carrossel"`:

```text
{
  phase: "variants" | "images" | "done",
  variant?: "minimalista" | "criativo",   // qual o usuário escolheu
  bootstrap?: { ... }   // o mesmo objeto que hoje vai em sessionStorage
  slides?: Slide[],     // estado completo dos slides (com bgImage por slide)
  imagesDone?: number,  // contador parcial
  imagesTotal?: number,
  ctx?: ...             // como hoje
  textAlign?: ...
}
```

`status` permanece `running` até as imagens da variante escolhida terminarem.

Sem migration: o campo `result` já é JSONB livre.

### 2. Worker de imagens global (continua em background)

Criar `src/lib/carousel-image-worker.ts` com um hook `useCarouselImageWorker(userId)` montado **uma vez** em `src/routes/dashboard.tsx`. Ele:

- Faz `select` inicial dos `studio_jobs` do usuário com `kind="carrossel"`, `status="running"`, `result->>phase = "images"` e que ainda têm `imageJobs` pendentes.
- Mantém um `Set<jobId>` em memória de jobs sendo processados (evita duplicar enquanto Realtime emite eventos).
- Para cada job, processa um `imageJobs[]` sequencialmente chamando `carrossel-image`. A cada imagem:
  - Atualiza `result.slides[idx].bgImage` e `result.imagesDone` no banco (UPDATE).
  - Atualiza `progress` (porcentagem).
- Quando termina: `status="done"`, `phase="done"`, dispara o toast (já existe via `useStudioJobs`).
- Subscribe ao Realtime para pegar jobs novos criados em outras abas/após "escolher versão".

Importante: o worker existe enquanto o usuário estiver em qualquer rota `/dashboard/*`. Fechar o navegador ainda interrompe — isso é limitação real do client-side; o estado parcial fica persistido e ao voltar o worker retoma de onde parou.

### 3. Wizard `CarouselAIWizard.tsx`

- Mantém a fase "variants" igual. Quando termina, **não marca o job como done**. Em vez disso atualiza `result.phase = "variants"` e mantém `status = "running"` apenas até o usuário escolher. Para o painel não confundir, mostrar essa janela curta como "Em andamento" também é OK — mas para evitar ficar pendurado, se o usuário fechar o wizard antes de escolher, marcar o job como `canceled` (status já existe no tipo, falta no enum check — verificar; se não permitido, usar `error` com mensagem "Cancelado pelo usuário" OU simplesmente `done` sem variante e excluir do painel).
  - Decisão recomendada: usar `status="error"` com `error="Cancelado — versão não escolhida"` para casos onde o usuário fecha o wizard sem escolher; assim aparece em "Recentes" como falha removível.
- `pickVariant`: além de salvar bootstrap no `sessionStorage`, **persiste o bootstrap completo + slides iniciais + imageJobs em `studio_jobs.result`** e atualiza `phase="images"`, `variant=kind`, `imagesTotal=imageJobs.length`, `imagesDone=0`. Depois navega para o editor.
- Hidratação por `initialJobId`:
  - Se `phase === "images"` ou `"done"` → **não abre o wizard**; o handler que chama deve ter redirecionado para o editor. O wizard ignora esses jobs.
  - Se `phase === "variants"` (raro: variantes prontas mas usuário fechou antes de escolher) → abre na tela "choose" como hoje.

### 4. Editor `dashboard.studio.carrossel.tsx`

- Aceita parâmetro `?jobId=...` (search param do TanStack Router). Se presente:
  - Carrega `studio_jobs.result.slides` (ou `bootstrap.slides` se ainda não foi preenchido) e monta o estado inicial a partir dali, ignorando o `sessionStorage` bootstrap.
  - Em vez de iniciar o loop local de geração, **se inscreve via Realtime** no row do job. Conforme `result.slides[i].bgImage` chega, atualiza o `setSlides` local. Mostra `imageProgress` derivado de `imagesDone/imagesTotal`.
- O loop local atual de `carrossel-image` (linhas ~398–470) é removido — a geração agora pertence ao worker global.
- Para o fluxo "vem do wizard sem jobId" (não deveria mais existir após (3), mas como fallback): mantém comportamento legado (loop local) por enquanto, com TODO para remoção.

### 5. Painel `StudioJobsPanel` + `dashboard.studio.tsx`

- `onOpen(job)` para `kind === "carrossel"`:
  - Se `job.result.phase === "images"` ou `"done"`: `navigate({ to: "/dashboard/studio/carrossel", search: { jobId: job.id } })`. **Não abre mais o wizard.**
  - Se `phase === "variants"` (caso raro descrito acima): abre o wizard com `initialJobId` como hoje.
- Texto do toast/botão na seção "Em andamento" continua mostrando o `progress` real (agora 0–100 baseado em imagens, não só 20% fixo).

### 6. Quando o usuário sai do editor

Hoje o `useEffect` do `VideoWorkflowCanvas` já mostra um toast "geração continua em background". Adicionar o mesmo no editor de carrossel quando `imageProgress` ainda está ativo e o usuário desmonta a rota.

## Arquivos alterados

- `src/lib/studio-jobs.ts` — pequenos ajustes (nenhuma mudança grande).
- `src/lib/carousel-image-worker.ts` — **novo**, hook do worker global.
- `src/routes/dashboard.tsx` — monta `useCarouselImageWorker(userId)`.
- `src/components/studio/CarouselAIWizard.tsx` — não fecha o job ao gerar variantes; em `pickVariant` persiste bootstrap completo no job; hidratação ignora jobs `phase=images|done`; ao fechar sem escolher marca `error="Cancelado"`.
- `src/routes/dashboard.studio.carrossel.tsx` — aceita `?jobId=`; remove loop local quando carregado via job; se inscreve no Realtime do job; toast de "continua em background" no unmount.
- `src/routes/dashboard.studio.tsx` — em `onOpen` decide entre abrir wizard ou navegar direto para o editor.
- `src/components/studio/StudioJobsPanel.tsx` — sem mudança funcional (já passa `job` inteiro ao `onOpen`).

Nenhuma migration de banco.

## Limitação que será comunicada ao usuário

Fechar o navegador inteiro ainda interrompe a geração das imagens (não há fila server-side). Ao reabrir a Postly, o worker retoma de onde parou usando o estado salvo no banco — nenhuma imagem já gerada é perdida.