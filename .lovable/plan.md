# Plano para corrigir a geração de imagens ao sair e voltar ao editor

## Objetivo
Fazer a geração de imagens do carrossel continuar de forma confiável mesmo quando o usuário sai da página do editor e, ao voltar, retomar automaticamente o andamento e exibir as imagens já concluídas.

## O que vou mudar

### 1. Tirar a dependência do worker client-side para a geração principal
Hoje a continuação depende de `useCarouselImageWorker`, que roda no navegador dentro de `/dashboard`. Isso significa que, ao sair da tela/app, a geração pode parar. Vou mover o processamento real para um fluxo de backend assíncrono, iniciado a partir do job salvo no banco.

### 2. Criar um endpoint/backend job runner para processar as imagens do carrossel
Vou criar uma rota/handler server-side que:
- recebe o `jobId`
- carrega `studio_jobs.result`
- processa `imageJobs` pendentes
- atualiza `result.images`, `imagesDone`, `imagesTotal`, `progress`, `status` e `finished_at`
- evita processamento duplicado do mesmo job
- marca erro parcial/final quando necessário

A ideia é o frontend apenas disparar esse processamento e o backend continuar trabalhando independentemente da tela atual.

### 3. Disparar o processamento no momento em que a variante é escolhida
No `CarouselAIWizard`, ao selecionar a versão do carrossel:
- persisto o `bootstrap` e `imageJobs` como já está sendo feito
- inicio imediatamente o processamento server-side do job
- navego para o editor com `jobId`

Assim, o editor passa a ser consumidor de estado, não o responsável por gerar.

### 4. Retomar jobs pendentes ao reabrir Studio/editor
Ao abrir Studio ou o editor com `jobId`, vou adicionar uma retomada segura:
- se o job estiver em `phase: "images"` e `status: "running"`, o app tenta reacionar o runner server-side
- isso cobre casos em que a aba foi fechada no meio, o navegador caiu ou houve interrupção no preview

### 5. Manter o editor sincronizado só por hidratação + realtime/polling
No editor de carrossel:
- continuar carregando `bootstrap` + imagens prontas do job
- atualizar os slides conforme novas imagens chegarem
- mostrar progresso real
- não executar mais geração local quando houver `jobId`

Se necessário, adiciono polling leve como fallback além do realtime, para garantir atualização visual mesmo se o canal não entregar algum evento.

### 6. Ajustar a navegação de “Em andamento” e “Recentes”
Vou manter a lógica de abrir direto no editor quando o job estiver em geração de imagens ou concluído, garantindo que o usuário sempre volte para o estado certo, sem cair em “escolha a versão” quando isso já passou.

## Resultado esperado
Depois da correção:
- o usuário pode sair do editor sem cancelar a geração
- ao voltar, as imagens continuam aparecendo normalmente
- jobs em andamento ficam acessíveis na área do Studio
- ao concluir, o job gera notificação e passa para recentes/concluídos

## Detalhes técnicos
- Arquivos mais prováveis de alteração:
  - `src/components/studio/CarouselAIWizard.tsx`
  - `src/routes/dashboard.studio.carrossel.tsx`
  - `src/routes/dashboard.studio.tsx`
  - `src/lib/carousel-image-worker.ts` (reduzido/removido como origem principal)
  - nova rota server-side em `src/routes/api/...` ou server function equivalente
- Vou reaproveitar a tabela `studio_jobs` já criada, sem expandir escopo para novos recursos.
- Se eu encontrar limitação do ambiente para execução longa no backend atual, adapto o runner para processamento encadeado por reentrada segura do job, mas mantendo a mesma experiência para o usuário.