# Briefing inteligente — stepper de 5 etapas

Reescrever `src/routes/dashboard.clientes.$id.briefing.tsx` como um wizard com 5 etapas, gerador de prompt e persistência no banco existente.

## Stepper

Topo da página:
- **Pills clicáveis** com numeração — concluídas (verde + ✓), ativa (gradient primary), pendentes (outline). Clicar volta/avança livremente.
- **Barra `<Progress>`** com % `(step+1)/5 * 100`.
- Etapas: `Identidade · Tom de voz · Público · Objetivos · Revisão`.

Rodapé: botões `Voltar` (outline) e `Próximo` (gradient). Na etapa 5 vira **`Salvar briefing`**.

## Estado único

```ts
type Form = {
  name; segment; personality: string[];                       // etapa 1
  formality: 1-5; persona; dos: string[]; donts: string[];    // etapa 2
  age; pains; dreams;                                          // etapa 3
  goal; competitors: [string,string,string]; frequency;       // etapa 4
};
```

Hidratação no mount: 2 queries paralelas — `clients.name` + `client_briefings.{tone_of_voice, target_audience, dos, donts, goals, content_pillars, extra}`. O `extra` (jsonb já existente) carrega as respostas brutas do wizard, garantindo que ao reabrir o briefing tudo volta exatamente como estava.

## Etapa 1 — Identidade

- Input "Nome do cliente".
- Grid 3 colunas de cards clicáveis (segmento): Saúde e beleza · Alimentação · Serviços locais · Educação · E-commerce · Outro.
- `TagInput` "Personalidade em 3 palavras".

## Etapa 2 — Tom de voz

- `Slider` 1–5 de Formalidade com label dinâmico (Muito informal → Muito formal).
- Cards 2×2 "A marca se parece com…": Amiga especialista / Autoridade / Aspiracional / Popular (com hint).
- Dois `TagInput`:
  - "Palavras que a marca USA" — wrapper com `bg-emerald-50 border-emerald-200`.
  - "O que a marca NUNCA deve dizer" — wrapper com `bg-rose-50 border-rose-200`.
  - (TagInput existente não aceita className por chip; o tom verde/vermelho vem do container ao redor — resultado visual idêntico.)

## Etapa 3 — Público

- Cards 4 colunas: 18–24 / 25–35 / 36–45 / 46+.
- 2 `Textarea`: "maiores dores" e "o que sonha em alcançar".

## Etapa 4 — Objetivos

- Cards 2×2: Gerar agendamentos / Crescer o perfil / Construir autoridade / Vender produto. Cada um traz uma instrução de CTA associada (usada no contexto da IA).
- 3 `Input` para `@perfil` de concorrentes.
- Cards 4 colunas de frequência: 1–2x / 3–4x / 5–6x / 7x+ por semana.

## Etapa 5 — Revisão

- **Bloco destacado** com `border-2 border-blue-200 bg-blue-50/60`, ícone Sparkles, título "Contexto gerado para a IA", texto **em itálico** com o prompt montado.
- Grid 2×2 de resumo: Segmento / Público (faixa etária) / Tom de voz (persona) / Objetivo.

### Geração do contexto

`useMemo` recalcula o prompt a cada mudança:

```
Você está criando conteúdo para {nome}, {segmento} voltado a pessoas de {faixa}.
A marca tem personalidade {personality}.
Tom de voz: {persona} ({formalidade}).
Use sempre: {dos}.
Nunca use: {donts}.
Dores do público: {pains}
Sonhos do público: {dreams}
O objetivo de cada conteúdo é {goal}. {cta_instrucao_baseada_no_objetivo}
```

CTA por objetivo:
- Agendamentos → "Inclua sempre uma chamada para agendamento (link na bio, WhatsApp ou DM)."
- Crescer perfil → "Termine os conteúdos com um gancho que estimule salvar, compartilhar ou comentar."
- Autoridade → "Sempre que possível, traga dados, fontes ou exemplos práticos."
- Vender → "Conduza o leitor para a oferta com prova social e CTA claro de compra."

## Salvar

Ao clicar **Salvar briefing**:
1. `UPDATE clients SET name` se o nome mudou.
2. `UPSERT client_briefings` mapeando o wizard nas colunas existentes:
   - `tone_of_voice` ← `"{persona} · {formalidade}"`
   - `target_audience` ← `"{faixa} anos. Dores: {pains}. Sonhos: {dreams}"`
   - `content_pillars` ← `personality[]`
   - `goals` ← `[goalLabel]`
   - `dos`, `donts` ← arrays diretos
   - `extra` ← objeto `Form` completo (para reidratação fiel)
3. `toast.success` + `navigate({ to: "/dashboard/clientes/$id", params: { id } })`.

A aba "Visão geral" já lê desses campos, então o contexto da IA aparece lá imediatamente após salvar.

## Sem mudanças de banco

Todas as colunas necessárias (`tone_of_voice`, `target_audience`, `content_pillars`, `goals`, `dos`, `donts`, `extra` jsonb) já existem em `client_briefings`.

## Arquivo afetado

- `src/routes/dashboard.clientes.$id.briefing.tsx` — reescrito por completo.
