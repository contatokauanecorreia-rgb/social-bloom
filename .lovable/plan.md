## Objetivo

Trocar o layout do editor de carrossel: remover a barra de miniaturas inferior e exibir os slides lado a lado horizontalmente no centro, em tamanho proporcional grande, com scroll horizontal, slide ativo destacado por borda rosa, botão `+` ao final e botão `×` em cada slide.

## Arquivo único alterado
`src/routes/dashboard.studio.carrossel.tsx`

Nada fora deste arquivo. Nenhum outro componente, rota, edge function, estilo global ou tipo é alterado.

## Mudanças

### 1. Remover (linhas 727–772)
- O `<main>` central que renderiza só o `ScaledPreview` do slide ativo.
- O bloco inteiro `{/* Barra de slides */}` com `<SlidesBar ... />` (mantendo apenas o indicador de progresso `imageProgress`, que continua aparecendo acima da nova área).

### 2. Substituir por: nova área central horizontal
No lugar dos dois blocos removidos, inserir um único `<main>` que ocupa o espaço entre o painel esquerdo e a borda direita:

```
<main className="flex min-h-0 flex-1 flex-col overflow-hidden">
  {imageProgress && (... barra de progresso atual, sem mudanças ...)}

  <div className="flex-1 overflow-x-auto overflow-y-hidden">
    <div className="flex h-full items-center gap-6 px-8 py-6 min-w-max">
      {slides.map((s, i) => (
        <SlideCard
          key={s.id}
          slide={s}
          index={i}
          format={format}
          dna={dna}
          active={s.id === activeId}
          onSelect={() => setActiveId(s.id)}
          onRemove={() => removeSlide(s.id)}
          onEditField={
            s.id === activeId
              ? (field, value) =>
                  updateActive((sl) => ({ ...sl, text: { ...sl.text, [field]: value } }))
              : undefined
          }
          onSelectField={s.id === activeId ? setSelectedField : undefined}
        />
      ))}
      <button
        type="button"
        onClick={addSlide}
        className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        style={{ width: 220, height: 275 /* proporcional ao formato */ }}
      >
        <Plus className="h-8 w-8" />
        <span className="text-xs font-medium">Adicionar slide</span>
      </button>
    </div>
  </div>
</main>
```

### 3. Novo componente local `SlideCard` (mesmo arquivo)
Renderiza um slide em **tamanho grande proporcional** (não miniatura) usando o mesmo padrão de scaling do `ScaledPreview` existente, mas com altura fixa baseada na altura da viewport (ex.: `min(70vh, 600px)`) e largura derivada do aspect ratio `format.w/format.h`.

Estrutura:
```
<div
  className={cn(
    "group relative shrink-0 rounded-2xl bg-white shadow-lg overflow-hidden transition-all",
    "border-4",
    active ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/40"
  )}
  style={{ width: cardW, height: cardH }}
  onClick={onSelect}
>
  {/* conteúdo escalado — mesma técnica do ScaledPreview */}
  <div style={{ width: format.w, height: format.h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
    <SlideContent
      slide={slide}
      format={format}
      dna={dna}
      scale={scale}
      editable={active}
      onEditField={onEditField}
      onSelectField={onSelectField}
    />
  </div>

  {/* índice */}
  <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
    {index + 1}
  </div>

  {/* botão remover */}
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onRemove(); }}
    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/80 text-background shadow hover:bg-foreground"
    title="Remover slide"
  >
    <X className="h-4 w-4" />
  </button>
</div>
```

Cálculo do tamanho (dentro do `SlideCard`, via `useEffect` + ResizeObserver no container pai):
- `cardH = clamp(360, contêiner.clientHeight - 48, 640)`
- `cardW = cardH * (format.w / format.h)`
- `scale = cardH / format.h`

### 4. Comportamento
- Clicar em qualquer slide → `setActiveId(s.id)` → painel esquerdo (`EditorPanel`) já lê `activeSlide` via `slides.find(s => s.id === activeId)` (linha 428) e aplica edições nele. **Nenhuma mudança no painel esquerdo.**
- Slide ativo: borda rosa (`border-primary` + `ring-primary/30`), edição inline habilitada (`editable`).
- Slides inativos: sem borda, click apenas seleciona (não edita inline).
- Scroll horizontal nativo via `overflow-x-auto` no contêiner.
- Botão `+` no final da fila chama `addSlide` (já existente).
- Botão `×` em cada slide chama `removeSlide(s.id)` (já existente, com a proteção de mínimo 1 slide já implementada na linha 453).

### 5. Limpeza
- Remover do JSX o uso de `<SlidesBar />` (mas **manter** as funções `SlidesBar` e `SlideThumb` no arquivo intactas para não tocar em código fora do escopo). Alternativamente, se preferir remoção total, posso apagar essas duas funções — confirmar se quiser.
- Remover `<ScaledPreview />` do JSX (também manter a definição da função intacta).

## O que NÃO muda
- `EditorPanel` e toda a coluna esquerda (incluindo "Baixar todos" e "Salvar rascunho").
- `SlideContent`, `ScaledPreview`, `SlidesBar`, `SlideThumb` (definições preservadas; só o uso no JSX muda).
- Lógica de `addSlide`, `removeSlide`, `updateActive`, `applyToAll`, drag-and-drop, geração de imagens, exportação ZIP, salvamento de rascunho.
- Edge functions, hierarquia de fontes, prompts, briefing, qualquer coisa fora deste arquivo.
- Nodes ocultos para export (`exportRef`) permanecem.

## Observação
A reordenação por drag-and-drop existente (via `dnd-kit` em `SlidesBar`) deixa de ter UI nesse novo layout. Se for desejado manter reorder no novo layout horizontal, posso adicionar `dnd-kit` ao novo `SlideCard` em uma próxima iteração — fora do escopo deste pedido ("não altere nenhuma outra parte").
