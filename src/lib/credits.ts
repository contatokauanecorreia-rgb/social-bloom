import { supabase } from "@/integrations/supabase/client";

export type Plan = "starter" | "pro" | "premium";

export const PLAN_LABEL: Record<Plan, string> = {
  starter: "Starter",
  pro: "Pro",
  premium: "Premium",
};

export const PLAN_LIMIT: Record<Plan, number> = {
  starter: 20,
  pro: 100,
  premium: Infinity,
};

export const MODE_COST = {
  copy: 1,
  carrossel: 3,
  pauta: 5,
  roteiro: 3,
} as const;

export type CreditsState = {
  plan: Plan;
  used: number;
  limit: number; // Infinity for premium
  remaining: number; // Infinity for premium
};

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetch current credits for the logged-in user, auto-resetting if the
 * monthly period has elapsed.
 */
export async function fetchCredits(): Promise<CreditsState> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada.");

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("plan, credits_used, period_start")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  let plan: Plan = "starter";
  let used = 0;
  let periodStart = new Date();

  if (!data) {
    // Race condition: signup trigger didn't run yet — create row.
    const ins = await supabase
      .from("user_subscriptions")
      .insert({ user_id: userId, plan: "starter" })
      .select("plan, credits_used, period_start")
      .single();
    if (ins.error) throw ins.error;
    plan = (ins.data.plan as Plan) ?? "starter";
    used = ins.data.credits_used ?? 0;
    periodStart = new Date(ins.data.period_start);
  } else {
    plan = (data.plan as Plan) ?? "starter";
    used = data.credits_used ?? 0;
    periodStart = new Date(data.period_start);
  }

  // Auto-reset if period elapsed
  if (Date.now() - periodStart.getTime() > PERIOD_MS) {
    const upd = await supabase
      .from("user_subscriptions")
      .update({ credits_used: 0, period_start: new Date().toISOString() })
      .eq("user_id", userId);
    if (!upd.error) used = 0;
  }

  const limit = PLAN_LIMIT[plan];
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  return { plan, used, limit, remaining };
}

/**
 * Consume `amount` credits server-side (RLS protected). Throws if insufficient.
 * Returns updated credits state.
 */
export async function consumeCredits(amount: number): Promise<CreditsState> {
  if (amount <= 0) throw new Error("Quantidade inválida.");
  const current = await fetchCredits();

  if (current.limit === Infinity) {
    // Premium: still increment for analytics, but never blocks.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada.");
    await supabase
      .from("user_subscriptions")
      .update({ credits_used: current.used + amount })
      .eq("user_id", session.user.id);
    return { ...current, used: current.used + amount };
  }

  if (current.remaining < amount) {
    throw new Error("Créditos insuficientes.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada.");

  const newUsed = current.used + amount;
  const { error } = await supabase
    .from("user_subscriptions")
    .update({ credits_used: newUsed })
    .eq("user_id", session.user.id);

  if (error) throw error;

  return {
    ...current,
    used: newUsed,
    remaining: current.limit - newUsed,
  };
}

/**
 * Refund `amount` credits (used when generation fails after consume).
 */
export async function refundCredits(amount: number): Promise<void> {
  if (amount <= 0) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { data } = await supabase
    .from("user_subscriptions")
    .select("credits_used")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const current = data?.credits_used ?? 0;
  await supabase
    .from("user_subscriptions")
    .update({ credits_used: Math.max(0, current - amount) })
    .eq("user_id", session.user.id);
}
