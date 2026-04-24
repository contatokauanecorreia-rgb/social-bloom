import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, LayoutGrid, Bot, Settings, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Início — Postly" }],
  }),
  component: DashboardHome,
});

type Stats = {
  weeks: number;
  planned: number;
  published: number;
};

function DashboardHome() {
  const [name, setName] = useState("Creator");
  const [stats, setStats] = useState<Stats>({ weeks: 0, planned: 0, published: 0 });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", uid)
        .maybeSingle();
      if (!active) return;
      if (prof?.display_name) setName(prof.display_name);
      else if (sess.session.user.email) setName(sess.session.user.email.split("@")[0]);

      const [weeksRes, plannedRes, pubRes] = await Promise.all([
        supabase.from("content_weeks").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "planned"),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "published"),
      ]);
      if (!active) return;
      setStats({
        weeks: weeksRes.count ?? 0,
        planned: plannedRes.count ?? 0,
        published: pubRes.count ?? 0,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const shortcuts = [
    { to: "/dashboard/plano", icon: ClipboardList, title: "Plano de conteúdo", desc: "Organize seus posts por semana." },
    { to: "/dashboard/carrosseis", icon: LayoutGrid, title: "Carrosséis", desc: "Em breve: gerador automático." },
    { to: "/dashboard/agentes", icon: Bot, title: "Agentes 24/7", desc: "Em breve: IA respondendo por você." },
    { to: "/dashboard/configuracoes", icon: Settings, title: "Configurações", desc: "Perfil e preferências." },
  ] as const;

  return (
    <PageContainer>
      <Badge variant="soft" className="mb-3 w-fit">Dashboard</Badge>
      <PageHeader
        title={`Olá, ${name} 👋`}
        description="Bem-vindo ao seu painel. Comece organizando seus posts no Plano de Conteúdo."
      />

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <Stat label="Semanas" value={stats.weeks} />
        <Stat label="Posts planejados" value={stats.planned} />
        <Stat label="Posts publicados" value={stats.published} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-foreground/20 hover:shadow"
          >
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-primary-soft">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>
    </PageContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-3xl font-bold tabular-nums text-gradient-primary">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
