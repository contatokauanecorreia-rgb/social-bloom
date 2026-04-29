# BLOCO 9 — Calculadora com presets

A página `/dashboard/precificacao` já tem 100% dos controles e do resultado em tempo real (sliders de clientes/posts/horas, input de valor-hora, checkboxes de extras, card grande com valor por cliente / total mensal / total anual / horas / hora implícita). Falta apenas o que a spec do Bloco 9 enfatiza: **os 3 presets clicáveis no topo**.

## Mudanças em `src/routes/dashboard.precificacao.tsx`

### 1. Adicionar bloco de presets (Starter / Padrão / Avançado)

Logo abaixo do `PageHeader`, antes da grade de inputs:

```ts
const PRESETS = [
  { key: "starter",  name: "Starter",   subtitle: "Pra começar", clients: 3,  posts: 12, perClient: 800,  badge: "Início" },
  { key: "padrao",   name: "Padrão",    subtitle: "Operação madura", clients: 6,  posts: 16, perClient: 1500, badge: "Mais escolhido", highlight: true },
  { key: "avancado", name: "Avançado",  subtitle: "Estúdio premium", clients: 10, posts: 20, perClient: 2500, badge: "Premium" },
];
```

UI: 3 cards em `grid md:grid-cols-3 gap-4` exibindo nome, subtítulo, "X clientes", "Y posts/cliente", "R$ N/cliente". Card "Padrão" recebe ring de destaque (`ring-2 ring-primary/40`). Hover/active visualmente reagem; ao clicar:

- Aplicar `clients` e `postsPerClient` do preset.
- Resetar extras para o estado neutro (`stories: false, reels: false, report: false, meeting: false`) — mantém comportamento previsível.
- Calcular o `hourlyRate` automaticamente para que `perClient` resultante bata no valor do preset:
  - `hourlyRate = round(perClient / (posts * hoursPerPost))`
  - Usa o `hoursPerPost` corrente.
- `toast.success("Preset aplicado!")`.

Manter um state `selectedPreset` para destacar o preset atualmente "ativo" (e limpar quando o usuário mexer em qualquer slider/extra para indicar customização).

### 2. Pequenos ajustes

- Mover o título para "Precificação" (combinando com a aba). O subtítulo continua.
- Manter a tabela "Comparação por cliente" (não está na spec mas é valiosa e já está pronta).

## Arquivos afetados

- **edit** `src/routes/dashboard.precificacao.tsx` — adicionar bloco de presets + state + handler de seleção; atualizar handlers existentes para limpar `selectedPreset` quando o usuário modifica algo.

Sem migrations, sem dependências.
