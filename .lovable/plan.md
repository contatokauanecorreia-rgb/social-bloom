# BLOCO 7 — Portal público de aprovação

A rota pública `/aprovar/$token` já existe. Vou reescrevê-la para bater 1:1 com a especificação visual e comportamental do Bloco 7.

## Mudanças no `src/routes/aprovar.$token.tsx`

### Header
- Logo Postly pequeno (ícone `Sparkles` em pílula com `bg-gradient-primary`).
- Nome do cliente + período (ex: "Studio Bela Forma" / "Semana de 13 a 19 de maio").
- Badge **"X conteúdos aguardando aprovação"** (laranja/âmbar quando >0; verde "Tudo respondido" quando =0). Calculada por `useMemo` em cima de `responses`.

### Grid de conteúdos
- **2 colunas no desktop, 1 no mobile** (`grid md:grid-cols-2 gap-5`).
- 4 mocks (carrossel, reels, post, story) — alinhados com os exemplos do Bloco 6 para dar continuidade narrativa.
- Cada card:
  - **Thumbnail** (h-44) com gradiente por tipo + ícone grande (Images/Video/ImageIcon/Layers).
  - Tipo (badge) + data/horário previsto (ex: "Seg, 13 mai · 09h00").
  - Título + copy do conteúdo.
  - **Botão "Aprovar" verde** (`bg-emerald-600`).
  - **Botão "Solicitar revisão" outline** → expande textarea inline + botão "Enviar".
  - Ao aprovar: **overlay verde "Aprovado"** sobre a thumbnail (círculo com check) + badge "Aprovado" no topo do card. Toast: *"Resposta registrada. O social media foi notificado."*
  - Ao enviar revisão: validação de comentário não-vazio, marca status `changes`, mostra o comentário inline + badge "Revisão pedida" no canto da thumb. Mesmo toast.

### Rodapé
- "Powered by **Postly**" centralizado, em `border-t` separado.

### Detalhes
- Página com `head()` declarando `noindex` (já está) e título.
- Sem login, sem chamada de API real — toda interação é client-side por enquanto. Quando criarmos a tabela `approval_links` num bloco futuro, plugamos aqui.
- Mantém tom acolhedor já existente ("Olá! Hora de aprovar 🎉").

## Arquivos afetados

- **edit** `src/routes/aprovar.$token.tsx` — reescrita completa do componente.

Sem migrations, sem novas dependências.
