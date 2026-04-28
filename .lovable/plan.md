# Perfil do Cliente — Aba "Visão geral"

Reformular a página `/clientes/:id` para usar 5 abas e transformar o conteúdo da aba inicial em um painel de visão geral com métricas, perfil da marca, personalidade e contexto de IA.

## 1. Atualizar layout `src/routes/dashboard.clientes.$id.tsx`

Expandir as abas atuais (Perfil | Briefing | Aprovação) para as 5 solicitadas:

- **Visão geral** → `/dashboard/clientes/$id` (índice)
- **Briefing** → `/dashboard/clientes/$id/briefing` (já existe)
- **Conteúdos** → `/dashboard/clientes/$id/conteudos` (placeholder)
- **Aprovação** → `/dashboard/clientes/$id/aprovacao` (já existe)
- **Precificação** → `/dashboard/clientes/$id/precificacao` (placeholder)

Renomear o rótulo "Perfil" para "Visão geral". Manter o header atual (avatar com iniciais, nome, badge de status) e adicionar logo abaixo do nome: **segmento** (`company` como fallback) e **"Cliente desde {data}"** formatada a partir de `created_at` (incluir esse campo no SELECT).

Criar dois arquivos placeholder mínimos (apenas Card "Em breve"), pois sem eles a navegação por `<Link to="...">` quebra a tipagem do TanStack Router:
- `src/routes/dashboard.clientes.$id.conteudos.tsx`
- `src/routes/dashboard.clientes.$id.precificacao.tsx`

## 2. Reescrever `src/routes/dashboard.clientes.$id.index.tsx` (Visão geral)

Substituir o formulário atual por um painel composto por 4 blocos verticais:

### a) Grid de 4 métricas
Cards com ícone + label + número grande + sublabel:
- **Posts no mês** (FileText)
- **Aprovados** (CheckCircle, verde)
- **Em revisão** (Clock, âmbar)
- **Taxa de aprovação** (TrendingUp, %)

Layout: `grid grid-cols-2 lg:grid-cols-4 gap-4`. Valores derivados (mock por enquanto, a partir do briefing/posts ainda não conectados): 0/0/0/0 quando não há dados, com hint "Nenhum conteúdo registrado ainda."

### b) Seção "Perfil da marca"
Card com 4 campos read-only em grid 2 colunas, populados a partir de `client_briefings`:
- **Nicho** ← `clients.company` (ou campo de briefing se preferir)
- **Tom de voz** ← `tone_of_voice`
- **Público-alvo** ← `target_audience`
- **Objetivo principal** ← primeiro item de `goals[]`

Cada campo mostra valor ou "—" + texto leve "Adicione no briefing" se vazio.

### c) Seção "Personalidade da marca"
Duas linhas de chips:
- **Faça (verde)** ← `dos[]` renderizadas como `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Evite (vermelho)** ← `donts[]` como `bg-rose-50 text-rose-700 border-rose-200`

Empty state: "Defina personalidade no briefing".

### d) Bloco "Contexto da IA"
Card com `Textarea readOnly` (font-mono, ~8 linhas) exibindo um prompt montado a partir do briefing:

```
Você está criando conteúdo para {nome} ({nicho}).
Público-alvo: {target_audience}
Tom de voz: {tone_of_voice}
Pilares: {content_pillars.join(", ")}
Objetivos: {goals.join(", ")}
Sempre: {dos.join(", ")}
Nunca: {donts.join(", ")}
```

Header do card com ícone Sparkles + descrição: "Esse contexto é injetado automaticamente em todas as gerações para esse cliente." Botão `Copy` no canto.

### e) CTA final
Botão `gradient` "Editar briefing" → `<Link to="/dashboard/clientes/$id/briefing" params={{ id }}>`.

## 3. Carregamento de dados

Single `useEffect` faz duas queries em paralelo (`Promise.all`):
- `clients` (name, company, status)
- `client_briefings` (tone_of_voice, target_audience, content_pillars, goals, dos, donts) via `.eq("client_id", id).maybeSingle()`

Loader: `Loader2` centralizado. Briefing pode ser `null` → todos os campos mostram empty state, prompt mostra placeholder "Preencha o briefing para gerar o contexto da IA."

## Arquivos afetados

- `src/routes/dashboard.clientes.$id.tsx` — atualizar tabs (5 itens) + header com data
- `src/routes/dashboard.clientes.$id.index.tsx` — reescrever como Visão geral
- `src/routes/dashboard.clientes.$id.conteudos.tsx` — novo (placeholder)
- `src/routes/dashboard.clientes.$id.precificacao.tsx` — novo (placeholder)

Sem mudanças de banco — usa `clients` e `client_briefings` existentes. O formulário de edição de contato anterior é removido (movido conceitualmente para Briefing/Configurações no futuro).
