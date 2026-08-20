import { normalizeOpenAICompatibleBaseURL } from "@/lib/ai-provider";
import { assertTrustedHttpsEndpoint, createTrustedFetch, customAiAllowedOrigins } from "@/lib/remote-endpoint";

type OpenAIModel = {
  id?: unknown;
  owned_by?: unknown;
  ownedBy?: unknown;
};

function providerError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = "error" in payload ? payload.error : undefined;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
    const baseURL = normalizeOpenAICompatibleBaseURL(endpoint);
    const allowedOrigins = customAiAllowedOrigins();
    if (!allowedOrigins.length) {
      return Response.json({ error: "Custom AI endpoints are not admitted for this deployment" }, { status: 403 });
    }
    await assertTrustedHttpsEndpoint(baseURL, { allowedOrigins });

    const headers = new Headers({ Accept: "application/json" });
    if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);

    const response = await createTrustedFetch({ allowedOrigins })(`${baseURL}/models`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return Response.json(
        { error: providerError(payload, `Model endpoint returned ${response.status}`) },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
      );
    }

    const candidates = payload && typeof payload === "object"
      ? Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: OpenAIModel[] }).data
        : Array.isArray((payload as { models?: unknown }).models)
          ? (payload as { models: OpenAIModel[] }).models
          : []
      : [];

    const seen = new Set<string>();
    const models = candidates.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || typeof candidate.id !== "string") return [];
      const id = candidate.id.trim();
      if (!id || seen.has(id)) return [];
      seen.add(id);
      const ownerValue = candidate.owned_by ?? candidate.ownedBy;
      return [{ id, ownedBy: typeof ownerValue === "string" ? ownerValue : undefined }];
    }).slice(0, 500);

    if (models.length === 0) {
      return Response.json(
        { error: "The endpoint returned no model IDs" },
        { status: 502 }
      );
    }

    return Response.json({ models, baseURL });
  } catch {
    return Response.json({ error: "Unable to load models" }, { status: 400 });
  }
}
