import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assistantConfig, summarizeProtocol, type ProtocolBrief } from "./assistant";

const brief: ProtocolBrief = {
  code: "VC-2026-1008",
  serviceName: "Street tree care",
  statusLabel: "Waiting to be claimed",
  currentSector: "Environment",
  route: ["Environment"],
  sections: [{ title: "Place", text: "Street: Example Street" }],
  documents: [{ label: "Photo of the canopy", fileName: "canopy-photo.jpg" }],
  openCorrections: [],
};

describe("analyst assistant", () => {
  it("stays off when the URL or the API key is missing", () => {
    assert.equal(assistantConfig({}), null);
    assert.equal(
      assistantConfig({ ANALYST_ASSISTANT_URL: "https://assistant.example" }),
      null,
    );
    assert.equal(assistantConfig({ ANALYST_ASSISTANT_API_KEY: "local-key" }), null);
  });

  it("posts the brief and returns the summary text", async () => {
    let seen: { authorization?: string; task?: string } = {};
    const summary = await summarizeProtocol(
      brief,
      {
        url: "https://assistant.example/summarize",
        apiKey: "local-key",
      },
      async (_url, init) => {
        const headers = new Headers(init?.headers);
        const payload = JSON.parse(String(init?.body)) as { task?: string };
        seen = {
          authorization: headers.get("authorization") ?? undefined,
          task: payload.task,
        };
        return new Response(
          JSON.stringify({ summary: "A street tree care request is waiting." }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    );
    assert.equal(summary, "A street tree care request is waiting.");
    assert.equal(seen.authorization, "Bearer local-key");
    assert.equal(seen.task, "summarize");
  });

  it("rejects a response that is not a summary", async () => {
    await assert.rejects(
      () =>
        summarizeProtocol(
          brief,
          { url: "https://assistant.example", apiKey: "local-key" },
          async () =>
            new Response(JSON.stringify({ note: "approve it" }), { status: 200 }),
        ),
      /did not return a summary/,
    );
  });
});
