
## Adicionar plano de fundo no hero da landing page

Adicionar um background visual atrás do título "Automatize sua presença nas redes sociais" na seção hero do `src/routes/index.tsx`, inspirado no gradiente colorido (laranja, vermelho, magenta, roxo) da imagem de referência enviada.

### Abordagem
Criar um background decorativo posicionado absolutamente atrás do conteúdo do hero, usando CSS puro (radial gradients sobrepostos) para reproduzir o efeito de "blobs" coloridos difusos da imagem — sem precisar embedar a imagem como arquivo.

### Mudanças

**`src/styles.css`** — adicionar nova utility:
- `--gradient-hero`: composição de 3-4 `radial-gradient` sobrepostos simulando os blobs da imagem:
  - Blob laranja/amarelo grande à direita (`oklch(0.78 0.18 60)` → transparente)
  - Blob vermelho/coral no centro-baixo (`oklch(0.65 0.25 25)` → transparente)
  - Blob magenta/rosa à esquerda-baixo (`oklch(0.65 0.27 350)` → transparente)
  - Toque de roxo/lilás no canto esquerdo (`oklch(0.70 0.15 300)` → transparente)
- `@utility bg-gradient-hero` aplicando essa composição
- Opcional: textura sutil de granulado (noise) via `background-image` SVG inline para replicar o "grain" da imagem

**`src/routes/index.tsx`** — modificar a `<section>` do hero:
- Adicionar `relative overflow-hidden` na section
- Inserir uma `<div>` absoluta atrás do conteúdo (`absolute inset-0 -z-10 bg-gradient-hero`) com:
  - `blur-3xl` ou `blur-2xl` para reforçar a difusão
  - `opacity-60` ou `opacity-70` para o conteúdo permanecer legível sobre o fundo claro
  - Posicionada de forma que os blobs fiquem concentrados atrás/ao redor do título
- Garantir que `Badge`, `h1`, parágrafo e botões fiquem com `relative z-10` para aparecerem por cima

### Resultado visual
Um halo difuso e colorido (laranja → vermelho → magenta → toques de roxo) emanando atrás do título, mantendo o restante da página limpo. O fundo respeita a identidade rosa/magenta já definida no design system, mas adiciona a riqueza cromática da imagem de referência apenas no hero.

### Notas técnicas
- Sem novas dependências
- Sem importar a imagem como arquivo — gradientes CSS são mais leves e responsivos
- Conteúdo permanece totalmente acessível (contraste preservado pela opacidade e blur)
- Funciona bem em mobile (gradientes escalam naturalmente)
