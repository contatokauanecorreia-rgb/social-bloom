## Objetivo

Ativar **dark mode global** em toda a plataforma (padrão escuro) e adicionar um **toggle light/dark** persistente acessível ao usuário.

## Mudanças

### 1. Tokens dark em `src/styles.css`

Hoje só existe `:root` (light). Adicionar bloco `.dark { ... }` com a paleta escura equivalente — fundo quase preto com leve toque magenta, foreground claro, borders sutis. A escala `--primary-*` e o gradiente da marca permanecem (magenta brilha melhor sobre escuro). Ajustar também `--shadow-elegant` para sombra mais densa no escuro.

```css
.dark {
  --background: oklch(0.13 0.02 340);
  --foreground: oklch(0.97 0.01 340);
  --card: oklch(0.17 0.025 340);
  --card-foreground: oklch(0.97 0.01 340);
  --popover: oklch(0.17 0.025 340);
  --popover-foreground: oklch(0.97 0.01 340);
  --primary-foreground: oklch(0.99 0.005 340);
  --secondary: oklch(0.22 0.03 340);
  --secondary-foreground: oklch(0.97 0.01 340);
  --muted: oklch(0.22 0.03 340);
  --muted-foreground: oklch(0.70 0.02 340);
  --accent: oklch(0.28 0.08 350);
  --accent-foreground: oklch(0.97 0.01 340);
  --destructive: oklch(0.62 0.23 28);
  --destructive-foreground: oklch(0.99 0.005 340);
  --border: oklch(0.28 0.02 340);
  --input: oklch(0.28 0.02 340);
  --ring: oklch(0.64 0.27 0);
  --sidebar: oklch(0.15 0.02 340);
  --sidebar-foreground: oklch(0.97 0.01 340);
  --sidebar-accent: oklch(0.25 0.06 350);
  --sidebar-accent-foreground: oklch(0.97 0.01 340);
  --sidebar-border: oklch(0.28 0.02 340);
  --shadow-elegant: 0 8px 24px -8px oklch(0 0 0 / 0.5);
}
```

A regra `@custom-variant dark (&:is(.dark *))` já existe no styles.css e fará todos os componentes responderem.

### 2. Theme provider + toggle (`src/lib/theme.tsx` — novo)

Pequeno provider client-side:
- Lê `localStorage["theme"]` (`"light" | "dark"`); padrão = `"dark"`.
- Aplica/remove a classe `dark` em `document.documentElement` num `useEffect`.
- Expõe `useTheme()` → `{ theme, setTheme, toggleTheme }`.

### 3. Aplicar classe inicial sem flash (`src/routes/__root.tsx`)

- Adicionar `className="dark"` em `<html>` no `RootShell` para o SSR já vir escuro (evita flash branco no carregamento).
- Envolver `<Outlet />` com `<ThemeProvider>` no `RootComponent`.

### 4. Componente de toggle (`src/components/ThemeToggle.tsx` — novo)

Botão `Button variant="ghost" size="icon"` com ícones `Sun`/`Moon` do lucide, chamando `toggleTheme()`. Tooltip "Alternar tema".

### 5. Posicionar o toggle

- **Dashboard:** adicionar o `ThemeToggle` no header do `AppSidebar` (ou topo da área autenticada) — fica acessível em toda a área logada.
- **Landing/login:** adicionar no canto superior direito da página `index.tsx` e `login.tsx`.

(Lista exata de arquivos a tocar: `src/components/dashboard/AppSidebar.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`. Ajusto durante a implementação se algum tiver header próprio melhor.)

## Fora do escopo

- Não mudar tokens `--primary-*` nem o gradiente da marca.
- Não criar variantes específicas por componente — todos já usam tokens semânticos.
- Sem detecção `prefers-color-scheme` automática (padrão fixo dark, usuário alterna manualmente).

## Verificação

- Carregar a app: deve abrir em dark, sem flash branco.
- Clicar no toggle: alterna instantaneamente entre dark e light em toda a UI; recarregar mantém a preferência.
- Conferir contraste: cards, inputs, sidebar, dialogs, toasts, página `/design-system`, dashboard, studio.
- Conferir o gradiente magenta e botões primários — devem continuar vibrantes em ambos os modos.
