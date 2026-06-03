## Objetivo

Permitir que o usuário feche a tela/modal de geração de carrossel ou vídeo sem perder o trabalho: a geração continua em background, aparece como "em andamento" no Studio e dispara uma notificação quando fica pronta.

## Como vai funcionar (do ponto de vista do usuário)

1. Ao iniciar a geração (carrossel ou vídeo), um "job" passa a existir no Studio.
2. Se o usuário fechar o modal/sair da página, aparece um toast: "Geração em andamento — você pode voltar quando quiser. Avisaremos quando estiver pronto."
3. Na home do Studio, ao lado dos cards **Gerar carrossel** e **Gerar vídeo**, aparece uma nova seção **Em andamento** listando todos os jobs ativos (com progresso e botão "Abrir").
4. Quando o job finaliza, dispara:
   - Toast de sucesso/erro com ação "Abrir".
   - Ponto vermelho no sino de notificações + entrada clicável.
   - O card sai da seção "Em andamento" e vai para "Recentes/Concluídos" (últimos 5).
5. Clicar em "Abrir" reabre o wizard/canvas exatamente no estado final (slides gerados / vídeo pronto).

## Arquitetura

### 1. Persistência (nova tabela)

`studio_jobs` no Supabase:

```
id uuid pk
user_id uuid
client_id uuid null
kind text                 -- 'carrossel' | 'video'
status text               -- 'running' | 'done' | 'error' | 'canceled'
progress int              -- 0..100
title text                -- ex: tópico do carrossel ou nome do vídeo
input jsonb               -- snapshot dos parâmetros do wizard (para reabrir)
result jsonb null         -- slides finais / url de vídeo / metadados
error text null
created_at, updated_at, finished_at
```

RLS: usuário só vê os próprios jobs. Realtime habilitado nessa tabela.

### 2. Execução em background

- **Carrossel**: hoje a geração é chamada dentro do componente `CarouselAIWizard` via `supabase.functions.invoke("carrossel-generate")`. Vamos:
  - Criar um job (`status: running`) antes de invocar a função.
  - Mover o `invoke` para um helper (`src/lib/studio-jobs.ts`) que roda fora do ciclo do modal — a Promise vive no módulo, não no componente, então fechar o modal não cancela.
  - Ao terminar, gravar `result` + `status: done` (ou `error`) na tabela.
- **Vídeo** (`VideoWorkflowCanvas`): mesma ideia — a chamada de geração final passa pelo helper e persiste estado.

Observação: a função edge em si já roda no servidor; o que estamos resolvendo é a UI poder fechar sem perder o resultado.

### 3. Hook global de jobs

`useStudioJobs()` em `src/lib/studio-jobs.ts`:
- carrega jobs ativos + últimos concluídos do usuário,
- assina realtime em `studio_jobs`,
- dispara toast + atualiza badge quando um job muda de `running` → `done/error`.

Esse hook é montado no layout do dashboard (em `src/routes/dashboard.tsx`) para funcionar mesmo fora do Studio.

### 4. UI

- **Studio (`dashboard.studio.tsx`)**: nova seção `<StudioJobsPanel />` acima ou ao lado dos `ModeCard`s, mostrando:
  - Jobs em andamento (com barra de progresso e botão "Abrir").
  - Últimos concluídos (com thumb e botão "Abrir").
- **Card em andamento**: ícone do tipo, título, cliente, status, ação Abrir / Cancelar.
- **CarouselAIWizard**: ao fechar enquanto `status === "loading"`, mostrar toast "Continua rodando em segundo plano" e marcar job no banco.
- **VideoWorkflowCanvas**: mesmo padrão ao sair da rota com geração ativa (guard via `useBlocker` do TanStack Router).
- **NotificationsBell**: já existe. Vamos reaproveitar inserindo notificações do tipo `studio_job_done` quando o job conclui (trigger no banco ou insert pelo helper).

### 5. Reabrir um job

`StudioJobsPanel` → "Abrir":
- Carrossel: abre `CarouselAIWizard` com `initialJobId`. O wizard, ao receber `initialJobId`, hidrata `variants`, `step = "choose"` e parâmetros a partir de `input` + `result`.
- Vídeo: navega para `/dashboard/studio/video-workflow?jobId=...` e o canvas hidrata o estado a partir do job.

## Detalhes técnicos

- Migração SQL: criar `studio_jobs`, GRANTs (`authenticated`, `service_role`), RLS por `user_id`, `ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_jobs`.
- Novo arquivo `src/lib/studio-jobs.ts` (helper + hook).
- Novo componente `src/components/studio/StudioJobsPanel.tsx`.
- Pequenas alterações em:
  - `src/routes/dashboard.studio.tsx` (renderizar o painel + passar `initialJobId` ao wizard).
  - `src/components/studio/CarouselAIWizard.tsx` (criar job, persistir progresso/resultado, suportar `initialJobId`, toast ao fechar durante geração).
  - `src/components/studio/video-workflow/VideoWorkflowCanvas.tsx` (mesmo padrão).
  - `src/components/dashboard/NotificationsBell.tsx` (renderizar também notificações tipo `studio_job_done` com link para reabrir).
- **Sem mudanças** nas edge functions de geração, no copy do Gemini, nos alinhamentos, no DNA/Claude, nem no schema de `notifications` (só adicionamos novos `type`).

## Fora do escopo

- Retomar geração interrompida no servidor (se a edge function falhar no meio, o job vai para `error`; não tentamos reexecutar automaticamente).
- Push notification fora da aba — só toast + sino dentro do app.
