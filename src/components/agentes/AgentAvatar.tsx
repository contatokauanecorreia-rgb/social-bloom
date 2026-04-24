import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/agents";

export function AgentAvatar({
  agent,
  size = "md",
  className,
}: {
  agent: Agent;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
  };
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white shadow-sm",
        agent.accent,
        sizes[size],
        className,
      )}
    >
      {agent.initials}
    </div>
  );
}
