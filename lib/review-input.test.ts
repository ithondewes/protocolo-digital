import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inboxQuerySchema, reviewActionSchema } from "./review-input";

describe("review payloads", () => {
  it("accepts a correction request and rejects an empty rejection note", () => {
    const corrections = reviewActionSchema.safeParse({
      action: "request_corrections",
      items: [
        {
          kind: "section",
          key: "proposal",
          decision: "changes_requested",
          comment: "Name the floor area.",
        },
      ],
    });
    assert.equal(corrections.success, true);

    const rejected = reviewActionSchema.safeParse({ action: "reject", note: "  " });
    assert.equal(rejected.success, false);
  });

  it("reads inbox filters and drops blank values", () => {
    const parsed = inboxQuerySchema.parse({
      status: "submitted",
      sector: "",
      type: "building-file",
    });
    assert.deepEqual(parsed, {
      status: "submitted",
      sector: undefined,
      type: "building-file",
    });
  });
});
