# BLOCO 4 — DNA da marca

Reescrita completa do wizard em `src/routes/dashboard.clientes.$id.briefing.tsx` (mantendo o path `/briefing` para preservar links já existentes), agora com 6 etapas, 12 arquétipos, tipografia (pública/exclusiva), paleta (HEX ou extraída de imagem) e tela de revisão com preview visual.

## 1. UI / Rota

- Caminho mantido: `/dashboard/clientes/:id/briefing`. Aba renomeada para **"DNA da marca"** em `dashboard.clientes.$id.tsx` (linha 72).
- Header da página passa a exibir "DNA da marca".
- Pills clicáveis no topo + barra de progresso (componente atual já faz isso — só atualizar a lista `STEPS`).

### Etapas

1. **Identidade** — nome do cliente; segmento (cards: Saúde e beleza / Alimentação / Serviços locais / Educação / E-commerce / Moda / Outro); chips "Personalidade em 3 palavras".
2. **Tom de voz** — slider Formalidade 1–5; cards "A marca se parece com..." (4 personas com descrições); tags verdes (USA) e tags vermelhas (NUNCA).
3. **Público** — cards de faixa etária; textareas de dores e sonhos.
4. **Objetivos** — cards de objetivo principal; até 3 inputs de @concorrente; cards de frequência de postagem.
5. **Branding** — três blocos:
   - **Arquétipo**: grid 3×4 com 12 cards (ícone do `lucide-react`, nome, descrição). Seleção única.
   - **Tipografia**: radio "Fonte pública" (input de nome + botão "Buscar" que carrega via Google Fonts API CSS e mostra preview "AaBb 123") OU "Fonte exclusiva" (upload `.ttf` → `brand-assets/{userId}/{clientId}/font.ttf` → preview com `FontFace`).
   - **Paleta**: radio "Inserir HEX" (3 inputs com `<input type="color">`) OU "Extrair de imagem" (upload → quantização client-side via canvas → 3 swatches editáveis). Salva sempre como `[primary, secondary, accent]` em `client_briefings.palette`.
6. **Revisão** — bloco azul com "Contexto gerado para a IA" (italico, prompt concatenado); grid resumo (Segmento / Público / Tom / Objetivo / Arquétipo); preview visual: card com fundo na cor primária, título na fonte escolhida em cor de destaque, secundária como acento. Botão **"Salvar DNA da marca"** → salva e navega para `/dashboard/clientes/:id`.

## 2. Arquétipos (12) e influência no prompt

Lista usada na UI **e** no edge function:

| ID | Nome | Direção de linguagem |
|---|---|---|
| inocente | Inocente | acolhedora, sem pressão |
| explorador | Explorador | aventureira, curiosa |
| sabio | Sábio | autoridade, premium |
| heroi | Herói | provocadora, desafiadora |
| fora-da-lei | Fora da Lei | provocadora, disruptiva |
| mago | Mago | visionária, transformadora |
| cara-comum | Cara Comum | leve, próxima |
| amante | Amante | sensual, íntima |
| bobo | Bobo da Corte | leve, com humor |
| cuidador | Cuidador | acolhedora, sem pressão |
| criador | Criador | criativa, original |
| governante | Governante | autoridade, premium |

Mapeamento agrupado em `ARCHETYPE_TONE` (front + edge function) seguindo o pedido:
- inocente / cuidador → acolhedora, sem pressão
- heroi / fora-da-lei → provocadora, desafiadora
- sabio / governante → autoridade, premium
- bobo / cara-comum → leve, próxima, humor
- explorador / amante / mago / criador → tom específico próprio (frase descritiva).

## 3. Persistência

Sem migration nova. Reaproveita colunas existentes em `client_briefings`:

- `name` do cliente → continua em `clients.name` (atualizado no save).
- `content_pillars` ← personalidade (3 palavras).
- `tone_of_voice` ← string composta `"{persona} • {formalityLabel}"`.
- `dos` / `donts` ← tags verde/vermelha.
- `target_audience` ← `"{ageRange} • Dores: ... | Sonhos: ..."`.
- `goals` ← `[goalId]`.
- `extra` (jsonb) ← `{ personality, formality, persona, age, pains, dreams, competitors, frequency, archetype, fontMode, paletteMode, sourceImageUrl }` (campos que não têm coluna dedicada).
- `archetype` ← id do arquétipo (texto livre, 12 valores possíveis).
- `palette` ← `[primary, secondary, accent]`.
- `brand_font`, `brand_font_url` ← já existem.

Ao carregar a tela, hidrata o form a partir dessas colunas + `extra`.

## 4. Extração de paleta (client-side)

Helper novo `src/lib/extract-palette.ts`:
- carrega imagem em `<canvas>` reduzido (~64×64), lê pixels, agrupa por buckets de 32 e retorna 3 cores mais frequentes em HEX.
- sem dependências externas.

## 5. Edge function (atualização leve)

`supabase/functions/studio-generate/index.ts`:
- adiciona dicionário `ARCHETYPE_TONE` igual ao do front.
- em `buildBriefingContext`, quando `b.archetype` existe, injeta também `Direção de linguagem: {ARCHETYPE_TONE[id]}`.
- nada mais muda; o sistema de créditos e o restante seguem iguais.

## 6. Arquivos afetados

- **edit** `src/routes/dashboard.clientes.$id.briefing.tsx` (reescrita do wizard, novas etapas, novos componentes inline: `ArchetypeGrid`, `FontPicker`, `PalettePicker`).
- **edit** `src/routes/dashboard.clientes.$id.tsx` (label da aba: "DNA da marca").
- **new** `src/lib/extract-palette.ts`.
- **edit** `supabase/functions/studio-generate/index.ts` (injetar tom do arquétipo).

Sem migrations novas, sem novas dependências.

## 7. Detalhes técnicos chave

```ts
// src/lib/extract-palette.ts (esboço)
export async function extractPalette(file: File): Promise<[string, string, string]> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  const buckets = new Map<string, { r:number; g:number; b:number; n:number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] & 0xE0, g = data[i+1] & 0xE0, b = data[i+2] & 0xE0;
    const key = `${r},${g},${b}`;
    const cur = buckets.get(key) ?? { r:0, g:0, b:0, n:0 };
    cur.r += data[i]; cur.g += data[i+1]; cur.b += data[i+2]; cur.n += 1;
    buckets.set(key, cur);
  }
  const top = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map(c => rgbToHex(c.r/c.n, c.g/c.n, c.b/c.n));
  while (top.length < 3) top.push("#FFFFFF");
  return top as [string, string, string];
}
```

```ts
// google fonts preview
const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g,'+')}:wght@400;700&display=swap`;
const link = document.createElement("link");
link.rel = "stylesheet"; link.href = url;
document.head.appendChild(link);
// usa style={{ fontFamily: `"${name}", sans-serif` }} no preview
```

Pronto para implementação após aprovação.
