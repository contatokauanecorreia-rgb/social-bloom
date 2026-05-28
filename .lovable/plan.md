# Página pública do cliente

Cria uma vitrine pública (sem login) com os conteúdos aprovados de cada cliente, acessível via link compartilhável.

## 1. Banco de dados

Migration em `clients`:
- Adicionar `slug text unique` (gerado a partir do nome ao criar/editar cliente, ex: `studio-bela-forma`).
- Backfill nos clientes existentes.
- Nova policy `SELECT` pública (role `anon`) em `clients` restrita por slug — apenas colunas seguras (name, company, avatar_url, instagram, website, slug). Para isso usaremos uma `security definer function` `public.get_public_client(slug text)` que retorna só esses campos + a lista de posts aprovados, evitando expor `user_id`, `email`, `phone`, `notes`.
- Função `public.get_public_client_content(slug text)` retornando posts com `status = 'published'` (tratado como "aprovado") + tipo derivado de `tags` (carrossel/reels/post/story).
- `GRANT EXECUTE ... TO anon, authenticated` nas duas funções.

Sem expor a tabela `clients` diretamente ao `anon`.

## 2. Rota pública `/cliente/$slug`

Arquivo: `src/routes/cliente.$slug.tsx` (fora do layout `dashboard`, sem auth).

- `loader`: chama `supabase.rpc('get_public_client', { slug })` + `get_public_client_content`. 404 se não existir.
- `head()`: title `"{nome} — Conteúdos"`, description, `og:title`, `og:description`, `og:image` (avatar do cliente quando existir), `robots: index`.
- Layout responsivo mobile-first:
  - **Header**: avatar/logo (fallback iniciais), nome, @instagram, link do site. Centrado no mobile, alinhado à esquerda no desktop.
  - **Filtros simples** (chips): Todos · Carrosséis · Vídeos · Posts · Stories.
  - **Grade**: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` com cards quadrados, capa por tipo (gradiente já usado no projeto), badge do tipo, título e legenda truncada. Clique abre `Dialog` com detalhes (legenda completa, data, tags).
  - **Footer**: "Feito com Postly" (branding leve, sem links pro app).
- Sem ações de edição/aprovação — somente visualização.
- Estado vazio amigável ("Em breve novos conteúdos").

## 3. Botão "Compartilhar com cliente"

Em `src/routes/dashboard.clientes.$id.index.tsx` (página do cliente no dashboard):
- Botão `Compartilhar link público` no header, abre `Dialog` com:
  - URL completa `https://{host}/cliente/{slug}`
  - Botão Copiar (toast de confirmação)
  - Botão Abrir em nova aba
  - QR code (usa `qrcode.react`, já leve) para abrir no celular
- Aviso curto: "Qualquer pessoa com o link consegue ver os conteúdos aprovados".

## 4. Detalhes técnicos

- Cliente Supabase do browser (anon key) já pode chamar as RPCs.
- Geração de slug: helper `slugify(name)` simples + sufixo numérico em caso de colisão, aplicado no `INSERT`/`UPDATE` do cliente (trigger SQL `BEFORE INSERT OR UPDATE` em `clients`).
- Tipos atualizados via regen do `types.ts` após migration.
- Mobile: header empilhado, filtros com scroll horizontal, cards 2 colunas, dialog ocupa quase tela cheia (`sm:max-w-lg`).

## Fora de escopo

- Comentários/reações públicas.
- Autenticação por senha do link.
- Upload real de mídia dos posts (continua usando as capas-gradiente atuais — quando houver `media_url` nos posts, basta trocar a capa).
