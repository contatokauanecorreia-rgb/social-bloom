# BLOCO 5 — Hub de Clientes

A tela `/dashboard/clientes` já tem 90% da especificação (cards, avatares com iniciais, status, métricas, modal "Novo cliente"). Faltam apenas três ajustes:

## 1. Renomear e conectar ao banco

`src/routes/dashboard.clientes.index.tsx`:

- Trocar título de **"Meus clientes" → "Hub de clientes"** (PageHeader e meta tag).
- Substituir os 3 mocks hard-coded por **leitura real da tabela `clients`** via Supabase (RLS já está configurada).
- Mostrar os **3 mocks como exemplos visuais** apenas quando o usuário ainda não tem nenhum cliente cadastrado, com aviso "Você ainda não cadastrou clientes — abaixo estão exemplos…". Cards mock ficam com `opacity-80` e botão "Exemplo" desabilitado (não dá pra navegar para um cliente fake).

## 2. Modal "Novo cliente" — campos básicos + redirect para DNA

Ajustar o conteúdo do `Dialog`:

- **Nome** (obrigatório).
- **Segmento** (input texto).
- **Status** (3 botões pill: Ativo / Pausado / Encerrado — default "Ativo").
- **Notas** (opcional).
- Texto de apoio: *"Após criar, você será levado direto ao DNA da marca para preencher o briefing."*

Botão de submit passa a ser **"Criar e preencher DNA"**:

```ts
const { data } = await supabase.from("clients").insert({
  user_id: session.user.id,
  name, company: segment || null, status, notes: notes || null,
}).select("id").single();

navigate({ to: "/dashboard/clientes/$id/briefing", params: { id: data.id } });
```

(A rota DNA da marca = `/clientes/:id/briefing`, conforme definido no Bloco 4.)

## 3. Card visual

- Segmento exibido como **badge** (`<Badge variant="soft">`) em vez de só texto cinza, para combinar com a especificação.
- Cor do bloco "aguardando aprovação" trocada de âmbar para **laranja** quando `awaitingApproval > 0`, conforme pedido no Bloco 5.
- Status "encerrado" passa de rose → cinza neutro (`zinc-100/700`), conforme pedido.

## Arquivos afetados

- **edit** `src/routes/dashboard.clientes.index.tsx` (única alteração).

Sem migrations, sem novas dependências. Métricas "X conteúdos este mês" / "X aguardando aprovação" continuam zeradas para clientes reais nesta etapa — serão preenchidas pelo Planner / Aprovação em blocos seguintes (já tem TODO marcado).
