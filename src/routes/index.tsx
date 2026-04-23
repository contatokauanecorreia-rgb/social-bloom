import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, ClipboardList, LayoutGrid, Filter, TrendingUp, Users, Camera, Zap } from "lucide-react";
import heroBg from "@/assets/hero-bg.png";

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
            className="pointer-events-none absolute inset-0 -z-10 bg-no-repeat bg-center bg-contain opacity-90"
            style={{ backgroundImage: `url(${heroBg})` }}
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

        <section className="py-12 md:py-16">
          <div className="rounded-3xl border bg-muted/40 px-6 py-10 shadow-elegant md:py-14">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0">
              {[
                { value: "+800", label: "Conteúdos criados" },
                { value: "+650", label: "Contas criadas" },
                { value: "+1.000", label: "Creators satisfeitos" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`flex flex-col items-center text-center ${
                    i > 0 ? "md:border-l md:border-border" : ""
                  }`}
                >
                  <div className="text-4xl font-bold tracking-tight text-gradient-primary md:text-6xl">
                    {stat.value}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground md:text-base">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="soft" className="mb-6">
              <TrendingUp className="mr-1.5 h-3 w-3" />
              Para quem vive de conteúdo
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Constância sem depender{" "}
              <span className="text-gradient-primary">de ninguém</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Social medias, UGC creators e criadores de conteúdo estão postando mais, faturando
              mais e trabalhando menos com a Postly.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Users,
                tag: "Social Media",
                stat: "63%",
                context:
                  "dos social medias freelancers faturam menos de R$ 3 mil por mês.",
                benefit:
                  "Não é falta de talento — é falta de sistema. Com a Postly você atende mais clientes, em menos tempo, sem depender de agência.",
                source: "MLabs · Panorama de profissionais de mídias sociais",
              },
              {
                icon: Camera,
                tag: "UGC Creator",
                stat: "+67%",
                context:
                  "de crescimento no número de influenciadores no Brasil em apenas 1 ano.",
                benefit:
                  "Marcas contratam quem tem processo, portfólio e consistência. A Postly entrega roteiro, fluxo de postagens e mídia kit prontos para você se posicionar como profissional.",
                source: "Mundo do Marketing · Creator Economy 2025",
              },
              {
                icon: Zap,
                tag: "Criadores de conteúdo",
                stat: "15h → 3h",
                context:
                  "é o tempo semanal que um criador com IA e processo gasta — vs. quem faz tudo no improviso.",
                benefit:
                  "Centralize roteiro, carrossel, calendário e funil em uma só plataforma. Economize horas por semana e produza com a consistência que o algoritmo recompensa.",
                source: "Treinamentos AF · IA para conteúdo 2026",
              },
            ].map((card) => (
              <article
                key={card.tag}
                className="flex flex-col rounded-2xl border bg-card p-8 shadow-elegant"
              >
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary-soft">
                    <card.icon className="h-4 w-4 text-primary" />
                  </div>
                  <Badge variant="soft" className="text-[10px] tracking-widest uppercase">
                    {card.tag}
                  </Badge>
                </div>

                <h3 className="mt-6 text-5xl font-bold tracking-tight text-gradient-primary md:text-6xl">
                  {card.stat}
                </h3>
                <p className="mt-3 text-base leading-snug text-foreground">
                  {card.context}
                </p>

                <div className="my-6 h-px bg-border" />

                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {card.benefit}
                </p>

                <p className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground/70">
                  Fonte: {card.source}
                </p>
              </article>
            ))}
          </div>
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
