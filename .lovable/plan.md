
## Adicionar seção de estatísticas (social proof)

Inserir uma nova seção logo abaixo de `#features` em `src/routes/index.tsx`, no estilo da imagem de referência: um card único, claro, com 3 colunas separadas por divisórias verticais, números grandes em destaque e legenda discreta abaixo.

### Conteúdo
- **+800** — Conteúdos criados
- **+650** — Contas criadas
- **+1.000** — Creators satisfeitos

### Estrutura visual
- Container `rounded-3xl` com `bg-muted/50` (ou `bg-card` com borda) e `shadow-elegant`, com bom padding interno (`py-10 md:py-14`).
- Grid de 3 colunas em desktop (`md:grid-cols-3`), empilhado em mobile.
- Divisórias verticais entre colunas em desktop usando `md:border-l border-border` a partir da 2ª coluna (sem borda no mobile).
- Número grande: `text-4xl md:text-6xl font-bold tracking-tight` — usar `text-gradient-primary` para alinhar com a identidade rosa/magenta da marca (versão diferenciada da imagem original em preto, mas coerente com o design system existente).
- Legenda: `text-sm md:text-base text-muted-foreground mt-2`.
- Centralizar conteúdo de cada coluna.

### Posicionamento
- Inserida entre a seção `#features` e o `<footer>`, dentro do `<main className="container ...">`.
- Margens verticais: `py-12 md:py-16`.

### Arquivo afetado
- `src/routes/index.tsx` — apenas adicionar o novo `<section>`. Sem novas dependências, sem alterações no design system.
