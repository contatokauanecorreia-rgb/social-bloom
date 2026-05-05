## Hierarquia automática de pesos no wizard de carrossel

Mantém tudo o que já existe. Apenas troca a lógica do "Peso da fonte".

### 1) Remover o seletor único Light/Medium/Bold

Arquivo: `src/components/studio/CarouselAIWizard.tsx`

- Remover o estado `fontWeightChoice` (linha 132) e o tipo `"light" | "medium" | "bold"`.
- Remover a constante `WEIGHT_MAP` (linha 72) — não é mais usada.
- Remover o bloco JSX inteiro "PESO DA FONTE" (linhas ~1022-1044), incluindo o `<Label>Peso da fonte</Label>`, o grid de 3 botões e o texto auxiliar.

### 2) Aplicar hierarquia automática quando a fonte NÃO vem do DNA

No `handleGenerate` (linhas 502-508), substituir o `fontWeightOverride` atual por uma hierarquia fixa, aplicada sempre que `selected && selected.source !== "dna"`:

```ts
fontWeightOverride:
  selected && selected.source !== "dna"
    ? { title: 700, subtitle: 500, body: 300 }
    : null,
```

- Título: 700 (Bold)
- Subtítulo: 500 (Medium)
- Corpo: 300 (Light)

Quando a fonte vem do DNA (`source === "dna"`), continua usando os pesos padrão do DNA (sem override) — comportamento atual preservado.

### 3) Carregamento dos pesos via Google Fonts

Sem alterações: `src/lib/brand-font.ts → loadGoogleFont` já carrega `wght@300;400;500;600;700`, então 300, 500 e 700 já vêm automaticamente para qualquer família selecionada.

### Sem alterações em

- `src/routes/dashboard.studio.carrossel.tsx` — o consumidor de `fontWeightOverride` já aplica `{ ...data.fontWeightOverride! }` por slide; passa a receber pesos diferentes por campo automaticamente, pois `Slide.fontWeight` já tem `{ title, subtitle, body }` separados e o render (linhas 1456/1473/1491) já lê cada um.
- `brand-font.ts`, `google-fonts.ts`, edge functions, `TemplatesDialog`, painel do editor.
- Card "Sua fonte" (DNA) — continua sem seletor e sem override.

### Arquivos editados

- `src/components/studio/CarouselAIWizard.tsx` (remoção do seletor + hierarquia automática)
