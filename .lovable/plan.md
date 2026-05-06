## Problema

Mesmo com a regra "no text, no letters" no prompt negativo, o FLUX 1.1 [pro] (e às vezes o Gemini fallback) está **inserindo texto, letras e legendas dentro das fotos** dos carrosséis gerados via planner.

Causas reais (confirmadas no código):

1. **FLUX 1.1 [pro] ignora negative prompts em prompts longos.** O `buildImagePrompt` atual junta ~10 frases descritivas e enfia o "Negative: no text..." no meio. FLUX trata isso como instrução positiva fraca e frequentemente desenha texto.
2. **A `nota_visual` gerada pela IA pode pedir texto implicitamente** (ex: "a workspace with a notebook page", "a sign", "a magazine cover", "a book") — termos que o modelo de imagem associa fortemente a letras visíveis.
3. **Não há um pós-filtro** que remova/reescreva notas visuais arriscadas antes de mandar pro FLUX.
4. **O prompt enviado para o LLM** que escreve a `nota_visual` diz "NUNCA peça texto", mas não bloqueia objetos que sempre contêm texto (livros, placas, telas, jornais, etiquetas).

## Solução

Atacar as três camadas: instrução ao LLM, sanitização da nota visual, e prompt do FLUX.

### 1. Endurecer a instrução ao LLM que cria a `nota_visual`

Em `supabase/functions/carrossel-generate/index.ts` (linha 301), trocar a regra de uma frase por uma lista explícita:

> A `nota_visual` NÃO pode conter (nem em inglês nem em português): text, letters, words, typography, captions, signs, signage, books, magazines, newspapers, journals, notebooks with visible writing, screens showing text/UI, posters, billboards, labels with words, packaging with brand names, business cards, documents, papers with writing, tattoos with letters, clothing with logos/text, watermarks, captions. Se o objeto natural da cena geralmente tem texto (ex: livro, jornal, tela), descreva-o como **"closed", "blank", "blurred out of focus" ou substitua** por um equivalente sem texto (ex: livro fechado de capa lisa, tela apagada, papel em branco).

Aplicar a mesma instrução nos appendices `minimalistAppendix` (M4/M5) e `creativeAppendix` (C1/C3).

### 2. Sanitizador de nota visual no servidor (camada de segurança)

Adicionar função `sanitizeImageNote(note: string): string` em `_shared/fal-image.ts` que:

- Detecta termos de risco em PT/EN: `text|letter|word|caption|sign|signage|book|magazine|newspaper|journal|notebook|screen|monitor|display|poster|billboard|label|tag|business card|document|paper writing|writing|tattoo|logo|watermark|menu|brochure|flyer`.
- Se encontrar, anexa uma reescrita: substitui esses substantivos por versões neutras OU adiciona ao final `". All books are closed and blank, all screens are off, all papers are blank, no readable text or letters anywhere in the image."`.
- Loga `[sanitize] note_rewritten` quando agir, pra debug futuro.

Chamar isso dentro de `buildImagePrompt` ANTES de montar o prompt final.

### 3. Reordenar e reforçar o prompt do FLUX

FLUX dá muito mais peso ao **início** do prompt e à **última frase**. Atualizar `buildImagePrompt` para:

- **Primeira frase:** `"Pure photographic image with absolutely no text, no letters, no words, no typography, no captions, no signs, no logos with text, no watermarks anywhere in the frame."`
- Em seguida: descrição da cena (`Photograph: ${note}`), estilo, luz, câmera, etc.
- **Última frase:** repetir `"Final constraint: zero text, zero letters, zero typography in the final image — purely visual, photographic content only."`

Frase no meio (linha 617) continua, mas as duas pontas é o que o FLUX realmente lê.

### 4. Ajuste mínimo no fal.ai call

Em `_shared/fal-image.ts`, no body do POST, adicionar parâmetros suportados pelo endpoint `flux-pro/v1.1`:

- `safety_tolerance: "2"` (já está)
- (FLUX pro 1.1 não tem `negative_prompt` nativo no endpoint v1.1, então dependemos do prompt positivo bem construído — daí o item 3.)

Replicar a mesma lógica em `supabase/functions/carrossel-image/index.ts` (regeneração individual no editor) para que a regeneração também sanitize.

## Arquivos afetados

- **Editado:** `supabase/functions/carrossel-generate/index.ts` — endurecer instrução do LLM (linha 301 e appendices), reescrever `buildImagePrompt` (linhas 601–623).
- **Editado:** `supabase/functions/_shared/fal-image.ts` — adicionar e exportar `sanitizeImageNote()`.
- **Editado:** `supabase/functions/carrossel-image/index.ts` — usar `sanitizeImageNote()` e prompt reforçado igual ao do generate.

## O que NÃO está incluído

- Trocar de FLUX 1.1 [pro] para outro modelo (ex: Recraft, Ideogram). A causa principal não é o modelo — é o prompt sem reforço nas pontas e a nota visual livre demais. Se mesmo assim aparecer texto depois dessa correção, aí sim avaliamos trocar a engine.
- Detecção/recusa via OCR pós-geração (regenerar automaticamente quando detectar texto na imagem). Pode ser próximo passo se o problema persistir.

## Resultado esperado

Imagens dos carrosséis (vindo do planner ou de tópico livre) sem texto, letras ou legendas. Quando a cena natural pediria texto (livro, tela, placa), o objeto aparece em branco/desligado/desfocado.