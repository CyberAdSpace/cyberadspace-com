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
