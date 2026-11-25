export type ProtocolBrief = {
  code: string;
  serviceName: string;
  statusLabel: string;
  currentSector: string;
  route: string[];
  sections: { title: string; text: string }[];
  documents: { label: string; fileName: string | null }[];
  openCorrections: { label: string; comment: string }[];
};

export type AssistantConfig = {
  url: string;
  apiKey: string;
};

/** The assistant stays off unless both a URL and an API key are set. */
export function assistantConfig(
  env: Record<string, string | undefined> = process.env,
): AssistantConfig | null {
  const url = env.ANALYST_ASSISTANT_URL?.trim() ?? "";
  const apiKey = env.ANALYST_ASSISTANT_API_KEY?.trim() ?? "";
  if (!url || !apiKey) {
    return null;
  }
  return { url, apiKey };
}

export async function summarizeProtocol(
  brief: ProtocolBrief,
  config: AssistantConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      task: "summarize",
      instruction:
        "Summarize this municipal protocol for the analyst. Do not approve, reject, or request corrections.",
      protocol: brief,
    }),
  });
  if (!response.ok) {
    throw new Error("The analyst assistant could not summarize this protocol.");
  }
  const body = (await response.json()) as { summary?: unknown };
  if (typeof body.summary !== "string" || body.summary.trim().length === 0) {
    throw new Error("The analyst assistant did not return a summary.");
  }
  return body.summary.trim();
}
