## Objetivo

Adicionar um painel de **Score preditivo** no editor de carrossel (`/dashboard/studio/carrossel`). Antes de exportar, o usuário pode rodar uma análise com IA que devolve nota de 1 a 10 + explicação curta com pontos a melhorar, considerando formato, tom, melhor horário e nicho do cliente.

## UX

- Novo painel no topbar/sidebar do editor (próximo ao botão "Baixar todos"), com:
  - Botão **"Analisar com IA"** (gasta 1 crédito, mesmo padrão dos demais geradores).
  - Após análise: card mostrando **score grande (X/10)**, **horário sugerido** ("Ex.: terça, 19h–21h"), **3 pontos fortes**, **3 sugestões de melhoria**.
  - Estado vazio antes de rodar: "Rode uma análise antes de exportar para ver o potencial do post."
- O botão **"Baixar todos"** continua funcional, mas ganha um aviso suave quando nenhum score foi calculado ainda ("Quer analisar antes de exportar?" — não bloqueia, só sugere).
- Se o usuário editar slides depois da análise, marcar score como "desatualizado" (badge cinza), incentivando re-análise.

## Backend

Nova edge function **`carrossel-score`** (segue o padrão de `carrossel-generate` e `planner-ideas`, via Lovable AI Gateway, modelo `google/gemini-3-flash-preview`, tool-calling para JSON estruturado).

**Input:**
```json
{
  "format": "carrossel" | "quadrado" | "stories",
  "slides": [{ "title": "...", "subtitle": "...", "body": "..." }],
  "clientId": "..."
}
```

**Lookup do cliente:** mesma lógica usada hoje no editor (briefing mock em `client-context.ts` + briefing salvo se houver). Passa para o prompt: segmento, tom de voz, objetivo, palavras-chave.

**Output (tool call estruturado):**
```json
{
  "score": 8,
  "summary": "Frase curta justificando a nota.",
  "bestTime": "Terça e quinta, 19h–21h",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."]
}
```

Sem persistência em DB nessa entrega — score vive em memória no editor (suficiente para o fluxo "ver antes de exportar"). Caso queira histórico depois, é outra iteração.

## Mudanças

### 1. `supabase/functions/carrossel-score/index.ts` (novo)
- CORS padrão, POST, valida payload com Zod.
- Monta prompt com briefing do cliente + slides + formato.
- Chama Lovable AI Gateway com tool `return_score` (schema acima).
- Trata 429/402 devolvendo a mensagem ao cliente.

### 2. `src/routes/dashboard.studio.carrossel.tsx`
- Novo estado: `score: ScoreResult | null`, `scoring: boolean`, `scoreStale: boolean`.
- Função `runScore()`:
  - Gate: precisa de `clientId` e ≥1 slide com conteúdo.
  - `consumeCredits(1)` (refund em erro), igual aos demais fluxos.
  - `supabase.functions.invoke("carrossel-score", { body })`.
  - Salva resultado em `score`, zera `scoreStale`.
- Marcar `scoreStale = true` em qualquer setter de slides (título/subtítulo/body/reordenar/adicionar/remover).
- Renderizar o painel `<ScorePanel />` ao lado/abaixo do botão "Baixar todos". Componente local no mesmo arquivo (já é o padrão do editor) ou extraído para `src/components/studio/CarouselScorePanel.tsx` se ficar > ~80 linhas.

### 3. Sem mudanças no banco
- Nada de migrations. Score é efêmero.

## Fora de escopo
- Histórico de scores por post.
- Score automático ao abrir o editor (só sob clique, para não gastar créditos sem consentimento).
- Re-análise automática após editar (apenas marca como desatualizado).
- Mudar o fluxo do Planner ou do CarouselAIWizard.
