## Objetivo

Aumentar o **tamanho padrão do texto de corpo (body)** nos slides do carrossel. Hoje o body usa 28px (≈2,6% da largura de 1080), o que fica visivelmente pequeno em relação ao título (72px). O subtítulo (36px) também fica próximo demais do body.

## Mudança

**Arquivo único:** `src/routes/dashboard.studio.carrossel.tsx`

### 1. Defaults de `fontSize` (linha 136)

Antes:
```
{ title: 72, subtitle: 36, body: 28 }
```

Depois:
```
{ title: 72, subtitle: 44, body: 40 }
```

- **body: 28 → 40** (≈3,7% da largura — mais legível em mobile, próximo do tamanho usado em referências de carrossel premium).
- **subtitle: 36 → 44** para manter a hierarquia visual (subtítulo > body).
- title permanece 72.

### 2. Constantes de hierarquia (linhas 118–119)

Atualizar para refletir os novos deltas, caso sejam usadas em algum auto-fit futuro:
```
const TITLE_TO_SUBTITLE = 28; // 72 - 44
const SUBTITLE_TO_BODY = 4;   // 44 - 40
```

(Se hoje não estiverem em uso na renderização — checado: aparecem só como constantes — o ajuste é apenas semântico.)

## Fora do escopo

- Não alterar o título (já está adequado).
- Não alterar templates já salvos (eles têm `layout.fontSize` próprio e mantêm o tamanho original).
- Sem mudança no edge function ou no wizard.
- Sem novo controle de "tamanho do body" no painel — o slider de ajuste manual já existente continua funcionando.

## Verificação

- Abrir `/dashboard/studio/carrossel` recém-gerado e conferir que o body fica maior em relação ao título.
- Verificar slide com body longo (perto do limite de caracteres) — deve continuar cabendo no canvas, sem estouro.
- Conferir export PNG/PDF: usa o DOM atual, então pega o novo tamanho automaticamente.
