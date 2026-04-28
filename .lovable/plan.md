# Expansão Postly: Clientes, Aprovação, Portal Público e Precificação

## Resumo da entrega
- **Backend real** para Clientes e Briefing (tabelas + RLS).
- **UI mockada** para Aprovação interna, Portal Público e Calculadora.
- **Reorganização do menu lateral** com seções agrupadas.
- **Remoção da rota `/dashboard/agentes`** (substituída por `/studio`).
- Nada existente é alterado funcionalmente além do menu e do rename agentes→studio.

---

## 1. Reorganização do menu lateral (`AppSidebar.tsx`)

Novo agrupamento com labels de seção:

```
INÍCIO
  └─ Início                 → /dashboard

CRIAR
  └─ Studio de conteúdo     → /dashboard/studio
  └─ Planner de conteúdo    → /dashboard/plano
  └─ Gerar carrosséis       → /dashboard/carrosseis

CLIENTES
  └─ Hub de clientes        → /dashboard/clientes

NEGÓCIO
  └─ Precificação           → /dashboard/precificacao

CONTA
  └─ Configurações          → /dashboard/configuracoes
```

- Mantém o comportamento de collapse atual.
- Renomeia `/dashboard/agentes` → `/dashboard/studio` (move o arquivo de rota e atualiza referências em `AppSidebar`, `dashboard.index.tsx` e `IdeaActions.tsx`).

---

## 2. Novas rotas

Todas dentro do layout `/dashboard` (autenticado), exceto o portal público.

| Rota | Arquivo | Tipo |
|---|---|---|
| `/dashboard/clientes` | `dashboard.clientes.index.tsx` | Hub (lista + criar) |
| `/dashboard/clientes/$id` | `dashboard.clientes.$id.tsx` | Layout com tabs (Perfil / Briefing / Aprovação) |
| `/dashboard/clientes/$id/` | `dashboard.clientes.$id.index.tsx` | Perfil |
| `/dashboard/clientes/$id/briefing` | `dashboard.clientes.$id.briefing.tsx` | Briefing inteligente |
| `/dashboard/clientes/$id/aprovacao` | `dashboard.clientes.$id.aprovacao.tsx` | Painel interno de aprovação (mock) |
| `/dashboard/precificacao` | `dashboard.precificacao.tsx` | Calculadora (mock, salva em localStorage) |
| `/aprovar/$token` | `aprovar.$token.tsx` | **Público**, fora do `/dashboard` (mock) |

---

## 3. Backend (Clientes + Briefing)

### Tabela `clients`
- `id uuid pk`, `user_id uuid not null` (dono/agência)
- `name text not null`, `company text`, `email text`, `phone text`
- `instagram text`, `website text`, `avatar_url text`
- `status text default 'active'` (active | paused | archived)
- `notes text`
- `created_at`, `updated_at`
- RLS: CRUD restrito a `auth.uid() = user_id`.

### Tabela `client_briefings`
- `id uuid pk`, `client_id uuid not null` (FK lógica), `user_id uuid not null`
- Campos do briefing inteligente:
  - `business_description text`
  - `target_audience text`
  - `tone_of_voice text`
  - `content_pillars text[]`
  - `goals text[]`
  - `dos text[]`, `donts text[]`
  - `references text` (links/exemplos)
  - `extra jsonb default '{}'` (espaço para evolução)
- `created_at`, `updated_at`
- 1 briefing por cliente (`unique(client_id)`).
- RLS: CRUD por `user_id`.

### Trigger
- `update_updated_at_column` em ambas as tabelas (já existe a função).

> Aprovação real e tokens públicos **não** entram nesta leva — ficam mockados.

---

## 4. Hub de clientes (`/dashboard/clientes`)

- Header com botão **"+ Novo cliente"** (abre Dialog).
- Grid de cards (responsive 1/2/3 colunas) com avatar, nome, empresa, status badge.
- Empty state com CTA central.
- Card clica → `/dashboard/clientes/$id`.
- Busca simples por nome.

---

## 5. Perfil do cliente (`/dashboard/clientes/$id`)

