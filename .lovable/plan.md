## Objetivo

Remover toda menção a "Nano Banana Pro" na interface e renomear referências visuais de "FLUX" para "Midjourney". Importante: a engine de imagem continua sendo a mesma (FAL/FLUX 1.1 Pro) — só estamos mudando o **rótulo** que aparece para você. Trocar de fato para Midjourney exigiria contratar a API do Midjourney (que não tem API pública oficial), então mantemos a engine atual e apenas atualizamos o nome exibido.

## O que vou mudar

### 1. `src/components/studio/CarouselAIWizard.tsx` (linha ~801-803)
- Trocar o label `"Gerar imagens com IA (Nano Banana Pro)"` por `"Gerar imagens com IA (Midjourney)"`.
- Trocar a descrição `"Gera imagens automáticas para cada slide usando Nano Banana Pro."` por `"Gera imagens automáticas para cada slide usando Midjourney."`.

### 2. `src/components/studio/CarouselModeDialog.tsx` (linha 38)
- Trocar `"A IA escreve os slides e pode gerar imagens com Nano Banana Pro."` por `"A IA escreve os slides e pode gerar imagens com Midjourney."`.

### 3. Verificação
- Rodar `rg -i "nano banana"` em `src/` para garantir que não sobrou nenhuma menção na UI.
- Backend (`supabase/functions/*`) continua como está — os comentários internos mencionando FLUX/FAL não aparecem para o usuário e servem de referência técnica para mim.

## Observação importante

Se você quiser **de verdade** trocar a engine para Midjourney (não só o nome), me avisa. O Midjourney oficial não expõe API pública; teríamos que ir por um proxy não-oficial (instável, contra ToS) ou trocar para outra engine premium (ex.: Ideogram, Recraft, ou um endpoint diferente do FAL). Por agora, este plano só renomeia o rótulo conforme você pediu.
