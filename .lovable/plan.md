# Plano aprovado — Imagens em zonas/frames por princípio

## Backend — `supabase/functions/carrossel-generate/index.ts`
1. Adicionar campo `imageFrame` ao mapa `PRINCIPLE_TO_LAYOUT` (e ao schema retornado pelo modelo, mesmo que o renderer use o valor fixo do princípio):
   - `contraste` → `top-60`
   - `equilibrio` → `half-left`
   - `harmonia` → `centered-square`
   - `direcionamento` → `bottom-third`
   - `variedade` → `top-60`
   - `ritmo` → `full`
   - princípios sem foto → `null`
2. Sobrescrever `out.imageFrame = layout.imageFrame` na normalização (mesmo bloco que hoje força `tipo`/`fundo`).
3. Incluir `imageFrame` no payload de cada slide retornado ao cliente.

## Wizard — `src/components/studio/CarouselAIWizard.tsx`
- Propagar `imageFrame` no objeto de cada slide gravado em `sessionStorage` (`studio:carrossel:bootstrap`).

## Renderer — `src/routes/dashboard.studio.carrossel.tsx`
1. Estender o tipo `Slide` com `imageFrame?: "full" | "top-60" | "half-left" | "half-right" | "centered-square" | "bottom-third" | null`.
2. Estender o tipo do bootstrap (`bootstrapRef`) com o mesmo campo e copiar para `slide.imageFrame` no mapper.
3. Criar componente interno `<ImageFrame frame src zoom pos />` que posiciona a imagem em uma das zonas:
   - `full` → inset 0 (comportamento atual)
   - `top-60` → top:0 left:0 right:0 height:60%
   - `half-left` / `half-right` → metade vertical
   - `centered-square` → quadrado ~70% centralizado, com margem mostrando o fundo (off-white/bege)
   - `bottom-third` → faixa inferior 33%
   Usa `overflow:hidden` + `<img>` com `object-fit:cover`.
4. Substituir o bloco atual que renderiza foto como background absoluto por:
   - sempre pintar fundo sólido (off-white / bege-texturizado / branco) conforme `bgKind`
   - se houver `bgImage` e `imageFrame !== null`, montar `<ImageFrame>` por cima
5. Ajustar texto:
   - cor: branca apenas quando o texto está sobreposto à imagem (`full`, `top-60` se texto fica embaixo é escuro, etc.). Regra simples: se `imageFrame === "full"` → branco; senão → cor escura padrão sobre a cor de fundo.
   - posição: para `half-left` empurrar bloco de texto para `padding-left: 52%`; para `half-right` o oposto; para `top-60` empurrar texto para metade inferior; demais mantêm layout atual.
6. Manter `overlay` apenas quando `imageFrame === "full"`.

## Painel direito (mesmo PR, opcional mas barato)
- Adicionar select "Posição da imagem" no painel "Imagem de fundo" (linha ~1045) com as 6 opções, ligado a `slide.imageFrame`.

## Resultado esperado
Selecionando `contraste + equilibrio + harmonia + direcionamento`, os 4 slides ficam visualmente distintos: foto no topo, foto à esquerda, quadrado centralizado, faixa inferior — variação real estilo Canva.
