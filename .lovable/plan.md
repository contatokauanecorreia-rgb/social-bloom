## Ajuste do conteúdo dos cards de combinação de fontes

Em `src/components/studio/CarouselAIWizard.tsx`, dentro do componente `FontCard`, simplificar o preview removendo as frases de exemplo e o nome repetido no rodapé.

### Mudanças (linhas ~898–926)

Remover:
- Bloco com a frase "Pilates transforma vidas" (linhas ~898–908).
- Bloco com a frase "Seu corpo muda. Sua mente agradece." (linhas ~909–919).
- Bloco do rodapé que repete `{heading} + {body}` (linhas ~923–926).

Manter, na ordem:
1. Nome da fonte display (`heading`) em 22px, bold, com a própria fonte aplicada.
2. Nome da fonte secundária (`body`) em 14px, regular, com a própria fonte aplicada — apenas se `body !== heading`.
3. Badge ("Sua fonte" / "Sugerido para …" / "Personalizada") com a `badgeClass` existente.

### Mantido intacto

- Toda a lógica de `fontsReady`, `useEffect`, `loadGoogleFont`.
- `visibility` controlado por `fontsReady` nos blocos de nome.
- Estado de seleção, hover, borda do botão.
- Resto do arquivo e demais arquivos do projeto.