Layout com header (avatar + nome + empresa + status) e tabs:
- **Perfil** (index): dados de contato editáveis, notas.
- **Briefing**: formulário do briefing inteligente.
- **Aprovação**: painel interno (mock).

Botão **"Gerar link de aprovação"** no header → mostra modal com URL fictícia `/aprovar/{token-mock}` + botão copiar.

---

## 6. Briefing inteligente (`/dashboard/clientes/$id/briefing`)

Formulário em seções (Card por bloco):
1. Sobre o negócio (textarea)
2. Público-alvo (textarea)
3. Tom de voz (textarea)
4. Pilares de conteúdo (TagInput — reaproveita `components/plano/TagInput.tsx`)
5. Objetivos (TagInput)
6. Faça / Não faça (dois TagInputs lado a lado)
7. Referências e links (textarea)

Botão **"Salvar briefing"** (upsert na tabela). Toast de sucesso.

> Sem geração via IA nesta leva — só formulário estruturado.

---

## 7. Painel interno de aprovação (`/dashboard/clientes/$id/aprovacao`) — MOCK

- Lista de "lotes de aprovação" mockados (3 exemplos).
- Cada lote: status (Aguardando cliente / Aprovado / Com ajustes), data, qtd posts, link público.
- Botão **"Criar novo lote"** (mock — apenas adiciona ao state local).
- Aviso visual: *"Em breve: integração real com posts do Planner."*

---

## 8. Portal público de aprovação (`/aprovar/$token`) — MOCK

Rota **fora** do dashboard, sem autenticação, sem sidebar.

Layout limpo (logo Postly no topo, "Aprovação de conteúdo - {Nome do Cliente Mock}"):
- Lista de cards de posts mockados (3-4 exemplos com imagem placeholder, título, copy).
- Cada card tem:
  - Botão **Aprovar** (verde)
  - Botão **Solicitar ajuste** (outline) — abre textarea inline para comentário
  - Badge de status local (pendente / aprovado / ajuste solicitado)
- Footer com botão **"Enviar respostas"** (mock — toast de sucesso).
- Estado totalmente local (sem persistência nesta leva).

---

## 9. Calculadora de precificação (`/dashboard/precificacao`) — MOCK híbrido com presets

Layout em 2 colunas (desktop):

**Coluna esquerda — Presets**
- 3 cards selecionáveis: **Starter / Pro / Premium**.
- Cada um pré-preenche quantidades dos entregáveis ao clicar.
- Botão "Começar do zero".

**Coluna direita — Configuração**
- Inputs por tipo de entregável (qtd × valor unitário):
  - Posts feed, Carrosséis, Reels, Stories, Capa destaques
- Slider/input de **Margem (%)**
- Slider/input de **Custos fixos (R$)**

**Resumo (card destacado abaixo)**
- Subtotal entregáveis
- + Custos fixos
- × (1 + margem)
- = **Valor mensal sugerido** (grande, gradient)
- Botão "Salvar como preset" (salva em `localStorage`).
- Botão "Exportar PDF" (placeholder — toast "Em breve").

---

## 10. Detalhes técnicos

- **Roteamento**: arquivos flat (`dashboard.clientes.$id.briefing.tsx`) — TanStack auto-gera o tree.
- **Tipos do Supabase**: `src/integrations/supabase/types.ts` regenera automaticamente após a migration.
- **Server functions vs client**: queries simples (CRUD de clientes/briefing) usam `supabase` browser client direto nos componentes — segue o padrão atual do projeto (ver `dashboard.plano.tsx`).
- **Design system**: 100% reaproveitado — `Button`, `Card`, `Dialog`, `Input`, `Textarea`, `Badge`, `TagInput`, `PageContainer`, `PageHeader`, `tagColor`.
- **Portal público `/aprovar/$token`**: criado como rota irmã de `/login` (não dentro de `/dashboard`), sem checagem de auth.

---

## Fora do escopo desta leva
- Geração de briefing por IA.
- Persistência real de aprovações e tokens públicos (vira backend numa próxima leva).
- Integração da aprovação com posts reais do Planner.
- Export PDF da precificação.
- Seleção de cliente ao criar conteúdo no Studio/Planner (vínculo `content_posts.client_id`).
