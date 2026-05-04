## Adicionar seletor de peso da fonte no wizard de carrossel

Mantém tudo que já existe. Adições isoladas e sem efeitos colaterais.

---

### 1) Wizard — `src/components/studio/CarouselAIWizard.tsx`

- Novo state:
  ```ts
  const [fontWeightChoice, setFontWeightChoice] = useState<"light" | "medium" | "bold">("medium");
  ```
- Reset junto com os outros no `useEffect` de close (default `"medium"`).
- Mapa local:
  ```ts
  const WEIGHT_MAP = { light: 300, medium: 500, bold: 700 } as const;
  ```
- **UI**: na seção "Combinação de fontes" (após o bloco de "Personalizadas" / "Explorar mais", ainda dentro do mesmo `<div>` da seção), renderizar **somente quando** `selected && selected.source !== "dna"`:
  - Label: `Peso da fonte`
  - 3 botões (toggle group simples, igual ao padrão do projeto, usando `Button variant={selecionado ? "default" : "outline"}`): **Light**, **Medium**, **Bold**.
  - Seleção atualiza `fontWeightChoice`.
  - Helper text curto: `Aplicado a títulos, subtítulos e corpo dos slides.`
- Quando o usuário seleciona a fonte do DNA (`source === "dna"`), o seletor não é exibido (e o valor mantido em state é ignorado no output).

- No `handleGenerate`:
  - Se `selected?.source === "dna"`, usar pesos atuais do DNA (default do slide — não enviar override).
  - Caso contrário, computar `weightValue = WEIGHT_MAP[fontWeightChoice]` e mapear para `fontWeight = { title: weightValue, subtitle: weightValue, body: weightValue }`.
  - Adicionar ao objeto `bootstrap`:
    ```ts
    fontWeightOverride: selected && selected.source !== "dna"
      ? { title: weightValue, subtitle: weightValue, body: weightValue }
      : null,
    ```

### 2) Editor — `src/routes/dashboard.studio.carrossel.tsx`

- No bootstrap consumer (próx. à linha 244, onde lê `data.fontPair`), aplicar override quando presente:
  - Após construir `built` slides, se `data.fontWeightOverride`, mapear todos os slides setando `slide.fontWeight = { ...data.fontWeightOverride }` antes de `setSlides(built)`.
- Não mexer em `pageFontPair` nem em outras lógicas. O `loadGoogleFont` existente já carrega pesos 300/400/500/600/700, então o peso escolhido já está disponível sem alteração.

### 3) Sem alterações em

- `carrossel-generate` (já recebe `fontPair`; o peso é puramente client-side aplicado no slide).
- `carrossel-image`, `screenshot-url`.
- Tabela `carousel_templates`, `TemplatesDialog`, fluxo de templates salvos.
- Card "Sua fonte" — continua sem seletor de peso.
- `loadGoogleFont` em `src/lib/brand-font.ts` — já inclui todos os pesos necessários.

### Arquivos editados

- `src/components/studio/CarouselAIWizard.tsx`
- `src/routes/dashboard.studio.carrossel.tsx`
