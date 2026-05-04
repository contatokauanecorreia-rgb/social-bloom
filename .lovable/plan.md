## Atualizar preview dos cards de combinação de fontes

Em `src/components/studio/CarouselAIWizard.tsx`, dentro do componente `FontCard` (linhas ~865–900), substituir o conteúdo do preview.

### Mudanças

1. Remover os blocos atuais com "Aa Título" e "Texto do corpo".
2. Renderizar, na seguinte ordem dentro do botão (mantendo a lógica de `fontsReady` e `loadGoogleFont` já existente):

   - Nome da fonte display: o texto é o próprio `heading`, com `fontFamily: "${heading}"`, `fontWeight: 700`, `fontSize: 22px`, line-height apertada.
   - Nome da fonte secundária: o texto é o próprio `body`, com `fontFamily: "${body}"`, `fontWeight: 400`, `fontSize: 14px`, cor `text-muted-foreground`. Renderizar apenas se `body !== heading`.
   - Pequeno espaçador (`mt-2`).
   - Frase exemplo linha 1: "Pilates transforma vidas" — `fontFamily: "${heading}"`, `fontWeight: 700`, `fontSize: 16px`.
   - Frase exemplo linha 2: "Seu corpo muda. Sua mente agradece." — `fontFamily: "${body}"`, `fontWeight: 400`, `fontSize: 12px`, cor `text-muted-foreground`.
   - Todos os elementos de texto recebem `visibility: fontsReady ? "visible" : "hidden"` para evitar flash.

3. Manter intacto:
   - Badge ("Sua fonte" / "Sugerido para …" / "Personalizada") com a mesma classe `badgeClass`.
   - Linha com nome das fontes abaixo do card (`{heading} + {body}`), tamanho 12px, cor foreground.
   - Estado de seleção, hover, borda, `useEffect` de carregamento das fontes.

### Nada mais é alterado

Nenhuma outra parte do `CarouselAIWizard.tsx`, do helper `google-fonts.ts`, ou de outros arquivos é tocada.
