## Problema

Ao abrir `/dashboard/studio`, a página quebra com:

> `cannot add postgres_changes callbacks for realtime:studio_jobs-<userId> after subscribe()`

## Causa

O hook `useStudioJobs(userId)` é usado em dois lugares ao mesmo tempo:
- `src/routes/dashboard.tsx` (layout global, para notificações)
- `src/routes/dashboard.studio.tsx` (para o painel de jobs)

Ambos criam um canal Supabase Realtime com o **mesmo nome**: `"studio_jobs-" + userId`. O Supabase reaproveita o canal existente por tópico — então no segundo `useEffect`, `supabase.channel(...)` devolve a instância que já chamou `.subscribe()`, e o `.on("postgres_changes", ...)` lança o erro acima. O React StrictMode (double-mount em dev) agrava o mesmo problema mesmo sem dois consumidores.

## Correção (1 arquivo)

Em `src/lib/studio-jobs.ts`, no `useEffect` do `useStudioJobs`:

1. Gerar um sufixo único por instância (ex.: `crypto.randomUUID()` dentro do effect) e usar `"studio_jobs-" + userId + "-" + uid` como nome do canal — assim cada hook tem seu próprio canal.
2. Garantir que o cleanup chame `supabase.removeChannel(channel)` (já chama) para não vazar canais entre re-renders/StrictMode.

Nenhuma outra mudança é necessária (sem alterações de schema, sem mudança em CarouselAIWizard, VideoWorkflowCanvas, etc.). A funcionalidade de jobs em background segue intacta.

## Arquivos alterados

- `src/lib/studio-jobs.ts` — nome único por canal.