# Hub de Clientes — novo layout

Reescrever `/dashboard/clientes` para o layout solicitado. Sem mexer no banco — usar **dados mockados em memória** (o usuário pediu mock para 3 clientes).

## Mudanças

### `src/routes/dashboard.clientes.index.tsx` (rewrite)

**Header**
- Título "Meus clientes" + descrição.
- Botão "Novo cliente" no canto direito → abre Dialog (nome, segmento, notas). Adiciona ao state local.

**Grid 2 colunas (md), 1 (mobile)**
Cada card contém:
- Avatar circular com **iniciais** geradas do nome (gradient primary).
- Nome (título) + segmento (subtítulo).
- Badge de status colorido:
  - Ativo → verde (`emerald`)
  - Pausado → âmbar
  - Encerrado → rose
- Dois mini-stat boxes lado a lado:
  - **"X conteúdos este mês"** (ícone FileText)
  - **"X aguardando aprovação"** (ícone Clock) — fundo/borda **âmbar destacado** quando `> 0`, neutro quando `= 0`.
- Botão **"Acessar"** (outline, com seta) → `Link` para `/dashboard/clientes/$id` usando slug do nome como id.

**Mocks iniciais**
```
Studio Bela Forma       · Saúde e beleza · Ativo    · 12 · 3
Restaurante Folha Verde · Alimentação    · Ativo    · 8  · 0
Academia ForçaViva      · Fitness        · Pausado  · 0  · 0
```

## Detalhes
- Sem chamadas Supabase nesta página (puro state local).
- Mantém `PageContainer wide`, `PageHeader`, Dialog/Input/Label/Textarea já existentes.
- `Link` tipado do TanStack continua funcionando — a rota `/dashboard/clientes/$id` aceita qualquer string como `id`.
- A rota `/dashboard/clientes/$id` atual lê do banco; ao acessar um mock o usuário verá "Cliente não encontrado" (esperado nesta etapa de UI).

## Fora do escopo
- Persistência dos clientes mockados no banco.
- Adicionar coluna `segment` na tabela `clients` (fica para quando voltar a integrar).
- Conectar contadores reais a `content_posts`/aprovações.
