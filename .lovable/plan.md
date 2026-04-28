# Painel de aprovação interno — visão do social media

Reescrever `src/routes/dashboard.clientes.$id.aprovacao.tsx` para mostrar o lote da semana atual com métricas e cards verticais de cada conteúdo (mock por enquanto, sem mudanças de banco).

## Estrutura da página

### Header
- Título: **"Semana de 13 a 19 de maio"** (período mock fixo) com label pequeno "Período atual" acima.
- À direita: botão `gradient` **"Gerar link de aprovação"** que cria um token aleatório (`{id.slice(0,8)}-{random}`), monta `/aprovar/{token}` e copia para o clipboard com `toast.success`.

### Métricas (grid 2 col mobile / 4 col desktop)
- **Aguardando** (Clock, âmbar)
- **Aprovados** (CheckCircle, esmeralda)
- **Revisão** (AlertCircle, rose)
- **Total do mês** (FileText, neutro)

Valores derivados via `useMemo` a partir do array de conteúdos.

### Lista de cards (vertical, um abaixo do outro)

Cada card horizontal (thumb à esquerda no desktop, em cima no mobile):

1. **Thumbnail placeholder** 28×28 (`h-28 w-28`) com `bg-gradient-to-br` colorido conforme o tipo:
   - Carrossel → violet→fuchsia (ícone `Images`)
   - Reels → rose→orange (ícone `Video`)
   - Post → sky→cyan (ícone `Image`)
   - Story → amber→yellow (ícone `Layers`)
2. **Linha de badges**: tipo (pill colorida) + status (pill colorida) + data prevista em texto pequeno.
3. **Título** do conteúdo (font-semibold).
4. **Preview da copy** com `line-clamp-2`.
5. **Bubble de comentário** (apenas quando status = `revisao`):
   - Container `border-rose-200 bg-rose-50/70 rounded-lg p-3`.
   - Linha topo: `AlertCircle` + nome do cliente · data/hora à direita.
   - Texto do comentário entre aspas curvas.

### Cores dos status
| Status | Chip |
|---|---|
| Aguardando | amber-100 / amber-800 |
| Aprovado | emerald-100 / emerald-800 |
| Revisão | rose-100 / rose-800 |
| Rascunho | muted / muted-foreground |

## Mock data

Array com 5 conteúdos cobrindo todos os tipos e todos os status (incluindo um em `revisao` com comentário "Júlia (Bela Forma)"). Sem persistência ainda — o array fica em `useState` para futura conexão com `content_posts` filtrados por cliente.

## Sem banco

Nenhuma migração — o esquema atual de `content_posts` ainda não tem `client_id` nem `content_type`, então o painel real será conectado em uma etapa futura. Esta entrega é só a UI da visão do social media.

## Arquivo afetado

- `src/routes/dashboard.clientes.$id.aprovacao.tsx` — reescrito por completo.
