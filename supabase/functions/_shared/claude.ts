// Shared Anthropic Claude helper.
// Uses tool-use to coerce structured JSON output reliably.

export const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

export type ClaudeUserContent = string | ClaudeContentBlock[];

export type ClaudeTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type ClaudeToolCallParams = {
  system: string;
  user: ClaudeUserContent;
  tool: ClaudeTool;
  maxTokens?: number;
  temperature?: number;
};

export type ClaudeToolCallResult<T = unknown> = {
  ok: true;
  data: T;
  rawArgsLen: number;
} | {
  ok: false;
  status: number;
  error: string;
};

/** Convert a data URL ("data:image/png;base64,XXX") to Anthropic image block. */
export function dataUrlToImageBlock(dataUrl: string): ClaudeContentBlock | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  return {
    type: "image",
    source: { type: "base64", media_type: m[1], data: m[2] },
  };
}

function friendlyError(status: number, bodyText: string): string {
  if (status === 401) return "Chave da API Claude inválida ou ausente.";
  if (status === 429) return "Muitas requisições à IA. Aguarde alguns segundos e tente novamente.";
  if (status === 529 || status === 503) return "IA Claude temporariamente indisponível. Tente novamente em instantes.";
  if (status === 400) return `Requisição inválida para a IA: ${bodyText.slice(0, 200)}`;
  return `Erro na IA (${status}).`;
}

/**
 * Call Claude with a forced tool use and return the parsed tool input.
 * Throws nothing — returns a discriminated union.
 */
export async function callClaudeTool<T = unknown>(
  params: ClaudeToolCallParams,
): Promise<ClaudeToolCallResult<T>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { ok: false, status: 500, error: "ANTHROPIC_API_KEY não configurada no backend." };
  }

  const userContent: ClaudeContentBlock[] =
    typeof params.user === "string"
      ? [{ type: "text", text: params.user }]
      : params.user;

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens ?? 4096,
    temperature: params.temperature ?? 0.7,
    system: params.system,
    tools: [params.tool],
    tool_choice: { type: "tool", name: params.tool.name },
    messages: [{ role: "user", content: userContent }],
  };

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: `Falha de rede ao chamar Claude: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const text = await resp.text();
  if (!resp.ok) {
    console.error("[claude] http_error", resp.status, text.slice(0, 500));
    return { ok: false, status: resp.status, error: friendlyError(resp.status, text) };
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: 500, error: "Resposta da IA não é JSON válido." };
  }

  const toolUse = Array.isArray(json?.content)
    ? json.content.find((b: any) => b?.type === "tool_use")
    : null;
  if (!toolUse || !toolUse.input || typeof toolUse.input !== "object") {
    console.error("[claude] no_tool_use", JSON.stringify(json).slice(0, 500));
    return { ok: false, status: 500, error: "IA não retornou dados estruturados." };
  }

  const argsLen = JSON.stringify(toolUse.input).length;
  return { ok: true, data: toolUse.input as T, rawArgsLen: argsLen };
}
