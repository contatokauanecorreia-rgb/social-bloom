# Navegação tipada para KIÜKA via search param

## Contexto
Hoje `IdeaActions` grava `localStorage` e navega para `/dashboard/agentes`. Se o usuário **já está** nessa rota, o componente não remonta e o agente não troca.

## Mudanças

### 1. `src/components/agentes/IdeaActions.tsx`
- Botão **✦ Criar carrossel com KIÜKA** passa a navegar com search param tipado:
  ```ts
  navigate({ to: "/dashboard/agentes", search: { agent: "kiuka" } });
  ```
- Remove a escrita direta em `localStorage` (a página de destino cuida disso).
- Botão **📅 Salvar no Planner** continua indo para `/dashboard/plano`.

### 2. `src/routes/dashboard.agentes.tsx`
- Adicionar `validateSearch` com Zod + `@tanstack/zod-adapter`:
  ```ts
  const searchSchema = z.object({
    agent: fallback(z.enum(agentIds), undefined).optional(),
  });
  ```
- Novo `useEffect` que reage a `search.agent`: seleciona o agente, persiste em `localStorage` e limpa a URL com `navigate({ search: {}, replace: true })`.
- Mantém o effect existente de restaurar `localStorage` no mount.

### 3. Dependência
- Instalar `@tanstack/zod-adapter` (zod já está instalado).

## Resultado
- De qualquer rota → clicar KIÜKA → vai para `/dashboard/agentes?agent=kiuka` → seleciona KIÜKA → URL fica limpa.
- Já em `/dashboard/agentes` com SUR ativo → clicar KIÜKA → URL muda → effect detecta → troca para KIÜKA → URL limpa. ✅

## Sem mudanças
- System prompt do SUR (já atualizado anteriormente).
- Trigger das CTAs (regex da frase final, já implementado).
- Escopo das CTAs (continua disponível em qualquer agente).
