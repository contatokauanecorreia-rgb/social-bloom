## Por que os slides não estão seguindo os princípios

O backend (`carrossel-generate`) faz a parte certa: mapeia cada princípio para `{sistema, tipo, fundo, hasImage}` e sobrescreve esses campos antes de devolver os slides. Os logs confirmam:

```
[carrossel-generate] principles-driven { principles: [ "contraste", "hierarquia", "proporcao", "variedade" ] }
```

O problema está **depois**, em duas camadas no front:

### 1) `CarouselAIWizard.tsx` — gera imagem para TODOS os slides

Em `handleGenerate` (linhas ~741–752), quando `aiImages` está ligado, criamos `imageJobs` para **todo slide**, inventando um `imagePrompt` via `deriveVisualSeed` mesmo quando o backend devolveu `imagePrompt` vazio (princípios `hasImage:false` como `espaco-branco`, `proporcao`, `hierarquia`, `enfase`, `alinhamento`, `margens`).

Resultado: princípios que pedem fundo limpo (`off-white` / `bege-texturizado`) recebem foto mesmo assim.

### 2) `dashboard.studio.carrossel.tsx` — bgImage sobrepõe o `fundo` do princípio

No bootstrap (linha 250) fazemos `if (s.imageDataUrl) slide.bgImage = s.imageDataUrl` **sem checar** `s.fundo`. E no renderer (linha 1521 e 1535), a condição `slide.bgKind === "foto" || slide.bgImage` faz qualquer slide com bgImage virar fundo de foto, ignorando `bege-texturizado` / `off-white`.

Combinado com (1): mesmo princípios sem foto acabam exibindo a foto gerada, com o layout de "foto + texto branco embaixo" — exatamente o que aparece nos prints (slides 1, 2 e 3 idênticos com foto + título branco em baixo).

### 3) Faltam estilos visuais específicos por princípio

O renderer só conhece os tipos `M1–M5` e `C1–C5`. Os layouts diferenciadores que cada princípio promete (ex.: `proporcao` = "DOIS títulos enormes empilhados", `hierarquia` = "três níveis alinhados à esquerda com bege") só são honrados parcialmente pelo tipo — sem o fundo certo, viram tudo igual.

---

## Mudanças propostas

### `src/components/studio/CarouselAIWizard.tsx`
- Em `handleGenerate`, só criar `imageJobs` para slides cujo `s.fundo === "foto"` **ou** que tenham `imagePrompt` não-vazio vindo do backend. Remover o `deriveVisualSeed` para os demais — princípios `hasImage:false` precisam ficar sem foto.

### `src/routes/dashboard.studio.carrossel.tsx`
- No bootstrap (linha ~250), só setar `slide.bgImage` quando `s.fundo === "foto"`. Se o princípio pediu `off-white` ou `bege-texturizado`, ignorar a imagem mesmo se vier.
- Garantir que `slide.bgKind` venha sempre de `s.fundo` (já vem) e que as cores de texto sejam recalculadas a partir de `s.fundo`, não de `s.imageDataUrl`. Hoje a lógica de cor depende de `isPhoto && s.imageDataUrl` — passar a depender só de `s.fundo === "foto"`.
- No renderer (linha ~1521 e ~1535), trocar a condição de "tem foto" de `slide.bgKind === "foto" || slide.bgImage` para apenas `slide.bgKind === "foto"`, para que `bege-texturizado` e `off-white` apareçam corretamente.
- Não rodar os `imageJobs` (efeito que preenche `bgImage` depois da navegação) para slides cujo `bgKind !== "foto"`. Localizar esse efeito (provavelmente baseado em `bootstrapRef.current.imageJobs`) e filtrar antes de disparar.

### Validação
- Após as mudanças, ao escolher `proporcao + hierarquia + contraste + variedade`, o resultado deve ser:
  - Slide 1 (contraste): foto + texto branco embaixo.
  - Slide 2 (hierarquia): fundo bege texturizado, sem foto, três níveis de texto alinhados à esquerda.
  - Slide 3 (proporcao): fundo off-white, dois títulos grandes empilhados, sem foto.
  - Slide 4 (variedade): foto + ticker C3.

## Resultado esperado
Os princípios passam a controlar de fato fundo + presença de foto + layout. Princípios sem imagem deixam de receber a foto-padrão que estava ofuscando o efeito visual.
