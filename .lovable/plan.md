## Correção da seção "Combinação de fontes"

Dois ajustes mínimos no componente `FontCard` em `src/components/studio/CarouselAIWizard.tsx`. Nada mais é tocado.

### 1. Carregar a fonte real de cada card

Hoje o CSS do preview já aponta `fontFamily: "${heading}"` e `"${body}"`, mas só funciona quando essas famílias estão de fato carregadas via `<link>` do Google Fonts. O preload acontece apenas no `useEffect` que gera as sugestões — se o catálogo do Google Fonts ainda não chegou, falhar (CORS, chave inválida, rate limit) ou o card vier de outro caminho (DNA, Personalizadas), nenhum `<link>` é injetado e o navegador cai na fonte de fallback `system-ui`. Resultado: todos os cards aparentam ter a mesma fonte.

Correção: o próprio `FontCard` chama `loadGoogleFont(heading)` e `loadGoogleFont(body)` em um `useEffect` no mount/quando heading ou body mudam. Como `loadGoogleFont` já tem deduplicação interna (Set `loadedGoogle`), não há custo de chamadas duplicadas. Isso garante que cada card baixa exatamente as fontes que renderiza.

### 2. Nome das fontes mais visível

A linha com o nome (`{heading} + {body}`) abaixo do badge passa de:

- `text-[10px] text-muted-foreground` → `text-[12px] font-medium text-foreground`
- margem `mt-1` → `mt-1.5` para respirar com o tamanho maior

### Detalhes técnicos

Arquivo único alterado: `src/components/studio/CarouselAIWizard.tsx`, dentro da função `FontCard` (linhas ~837–866).

```tsx
function FontCard({ heading, body, badge, badgeTone, selected, onClick }) {
  // ... badgeClass igual ...

  useEffect(() => {
    loadGoogleFont(heading);
    loadGoogleFont(body);
  }, [heading, body]);

  return (
    <button ...>
      <div style={{ fontFamily: `"${heading}", system-ui, sans-serif`, fontWeight: 700 }}>Aa Título</div>
      <div style={{ fontFamily: `"${body}", system-ui, sans-serif`, fontWeight: 400 }}>Texto do corpo</div>
      <div className="... badge ...">{badge}</div>
      <div className="mt-1.5 text-[12px] font-medium text-foreground">
        {heading}{heading !== body ? ` + ${body}` : ""}
      </div>
    </button>
  );
}
```

`useEffect` e `loadGoogleFont` já estão importados no arquivo. Nenhuma outra parte da plataforma é tocada.
