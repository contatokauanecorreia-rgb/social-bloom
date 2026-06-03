## Objetivo
Fazer o carrossel sair dessa tela de “Gerando o seu carrossel...” quando a geração travar antes do `bootstrap`, garantindo que o job avance corretamente para o editor e conclua as imagens em segundo plano.

## O que vou corrigir
1. **Destravar a transição de `variants` para `images/done` no wizard**
   - Revisar o fluxo em `CarouselAIWizard` para garantir que, assim que as duas versões forem geradas, a variante automática seja realmente persistida no job.
   - Corrigir o ponto em que hoje o job pode ficar salvo apenas com `phase: "variants"`, `progress: 30` e sem `bootstrap`.

2. **Adicionar retomada automática para jobs presos**
   - No editor `/dashboard/studio/carrossel`, detectar quando um job antigo estiver em `phase: "variants"` com variantes já prontas no banco.
   - Nessa situação, aplicar a mesma escolha automática da variante, salvar `bootstrap`, mover o job para `images` ou `done` e disparar a continuação em background.

3. **Melhorar a tela de andamento para não ficar infinita**
   - Diferenciar claramente os estados:
     - gerando variantes,
     - gerando imagens,
     - travado com erro,
     - concluído.
   - Se o job estiver parado tempo demais sem avançar, mostrar estado de recuperação/erro em vez de spinner infinito.

4. **Validar o acionamento do processamento em background**
   - Confirmar que o disparo do runner acontece depois que o job entra em `phase: "images"`.
   - Ajustar a retomada pelo painel/editor para que abrir um job concluído vá direto para o resultado, e abrir um job em andamento retome a execução corretamente.

## Resultado esperado
- O job não ficará mais preso em `30%` com a mensagem de carregamento.
- Ao abrir um carrossel em andamento, ele retomará do ponto correto.
- Ao abrir um carrossel concluído, o editor abrirá com os slides prontos.
- Se algo falhar, o usuário verá erro/retomada em vez de tela infinita.

## Detalhes técnicos
- Arquivos-alvo:
  - `src/components/studio/CarouselAIWizard.tsx`
  - `src/routes/dashboard.studio.carrossel.tsx`
  - possivelmente `src/lib/studio-jobs.ts` se eu precisar endurecer a persistência/retomada
- Estado observado no job atual:
  - `status = running`
  - `phase = variants`
  - `progress = 30`
  - sem `bootstrap`
  - sem `images`
- Isso indica que o problema está antes da geração de imagens, na etapa que deveria consolidar a variante escolhida e montar o bootstrap.