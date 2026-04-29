## Objetivo

Reestruturar o menu lateral (BLOCO 1) com novas seções, rotas e item "Plano" novo. Manter tudo dentro do layout `/dashboard` (URLs amigáveis no menu, mas tecnicamente sob `/dashboard/...` para preservar header, autenticação e rotas existentes).

## Mapeamento de rotas

| Label sidebar | Rota técnica | Status |
|---|---|---|
| Dashboard | `/dashboard` | já existe |
| Studio de conteúdo | `/dashboard/studio` | já existe |
| Planner de conteúdo | `/dashboard/planner` | **renomear** de `dashboard.plano.tsx` |
| Hub de clientes | `/dashboard/clientes` | já existe |
| Precificação | `/dashboard/precificacao` | já existe |
| Plano | `/dashboard/plano` | **criar nova** (assinatura/billing) |
| Configurações | `/dashboard/configuracoes` | já existe |

Itens removidos do sidebar: **Gerar carrosséis** (rota `/dashboard/carrosseis` continua existindo no código, só some do menu — não foi listada). Confirmar com usuário se quer manter o arquivo ou também excluir do menu apenas.

> Observação: a rota `/agentes` mencionada pelo usuário não existe no projeto atual — nada a remover além de garantir que não está no sidebar (e não está).

## Arquivos alterados

### 1. `src/components/dashboard/AppSidebar.tsx`
Reescrever array `sections` com a estrutura exata pedida:

```ts
const sections = [
  { label: "Início", items: [
    { to: "/dashboard", label: "Dashboard", icon: Home, exact: true }
  ]},
  { label: "Criar", items: [
    { to: "/dashboard/studio", label: "Studio de conteúdo", icon: Sparkles },
    { to: "/dashboard/planner", label: "Planner de conteúdo", icon: ClipboardList },
  ]},
  { label: "Clientes", items: [
    { to: "/dashboard/clientes", label: "Hub de clientes", icon: Users }
  ]},
  { label: "Negócio", items: [
    { to: "/dashboard/precificacao", label: "Precificação", icon: Calculator }
  ]},
  { label: "Conta", items: [
    { to: "/dashboard/plano", label: "Plano", icon: CreditCard },
    { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  ]},
];
```

Remove o item "Gerar carrosséis" do menu. Atualiza tipo `to` da union `SidebarItem` para refletir as rotas novas.

### 2. Renomear `src/routes/dashboard.plano.tsx` → `src/routes/dashboard.planner.tsx`
- Mover o arquivo (cópia + delete).
- Atualizar `createFileRoute("/dashboard/plano")` → `createFileRoute("/dashboard/planner")`.
- Atualizar `head().meta.title` para "Planner de conteúdo — Postly".
- `routeTree.gen.ts` é regenerado automaticamente.

### 3. Criar `src/routes/dashboard.plano.tsx` (novo — tela de Plano/Assinatura)
Página placeholder com mesmo design system (rosa, cards, fonte atual):
- Header: "Plano e assinatura"
- Seção "Plano atual" com card mostrando plano fictício (ex: "Free" ou "Pro") e botão "Fazer upgrade".
- Seção "Histórico de cobrança" vazia ("Nenhuma cobrança ainda").
- Conteúdo simples e limpo, pronto para ser preenchido depois com integração de pagamento.

### 4. Verificar referências internas a `/dashboard/plano` antigo
Buscar com `rg "dashboard/plano|dashboard.plano"` e atualizar qualquer link interno (ex: cards do dashboard.index, rotas de cliente que linkam pra planner) para `/dashboard/planner`.

## Fora do escopo (próximos blocos)

- BLOCO 2+ não foi enviado — apenas navegação agora.
- Não alterar conteúdo do Planner em si, só renomear a rota.
- Não implementar lógica real de assinatura na tela "Plano" — só o placeholder visual.

## Pergunta antes de implementar

O arquivo `dashboard.carrosseis.tsx` (Gerar carrosséis) deve ser:
- (a) mantido no projeto, só removido do sidebar; ou
- (b) excluído por completo?

Se não responder, sigo com (a) por segurança.

Posso implementar?
