## Problema

Ao clicar em **Abrir** em qualquer card do painel do Studio (tanto "Em andamento" quanto "Recentes – Concluído"), o usuário cai na janela **"Configurar carrossel"** (wizard step 1), em vez de ir direto para a tela de andamento / editor com as imagens.

Isso acontece porque hoje o roteamento do painel decide entre duas coisas:

- `phase === "images" | "done"` → vai pro editor
- caso contrário (`phase === "variants"` ou `null`) → **reabre o wizard** no modo "escolha a versão"

E o wizard, quando hidratado por `initialJobId` sem `result.variants` ainda prontos, cai no estado default e mostra o step 1 ("Configurar carrossel"). Daí a sensação de que "clicar não faz nada útil".

Além disso, no fluxo desejado o usuário **não quer mais ver a tela "Escolha a versão"** – ele quer que a geração siga em background e que abrir o job mostre o **andamento das imagens** dentro do editor.

## Solução

Eliminar a etapa "Escolha a versão" do fluxo do carrossel e mover **toda** a visualização de jobs (em andamento ou concluídos) para o editor, com um estado de "andamento" próprio.

### 1. Auto-escolha da variante no wizard

`CarouselAIWizard.handleGenerate` passa a:

1. Gerar as duas variantes (`minimalista` + `criativo`) como hoje.
2. Em vez de `setStep("choose")`, chamar diretamente uma versão refatorada de `pickVariant` com uma regra fixa:
   - se `aiImages` estiver ligado → `"criativo"` (que é a única que aciona imagens),
   - caso contrário → `"minimalista"`,
   - se uma das duas falhar, escolhe a outra automaticamente.
3. Persistir o job já em `phase: "images"` (ou `"done"` quando não há imagens), disparar `kickCarouselJobRunner` e navegar para o editor com `jobId`.

O step `"choose"` e a UI de cards de variante deixam de ser renderizados (podem ser removidos para simplificar o componente, mantendo só a hidratação para compatibilidade com jobs antigos: se um job antigo vier em `phase: "variants"`, auto-escolhemos no mesmo critério e seguimos pro editor).

### 2. Painel do Studio sempre navega para o editor

Em `src/routes/dashboard.studio.tsx`, o callback `onOpen` do `StudioJobsPanel` para `kind === "carrossel"` passa a **sempre** navegar:

```ts
navigate({ to: "/dashboard/studio/carrossel", search: { jobId: job.id } })
```

(sem `as never`, usando tipagem do route validator), independentemente de `phase`. Remove-se o branch que abria o wizard com `initialJobId`.

### 3. Editor mostra "andamento" quando o job ainda não tem imagens

Em `src/routes/dashboard.studio.carrossel.tsx`, quando entramos com `jobId` e o job está `running` e ainda sem `bootstrap` (porque as variantes ainda estão sendo geradas), mostrar um estado de **loading com progresso** baseado em `studio_jobs.progress`, em vez de cair em "skip" + slide padrão. Quando `bootstrap` chega (via realtime/polling), aplicamos `applyBootstrap` normalmente.

Quando o job está em `phase: "images"`, já hidratamos os slides e mostramos o `imageProgress` existente (já implementado).

### 4. Garantir que o painel "Em andamento" só some quando o job realmente terminou

- Confirmar que `useStudioJobs` segue removendo o job do `running` quando `status` muda para `done/error`.
- Toast global de conclusão continua igual.

### Arquivos a alterar

- `src/components/studio/CarouselAIWizard.tsx` — auto-escolha, remoção do step `"choose"` na UX, refator de `pickVariant` para ser chamado internamente.
- `src/routes/dashboard.studio.tsx` — `onOpen` simplificado, sempre navega para o editor.
- `src/routes/dashboard.studio.carrossel.tsx` — estado de "aguardando variantes" quando `jobId` está running sem `bootstrap`, com polling/realtime já existente para hidratar quando chegar.
- Sem mudanças em `supabase/functions/carrossel-run-job/index.ts` nem em `studio-jobs.ts`.

### Detalhes técnicos

- A navegação com `search: { jobId }` precisa bater com o `validateSearch` de `/dashboard/studio/carrossel` (já aceita `jobId?: string`); remover o cast `as never`.
- Manter `kickCarouselJobRunner` sendo chamado tanto no `pickVariant` automático quanto na hidratação do editor (já é idempotente).
- Para jobs antigos persistidos em `phase: "variants"`, o editor, ao hidratar, detecta `result.variants` sem `result.bootstrap`, aplica a mesma regra de auto-escolha, persiste `phase: "images"` e dispara o runner — assim nada quebra ao abrir jobs antigos.
