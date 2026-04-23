import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Bot, ClipboardList, LayoutGrid, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Postly" },
      { name: "description", content: "Seu painel de controle Postly." },
    ],
  }),
  component: DashboardPage,
});

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      setUser(session.user);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setUser(data.session.user);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (active) {
        setProfile(prof);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const name = profile?.display_name || user.email?.split("@")[0] || "Creator";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary shadow-primary" />
            <span className="text-xl font-bold tracking-tight">Postly</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-col gap-3">
          <Badge variant="soft" className="w-fit">Dashboard</Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Olá, <span className="text-gradient-primary">{name}</span> 👋
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel. Em breve você poderá criar e agendar conteúdos por aqui.
          </p>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Bot, title: "Agentes 24/7", desc: "Configure seus agentes de IA." },
            { icon: ClipboardList, title: "Plano de conteúdo", desc: "Organize seu calendário." },
            { icon: LayoutGrid, title: "Carrosséis", desc: "Gere carrosséis automáticos." },
            { icon: Filter, title: "Funil", desc: "Estruture sua jornada." },
          ].map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border bg-card p-6 shadow-elegant"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary-soft">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
