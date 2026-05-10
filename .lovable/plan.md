## Objetivo

Aplicar no editor de carrossel o **par de fontes (heading + body)** que o wizard já envia, em vez de usar uma única fonte global. Hoje o wizard salva `pageFontPair` mas o render usa só `brandFontFamily(dna.brandFont)` em todos os textos.

## Mudanças

**Arquivo único:** `src/routes/dashboard.studio.carrossel.tsx`

### 1. `SlideCanvas`: receber e usar par de fontes

- Adicionar prop `fontPair?: { heading: string; body: string } | null`.
- Calcular duas famílias:
  - `headingFamily` = `fontPair?.heading` → `brandFontFamily` fallback para `dna.brandFont`.
  - `bodyFamily` = `fontPair?.body` → fallback idem.
- Remover o `fontFamily: family` do container raiz (linha 1637) — passar família por elemento.

### 2. Aplicação por elemento

- **Título** (todos os render-paths: minimalista, criativo, padrão, `renderCreativeTitle`): `fontFamily: headingFamily`.
- **Subtítulo**: `fontFamily: headingFamily` (segue o título; é elemento de destaque).
- **Body**: `fontFamily: bodyFamily`.
- **Assinatura** (`sigStyle`, linha 1502): `fontFamily: bodyFamily` — conforme escolha do usuário.

### 3. Propagar `pageFontPair` até o canvas

- `pageFontPair` já existe no estado da página (linha 205) e é hidratado pelo wizard (linha 332) e por templates (linha 360–361).
- Onde `<SlideCanvas .../>` é renderizado (preview principal e thumbnails), passar `fontPair={pageFontPair}`.
- Garantir `loadGoogleFont(pageFontPair.heading)` e `loadGoogleFont(pageFontPair.body)` no boot — já feito no wizard payload, replicar no carregamento de template se faltar.

### 4. Bootstrap a partir do wizard

- O wizard já envia `fontPair` no payload de navegação para o editor (linha 192). Confirmar que `setPageFontPair(data.fontPair)` é chamado no carregamento (já existe no entorno da linha 332). Sem mudança de schema.

## Fora do escopo

- Override de fonte por elemento/slide no painel direito (foi descartado nesta rodada).
- Painel para trocar o par dentro do editor — fica para depois; por enquanto a troca é só pelo wizard.
- Mudanças no edge function `carrossel-generate` (não envolve fonte).

## Riscos / verificação

- Conferir que ao usar template salvo (`tpl.font_pair`) o canvas re-renderiza com a nova família — já há `loadGoogleFont` no fluxo de template.
- Conferir export PNG/PDF: o html2canvas/exporter usa o DOM atual, então pegar as famílias automaticamente.
