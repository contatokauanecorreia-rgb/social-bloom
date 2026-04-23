import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, ClipboardList, LayoutGrid, Filter, TrendingUp, Users, Camera, Zap, Check, Instagram } from "lucide-react";
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

        <section id="pricing" className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="soft" className="mb-6">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Planos
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Escolha o plano ideal{" "}
              <span className="text-gradient-primary">para você</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Comece grátis e evolua quando estiver pronto para escalar sua produção de conteúdo.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
            {/* Plano Gratuito */}
            <article className="flex flex-col rounded-2xl border bg-card p-8 shadow-elegant">
              <div>
                <Badge variant="soft" className="text-[10px] tracking-widest uppercase">
                  Gratuito
                </Badge>
                <h3 className="mt-4 text-2xl font-bold tracking-tight">Teste grátis</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Experimente por 7 dias, sem compromisso.
                </p>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">R$ 0</span>
                <span className="text-sm text-muted-foreground">/ 7 dias</span>
              </div>

              <div className="my-6 h-px bg-border" />

              <ul className="flex-1 space-y-3 text-sm">
                {[
                  "Criação de carrosséis automáticos",
                  "Acesso à plataforma por 7 dias",
                  "Sem necessidade de cartão de crédito",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button variant="outline" size="xl" className="mt-8 rounded-full">
                Começar grátis
              </Button>
            </article>

            {/* Plano Premium */}
            <article className="relative flex flex-col rounded-2xl border-2 border-primary/40 bg-gradient-primary-soft p-8 shadow-primary">
              <div className="absolute -top-3 right-6">
                <Badge variant="gradient" className="text-[10px] tracking-widest uppercase">
                  Mais popular
                </Badge>
              </div>

              <div>
                <Badge variant="soft" className="text-[10px] tracking-widest uppercase">
                  Premium
                </Badge>
                <h3 className="mt-4 text-2xl font-bold tracking-tight">Plano completo</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tudo o que você precisa para escalar sua presença digital.
                </p>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight text-gradient-primary">
                  R$ 89,90
                </span>
                <span className="text-sm text-muted-foreground">/ mês</span>
              </div>

              <div className="my-6 h-px bg-border" />

              <ul className="flex-1 space-y-3 text-sm">
                {[
                  "Acesso a todas as funcionalidades",
                  "Carrosséis automáticos ilimitados",
                  "Agentes de IA 24/7",
                  "Plano de conteúdo completo",
                  "Plano de funil estratégico",
                  "Suporte prioritário",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button variant="gradient" size="xl" className="mt-8">
                Assinar Premium
              </Button>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-muted-foreground md:flex-row">
          <span>© 2026 Postly. Todos os direitos reservados.</span>

          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:-translate-y-0.5 hover:bg-gradient-primary hover:text-primary-foreground hover:border-transparent hover:shadow-primary"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:-translate-y-0.5 hover:bg-gradient-primary hover:text-primary-foreground hover:border-transparent hover:shadow-primary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:-translate-y-0.5 hover:bg-gradient-primary hover:text-primary-foreground hover:border-transparent hover:shadow-primary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V8.85a8.16 8.16 0 004.77 1.52V6.93a4.85 4.85 0 01-1.84-.24z" />
              </svg>
            </a>
          </div>

          <Link to="/design-system" className="transition-colors hover:text-foreground">
            Design System →
          </Link>
        </div>
      </footer>
    </div>
  );
}
