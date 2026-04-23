
## Adicionar a imagem anexa como background da seção hero

Substituir o gradiente CSS atual (`bg-gradient-hero`) por uma imagem real de gradiente colorido (laranja/vermelho/magenta/roxo com textura granulada), idêntica em estilo ao anexo enviado.

### Arquivos
- **`src/assets/hero-bg.png`** — imagem do gradiente já gerada via IA (1024×1024, ~1.4 MB), reproduzindo fielmente o estilo do anexo: blob central laranja-vermelho dominante, blob magenta na parte inferior-esquerda, acento roxo no canto superior-esquerdo e pontos amarelos, tudo sobre fundo branco com grão sutil.
- **`src/routes/index.tsx`** — alterações:
  1. Importar a imagem: `import heroBg from "@/assets/hero-bg.png"`.
  2. Substituir a `<div>` decorativa atual (que usa `bg-gradient-hero` + `blur-3xl`) por uma `<div>` com `background-image: url(heroBg)`, `bg-no-repeat bg-center bg-contain` e `opacity-90`.
  3. Manter `pointer-events-none absolute inset-0 -z-10` para que a imagem fique atrás do conteúdo sem capturar cliques.
  4. O conteúdo (Badge, h1, parágrafo, botões) já está com posicionamento correto e permanecerá legível por cima da imagem (as bordas do PNG são brancas e suaves, fundindo com o `bg-background`).

### Limpeza opcional (não obrigatória)
- A utility `bg-gradient-hero` em `src/styles.css` deixa de ser usada na home, mas pode permanecer no design system para reutilização futura — não será removida.

### Resultado
A seção hero passa a exibir o gradiente colorido real da imagem de referência atrás do título "Automatize sua presença nas redes sociais", com a textura granulada e a riqueza cromática que o gradiente CSS não consegue reproduzir.
