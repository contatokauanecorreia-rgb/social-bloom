import { Link, useLocation } from "@tanstack/react-router";
import { Home, ClipboardList, LayoutGrid, Bot, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SidebarItem = {
  to: "/dashboard" | "/dashboard/plano" | "/dashboard/carrosseis" | "/dashboard/agentes" | "/dashboard/configuracoes";
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const items: SidebarItem[] = [
  { to: "/dashboard", label: "Início", icon: Home, exact: true },
  { to: "/dashboard/plano", label: "Plano de conteúdo", icon: ClipboardList },
  { to: "/dashboard/carrosseis", label: "Carrosséis", icon: LayoutGrid },
  { to: "/dashboard/agentes", label: "Agentes 24/7", icon: Bot },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r bg-card/40 backdrop-blur transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-primary shadow-primary" />
          {!collapsed && <span className="truncate text-base font-bold tracking-tight">Postly</span>}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-accent text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t p-3 text-[11px] text-muted-foreground/70">
          Postly · v1
        </div>
      )}
    </aside>
  );
}
