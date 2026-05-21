## Objetivo

Em cada card de ideia gerada pela IA no Planner, adicionar um botão **"Gerar carrossel"** ao lado de **"Adicionar"**. Ao clicar, abrir o `CarouselAIWizard` já com o título e a descrição daquela ideia preenchidos no campo de tópico, e com o cliente selecionado.

## Mudanças

### 1. `src/components/studio/CarouselAIWizard.tsx`
- Adicionar prop opcional `initialTopic?: string` no `CarouselAIWizardProps`.
- Quando o wizard abrir (`open` vira `true`) e `initialTopic` estiver preenchido:
  - Setar `contentSource` para `"ai"`.
  - Setar `topic` com o valor de `initialTopic`.
- Garantir que o reset no `onClose` continue funcionando normalmente (não tocar nessa lógica além do necessário).

### 2. `src/routes/dashboard.planner.tsx`
- Importar `CarouselAIWizard` e o ícone `Sparkles` (já importado) / `Layers`.
- Novo state: `carouselOpen: boolean` e `carouselTopic: string`.
- No card de cada ideia (loop em `ideas.map`), adicionar um segundo botão **"Gerar carrossel"** (variant outline, mesmo tamanho) que:
  - Verifica se há `ideasClientId` (sempre haverá, pois ideias só existem com cliente selecionado).
  - Define `carouselTopic` como `${idea.title}\n\n${idea.description}`.
  - Abre `carouselOpen = true`.
- Renderizar `<CarouselAIWizard open={carouselOpen} onOpenChange={setCarouselOpen} clientId={ideasClientId} initialTopic={carouselTopic} />` no final do componente, junto ao `PostDialog`.

## Notas

- O wizard atual já roteia para o editor após gerar, então não há outras dependências.
- Não alterar a lógica do botão "Adicionar" existente — apenas adicionar o novo botão ao lado.
- Layout do card de ideia: empilhar os dois botões verticalmente em telas pequenas (`flex-col sm:flex-row`) para não quebrar visualmente.
