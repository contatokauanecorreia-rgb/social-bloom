# Reposicionar "Para qual cliente?" no Planner

Atualmente o seletor "Para qual cliente?" fica no topo da página, antes do título "Planner de conteúdo". Vamos movê-lo para logo **acima da barra de busca/tags** (o card que contém o input "Buscar por título ou nota..." e os chips de tags), mantendo todo o comportamento (filtro, auto-preenchimento no "Novo post", chips coloridos quando "Todos os clientes").

## Mudança em `src/routes/dashboard.planner.tsx`

1. Remover o bloco do seletor que hoje está antes do `<Badge>Conteúdo</Badge>` / `<PageHeader>`.
2. Inserir esse mesmo bloco imediatamente antes do card de filtros (`<div className="mb-6 flex flex-col gap-3 rounded-xl border bg-card/40 p-3">`), entre o `PageHeader` e a barra de busca.
3. Manter o mesmo markup (ícone `Users`, `Label`, `Select` com "Todos os clientes" + lista de clientes) e os mesmos estados (`selectedClient`, `setSelectedClient`).

## Resultado visual

```
[Badge Conteúdo]
[Planner de conteúdo  ............  Nova semana | Novo post]

[Para qual cliente?  ▾ Todos os clientes]   ← novo lugar
[🔎 Buscar por título ou nota...        ]
[ tags chips... ]

[ Semana 1 ] [ Semana 2 ] [ Semana 3 ] ...
```

Sem mudanças de lógica, banco de dados ou outros componentes.
