## Problema identificado
O clique do card não é o verdadeiro problema.

Verifiquei o fluxo atual e confirmei que:
- o card **"Criar carrossel"** já chama `navigate({ to: "/dashboard/studio/carrossel" })`;
- a rota **`/dashboard/studio/carrossel`** está registrada no roteador;
- o arquivo **`src/routes/dashboard.studio.carrossel.tsx`** existe e exporta a rota corretamente.

O bloqueio real é este:
- **`src/routes/dashboard.studio.tsx` é a rota pai de `/dashboard/studio/carrossel`, mas não renderiza `<Outlet />`.**
- Resultado: a URL pode até mudar para `/dashboard/studio/carrossel`, porém o editor filho nunca monta na tela.

## Plano de correção

### 1. Ajustar a rota pai `/dashboard/studio`
Modificar **`src/routes/dashboard.studio.tsx`** para funcionar como rota pai de verdade:
- importar `Outlet` e o hook de localização do TanStack Router;
- manter a interface atual do Studio quando a URL for exatamente **`/dashboard/studio`**;
- renderizar **`<Outlet />`** quando a URL for uma rota filha, especialmente **`/dashboard/studio/carrossel`**.

Isso preserva tudo que já existe e libera a renderização do editor sem mexer na lógica interna dele.

### 2. Preservar a navegação existente do card
Manter o comportamento atual do card **"Criar carrossel"**:
- continuar validando se existe cliente selecionado;
- continuar navegando para **`/dashboard/studio/carrossel`**;
- não reescrever `ModeCard` nem trocar a arquitetura do editor.

### 3. Validar o fluxo completo
Depois da correção, confirmar este caminho:
1. abrir `/dashboard/studio`;
2. clicar em **Criar carrossel**;
3. abrir **`/dashboard/studio/carrossel`**;
4. exibir o modal de seleção de formato;
5. clicar em **Começar**;
6. abrir o editor normalmente.

## Arquivo a alterar
- `src/routes/dashboard.studio.tsx`

## Detalhe técnico
Não vou editar `routeTree.gen.ts`, porque ele já mostra que a rota existe e é gerada automaticamente. A correção é puramente estrutural na rota pai.

## Impacto esperado
- corrige a abertura do editor;
- mantém o editor existente intacto;
- mantém a URL atual;
- evita retrabalho desnecessário em navegação, modal e layout do carrossel.