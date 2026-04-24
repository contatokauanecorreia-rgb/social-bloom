# Substituir avatares de 3 agentes

## Objetivo
Trocar as imagens dos agentes KIÜKA, SUR e KIMO pelos novos gradientes enviados. ROXY STUDIO permanece inalterada.

## Alterações (apenas assets, sem mudanças em código)

| Agente | Origem | Destino (sobrescreve) |
|---|---|---|
| **KIÜKA** | `user-uploads://1-2.jpg` | `src/assets/agents/kiuka.jpg` |
| **SUR** | `user-uploads://2-2.jpg` | `src/assets/agents/sur.jpg` |
| **KIMO** | `user-uploads://4-2.jpg` | `src/assets/agents/kimo.jpg` |
| **ROXY STUDIO** | — | mantém atual ✓ |

## Sem mudanças em código
- `src/lib/agents.ts` continua importando dos mesmos caminhos.
- `AgentAvatar.tsx` segue renderizando normalmente.
- Vite recarrega os novos assets automaticamente.

## Resultado
Os três agentes passam a exibir os novos gradientes na lista lateral e no header do chat.
