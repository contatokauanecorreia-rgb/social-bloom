## Objetivo

No diálogo de edição de post (Plano de Conteúdo), substituir o campo único de **Notas** por uma lista de **blocos de notas** que o usuário pode adicionar/remover livremente, com um botão **"+ Adicionar bloco"** abaixo da lista — semelhante a blocos de texto do Notion.

## Como vai funcionar

- Cada bloco é um `Textarea` independente, empilhado verticalmente.
- Acima/à direita de cada bloco aparece um botão discreto de remover (ícone de lixeira ou "X") — só aparece no hover, para não poluir.
- Abaixo do último bloco, um botão **"+ Adicionar bloco de notas"** (variant `ghost`, com ícone `Plus`) cria um novo bloco vazio e foca nele.
- Sempre há pelo menos 1 bloco visível (mesmo vazio). Não é possível remover o último bloco — apenas limpar o conteúdo.
- Blocos vazios são descartados ao salvar.

## Persistência (sem migração de banco)

A coluna `notes` no banco continua sendo `text`. Os blocos são serializados/deserializados usando um separador estável:

- **Separador:** `\n\n---\n\n` (linha em branco + `---` + linha em branco — formato Markdown padrão de divisor, fácil de visualizar até em export futuro).
- **Salvar:** `blocks.map(b => b.trim()).filter(Boolean).join("\n\n---\n\n")` → string ou `null` se vazio.
- **Carregar:** `(post.notes ?? "").split(/\n\n---\n\n/)` → array; se vazio, inicia com `[""]`.
- Posts antigos com uma única nota continuam funcionando: viram um único bloco.

Sem mudança no schema, sem migração, totalmente retrocompatível.

## Arquivos alterados

### `src/components/plano/PostDialog.tsx`
- Trocar `const [notes, setNotes] = useState("")` por `const [noteBlocks, setNoteBlocks] = useState<string[]>([""])`.
- No `useEffect` de inicialização: parsear `post?.notes` com o split acima (ou `[""]` se vazio/null).
- Adicionar handlers: `addBlock()`, `removeBlock(index)`, `updateBlock(index, value)`.
- No `handleSave`: serializar com `.filter(Boolean).join(...)` e enviar como `notes` no payload (mantém o tipo `string` em `PostDialogValue` — nenhuma mudança em quem consome).
- JSX: substituir o `<Textarea>` único por um `map` sobre `noteBlocks`, cada um com:
  - Um `Textarea` (`rows={4}`).
  - Um botão de remover no canto superior direito (visível em `hover` no container, ou sempre se houver mais de 1 bloco), desabilitado quando `noteBlocks.length === 1`.
- Abaixo da lista, botão `<Button variant="ghost" size="sm" onClick={addBlock}><Plus /> Adicionar bloco</Button>`.
- O Label "NOTAS" continua aparecendo uma vez no topo da seção.

### Nada mais muda
- `src/routes/dashboard.plano.tsx`: nenhuma alteração — continua recebendo/enviando `notes: string` para o Supabase.
- `src/lib/content-types.ts`: `notes: string | null` permanece.
- Filtro de busca (`p.notes ?? ""` em `dashboard.plano.tsx:105`) continua funcionando — busca no texto inteiro, incluindo separadores.

## Detalhes de UX

- Espaçamento entre blocos: `space-y-2`.
- Botão de remover: `variant="ghost"`, `size="icon"`, `className="h-7 w-7 text-muted-foreground hover:text-destructive"`, posicionado com `absolute top-2 right-2` em um container `relative` (ou inline acima do textarea — defino na implementação para ficar limpo).
- Ao adicionar um bloco, focar automaticamente o novo `Textarea` (via `ref` no último item).
- Placeholder do primeiro bloco: `"Roteiro, ideias, hooks..."`. Dos blocos seguintes: `"Mais notas..."`.

## Fora do escopo

- Reordenar blocos por drag-and-drop (pode vir depois se quiser estilo Notion completo).
- Tipos diferentes de bloco (checklist, citação, etc.) — só texto por enquanto.
- Migração para uma tabela `post_note_blocks` separada — desnecessária para o caso atual.

Posso implementar?
