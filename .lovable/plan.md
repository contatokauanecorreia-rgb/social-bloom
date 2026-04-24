# Substituir avatar da ROXY STUDIO

## Objetivo
Trocar a imagem do agente ROXY STUDIO pela nova imagem enviada (`3-2.jpg`).

## Alterações
1. Sobrescrever `src/assets/agents/roxy.jpg` copiando `user-uploads://3-2.jpg` para esse caminho.

## Sem alterações de código
- `src/lib/agents.ts` continua importando `roxyImg from "@/assets/agents/roxy.jpg"`.
- `AgentAvatar.tsx` segue renderizando a imagem normalmente.
- O Vite faz hot-reload do novo asset automaticamente.

## Resultado
A ROXY STUDIO passa a exibir o novo avatar (gradiente rosa/laranja sobre fundo escuro) tanto na lista lateral quanto no header do chat, alinhado ao seu accent (`from-rose-500 via-red-500 to-amber-500`).