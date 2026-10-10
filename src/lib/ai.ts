// Thin OpenAI API client (ChatGPT models). Models are configurable so they can be
// swapped without a code change: OPENAI_TEXT_MODEL and OPENAI_IMAGE_MODEL.

const TEXT_MODEL = () => process.env.OPENAI_TEXT_MODEL || "gpt-5-mini";
const IMAGE_MODEL = () => process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function call(path: string, body: unknown, timeoutMs: number) {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `OpenAI request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

/** Ask for a JSON object. The system prompt must describe the exact shape. */
export async function chatJSON<T>(system: string, user: string): Promise<T> {
  const json = await call(
    "chat/completions",
    {
      model: TEXT_MODEL(),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system + "\n\nRespond with a single JSON object only." },
        { role: "user", content: user },
      ],
    },
    120_000,
  );
  const text: string = json?.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The AI returned something that wasn't valid JSON. Try running this step again.");
  }
}

/** Generate one square PNG with a transparent background. Returns raw bytes. */
export async function image(prompt: string): Promise<Buffer> {
  const json = await call(
    "images/generations",
    { model: IMAGE_MODEL(), prompt, size: "1024x1024", background: "transparent", quality: "medium", n: 1 },
    180_000,
  );
  const b64: string | undefined = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image model didn't return an image.");
  return Buffer.from(b64, "base64");
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Plain-text chat reply (used by the brand chat agents). Short and fast by design. */
export async function chatText(system: string, messages: ChatTurn[], opts: { maxTokens?: number } = {}): Promise<string> {
  const model = TEXT_MODEL();
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
    max_completion_tokens: opts.maxTokens ?? 1200,
  };
  // gpt-5 family reasoning models: keep reasoning minimal so replies stay quick and cheap.
  if (/^gpt-5(-mini|-nano)?$/.test(model)) body.reasoning_effort = "minimal";
  const json = await call("chat/completions", body, 45_000);
  const text: string = json?.choices?.[0]?.message?.content ?? "";
  return text.trim();
}

export type Source = { title: string; url: string };

/** Research with live web search (OpenAI Responses API + web_search tool), returning a JSON object
 *  plus the pages the model actually cited. Falls back to chatJSON (no web) if search isn't available. */
export async function researchJSON<T>(system: string, user: string): Promise<{ data: T; sources: Source[]; searched: boolean }> {
  const model = process.env.OPENAI_RESEARCH_MODEL || TEXT_MODEL();
  try {
    const json = await call(
      "responses",
      {
        model,
        tools: [{ type: "web_search" }],
        instructions: system + "\n\nSearch the web for current, official sources before answering. Respond with a single JSON object only, no other text.",
        input: user,
      },
      200_000,
    );
    const items: { type?: string; content?: { type?: string; text?: string; annotations?: { type?: string; url?: string; title?: string }[] }[] }[] = json?.output ?? [];
    const parts = items.filter((i) => i.type === "message").flatMap((i) => i.content ?? []).filter((c) => c.type === "output_text");
    const text = json?.output_text || parts.map((p) => p.text ?? "").join("\n");
    const sources: Source[] = [];
    for (const a of parts.flatMap((p) => p.annotations ?? [])) {
      if (a.type === "url_citation" && a.url && !sources.some((s) => s.url === a.url)) sources.push({ title: a.title || a.url, url: a.url.replace(/[?&]utm_source=openai$/, "") });
    }
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no JSON in research reply");
    return { data: JSON.parse(m[0]) as T, sources, searched: true };
  } catch (e) {
    console.warn("researchJSON: web search unavailable, falling back", e instanceof Error ? e.message : e);
    return { data: await chatJSON<T>(system, user), sources: [], searched: false };
  }
}
