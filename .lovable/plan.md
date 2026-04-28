## Plano — Reescrita de `/dashboard/precificacao` (Calculadora interativa)

A página atual é um montador de "pacote por entregáveis" (presets Starter/Pro/Premium, custos fixos, margem). Vou substituí-la pela calculadora descrita na especificação: inputs por slider/checkbox à esquerda, resultado em destaque à direita, e tabela comparativa por cliente abaixo. A rota interna por cliente (`/clientes/:id/precificacao`) permanece como está (placeholder).

### Arquivo afetado
- `src/routes/dashboard.precificacao.tsx` — reescrito por completo. Sem mudanças de banco, sem novas dependências (usa `Slider`, `Input`, `Checkbox`, `Card`, `Badge`, `Button`, `Table` já existentes).

### Layout

```text
┌──────────────────────────────────────────────────────────────────┐
│  Badge "Negócio"                                                 │
│  H1: Calculadora de precificação                                 │
│  Sub: Simule seu valor ideal por cliente em segundos.            │
├──────────────────────────────┬───────────────────────────────────┤
│ ESQUERDA  (inputs)           │ DIREITA  (resultado, sticky)      │
│                              │                                   │
│ • Clientes ativos    [1–20]  │  R$ 1.870 / cliente · mês         │
│ • Posts por cliente  [4–30]  │  ─────────────────────────        │
│ • Horas por post     [.5–3]  │  Total mensal   R$ 9.350          │
│ • Valor hora (R$)    input   │  Total anual    R$ 112.200        │
│ • Extras (4 checkboxes)      │  48 horas/mês de trabalho         │
│                              │  Custo/hora implícito: R$ 38,96   │
└──────────────────────────────┴───────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│ Tabela comparativa (5 clientes mock)                             │
│ Cliente | Posts/mês | Cobrado hoje (edit) | Sugerido | Δ         │
└──────────────────────────────────────────────────────────────────┘
```

Grid: `lg:grid-cols-[1fr_380px]`. O painel de resultado usa `lg:sticky lg:top-6`.

### Estado e fórmulas

Estado único em `useState`:
```ts
{
  clients: 5,            // slider 1–20
  postsPerClient: 12,    // slider 4–30
  hoursPerPost: 1.5,     // slider 0.5–3, step 0.5
  hourlyRate: 80,        // input numérico (R$)
  extras: { stories: true, reels: true, report: false, meeting: false },
  overrides: Record<clientId, number | null>,  // valor cobrado hoje editável
}
```

Cálculo por cliente (memoizado):
```ts
const baseHours = postsPerClient * hoursPerPost;        // horas/mês por cliente
const baseValue = baseHours * hourlyRate;               // R$ base
let multiplier = 1;
if (extras.stories) multiplier += 0.20;
if (extras.reels)   multiplier += 0.30;
let perClient = baseValue * multiplier;
if (extras.report)  perClient += 150;
if (extras.meeting) perClient += 200;

const monthlyTotal  = perClient * clients;
const yearlyTotal   = monthlyTotal * 12;
const hoursMonthAll = baseHours * clients;
const implicitRate  = perClient / baseHours;            // R$/h efetivo
```

Formatação BR via `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.

### Inputs (coluna esquerda)

Cada bloco em um `Card` com `CardHeader` (label + valor atual à direita) + `CardContent` com o controle.

1. **Clientes ativos** — `Slider` `min=1 max=20 step=1`. Header mostra `5 clientes`.
2. **Posts por cliente / mês** — `Slider` `min=4 max=30 step=1`. Header `12 posts`.
3. **Horas por post** — `Slider` `min=0.5 max=3 step=0.5`. Header `1.5h`.
4. **Valor hora desejado** — `Input type="number" min=0`, prefixo `R$` via wrapper.
5. **Extras incluídos** — 4 `Checkbox` com label e o impacto à direita (`+20%`, `+30%`, `+R$ 150/cliente`, `+R$ 200/cliente`). Layout 2 colunas em `sm:`.

### Resultado (coluna direita)

Card `border-primary/30 bg-gradient-primary-soft`:
- Linha pequena uppercase: `Valor sugerido por cliente / mês`
- Número grande: `text-5xl font-bold text-gradient-primary tabular-nums` (ex.: `R$ 1.870`)
- Separador
- Duas linhas em grid 2 colunas: `Total mensal` e `Total anual` (valores grandes mas menores que o principal)
- Bloco de breakdown muted:
  - `48h/mês de trabalho total` (`hoursMonthAll`)
  - `Custo por hora implícito: R$ 38,96`

Botão secundário no rodapé: `Copiar resumo` (copia texto formatado para clipboard, com toast). Sem export PDF para manter escopo.

### Tabela comparativa

`Card` separado abaixo do grid principal.
- 5 clientes mock fixos (nome + posts/mês iniciais), independentes dos sliders globais para servirem de base de comparação:
  ```ts
  const MOCK_CLIENTS = [
    { id: "c1", name: "Bela Forma Estética", posts: 16, currentCharged: 1200 },
    { id: "c2", name: "Padaria Trigo de Ouro", posts: 8, currentCharged: 600 },
    { id: "c3", name: "Studio Pilates Vita", posts: 12, currentCharged: 900 },
    { id: "c4", name: "Dr. Lucas Odonto", posts: 10, currentCharged: 1500 },
    { id: "c5", name: "Brechó Manu", posts: 6, currentCharged: 400 },
  ];
  ```
- Colunas: **Cliente** · **Posts/mês** · **Cobrado hoje** (input numérico editável, override em estado) · **Sugerido** · **Δ** (badge verde se positivo, vermelho se negativo, formatado com sinal).
- "Sugerido" por linha usa as mesmas fórmulas de extras/hourlyRate, mas com `posts` da própria linha (ignorando `postsPerClient` global) → mostra como o pricing atual da calculadora se aplicaria àquele cliente real.
- Linha de rodapé com totais (somatório de cobrado hoje vs somatório sugerido + delta total).

### Detalhes visuais

- `PageContainer wide`, mesmo padrão das outras páginas do dashboard.
- `Badge variant="soft"` "Negócio" + `PageHeader` (sem actions, ou só `Calculator` icon decorativo no título).
- Sem persistência em localStorage (calculadora é exploratória); mantenho assim para evitar conflito com a chave `postly:pricing-state` antiga.
- Sem chamadas de rede, sem tabelas novas no banco.

### Fora do escopo
- Salvar simulações por usuário (não pedido).
- Export PDF (não pedido).
- Integração com tabela `clients` real — usamos mock conforme padrão das outras páginas internas ainda em mock.
