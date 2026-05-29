## Mudança no Bloco 1 (Upload de vídeo)

Hoje o `<video>` do preview está com `h-28 w-full ... object-contain`, o que força altura fixa de 112px e cria as faixas pretas laterais para um vídeo vertical (9:16 / 4:5).

### O que fazer

Em `src/components/studio/video-workflow/VideoWorkflowCanvas.tsx`, no bloco de preview do vídeo:

1. Remover `h-28` e `object-contain` do elemento `<video>`.
2. Detectar a proporção real do arquivo via evento `onLoadedMetadata` (usar `videoWidth / videoHeight`) e guardar em estado local `videoAspect`.
3. Envolver o `<video>` em um container com:
   - `width: 100%`
   - `aspect-ratio: var(--video-aspect)` (default `9 / 16` enquanto carrega)
   - `max-height: 360px` para não estourar o card do canvas
   - `mx-auto` para centralizar quando o vídeo for mais estreito que o card
4. Aplicar `aspect-ratio` dinamicamente via `style={{ aspectRatio: videoAspect ?? "9 / 16" }}` no container; o `<video>` interno fica `h-full w-full object-cover` (sem letterbox) ou `object-contain` se preferirmos preservar 100% do frame — recomendo `object-cover` já que o container já segue a proporção real do vídeo, então não haverá corte.
5. Manter `bg-black` e `rounded-md` no container.

### Resultado

- Vídeo vertical 9:16 → preview vertical, sem barras pretas laterais.
- Vídeo 1080×1350 (4:5) → preview 4:5.
- Vídeo horizontal 16:9 → preview horizontal.
- O card do bloco continua com a mesma largura; só a altura do preview se adapta (limitada a 360px).

### Fora de escopo

- Mudar o tamanho do card do bloco no canvas.
- Alterar o preview do vídeo gerado (Bloco 5).
