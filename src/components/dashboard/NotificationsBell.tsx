import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, MessageSquare, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: "approval" | "comment";
  client_id: string;
  post_id: string;
  payload: { title?: string; author_name?: string | null; preview?: string };
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function NotificationsBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, client_id, post_id, payload, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setItems(data as NotificationRow[]);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notifications-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    load();
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notificações</p>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3" /> Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Sem notificações por enquanto.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = n.type === "approval" ? Check : MessageSquare;
                const who = n.payload.author_name || "Cliente";
                const title = n.payload.title || "conteúdo";
                const action = n.type === "approval" ? "aprovou" : "comentou em";
                return (
                  <li key={n.id} className={cn(!n.read_at && "bg-primary/5")}>
                    <Link
                      to="/dashboard/clientes/$id/aprovacao"
                      params={{ id: n.client_id }}
                      onClick={() => {
                        markOne(n.id);
                        setOpen(false);
                      }}
                      className="flex gap-3 px-3 py-2.5 hover:bg-accent/50"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          n.type === "approval"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-sky-500/15 text-sky-600",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{who}</span> {action}{" "}
                          <span className="font-medium">{title}</span>
                        </p>
                        {n.payload.preview && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            "{n.payload.preview}"
                          </p>
                        )}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
