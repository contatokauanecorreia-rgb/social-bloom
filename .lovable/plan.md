## Objetivo

Atualizar o editor `dashboard.studio.carrossel.tsx` para entender a nova configuração que o wizard agora envia: **assinatura global em 6 posições** (top/bottom × esquerda/centro/direita) aplicada igualmente a todos os slides, e os novos presets `texto-left/center` e `foto-left/center` vindos do edge function. Sem isso, o usuário configura tudo no wizard mas o editor ignora ou aplica errado.

## Escopo

### 1. Tipo `SignaturePos` estendido para 6 posições

Hoje o tipo cobre só `tl | tr | bl | br`. Estender para incluir as duas posições centrais novas, mantendo as antigas.

```text
"tl" | "tc" | "tr" | "bl" | "bc" | "br"
```

Atualizar em paralelo:
- O cálculo de `sigStyle` (posicionamento absoluto da assinatura no canvas) para tratar `tc` e `bc`: `left: 50%, transform: translateX(-50%)` + `top` ou `bottom` no padding padrão.
- O `sigBase` lido do bootstrap aceita o novo conjunto.

### 2. Bootstrap: ler `signaturePos` + `signatureEnabled` globais

Atualmente o bootstrap já traz `signature: { enabled, handle, position, color }` mas o wizard agora propaga uma **única configuração global**. O editor já clona `sigBase` em todos os slides (linha 259), então o comportamento padrão já fica correto — só precisa garantir que `position` aceite os 6 valores.

### 3. Painel direito: assinatura global em vez de por slide

Substituir o bloco "Assinatura" do painel (hoje em `slide.signature.*` com checkbox "Aplicar em todos") por um painel **sempre global**:

- Toggle "Ativar assinatura"
- Input `@ da marca`
- Grid 2×3 de posições com mini-ícones (sup-esq, sup-centro, sup-dir, inf-esq, inf-centro, inf-dir)
- Seletor de cor (paleta)
- Remover o checkbox "Aplicar em todos" — toda mudança escreve em **todos os slides** automaticamente via `onApplyToAll`.

Mantém o handler `onUpdateActive` apenas para campos por slide (texto, imagem etc.).

### 4. Compatibilidade com presets `texto-*` / `foto-*`

O edge function já devolve `tipo`, `fundo`, `imageFrame`, `layout`, `align` no formato novo. A função de boot do editor (linhas 245–321) já consome `s.fundo`, `s.imageFrame`, `s.alignment` — deve funcionar sem mudança. Verificação:

- `s.alignment === "left" | "center"` → `slide.textAlign` aplicado (já implementado).
- `s.fundo === "foto"` → `slide.bgImage` recebe `imageDataUrl` (já implementado).
- `imageFrame` agora é só `"full"` ou `null` (presets novos não usam frames parciais). Não precisa remover os branches antigos (`top-60`, `half-*`, etc.) — ficam como dead code inofensivo, removo se a ramificação ficar trivial.

### 5. Limpeza

- Remover bloco antigo "Assinatura" por slide e variável `applySigAll` se não tiver mais uso.
- Atualizar o array de posições no painel para 6 entradas com labels curtos.

## Arquivos afetados

- `src/routes/dashboard.studio.carrossel.tsx` (único arquivo)

## Fora do escopo (próximo plano)

- Drag com guias de alinhamento (Frente 2)
- Pop-up de conteúdo extenso antes de gerar (Frente 3)
- Remoção dos branches legados de `imageFrame` parcial — só se ficarem 100% órfãos
