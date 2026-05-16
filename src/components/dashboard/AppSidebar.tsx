import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  ClipboardList,
  Sparkles,
  Settings,
  Users,
  Calculator,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  clearPlannerHasDraft,
  usePlannerNotification,
} from "@/lib/planner-notification";
import { ThemeToggle } from "@/components/ThemeToggle";

type SidebarItem = {
  to:
    | "/dashboard"
    | "/dashboard/studio"
    | "/dashboard/planner"
    | "/dashboard/clientes"
    | "/dashboard/precificacao"
    | "/dashboard/plano"
    | "/dashboard/configuracoes";
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const navItems: SidebarItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home, exact: true },
  { to: "/dashboard/studio", label: "Studio", icon: Sparkles },
  { to: "/dashboard/planner", label: "Planner de conteúdo", icon: ClipboardList },
  { to: "/dashboard/clientes", label: "Hub de clientes", icon: Users },
  { to: "/dashboard/precificacao", label: "Precificação", icon: Calculator },
  { to: "/dashboard/plano", label: "Plano", icon: CreditCard },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const plannerNotif = usePlannerNotification();

  useEffect(() => {
    if (pathname === "/dashboard/planner" || pathname.startsWith("/dashboard/planner/")) {
      clearPlannerHasDraft();
    }
  }, [pathname]);

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
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            const showDot = item.to === "/dashboard/planner" && plannerNotif;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-accent text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="relative">
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                    {showDot && collapsed && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                    )}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {showDot && !collapsed && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("border-t p-2 flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
        {!collapsed && (
          <span className="text-[11px] text-muted-foreground/70">Postly · v1</span>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
