## Objetivo
Fazer o Studio voltar a gerar imagens reais no carrossel, em vez de aceitar respostas “200 OK” que na prática viram fundo preto/vazio.

## Diagnóstico
O problema atual não é mais o envio do texto do Planner como prompt.

Pelo que conferi no fluxo atual:
- o editor ainda dispara requests para `carrossel-image`;
- essas requests estão voltando com `200`;
- os logs da função mostram `done_fal`, ou seja, a engine principal está sendo considerada bem-sucedida;
- porém a resposta retornada é uma imagem aparentemente inválida/placeholder escuro, compatível com o slide preto que você mostrou.

Em outras palavras: **a geração está acontecendo, mas o backend está aceitando como “imagem válida” um resultado ruim da engine**, então o fallback não entra e o Studio exibe esse fundo preto.

## Plano de correção

### 1. Validar a imagem retornada antes de aceitá-la como sucesso
Em `supabase/functions/_shared/fal-image.ts`:
- adicionar uma verificação do arquivo retornado pela engine antes de converter para data URL;
- rejeitar respostas suspeitas, por exemplo:
  - imagem pequena demais para uma foto real;
  - placeholder muito comprimido / provavelmente sólido;
  - assinatura compatível com imagem vazia/preta conhecida.
- quando isso acontecer, retornar `null` e logar algo como `suspect_blank_image`.

Resultado: a função deixa de tratar “imagem preta” como sucesso.

### 2. Ajustar a estratégia de geração no `carrossel-image`
Em `supabase/functions/carrossel-image/index.ts`:
- separar melhor o prompt para FLUX/FAL e o prompt para Gemini;
- encurtar o prompt enviado para FLUX, deixando ele mais natural e menos “travado”;
- manter a regra de “sem texto”, mas sem repetir instruções negativas demais, porque isso pode estar contribuindo para o resultado degenerado;
- se a resposta do FAL vier inválida, cair automaticamente para Gemini.

Resultado: o Studio volta a receber uma imagem utilizável, não só uma resposta HTTP bem-sucedida.

### 3. Aplicar a mesma proteção no fluxo `carrossel-generate`
Em `supabase/functions/carrossel-generate/index.ts`:
- usar a mesma validação de imagem retornada;
- evitar que o fluxo alternativo de geração inline aceite imagem inválida no futuro;
- manter consistência entre os dois caminhos de geração.

Resultado: o problema não reaparece em outro ponto do produto.

### 4. Melhorar o feedback do editor
Em `src/routes/dashboard.studio.carrossel.tsx`:
- contar quantas imagens realmente foram aplicadas com sucesso;
- parar de mostrar sempre `Imagens geradas 🎨` quando zero imagens válidas entraram;
- mostrar feedback mais honesto, por exemplo:
  - sucesso total;
  - sucesso parcial;
  - nenhuma imagem válida gerada.

Resultado: se a engine falhar de novo, o Studio deixa claro o que aconteceu em vez de parecer que tudo deu certo.

## Arquivos que vou ajustar
- `supabase/functions/_shared/fal-image.ts`
- `supabase/functions/carrossel-image/index.ts`
- `supabase/functions/carrossel-generate/index.ts`
- `src/routes/dashboard.studio.carrossel.tsx`

## Detalhes técnicos
- Vou preservar a proteção contra texto dentro da imagem.
- A mudança principal será **não confiar só no status 200 da engine**.
- O fallback para Gemini continuará existindo, mas passará a ser acionado também quando a imagem vier “tecnicamente pronta” porém claramente inutilizável.
- Também vou reduzir a chance de o FLUX colapsar para um resultado preto por excesso de prompt negativo.

## Resultado esperado
- O carrossel volta a gerar fotos/imagens visuais normais.
- Fundos pretos/blank não serão mais aceitos como sucesso.
- Quando a engine principal falhar, o sistema tenta outra rota automaticamente.
- O Studio mostrará feedback correto sobre quantas imagens realmente foram geradas.