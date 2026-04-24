import { cn } from "@/lib/utils";
import { AGENTS, type Agent, type AgentId } from "@/lib/agents";
import { AgentAvatar } from "./AgentAvatar";
import { OnlineDot } from "./OnlineDot";

export function AgentList({
  selectedId,
  onSelect,
}: {
  selectedId: AgentId;
  onSelect: (agent: Agent) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Agentes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {AGENTS.length} disponíveis · Online agora
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {AGENTS.map((agent) => {
            const active = selectedId === agent.id;
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => onSelect(agent)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-all hover:bg-accent",
                    active && "bg-accent shadow-sm",
                  )}
                >
                  <AgentAvatar agent={agent} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-semibold",
                          active ? "text-foreground" : "text-foreground/90",
                        )}
                      >
                        {agent.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <OnlineDot />
                      <span className="text-[11px] font-medium text-emerald-600">
                        Online
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {agent.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
