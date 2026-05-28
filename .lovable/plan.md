# Aprovação e comentários na página pública + notificações in-app

Estende a página pública `/cliente/$slug` (aprovada no plano anterior) com ações de aprovação e comentário por peça, e cria um sistema de notificações dentro da plataforma para o social media.

## 1. Banco de dados

Migration nova:

- **`public.post_approvals`** — uma linha por peça/cliente: `post_id`, `client_id`, `status` ('aprovado' | 'comentado'), `approver_name`, `approver_ip` (hash), `created_at`. Sem `user_id` (ação anônima do cliente).
- **`public.post_comments`** — `post_id`, `client_id`, `author_name` (opcional), `body` (text, 1–1000), `created_at`. Histórico de comentários.
- **`public.notifications`** — `user_id` (social media), `type` ('approval' | 'comment'), `client_id`, `post_id`, `payload jsonb`, `read_at` nullable, `created_at`.
  - RLS: `SELECT/UPDATE/DELETE` apenas para o próprio `user_id`. Sem `INSERT` direto via RLS (inserção feita por RPC `SECURITY DEFINER` abaixo).
- GRANTs em todas as tabelas (`authenticated` + `service_role`).

Funções públicas (`SECURITY DEFINER`, `GRANT EXECUTE TO anon, authenticated`):

- **`public.submit_post_approval(p_slug, p_post_id, p_author_name)`**
  Valida slug + post pertence ao cliente; insere/atualiza linha em `post_approvals`; insere notificação para o `user_id` dono do cliente. Idempotente (uma aprovação por peça).
- **`public.submit_post_comment(p_slug, p_post_id, p_author_name, p_body)`**
  Valida tamanho (≤1000), insere em `post_comments`; insere notificação.
- **`public.get_public_client_content(p_slug)`** (já existe) — estender para retornar também `approved boolean` e `comments_count int` para a UI mostrar estado.

Notificações são inseridas com `INSERT INTO public.notifications ...` dentro da função `SECURITY DEFINER`, contornando RLS.

## 2. Página pública `/cliente/$slug`

(Se ainda não existir, criar conforme plano anterior aprovado.) Em cada card de conteúdo:

- Badge "Aprovado ✓" quando `approved=true`.
- No `Dialog` de detalhes da peça:
  - Botão **Aprovar** (ícone check). Se já aprovado, mostra estado "Aprovado por {nome} em {data}" e desabilita.
  - Campo de **nome** (opcional, persistido em `localStorage` por slug para reuso).
  - **Textarea de comentário** + botão **Enviar comentário**. Validação client+server (1–1000 chars, `zod`).
  - Lista cronológica dos comentários abaixo.
- Toast de confirmação após cada ação. Tratamento de erro amigável.
- Tudo isso usa a `anon key` chamando as RPCs `submit_post_approval` e `submit_post_comment`.

## 3. Notificações dentro da plataforma

Componente `NotificationsBell` no header do dashboard (`src/components/dashboard/AppSidebar.tsx` ou `src/routes/dashboard.tsx`):

- Ícone de sino com badge contendo número de não lidas.
- `Popover` ao clicar, listando últimas 20 notificações (RPC ou `select` direto via RLS).
- Cada item:
  - Ícone (check ou balão), nome do cliente, "aprovou {título}" ou "comentou em {título}", tempo relativo.
  - Clique → navega para `/dashboard/clientes/$id/aprovacao` ou conteúdo equivalente e marca como lida.
- Botão "Marcar todas como lidas".
- Realtime via `supabase.channel('notifications').on('postgres_changes', ...)` filtrando por `user_id` para atualizar contador sem refresh. Habilitar `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications`.

## 4. Validação e segurança

- `zod` no client para nome (≤80) e comentário (1–1000).
- Trigger de validação no servidor (CHECK ou validação dentro da RPC) para mesmas regras.
- Rate-limit simples: a função RPC pode rejeitar mais de N comentários do mesmo IP/post em 1 minuto (usar `inet_client_addr()` com cuidado — opcional, se complicar pulamos).
- Sem expor `user_id` do social media na resposta pública.

## Fora de escopo

- Notificação por email/push.
- Sistema de menções, threading de comentários, edição/exclusão pelo cliente.
- Aprovação revogável pelo cliente (uma vez aprovado, fica aprovado).
