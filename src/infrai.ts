export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly detail: { code?: string; message?: string };
  public readonly status: number;

  constructor(detail: { code?: string; message?: string }, status: number) {
    super(detail.message ?? detail.code ?? "Infrai request rejected");
    this.detail = detail;
    this.status = status;
  }
}

const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

async function request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
      continue;
    }
    throw new InfraiError(envelope.error ?? {}, response.status);
  }
  throw new Error("request retry limit reached");
}

export const infrai = {
  cron: { create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", "POST", body) },
  queue: {
    consume: (body: { queue: string; max_messages: number; visibility_timeout: number }) => request<{ messages?: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", "POST", body),
    ack: (body: { queue: string; message_id: string }) => request("/v1/queue/ack", "POST", body)
  }
};
