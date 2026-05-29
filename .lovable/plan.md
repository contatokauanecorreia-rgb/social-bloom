## Causa

O tempo de geração do Luma Ray2 (minutos) é inerente ao modelo. Mas o loop de status no frontend adiciona latência desnecessária:

- `setInterval(..., 3000)` espera 3s antes da **primeira** checagem (mesmo quando o FAL já está pronto).
- 3s entre ciclos é conservador demais — atrasa a detecção de `COMPLETED` e do progresso intermediário.

## Mudanças (somente frontend)

**`src/components/studio/video-workflow/VideoWorkflowCanvas.tsx`** (linhas ~399–424):

- Extrair o corpo do poll para uma função `tick()` async.
- Chamar `tick()` **imediatamente** após `startLumaFn` retornar.
- Substituir `setInterval` por `setTimeout` recursivo, reagendado ao final de cada `tick` com **1500 ms** — evita sobreposição de chamadas e mantém ritmo responsivo.
- `stopGenerationPolling()` passa a cancelar o timeout pendente (`clearTimeout`).

Sem mudanças em `src/lib/luma.functions.ts`, schemas, banco ou pacotes.

## Resultado

- Detecção de conclusão ~1,5–3s mais rápida.
- UI de progresso/estágio atualiza com mais fluidez.
- Tempo real do FAL/Luma permanece igual.
