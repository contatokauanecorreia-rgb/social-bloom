import { supabase } from "@/integrations/supabase/client";

/**
 * Aciona o runner de imagens do carrossel no backend. O endpoint responde
 * 202 imediatamente e continua processando via EdgeRuntime.waitUntil, então
 * é seguro chamar de qualquer lugar (wizard, editor, painel do studio) sem
 * esperar a resposta.
 *
 * Idempotente: o próprio runner usa lock em memória e checa `imagesDone`
 * antes de regenerar.
 */
export async function kickCarouselJobRunner(jobId: string): Promise<void> {
  try {
    await supabase.functions.invoke("carrossel-run-job", {
      body: { jobId },
    });
  } catch (e) {
    console.warn("[kickCarouselJobRunner] failed", e);
  }
}
