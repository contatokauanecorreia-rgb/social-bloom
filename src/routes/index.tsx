import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, ClipboardList, LayoutGrid, Filter } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary shadow-primary" />
          <span className="text-xl font-bold tracking-tight">Postly</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Recursos</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">Preços</a>
          <Link to="/design-system" className="transition-colors hover:text-foreground">
            Design System
          </Link>
        </nav>
        <Button variant="gradient" size="default">Entrar</Button>
      </header>

      <main className="container mx-auto px-6">
        <section className="relative flex flex-col items-center py-20 text-center md:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[120%] bg-gradient-hero opacity-70 blur-3xl"
          />
          <Badge variant="soft" className="mb-6 relative">
            <Sparkles className="mr-1.5 h-3 w-3" />
            Novo · Geração de conteúdo com IA
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Automatize sua presença nas{" "}
            <span className="text-gradient-primary">redes sociais</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Crie, agende e publique conteúdos em todas as suas redes a partir de um único lugar.
            Deixe a inteligência artificial cuidar do resto.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button variant="gradient" size="xl">Começar grátis</Button>
            <Button variant="outline" size="xl" className="rounded-full">
              Ver demonstração
            </Button>
          </div>
        </section>

        <section id="features" className="grid gap-6 py-16 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Bot,
              title: "Agentes 24/7",
              desc: "Agentes de IA que trabalham sem parar criando seu plano de conteúdo.",
            },
            {
              icon: ClipboardList,
              title: "Plano de conteúdo",
              desc: "Organize, visualize e aprove todo o seu calendário dentro da plataforma.",
            },
            {
              icon: LayoutGrid,
              title: "Carrosséis automáticos",
              desc: "Gere carrosséis prontos para publicar com um clique.",
            },
            {
              icon: Filter,
              title: "Plano de funil",
              desc: "Estruture jornadas de topo, meio e fundo de funil em minutos.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 shadow-elegant transition-all hover:-translate-y-1 hover:shadow-primary"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary-soft">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <span>© 2026 Postly. Todos os direitos reservados.</span>
          <Link to="/design-system" className="transition-colors hover:text-foreground">
            Design System →
          </Link>
        </div>
      </footer>
    </div>
  );
}
