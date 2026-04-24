## Renomear e reordenar menu lateral

### Mudanças

**1. `src/components/dashboard/AppSidebar.tsx`** — atualizar array `items` com nova ordem e nomes:
1. **Início** (`/dashboard`)
2. **Criar conteúdo** (`/dashboard/agentes`) — antes "Agentes 24/7"
3. **Planner de conteúdo** (`/dashboard/plano`) — antes "Plano de conteúdo"
4. **Gerar carrosséis** (`/dashboard/carrosseis`) — antes "Carrosséis"
5. **Configurações** (`/dashboard/configuracoes`)

**2. `src/routes/dashboard.agentes.tsx`** — atualizar `meta title` e `PageHeader` para "Criar conteúdo".

**3. `src/routes/dashboard.plano.tsx`** — atualizar `meta title` e `PageHeader` para "Planner de conteúdo".

**4. `src/routes/dashboard.carrosseis.tsx`** — atualizar `meta title` e `PageHeader` para "Gerar carrosséis".

### Observação
As URLs internas (`/dashboard/agentes`, `/dashboard/plano`, `/dashboard/carrosseis`) **não mudam** — apenas os rótulos visíveis ao usuário. Isso evita quebrar links e migrar arquivos de rota.