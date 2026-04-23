
## Adicionar seção "Como a Postly impacta cada nicho"

Inserir uma nova seção logo abaixo da seção de estatísticas (`+800 / +650 / +1.000`) e antes do `<footer>` em `src/routes/index.tsx`. A seção apresenta um dado alarmante para cada perfil de usuário (Social Media Freelancer, UGC Creator, Criador de Conteúdo) seguido do benefício direto da plataforma.

### Estrutura da seção

```text
┌──────────────────────────────────────────────────────────────┐
│  Badge: Para quem vive de conteúdo                           │
│  H2: Constância sem depender de ninguém                      │
│  Subtítulo curto                                             │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │ SOCIAL     │  │ UGC        │  │ CRIADORES  │              │
│  │ MEDIA      │  │ CREATOR    │  │            │              │
│  │            │  │            │  │            │              │
│  │ +63%       │  │ +75%       │  │ 15h → 3h   │              │
│  │ (rosa, XL) │  │ (rosa, XL) │  │ (rosa, XL) │              │
│  │            │  │            │  │            │              │
│  │ frase      │  │ frase      │  │ frase      │              │
│  │ contexto   │  │ contexto   │  │ contexto   │              │
│  │            │  │            │  │            │              │
│  │ Benefício  │  │ Benefício  │  │ Benefício  │              │
│  │ Postly     │  │ Postly     │  │ Postly     │              │
│  │            │  │            │  │            │              │
│  │ Fonte ↗    │  │ Fonte ↗    │  │ Fonte ↗    │              │
│  └────────────┘  └────────────┘  └────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

### Conteúdo dos 3 cards

**Card 1 — Social Media Freelancer**
- Tag: `SOCIAL MEDIA`
- Número/dado: `63%`
- Contexto: "dos social medias freelancers faturam menos de R$ 3k/mês."
- Benefício: "Não é falta de talento — é falta de sistema. Com a Postly, você atende mais clientes, em menos tempo, sem depender de agência."
- Fonte: `MLabs · Panorama de profissionais de mídias sociais`

**Card 2 — UGC Creator**
- Tag: `UGC CREATOR`
- Número/dado: `+67%`
- Contexto: "de crescimento no número de influenciadores no Brasil em apenas 1 ano."
- Benefício: "Marcas contratam quem tem processo, portfólio e consistência. A Postly entrega roteiro, fluxo de postagens e mídia kit prontos."
- Fonte: `Mundo do Marketing · Creator Economy 2025`

**Card 3 — Criadores de Conteúdo**
- Tag: `CRIADORES DE CONTEÚDO`
- Número/dado: `15h → 3h`
- Contexto: "é o tempo semanal que um criador com IA e processo gasta — vs. quem faz no improviso."
- Benefício: "Centralize roteiro, carrossel, calendário e funil em uma só plataforma. Economize horas e produza com consistência."
- Fonte: `Treinamentos AF · IA para conteúdo 2026`

### Estilo visual (alinhado ao design system existente)

- Container externo: `py-16 md:py-24`.
- Header da seção: `Badge variant="soft"` com ícone `TrendingUp`, `<h2 className="text-3xl md:text-5xl font-bold tracking-tight">` e parágrafo `text-muted-foreground`.
- Grid: `grid gap-6 md:grid-cols-3`.
- Cada card:
  - `rounded-2xl border bg-card p-8 shadow-elegant flex flex-col`
  - Tag: `Badge variant="soft" className="text-[10px] tracking-widest uppercase w-fit"`
  - Número: `text-5xl md:text-6xl font-bold text-gradient-primary mt-6`
  - Contexto: `text-base text-foreground mt-3 leading-snug`
  - Divisor: `<div className="my-6 h-px bg-border" />`
  - Benefício: `text-sm text-muted-foreground leading-relaxed flex-1`
  - Fonte (rodapé): `text-xs text-muted-foreground/70 mt-6 pt-4 border-t border-border/60`

### Ícones (lucide-react, já usado)

Adicionar ao import existente: `TrendingUp, Users, Camera, Zap` (1 ícone discreto por card, opcional, ao lado da tag).

### Arquivos afetados

- **`src/routes/index.tsx`** — único arquivo alterado:
  1. Estender o import de `lucide-react` com os ícones acima.
  2. Adicionar a nova `<section>` entre a seção de estatísticas e o `<footer>`, dentro do `<main className="container ...">`.

### Notas técnicas

- Sem novas dependências.
- Sem alterações em `src/styles.css` — todas as utilities (`text-gradient-primary`, `shadow-elegant`, `bg-gradient-primary-soft`) já existem.
- Totalmente responsivo: 1 coluna em mobile, 3 colunas em `md:` para cima.
- Acessibilidade: hierarquia `h2` na seção, cards são `<article>` com `<h3>` interno para o número/headline.
