## Sistema Visual Minimalista para o gerador de carrossel

Adicionar um sistema visual minimalista que é **ativado automaticamente** quando o DNA da marca cruza certos critérios, sem alterar nada do que já existe (system prompt de copy, motor de imagem, layout do editor, etc.).

Tudo é integrado dentro de **`supabase/functions/carrossel-generate/index.ts`**, com um pequeno acréscimo no **wizard** (campo de alinhamento global) e no **editor** (renderização mínima dos novos campos quando vierem).

---

### 1. Detecção automática do sistema

Em `carrossel-generate/index.ts`, após carregar `briefing` + `segment`, calcular:

```ts
const minimalistArchetypes = ["inocente", "sabio", "cuidador"]; // + "sofisticado" tratado como sinônimo de governante/amante
const minimalistTones = /elegante|leve|acolhedor|formal|sofisticad/i;
const minimalistSegments = /sa[úu]de|beleza|bem.?estar|educa[çc][ãa]o|moda|lifestyle/i;

const isMinimalist =
  minimalistArchetypes.includes((briefing?.archetype ?? "").toLowerCase()) ||
  minimalistTones.test(briefing?.tone_of_voice ?? "") ||
  minimalistSegments.test(`${segment ?? ""} ${clientName ?? ""}`);
```

Quando `isMinimalist === true`, o sistema entra em modo minimalista.

---

### 2. System prompt adicional (anexado, não substituído)

Manter o system prompt atual de copywriting intacto. Quando `isMinimalist`, **anexar** um bloco extra ao final descrevendo:

- Regras globais (off-white #F5F0E8 / bege linho / foto com overlay máx 30%, espaço negativo, margens 48px, máximo 2 fontes, mix regular+itálico, alinhamento `[ALINHAMENTO]`).
- Os 5 tipos de slide (M1 tipografia pura, M2 editorial estruturado, M3 fundo neutro + objeto, M4 foto duas zonas, M5 foto íntima) com regras de cada um.
- Regra de alternância: slide 1 = M4 ou M5; slides 2-3 = M1 ou M2; slides 4-5 = M2 ou M3; último = M1; nunca dois iguais consecutivos.
- Elementos decorativos permitidos (seta →, tags pílulas, asterisco *, triângulo, seta circular ⊙).
- Fontes: usar a do DNA se houver, senão sugerir Cormorant Garamond + Inter (fallback Playfair Display + Raleway).

E **expandir o tool `build_carousel`** para aceitar campos extras por slide quando minimalista:

```
sistema: "minimalista"
tipo: "M1" | "M2" | "M3" | "M4" | "M5"
fundo: "off-white" | "bege-texturizado" | "foto"
label: string
titulo: string (com marcação *palavra* para itálico)
subtitulo: string
corpo: string
tags: string[]   // só M4
elemento_decorativo: "seta" | "asterisco" | "triangulo" | "seta-circular" | "nenhum"
nota_visual: string // só M4 e M5, em inglês para Gemini
```

Esses campos extras passam para o slide retornado, junto aos campos originais (title/subtitle/body/imagePrompt) — `nota_visual` alimenta `imagePrompt` para os tipos M4/M5; M1/M2/M3 não geram imagem (`imagePrompt` vazio → motor já pula).

---

### 3. Geração de imagem condicional

No bloco de geração de imagens, quando o slide tem `sistema === "minimalista"` e `tipo` ∈ {M1, M2, M3} → **não gerar imagem** (pular `genOne` para esse índice). Apenas M4 e M5 chamam o motor fotográfico atual (que continua intacto).

Para M4/M5, anexar ao prompt fotográfico já existente uma diretiva extra: `Composition style: editorial minimalist, generous negative space, off-white or linen tones, vertical 4:5.`

---

### 4. Wizard — campo `[ALINHAMENTO]` global

Em `src/components/studio/CarouselAIWizard.tsx`:

- Adicionar no Step 2, próximo da paleta/fontes, um seletor "Alinhamento dos textos" com 3 botões: **Esquerda · Centro · Direita** (default centro).
- Estado: `const [alignment, setAlignment] = useState<"left"|"center"|"right">("center")`.
- Enviar `alignment` no body de `supabase.functions.invoke("carrossel-generate", { body: { ..., alignment } })`.
- Resetar no close junto com os outros estados.

Na edge function, ler `body.alignment` (default `"center"`) e injetar no system prompt como `[ALINHAMENTO]`. Também aplicar como `textAlign` default em todos os slides retornados (passa para o editor via `slidesData` no wizard, que já mapeia para `textAlign`).

---

### 5. Editor — suporte mínimo aos novos campos

Em `src/routes/dashboard.studio.carrossel.tsx`:

- Estender `Slide` com campos opcionais: `system?: "minimalista"`, `slideType?: "M1"|"M2"|"M3"|"M4"|"M5"`, `bgKind?: "off-white"|"bege-texturizado"|"foto"`, `label?: string`, `tags?: string[]`, `decor?: "seta"|"asterisco"|"triangulo"|"seta-circular"|"nenhum"`.
- Ao receber slides no wizard (linhas 465+), mapear esses campos extras para o slide.
- No `SlideContent` render: se `slide.system === "minimalista"`, aplicar:
  - background: `#F5F0E8` (off-white) ou textura bege CSS (gradient sutil) ou imagem (M4/M5);
  - margens internas 48px;
  - render de `label` no topo com asterisco (M2 esquerda, M3 centro);
  - render de `tags` como pílulas no topo (M4);
  - render de `decor` no rodapé (seta →, asterisco *, triângulo ▲, seta circular ⊙);
  - parsing de `*palavra*` no título/corpo → `<em>`.

Comportamento legacy (slides sem `system`) permanece exatamente como hoje.

---

### Resumo dos arquivos editados

- **`supabase/functions/carrossel-generate/index.ts`** — detector minimalista, prompt anexado, tool ampliado, mapeamento de novos campos no slide, skip de imagem para M1/M2/M3, leitura de `alignment`.
- **`src/components/studio/CarouselAIWizard.tsx`** — campo de alinhamento global, envio no body, mapeamento dos novos campos retornados para o slide do editor.
- **`src/routes/dashboard.studio.carrossel.tsx`** — extensão do tipo `Slide`, render condicional dos elementos minimalistas (label, tags, decor, fundos, parser `*itálico*`).

Nenhuma outra parte do sistema (motor fotográfico, system prompt principal de copy, layout horizontal de slides, edge functions vizinhas) é alterada.