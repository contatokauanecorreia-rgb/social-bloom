import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Agent } from "@/lib/agents";
import { AgentAvatar } from "./AgentAvatar";
import { OnlineDot } from "./OnlineDot";
import { MessageBubble } from "./MessageBubble";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AgentChatPanel({
  agent,
  userId,
}: {
  agent: Agent;
  userId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversation when agent changes
  useEffect(() => {
    let active = true;
    setMessages([]);
    setConversationId(null);
    setLoading(true);

    (async () => {
      const { data: convo } = await supabase
        .from("agent_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("agent_id", agent.id)
        .maybeSingle();

      if (!active) return;

      if (!convo) {
        setLoading(false);
        return;
      }

      setConversationId(convo.id);

      const { data: msgs } = await supabase
        .from("agent_messages")
        .select("id, role, content")
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!active) return;
      setMessages((msgs ?? []) as ChatMessage[]);
      setLoading(false);
    })();

    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [agent.id, userId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const ensureConversation = async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    const { data, error } = await supabase
      .from("agent_conversations")
      .insert({ user_id: userId, agent_id: agent.id })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setConversationId(data.id);
    return data.id;
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const convoId = await ensureConversation();
    if (!convoId) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    // Persist user message
    await supabase.from("agent_messages").insert({
      conversation_id: convoId,
      user_id: userId,
      role: "user",
      content: text,
    });

    // Add placeholder assistant message
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    let assistantSoFar = "";
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify({
          agentId: agent.id,
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: "Erro" }));
        if (resp.status === 429) toast.error("Muitas requisições. Aguarde um instante.");
        else if (resp.status === 402) toast.error("Créditos esgotados.");
        else toast.error(errBody.error ?? "Erro ao falar com o agente");
        setStreaming(false);
        return;
      }
      if (!resp.body) throw new Error("Sem corpo de resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              assistantSoFar += delta;
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantSoFar) {
        // Split into chunks by double newline (paragraphs)
        const chunks = assistantSoFar
          .split(/\n{2,}/)
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        const finalChunks = chunks.length > 0 ? chunks : [assistantSoFar.trim()];

        // Reveal one bubble at a time with a small typing delay
        for (let i = 0; i < finalChunks.length; i++) {
          const chunk = finalChunks[i];
          // Typing delay proportional to length, capped between 350ms and 1400ms
          const delay = Math.min(1400, Math.max(350, chunk.length * 18));
          await new Promise((r) => setTimeout(r, delay));
          setMessages((prev) => [
            ...prev,
            { id: `${assistantId}-${i}`, role: "assistant", content: chunk },
          ]);
        }

        await supabase.from("agent_messages").insert({
          conversation_id: convoId,
          user_id: userId,
          role: "assistant",
          content: assistantSoFar,
        });
        await supabase
          .from("agent_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", convoId);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        console.error(err);
        toast.error("Falha na conversa");
      }
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const clearChat = async () => {
    if (!conversationId) return;
    if (!confirm("Limpar todo o histórico desta conversa?")) return;
    const { error } = await supabase
      .from("agent_messages")
      .delete()
      .eq("conversation_id", conversationId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessages([]);
    toast.success("Conversa limpa");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <AgentAvatar agent={agent} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{agent.name}</h2>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <OnlineDot />
            <span className="text-xs font-medium text-emerald-600">Online</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="truncate text-xs text-muted-foreground">{agent.description}</span>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} disabled={streaming}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center pt-10 text-center">
            <AgentAvatar agent={agent} size="lg" className="mb-4 h-20 w-20 text-xl" />
            <h3 className="text-lg font-semibold">{agent.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content || "..."} />
            ))}
            {streaming && messages[messages.length - 1]?.role === "assistant" &&
              !messages[messages.length - 1]?.content && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={send} className="border-t bg-background px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Conversar com ${agent.name}...`}
            rows={1}
            disabled={streaming}
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || streaming} className="h-11 w-11 shrink-0 rounded-full">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          Enter envia · Shift + Enter quebra linha
        </p>
      </form>
    </div>
  );
}
