# BLOCO 6 — Perfil do cliente (`/clientes/:id`)

A rota layout (`dashboard.clientes.$id.tsx`), a Visão geral (`.index.tsx`) e a Aprovação (`.aprovacao.tsx`) já existem. As abas "Visão geral | DNA da marca | Conteúdos | Aprovação" já estão funcionando no header. Vou ajustar duas coisas + ampliar a Visão geral para bater 1:1 com a especificação.

## 1. Visão geral — métricas reais + bloco Branding (`dashboard.clientes.$id.index.tsx`)

Refazer a página para incluir tudo que a spec pede, na ordem:

1. **4 métricas no topo** (atualmente são todas zeradas/mock):
   - **Posts criados** — `count` em `content_posts` filtrando por `client_id` (ver passo 4) no mês corrente.
   - **Aprovados** — count com `status = 'aprovado'` no mês.
   - **Em revisão** — count com `status IN ('revisao','aguardando')` no mês.
   - **Taxa de aprovação** — `aprovados / (aprovados + revisao + aguardando) * 100`, ou `—` quando não houver posts.

2. **Seção "DNA da marca"** — manter o card "Perfil da marca" + "Personalidade" que já existe, com nicho / tom / público / objetivo / dos / donts.

3. **Nova seção "Branding"** — preview visual:
   - 3 swatches da paleta (`palette[0..2]`) com seus HEX abaixo.
   - Preview tipográfico: cartão com fundo `palette[0]` e texto na fonte `brand_font` (carrega via `<link>` do Google Fonts dinamicamente quando `brand_font_url` apontar para fonts.googleapis ou quando o nome for definido) — ex: "Aa — Studio Bela Forma" como demonstração.
   - Badge com o nome do **arquétipo** (lendo `archetype`).
   - Estado vazio: se faltar paleta/fonte/arquétipo, mostrar placeholder "— Defina no DNA da marca".

4. **Botão "Editar DNA da marca"** — já existe como "Editar briefing"; renomear o label para **"Editar DNA da marca"** conforme spec, mantendo o `Link to="/dashboard/clientes/$id/briefing"`.

5. **Bloco Contexto da IA** continua como hoje (já é parte do que a IA recebe — é útil manter, mesmo que a spec não cite explicitamente).

### Sobre a métrica de posts por cliente

A tabela `content_posts` hoje **não tem `client_id`** (tem só `week_id`, `user_id`). Sem isso, não consigo contar posts por cliente. Duas opções:

- **(A) Métricas zeradas/placeholder** com nota "Em breve: vinculação de posts a clientes" — solução rápida, sem migration.
- **(B) Migration adicionando `client_id uuid REFERENCES clients(id)` em `content_posts` (nullable)** + atualizar Studio/Planner para gravar quando aplicável. Mais correto, mas extrapola o Bloco 6.

Vou seguir com **(A)** agora — como ainda não há posts vinculados a clientes, qualquer count seria fake. Deixo o cálculo já estruturado para virar real assim que (B) for feito num bloco futuro. Se preferir já fazer (B), me avisa.

## 2. Aba Aprovação — link público com botão copiar (`dashboard.clientes.$id.aprovacao.tsx`)

A spec pede o link visível (não atrás de um modal). Ajuste:

- **Adicionar bloco no topo** "Link público de aprovação" mostrando `flowpauta.app/aprovar/<token>` em um `Input` readonly + botão "Copiar". O token é gerado uma vez por mount do componente (memorizado) e o `origin` usado é `flowpauta.app` (literal, conforme spec) — não `window.location.origin`.
- O botão "Gerar link de aprovação" do header global (no layout) continua funcionando como atalho que copia.
- Manter o resto: contadores, cards de conteúdo, comentários inline (já estão bons).

## 3. Aba Conteúdos (placeholder)

Não está no escopo deste bloco — manter placeholder atual.

## Arquivos afetados

- **edit** `src/routes/dashboard.clientes.$id.index.tsx` — métricas estruturadas + nova seção Branding + label do CTA.
- **edit** `src/routes/dashboard.clientes.$id.aprovacao.tsx` — bloco visível com link `flowpauta.app/aprovar/<token>` + Copiar.

Sem migrations, sem dependências novas. Carregamento de Google Font no preview usa `<link rel="stylesheet">` injetado dinamicamente (sem libs), só quando `brand_font_url` é http(s).
