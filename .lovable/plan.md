
## Design System em /design-system

Criar uma rota showcase com todos os componentes shadcn/ui usando uma paleta derivada do gradiente rosa→magenta da imagem.

### 1. Paleta de cores (light mode)
Atualizar `src/styles.css` com tokens derivados do gradiente `#FF2E63 → #FF1493`:

- **Primary**: magenta sólido (~`oklch(0.62 0.27 0)`) — base para botões, links, focus rings
- **Gradiente principal**: variável `--gradient-primary: linear-gradient(90deg, #FF2E63, #FF1493)` aplicada em CTAs, hero, badges de destaque
- **Variantes derivadas** (escala 50→900 do magenta) expostas como utilitários: `--primary-50` (rosa muito claro / backgrounds suaves) até `--primary-900` (magenta profundo / hover states)
- **Accent**: rosa coral mais claro do início do gradiente
- **Destructive / muted / border / ring**: ajustados para harmonizar com a base rosada
- **Sombra colorida**: `--shadow-primary` com glow magenta para botões principais (como na imagem de referência)
- Fundo geral neutro claro (off-white) para o magenta respirar

### 2. Botão principal customizado
Adicionar variantes ao `button.tsx`:
- `gradient` — fundo com `--gradient-primary`, texto branco, sombra rosa difusa, cantos bem arredondados (rounded-full) — replicando exatamente o botão "Entrar" da imagem
- `gradient-outline` — borda gradiente, fundo transparente

### 3. Página `/design-system`
Novo arquivo `src/routes/design-system.tsx` em scroll vertical único, com seções uma após a outra:

1. **Header** — título "Design System", subtítulo da plataforma SaaS, botão gradiente "Entrar" como hero do estilo
2. **Cores** — swatches da escala primary (50–900), accent, semânticas (background, foreground, muted, border, destructive), e um card grande mostrando o gradiente
3. **Tipografia** — h1–h6, parágrafo, lead, muted, código inline
4. **Botões** — todas as variantes (default, gradient, outline, secondary, ghost, link, destructive) × tamanhos (sm, default, lg, icon) + estados disabled/loading
5. **Inputs & Forms** — Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Label, Form com validação exemplo, InputOTP, Calendar/DatePicker
6. **Display** — Card, Badge (todas variantes + uma `gradient`), Avatar, Separator, Skeleton, Aspect Ratio, Progress, Table, Chart (exemplo simples)
7. **Navegação** — Tabs, Breadcrumb, Pagination, Navigation Menu, Menubar, Sidebar (mini exemplo), Command
8. **Overlays** — Dialog, AlertDialog, Sheet, Drawer, Popover, HoverCard, Tooltip, DropdownMenu, ContextMenu, Accordion, Collapsible, Carousel, Resizable, ScrollArea, Toggle, ToggleGroup
9. **Feedback** — Alert (todas variantes), Sonner toast (botões disparando exemplos), Progress

Cada seção em um bloco com título, breve descrição e exemplos interativos lado a lado.

### 4. Acesso
- Link discreto para `/design-system` no rodapé do `index.tsx` (substituindo o placeholder com uma landing page mínima da plataforma SaaS)
- Rota acessível diretamente via URL para referência durante desenvolvimento

### 5. Metadata
`head()` próprio na rota com título "Design System — [Plataforma]" e descrição.
