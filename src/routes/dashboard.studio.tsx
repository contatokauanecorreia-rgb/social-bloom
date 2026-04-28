import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AgentList } from "@/components/agentes/AgentList";
import { AgentChatPanel } from "@/components/agentes/AgentChatPanel";
import { AGENTS, type Agent, type AgentId, getAgent } from "@/lib/agents";

const STORAGE_KEY = "postly:last-agent";

const agentIds = AGENTS.map((a) => a.id) as [AgentId, ...AgentId[]];

const searchSchema = z.object({
  agent: fallback(z.enum(agentIds).optional(), undefined),
});

export const Route = createFileRoute("/dashboard/studio")({
  head: () => ({ meta: [{ title: "Studio de conteúdo — Postly" }] }),
  validateSearch: zodValidator(searchSchema),
  component: AgentesPage,
});

function AgentesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Agent>(AGENTS[0]);

  // Restore last agent from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = window.localStorage.getItem(STORAGE_KEY) as AgentId | null;
    if (last) {
      const agent = getAgent(last);
      if (agent) setSelected(agent);
    }
  }, []);

  // React to ?agent=<id> query param: switch agent and clear the URL param
  useEffect(() => {
    if (!search.agent) return;
    const agent = getAgent(search.agent);
    if (!agent) return;
    setSelected(agent);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, agent.id);
    }
    navigate({
      to: "/dashboard/studio",
      search: {},
      replace: true,
    });
  }, [search.agent, navigate]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(data.session.user.id);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSelect = (agent: Agent) => {
    setSelected(agent);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, agent.id);
    }
  };

  if (!userId) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 md:grid-cols-[320px_1fr]">
      <aside className="hidden border-r bg-card/40 md:block">
        <AgentList selectedId={selected.id} onSelect={handleSelect} />
      </aside>

      {/* Mobile: dropdown to switch agent */}
      <div className="flex items-center gap-2 border-b bg-card/40 px-4 py-2 md:hidden">
        <select
          value={selected.id}
          onChange={(e) => {
            const a = getAgent(e.target.value);
            if (a) handleSelect(a);
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.role}
            </option>
          ))}
        </select>
      </div>

      <main className="min-w-0 overflow-hidden">
        <AgentChatPanel agent={selected} userId={userId} />
      </main>
    </div>
  );
}
