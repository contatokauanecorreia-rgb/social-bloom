## Causa do problema

O card "Criar carrossel" e a rota `/dashboard/studio/carrossel` já estão corretamente conectados:

- `src/routes/dashboard.studio.tsx` chama `navigate({ to: "/dashboard/studio/carrossel" })` no `onClick`.
- A rota está registrada em `src/routeTree.gen.ts` (`DashboardStudioCarrosselRoute`).
- O componente `CarrosselEditorPage` é exportado corretamente em `src/routes/dashboard.studio.carrossel.tsx`.

O sintoma "card não abre o editor" vem de um **redirect silencioso dentro do próprio editor**: quando não há cliente ativo em `localStorage` (`ACTIVE_CLIENT_STORAGE_KEY`), o `useEffect` do editor mostra um toast e chama `navigate({ to: "/dashboard/studio" })` imediatamente. Para o usuário, o editor "pisca" e volta para o Studio, parecendo que o clique não funcionou.

## Correções (mínimas, sem reescrever o editor)

### 1. `src/routes/dashboard.studio.tsx` — validar cliente ANTES de navegar

No `onClick` do `ModeCard` "Criar carrossel", se não houver `clientId`, mostrar toast e não navegar. Assim o usuário vê uma mensagem clara em vez de uma navegação fantasma.

```tsx
<ModeCard
  icon={Layers}
  title="Criar carrossel"
  description="Slides completos com design da marca."
  cost={MODE_COST.carrossel}
  disabled={exhausted}
  onClick={() => {
    if (!clientId) {
      toast.error("Selecione um cliente antes de criar um carrossel.");
      return;
    }
    navigate({ to: "/dashboard/studio/carrossel" });
  }}
/>
```

### 2. `src/routes/dashboard.studio.carrossel.tsx` — não redirecionar silenciosamente

Trocar o `useEffect` que redireciona quando não há cliente por um `return` simples. Como `clientId` continua `null`, o resto do editor já se comporta de forma segura (Promise.all não roda, `clientName` fica vazio, modal de formato segue abrindo). O guard antes da navegação no Studio é a primeira linha de defesa; este aqui é só um fallback se o usuário entrar direto pela URL.

Substituição em `dashboard.studio.carrossel.tsx` (linhas 151–162):

```tsx
useEffect(() => {
  if (!userId) return;
  const saved =
    typeof window !== "undefined"
      ? window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY)
      : null;
  if (!saved) {
    // Não redireciona: o guard no /studio já previne o caso comum.
    return;
  }
  setClientId(saved);
  // ... resto do useEffect segue igual
```

## O que NÃO muda

- Estrutura do editor (modal de formato, painel esquerdo, preview central, slides bar)
- Lógica de export ZIP, save draft, notificação do Planner
- Rotas, banco, tipos
- Qualquer outro componente

## Validação manual após aplicar

1. `/dashboard/studio` sem cliente selecionado → clicar em "Criar carrossel" → toast "Selecione um cliente antes de criar um carrossel.", sem navegação.
2. Selecionar um cliente no `ClientPicker` → clicar em "Criar carrossel" → modal "Escolha o formato" abre → "Começar" → editor carrega com preview, painel e barra de slides.
3. Voltar e testar "Baixar todos" / "Salvar rascunho" para confirmar que o resto continua funcionando.

## Arquivos alterados

- `src/routes/dashboard.studio.tsx` (1 bloco do `onClick`)
- `src/routes/dashboard.studio.carrossel.tsx` (1 bloco do `useEffect`)